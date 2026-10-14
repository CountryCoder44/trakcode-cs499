import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { feedbackApi } from '../api/endpoints';
import { ApiError, fetchImageUrl } from '../api/client';
import type { FeedbackMessage, FeedbackThreadDetail, FeedbackThreadSummary } from '../api/types';
import { MESSAGES_CHANGED_EVENT } from '../components/MessagesButton';

function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const AUTHOR_LABEL: Record<FeedbackMessage['from'], string> = {
  user: 'You',
  system: 'TrakCode',
  team: 'TrakCode team',
};

// Messages: the learner's feedback and every reply to it. /messages lists the
// conversations; /messages/:id shows one (opening it marks it read).
export default function MessagesPage() {
  const { threadId } = useParams();
  return threadId ? <ThreadView id={threadId} /> : <InboxView />;
}

function InboxView() {
  const [threads, setThreads] = useState<FeedbackThreadSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    feedbackApi
      .threads()
      .then((r) => setThreads(r.threads))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load your messages"));
  }, []);

  return (
    <div className="messages-page">
      <h1>Messages</h1>
      <p className="text-dim">
        Replies to feedback you've sent. Use the feedback button in the bottom right corner of any page to send more.
      </p>
      {error && <div className="error-banner">{error}</div>}
      {!threads && !error && (
        <div className="empty-state">
          <span className="spinner" />
        </div>
      )}
      {threads && threads.length === 0 && (
        <div className="card empty-state">
          <p style={{ margin: 0 }}>No messages yet.</p>
          <p className="text-faint" style={{ margin: 0, fontSize: 14 }}>
            When you send feedback, our reply shows up here.
          </p>
        </div>
      )}
      {threads && threads.length > 0 && (
        <ul className="messages-list">
          {threads.map((t) => (
            <li key={t.id}>
              <Link to={`/messages/${t.id}`} className={`messages-row${t.unread ? ' unread' : ''}`}>
                <div className="messages-row-main">
                  <div className="messages-row-subject">
                    {t.unread > 0 && <span className="messages-dot" aria-label="Unread" />}
                    <span className={`badge ${t.kind === 'idea' ? 'badge-accent' : 'badge-warning'}`}>
                      {t.kind === 'idea' ? 'Suggestion' : 'Bug report'}
                    </span>
                    {t.subject}
                  </div>
                  <div className="messages-row-preview text-faint">{t.preview}</div>
                </div>
                <div className="messages-row-meta text-faint">
                  {when(t.lastMessageAt)}
                  {t.status === 'closed' && <span className="badge badge-neutral">Closed</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ThreadView({ id }: { id: string }) {
  const [thread, setThread] = useState<FeedbackThreadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shotUrl, setShotUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setThread(null);
    feedbackApi
      .thread(id)
      .then((r) => {
        if (cancelled) return;
        setThread(r.thread);
        window.dispatchEvent(new Event(MESSAGES_CHANGED_EVENT));
      })
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : "Couldn't load this message"));
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!thread?.hasScreenshot) return;
    let url: string | null = null;
    fetchImageUrl(`/feedback/threads/${thread.id}/screenshot`)
      .then((u) => {
        url = u;
        setShotUrl(u);
      })
      .catch(() => {});
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [thread?.id, thread?.hasScreenshot]);

  return (
    <div className="messages-page">
      <Link to="/messages" className="text-dim" style={{ fontSize: 14 }}>
        ← All messages
      </Link>
      {error && <div className="error-banner" style={{ marginTop: 16 }}>{error}</div>}
      {!thread && !error && (
        <div className="empty-state">
          <span className="spinner" />
        </div>
      )}
      {thread && (
        <>
          <h1 style={{ marginTop: 12 }}>{thread.kind === 'idea' ? 'Your suggestion' : 'Your bug report'}</h1>
          <p className="text-faint" style={{ fontSize: 13 }}>
            Sent {when(thread.createdAt)}
            {thread.pagePath && <> from {thread.pagePath}</>}
            {thread.status === 'closed' && ' · Closed'}
          </p>
          <div className="messages-thread">
            {thread.messages.map((m, i) => (
              <div key={i} className={`messages-bubble from-${m.from}`}>
                <div className="messages-bubble-head">
                  <strong>{AUTHOR_LABEL[m.from]}</strong>
                  <span className="text-faint">{when(m.createdAt)}</span>
                </div>
                <div className="messages-bubble-body">{m.body}</div>
                {i === 0 && shotUrl && (
                  <a href={shotUrl} target="_blank" rel="noreferrer" className="messages-shot">
                    <img src={shotUrl} alt="Screenshot you sent" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
