import { useEffect, useRef, useState } from 'react';
import { tutorApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { TutorMessage } from '../api/types';
import { withEmoji } from './Emoji';
import { sendQueued, takePending, TrakAllowanceLine, TrakLimitNotice, trakLimitFrom, useUsage } from './TrakAllowance';
import TrakIcon from './TrakIcon';

// Docked chat panel — permanently occupies the workspace shell's chat Panel
// slot (sized via the parent Panel + .chat-panel's own height:100% flex
// CSS). `code` is the caller's current, live editor buffer, sent along with
// every message so Trak can see what's actually on screen. No more discrete
// hint levels — Trak paces itself conversationally (see the dockable-layout
// and Trak-memory plans); a session now opens with a real generated turn
// from Trak instead of a static placeholder.
//
// `resumeSessionId` (optional): hydrate an existing session's history instead
// of starting a fresh one via `initiate` — a practice attempt reopens its
// own Trak conversation this way.
interface TutorChatProps {
  contextType: 'problem' | 'practiceAttempt';
  contextId: string;
  code: string;
  resumeSessionId?: string;
}

export default function TutorChat({
  contextType,
  contextId,
  code,
  resumeSessionId,
}: TutorChatProps) {
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { usage, setUsage, refresh: refreshUsage } = useUsage();
  // Started a membership from the trial pop-up: new allowances apply right away.
  const onUpgraded = () => {
    setLimitHit(null);
    refreshUsage();
  };
  const [limitHit, setLimitHit] = useState<ReturnType<typeof trakLimitFrom>>(null);
  const exhausted =
    limitHit ??
    (usage?.trak && usage.trak.remaining <= 0 && usage.bonusTrak <= 0 ? { code: 'TRAK_LIMIT' as const, usage } : null);
  const chatKey = `${contextType}:${contextId}`;

  // Keeps the latest message (or the typing indicator while a reply is in
  // flight) actually in view — without this, a longer conversation could
  // leave the typing dots scrolled off the bottom of .chat-messages'
  // overflow-y:auto, making the new "Trak is thinking" indicator pointless.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);
  // Guards against React StrictMode's dev-mode double effect invocation,
  // which would otherwise fire two mount-time calls (client/src/main.tsx
  // wraps the app in <StrictMode>) — covers all three branches below, not
  // just `initiate`.
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current || sessionId) return;
    mountedRef.current = true;
    setSending(true);
    setError(null);

    async function mount() {
      if (resumeSessionId) {
        const { session } = await tutorApi.getSession(resumeSessionId);
        setSessionId(session.id);
        setMessages(session.messages);
        return;
      }
      const res = await tutorApi.sendMessage({ contextType, contextId, code, initiate: true });
      setSessionId(res.sessionId);
      setMessages([{ role: 'tutor', content: res.reply, timestamp: new Date().toISOString() }]);
    }

    mount()
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Trak is unavailable right now'))
      .finally(() => setSending(false));
    // Deliberately narrow deps — this effect opens/resumes the session once
    // per mount; `code` changing mid-session shouldn't re-trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextType, contextId, resumeSessionId]);

  async function send(text: string) {
    if (!text.trim()) return;
    setError(null);
    setSending(true);
    setMessages((prev) => [...prev, { role: 'user', content: text, timestamp: new Date().toISOString() }]);
    setDraft('');
    try {
      // Waits (showing Trak's thinking dots) if it's too soon after a burst.
      const res = await sendQueued(chatKey, text, () =>
        tutorApi.sendMessage({ sessionId, contextType, contextId, message: text, code })
      );
      setSessionId(res.sessionId);
      if (res.usage) setUsage(res.usage);
      setMessages((prev) => [...prev, { role: 'tutor', content: res.reply, timestamp: new Date().toISOString() }]);
    } catch (err) {
      const limit = trakLimitFrom(err);
      if (limit) {
        // Not answered: take the message back out and leave it in the box.
        setMessages((prev) => prev.slice(0, -1));
        setDraft(text);
        setLimitHit(limit);
        if (limit.usage) setUsage(limit.usage);
      } else {
        setError(err instanceof ApiError ? err.message : 'Trak is unavailable right now');
      }
    } finally {
      setSending(false);
    }
  }

  // A message that was waiting when the page was closed or refreshed: send it
  // once this chat's session is open again.
  const resentRef = useRef(false);
  useEffect(() => {
    if (!sessionId || resentRef.current) return;
    resentRef.current = true;
    const pending = takePending(chatKey);
    if (pending) void send(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <div className="chat-panel">
      <div className="flex justify-between items-center" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <TrakIcon size={20} />
          <strong>Trak</strong>
        </div>
      </div>
      <div className="chat-messages">
        {sending && messages.length === 0 && (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            <span className="spinner" />
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role}`}>
            {withEmoji(m.content)}
          </div>
        ))}
        {sending && messages.length > 0 && (
          <div className="chat-bubble tutor typing" aria-label="Trak is typing">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        )}
        {error && <div className="error-banner">{error}</div>}
        <div ref={bottomRef} />
      </div>
      {exhausted ? (
        <div className="chat-input-row">
          <TrakLimitNotice code={exhausted.code} usage={exhausted.usage} onUpgraded={onUpgraded} />
        </div>
      ) : (
        <>
          <div className="chat-input-row">
            <input
              className="input"
              placeholder="Ask Trak for help..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send(draft)}
              disabled={sending}
            />
          </div>
          <TrakAllowanceLine usage={usage} onUpgraded={onUpgraded} />
        </>
      )}
    </div>
  );
}
