import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { tutorApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { TutorMessage } from '../api/types';
import { withEmoji } from './Emoji';
import { sendQueued, takePending, TrakAllowanceLine, TrakLimitNotice, trakLimitFrom, useUsage } from './TrakAllowance';
import TrakIcon from './TrakIcon';

// Ask Trak is one continuous thread per learner, so one key for its saved message.
const ASK_TRAK_KEY = 'seqItem';

const DEFAULT_WIDTH = 340;
const DEFAULT_HEIGHT = 440;
const MIN_WIDTH = 280;
const MIN_HEIGHT = 320;
const SCREEN_MARGIN = 8;

// The textarea grows with the draft up to 6 lines, then scrolls internally —
// measured from the input's own font metrics rather than a guessed pixel
// value, so it stays right if that CSS ever changes.
const MAX_INPUT_LINES = 6;

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), Math.max(min, max));
}

// The panel's size is a remembered per-viewer convenience (like the theme
// choice), not application data — persisted in localStorage, not the
// server, so it survives page reloads and later sessions without needing an
// account round-trip. Wrapped in try/catch: a private window or blocked site
// data can throw or return nothing, and the panel should just fall back to
// the default size rather than break.
const SIZE_STORAGE_KEY = 'trakcode_ask_trak_size';

function loadStoredSize(): { width: number; height: number } {
  try {
    const raw = localStorage.getItem(SIZE_STORAGE_KEY);
    if (!raw) return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
    const parsed = JSON.parse(raw);
    return {
      width: clamp(Number(parsed.width) || DEFAULT_WIDTH, MIN_WIDTH, window.innerWidth - SCREEN_MARGIN),
      height: clamp(Number(parsed.height) || DEFAULT_HEIGHT, MIN_HEIGHT, window.innerHeight - SCREEN_MARGIN),
    };
  } catch {
    return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  }
}

function saveStoredSize(size: { width: number; height: number }): void {
  try {
    localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(size));
  } catch {
    // private browsing / storage disabled — not worth surfacing
  }
}

interface Props {
  /** "<topicId>::<itemId>" — see TutorSession.contextId (server). */
  contextId: string;
  /** The learner's live editor buffer, only meaningful for a practical/
      checkpoint item — omit for a concept item, which has no editor. */
  code?: string;
  onClose: () => void;
}

// Which edges/corners a resize handle drags, as -1/0/1 per axis (-1 = the
// low edge, i.e. left/top; 1 = the high edge, i.e. right/bottom).
type ResizeDir = { x: -1 | 0 | 1; y: -1 | 0 | 1 };

// A small, draggable, resizable "Ask Trak" chat window for the Sequential
// Curriculum — a lighter-weight sibling of TutorChat.tsx's docked workspace
// panel, built for on-demand questions rather than the old Learn Mode's
// scripted calibration/practice rounds: no `initiate` opening turn (nothing
// is asked of the AI until the learner actually types something, so opening
// the panel costs nothing), no readiness classification, no auto-attached
// problem.
//
// One continuous thread per learner, not one per item — `contextId` changes
// as the learner moves between items (the parent just passes whatever the
// current item is), and the server folds that into the SAME ongoing session
// rather than starting a new one (see tutor.controller.ts's seqItem branch).
// Closing the panel doesn't end the conversation either: on mount, this
// resumes the learner's existing thread from the server rather than starting
// blank, so a page reload or navigating away and back picks up right where
// it left off.
export default function AskTrakPanel({ contextId, code, onClose }: Props) {
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [resuming, setResuming] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [size, setSize] = useState(() => loadStoredSize());
  const [pos, setPos] = useState(() => ({
    x: clamp(window.innerWidth - size.width - 32, 16, window.innerWidth - size.width - 16),
    y: clamp(96, 16, window.innerHeight - size.height - 16),
  }));
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const resizeRef = useRef<{
    dir: ResizeDir;
    startClientX: number;
    startClientY: number;
    startWidth: number;
    startHeight: number;
    startX: number;
    startY: number;
  } | null>(null);

  // Guards against React StrictMode's dev-mode double effect invocation
  // (client/src/main.tsx wraps the app in <StrictMode>), same idiom
  // TutorChat.tsx uses for its own mount-time session fetch.
  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    tutorApi
      .getLatestSeqItemSession()
      .then((res) => {
        if (res.session) {
          setSessionId(res.session.id);
          setMessages(res.session.messages);
        }
      })
      // A failed resume just means "start fresh" — never blocks the chat
      // itself from working.
      .catch(() => {})
      .finally(() => setResuming(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  // Auto-grow the textarea with its content, up to MAX_INPUT_LINES worth of
  // height — beyond that, the CSS `overflow-y: auto` (see global.css) takes
  // over and it scrolls internally instead of growing further.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 18;
    const verticalPadding =
      parseFloat(getComputedStyle(el).paddingTop) + parseFloat(getComputedStyle(el).paddingBottom);
    const maxHeight = lineHeight * MAX_INPUT_LINES + verticalPadding;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [draft]);

  function onHeaderPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onHeaderPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    setPos({
      x: clamp(e.clientX - dragRef.current.dx, 0, Math.max(0, window.innerWidth - size.width)),
      y: clamp(e.clientY - dragRef.current.dy, 0, Math.max(0, window.innerHeight - size.height)),
    });
  }
  function onHeaderPointerUp() {
    dragRef.current = null;
  }

  function onResizePointerDown(e: ReactPointerEvent<HTMLDivElement>, dir: ResizeDir) {
    e.stopPropagation();
    resizeRef.current = {
      dir,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startWidth: size.width,
      startHeight: size.height,
      startX: pos.x,
      startY: pos.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onResizePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const r = resizeRef.current;
    if (!r) return;
    const deltaX = e.clientX - r.startClientX;
    const deltaY = e.clientY - r.startClientY;

    let width = size.width;
    let height = size.height;
    let x = pos.x;
    let y = pos.y;

    if (r.dir.x === 1) {
      width = clamp(r.startWidth + deltaX, MIN_WIDTH, window.innerWidth - r.startX - SCREEN_MARGIN);
    } else if (r.dir.x === -1) {
      width = clamp(r.startWidth - deltaX, MIN_WIDTH, r.startX + r.startWidth - SCREEN_MARGIN);
      x = r.startX + (r.startWidth - width);
    }
    if (r.dir.y === 1) {
      height = clamp(r.startHeight + deltaY, MIN_HEIGHT, window.innerHeight - r.startY - SCREEN_MARGIN);
    } else if (r.dir.y === -1) {
      height = clamp(r.startHeight - deltaY, MIN_HEIGHT, r.startY + r.startHeight - SCREEN_MARGIN);
      y = r.startY + (r.startHeight - height);
    }

    setSize({ width, height });
    setPos({ x, y });
  }
  function onResizePointerUp() {
    resizeRef.current = null;
    // Only on drag END, not every pointermove during the drag — this fires
    // dozens of times a second while resizing, and a synchronous
    // localStorage write on each one would be wasteful for no benefit.
    saveStoredSize(size);
  }

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

  async function send(text: string) {
    if (!text.trim() || sending || resuming) return;
    setError(null);
    setSending(true);
    setMessages((prev) => [...prev, { role: 'user', content: text, timestamp: new Date().toISOString() }]);
    setDraft('');
    try {
      // Waits (showing Trak's thinking dots) if it's too soon after a burst.
      const res = await sendQueued(ASK_TRAK_KEY, text, () =>
        tutorApi.sendMessage({ sessionId, contextType: 'seqItem', contextId, message: text, code })
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
  // once the thread has finished loading.
  const resentRef = useRef(false);
  useEffect(() => {
    if (resuming || resentRef.current) return;
    resentRef.current = true;
    const pending = takePending(ASK_TRAK_KEY);
    if (pending) void send(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resuming]);

  const RESIZE_HANDLES: { className: string; dir: ResizeDir }[] = [
    { className: 'ask-trak-resize-n', dir: { x: 0, y: -1 } },
    { className: 'ask-trak-resize-s', dir: { x: 0, y: 1 } },
    { className: 'ask-trak-resize-e', dir: { x: 1, y: 0 } },
    { className: 'ask-trak-resize-w', dir: { x: -1, y: 0 } },
    { className: 'ask-trak-resize-ne', dir: { x: 1, y: -1 } },
    { className: 'ask-trak-resize-nw', dir: { x: -1, y: -1 } },
    { className: 'ask-trak-resize-se', dir: { x: 1, y: 1 } },
    { className: 'ask-trak-resize-sw', dir: { x: -1, y: 1 } },
  ];

  return (
    <div
      className="ask-trak-panel"
      style={{ left: pos.x, top: pos.y, width: size.width, height: size.height }}
    >
      {RESIZE_HANDLES.map(({ className, dir }) => (
        <div
          key={className}
          className={`ask-trak-resize-handle ${className}`}
          onPointerDown={(e) => onResizePointerDown(e, dir)}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
        />
      ))}

      <div
        className="ask-trak-panel-header"
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
      >
        <div className="flex items-center gap-2">
          <TrakIcon size={18} />
          <strong style={{ fontSize: 13 }}>Ask Trak</strong>
        </div>
        <button
          className="btn btn-sm"
          onClick={onClose}
          aria-label="Close"
          title="Close"
          style={{
            padding: '2px 8px',
            lineHeight: 1,
            background: 'var(--code-inline)',
            borderColor: 'var(--code-inline)',
            // --bg conveniently inverts lightness the same way --code-inline
            // does between themes (dark on light-mode's deep orange fill,
            // light on dark-mode's pale one), so the X stays readable either way.
            color: 'var(--bg)',
          }}
        >
          ✕
        </button>
      </div>
      <div className="chat-panel" style={{ height: 'auto', flex: 1, border: 'none', borderRadius: 0 }}>
        <div className="chat-messages">
          {resuming && (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <span className="spinner" />
            </div>
          )}
          {!resuming && messages.length === 0 && !sending && (
            <div className="text-faint" style={{ fontSize: 12.5, padding: '8px 2px' }}>
              Ask Trak anything about this item: how to approach it, what a concept means, or why something isn't
              working.
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble ${m.role}`}>
              {withEmoji(m.content)}
            </div>
          ))}
          {sending && (
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
        <div className="chat-input-row" style={{ alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            className="input ask-trak-input"
            placeholder="Ask Trak... (Shift+Enter for a new line)"
            value={draft}
            rows={1}
            spellCheck={false}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            disabled={sending || resuming}
            autoFocus
          />
          <button
            className="btn btn-sm btn-primary"
            onClick={() => send(draft)}
            disabled={sending || resuming || !draft.trim()}
            aria-label="Send"
            title="Send"
          >
            Send
          </button>
        </div>
        )}
        {!exhausted && <TrakAllowanceLine usage={usage} onUpgraded={onUpgraded} />}
      </div>
    </div>
  );
}
