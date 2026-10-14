import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { feedbackApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { MESSAGES_CHANGED_EVENT } from './MessagesButton';

const MAX_CHARS = 1000;

type Kind = 'bug' | 'idea';
const KINDS: { id: Kind; label: string; prompt: string; placeholder: string }[] = [
  {
    id: 'bug',
    label: 'Report a bug',
    prompt: 'What went wrong? Tell us what you did and what you expected to happen.',
    placeholder: 'For example: I pressed Run and nothing happened.',
  },
  {
    id: 'idea',
    label: 'Suggest an improvement',
    prompt: "What would make TrakCode better for you? We read every idea.",
    placeholder: 'For example: It would help to see my past answers.',
  },
];
// Screenshots are downscaled to this width before sending (keeps them well
// under the server's 2.5 MB limit while staying readable).
const MAX_SHOT_WIDTH = 1600;

// Anything marked with this attribute (the button and the form) is left out of
// the screenshot, so it shows the page the learner was looking at.
const UI_ATTR = 'data-feedback-ui';

/** Captures what's visible in the window right now, as a JPEG data URL. */
async function captureScreen(): Promise<string> {
  // Loaded only when someone actually asks for a screenshot.
  const { default: html2canvas } = await import('html2canvas-pro');
  const scale = Math.min(window.devicePixelRatio || 1, 1.5);
  const canvas = await html2canvas(document.body, {
    x: window.scrollX,
    y: window.scrollY,
    width: window.innerWidth,
    height: window.innerHeight,
    windowWidth: document.documentElement.clientWidth,
    windowHeight: window.innerHeight,
    scale,
    useCORS: true,
    logging: false,
    backgroundColor: getComputedStyle(document.body).backgroundColor || null,
    ignoreElements: (el) => el.hasAttribute(UI_ATTR),
  });

  let out: HTMLCanvasElement = canvas;
  if (canvas.width > MAX_SHOT_WIDTH) {
    out = document.createElement('canvas');
    out.width = MAX_SHOT_WIDTH;
    out.height = Math.round((canvas.height * MAX_SHOT_WIDTH) / canvas.width);
    out.getContext('2d')!.drawImage(canvas, 0, 0, out.width, out.height);
  }
  let url = out.toDataURL('image/jpeg', 0.75);
  if (url.length > 3_000_000) url = out.toDataURL('image/jpeg', 0.5);
  return url;
}

function SpeechIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16A2.5 2.5 0 0 1 4 13.5v-8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M8.5 8.5h7M8.5 11.5h4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// The floating Feedback button (bottom right of every signed-in page) and the
// form it opens. Sent feedback shows up in Messages along with an automatic
// "we got it" reply and anything the team writes back.
export default function FeedbackWidget() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>('bug');
  const [message, setMessage] = useState('');
  const [wantShot, setWantShot] = useState(false);
  const [shot, setShot] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    textareaRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // A screenshot belongs to the page it was taken on: moving to another page
  // drops it (the box stays ticked, so it can be retaken here).
  useEffect(() => {
    setShot(null);
  }, [location.pathname]);

  async function takeShot() {
    setError(null);
    setCapturing(true);
    try {
      setShot(await captureScreen());
    } catch {
      setWantShot(false);
      setError("Couldn't take a screenshot of this page. You can still send your message without one.");
    } finally {
      setCapturing(false);
    }
  }

  function toggleShot(checked: boolean) {
    setWantShot(checked);
    if (checked) void takeShot();
    else setShot(null);
  }

  async function send() {
    const text = message.trim();
    if (!text || sending || capturing) return;
    setSending(true);
    setError(null);
    try {
      await feedbackApi.send({
        kind,
        message: text,
        screenshot: wantShot && shot ? shot : undefined,
        pagePath: `${location.pathname}${location.search}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      });
      setMessage('');
      setWantShot(false);
      setShot(null);
      setSent(true);
      window.dispatchEvent(new Event(MESSAGES_CHANGED_EVENT));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send your feedback. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function close() {
    setOpen(false);
    setSent(false);
    setError(null);
  }

  return (
    <>
      {open && (
        <div className="feedback-panel" role="dialog" aria-label="Send feedback" {...{ [UI_ATTR]: '' }}>
          <div className="feedback-panel-header">
            <strong style={{ fontSize: 14 }}>Send feedback</strong>
            <button className="btn btn-sm feedback-close" onClick={close} aria-label="Close" title="Close">
              ✕
            </button>
          </div>

          {sent ? (
            <div className="feedback-panel-body">
              <p style={{ margin: 0 }}>
                <strong>Thanks, we got it!</strong>
              </p>
              <p className="text-dim" style={{ margin: 0, fontSize: 14 }}>
                Our team reads every message. If we reply, you'll find it in{' '}
                <Link to="/messages" onClick={close}>
                  Messages
                </Link>
                .
              </p>
              <div className="flex gap-2" style={{ marginTop: 4 }}>
                <button className="btn btn-sm" onClick={() => setSent(false)}>
                  Send more feedback
                </button>
                <button className="btn btn-sm btn-primary" onClick={close}>
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="feedback-panel-body">
              <div className="feedback-kind" role="radiogroup" aria-label="Type of feedback">
                {KINDS.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    role="radio"
                    aria-checked={kind === k.id}
                    className={`feedback-kind-option${kind === k.id ? ' active' : ''}`}
                    onClick={() => setKind(k.id)}
                    disabled={sending}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
              <label htmlFor="feedback-message" className="text-dim" style={{ fontSize: 13 }}>
                {KINDS.find((k) => k.id === kind)!.prompt}
              </label>
              <textarea
                id="feedback-message"
                ref={textareaRef}
                className="input feedback-input"
                rows={6}
                maxLength={MAX_CHARS}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={KINDS.find((k) => k.id === kind)!.placeholder}
                disabled={sending}
              />
              <div className="feedback-count text-faint">
                {message.length}/{MAX_CHARS}
              </div>

              <label className="feedback-shot-toggle">
                <input
                  type="checkbox"
                  checked={wantShot}
                  onChange={(e) => toggleShot(e.target.checked)}
                  disabled={sending || capturing}
                />
                Add a screenshot of this page
              </label>
              {wantShot && (
                <div className="feedback-shot">
                  {capturing ? (
                    <span className="text-faint" style={{ fontSize: 13 }}>
                      <span className="spinner" /> Taking screenshot...
                    </span>
                  ) : shot ? (
                    <>
                      <img src={shot} alt="Screenshot that will be sent" />
                      <button className="btn btn-sm" onClick={() => void takeShot()} disabled={sending}>
                        Retake
                      </button>
                    </>
                  ) : (
                    <button className="btn btn-sm" onClick={() => void takeShot()} disabled={sending}>
                      Take screenshot
                    </button>
                  )}
                </div>
              )}

              {error && <div className="error-banner">{error}</div>}

              <button
                className="btn btn-primary"
                onClick={() => void send()}
                disabled={!message.trim() || sending || capturing || (wantShot && !shot)}
              >
                {sending ? 'Sending...' : kind === 'bug' ? 'Send bug report' : 'Send suggestion'}
              </button>
            </div>
          )}
        </div>
      )}

      <button
        className="feedback-fab"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={open ? 'Close feedback' : 'Send feedback'}
        title="Send feedback"
        {...{ [UI_ATTR]: '' }}
      >
        <SpeechIcon />
      </button>
    </>
  );
}
