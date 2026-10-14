import { useEffect, useRef, useState } from 'react';
import { tutorApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { TutorMessage, Problem } from '../api/types';

// Docked chat panel — permanently occupies the workspace shell's chat Panel
// slot (sized via the parent Panel + .chat-panel's own height:100% flex
// CSS). `code` is the caller's current, live editor buffer, sent along with
// every message so Trak can see what's actually on screen. No more discrete
// hint levels — Trak paces itself conversationally (see the dockable-layout
// and Trak-memory plans); a session now opens with a real generated turn
// from Trak instead of a static placeholder.
//
// Learn Mode redesign additions (both optional, opt-in — Practice
// Workspace/Flash Card pass neither and get today's exact behavior):
// - `resumeSessionId`: hydrate an existing session's history instead of
//   starting a fresh one via `initiate` — used for "Continue where you left
//   off" and for a plain page reload mid-calibration.
// - `triggerNextRound`: combined with `resumeSessionId`, immediately
//   retriggers a check-in on that (already-hydrated) session via
//   `beginNextRound` — used exactly once, right when the parent transitions
//   from a just-passed practicing round back into calibration for the next.
// - `onReadyForPractice`: fires once Trak's readiness classifier signals the
//   learner wants to move on, handing back the freshly-attached problem.
interface TutorChatProps {
  contextType: 'problem' | 'curriculumItem';
  contextId: string;
  code: string;
  resumeSessionId?: string;
  triggerNextRound?: boolean;
  onReadyForPractice?: (problem: Problem) => void;
}

export default function TutorChat({
  contextType,
  contextId,
  code,
  resumeSessionId,
  triggerNextRound,
  onReadyForPractice,
}: TutorChatProps) {
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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
        if (triggerNextRound) {
          const res = await tutorApi.sendMessage({ sessionId: session.id, contextType, contextId, beginNextRound: true, code });
          setMessages((prev) => [...prev, { role: 'tutor', content: res.reply, timestamp: new Date().toISOString() }]);
        }
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
    // per mount; `code`/`triggerNextRound` changing mid-session shouldn't
    // re-trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextType, contextId, resumeSessionId]);

  async function send(text: string) {
    if (!text.trim()) return;
    setError(null);
    setSending(true);
    setMessages((prev) => [...prev, { role: 'user', content: text, timestamp: new Date().toISOString() }]);
    setDraft('');
    try {
      const res = await tutorApi.sendMessage({ sessionId, contextType, contextId, message: text, code });
      setSessionId(res.sessionId);
      setMessages((prev) => [...prev, { role: 'tutor', content: res.reply, timestamp: new Date().toISOString() }]);
      if (res.readyForPractice && res.problem && onReadyForPractice) {
        onReadyForPractice(res.problem);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Trak is unavailable right now');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chat-panel">
      <div className="flex justify-between items-center" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 18 }}>🐭</span>
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
            {m.content}
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
    </div>
  );
}
