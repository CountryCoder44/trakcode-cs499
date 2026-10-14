import { useEffect, useState } from 'react';
import { adminApi } from '../../api/endpoints';
import { ApiError, fetchImageUrl } from '../../api/client';
import type { AdminFeedbackDetail, AdminFeedbackRow } from '../../api/types';

// Admin, Feedback: everything learners sent with the Feedback button. A reply
// here shows up in the learner's Messages (with an unread badge). Closing a
// thread just files it; the learner still sees it.

type View = 'open' | 'closed' | 'all';

const VIEWS: { id: View; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'closed', label: 'Closed' },
  { id: 'all', label: 'All' },
];

const AUTHOR: Record<string, string> = { user: 'Learner', system: 'Automatic reply', team: 'Team' };

function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function FeedbackTab({ onError }: { onError: (msg: string | null) => void }) {
  const [view, setView] = useState<View>('open');
  const [kind, setKind] = useState<'bug' | 'idea' | 'all'>('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof adminApi.feedback>> | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setData(null);
    adminApi
      .feedback(view, kind, page)
      .then(setData)
      .catch((err) => onError(err instanceof ApiError ? err.message : 'Failed to load feedback'));
  }, [view, kind, page, reloadKey, onError]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="card">
      <h3>Feedback</h3>
      <p className="text-faint" style={{ marginTop: 0 }}>
        Sent with the Feedback button. Each one got an automatic "we got it" reply. Your replies show up in the
        learner's Messages.
        {data && (
          <>
            {' '}
            <strong>{data.unreadCount}</strong> unread, <strong>{data.openCount}</strong> open.
          </>
        )}
      </p>
      <div className="tabs safety-subtabs" role="tablist">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            role="tab"
            className={`tab${view === v.id ? ' active' : ''}`}
            onClick={() => {
              setView(v.id);
              setPage(1);
              setOpenId(null);
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2" style={{ margin: '4px 0 12px' }}>
        <label className="text-faint" style={{ fontSize: 13 }} htmlFor="feedback-kind-filter">
          Show
        </label>
        <select
          id="feedback-kind-filter"
          className="input"
          style={{ width: 'auto' }}
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as 'bug' | 'idea' | 'all');
            setPage(1);
            setOpenId(null);
          }}
        >
          <option value="all">Bugs and suggestions</option>
          <option value="bug">Bug reports</option>
          <option value="idea">Suggestions</option>
        </select>
      </div>

      {!data && (
        <div className="empty-state">
          <span className="spinner" />
        </div>
      )}
      {data && data.threads.length === 0 && <p className="text-faint">No feedback here yet.</p>}
      {data && data.threads.length > 0 && (
        <div className="feedback-admin-list">
          {data.threads.map((t) => (
            <FeedbackRow
              key={t.id}
              row={t}
              open={openId === t.id}
              onToggle={() => setOpenId(openId === t.id ? null : t.id)}
              onChanged={() => setReloadKey((k) => k + 1)}
              onError={onError}
            />
          ))}
        </div>
      )}

      {data && totalPages > 1 && (
        <div className="flex items-center gap-2" style={{ marginTop: 12 }}>
          <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span className="text-faint" style={{ fontSize: 13 }}>
            Page {page} of {totalPages}
          </span>
          <button className="btn btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function FeedbackRow({
  row,
  open,
  onToggle,
  onChanged,
  onError,
}: {
  row: AdminFeedbackRow;
  open: boolean;
  onToggle: () => void;
  onChanged: () => void;
  onError: (msg: string | null) => void;
}) {
  return (
    <div className={`feedback-admin-row${row.unreadForTeam ? ' unread' : ''}`}>
      <button className="feedback-admin-summary" onClick={onToggle} aria-expanded={open}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
            {row.unreadForTeam && <span className="badge badge-accent">New</span>}
            <span className={`badge ${row.kind === 'idea' ? 'badge-success' : 'badge-warning'}`}>
              {row.kind === 'idea' ? 'Suggestion' : 'Bug'}
            </span>
            <strong>{row.userName || row.userEmail}</strong>
            <span className="text-faint" style={{ fontSize: 13 }}>
              {row.userEmail}
            </span>
            {row.hasScreenshot && <span className="badge badge-neutral">Screenshot</span>}
            {row.replies > 0 && (
              <span className="badge badge-success">
                {row.replies} {row.replies === 1 ? 'reply' : 'replies'}
              </span>
            )}
            {row.status === 'closed' && <span className="badge badge-neutral">Closed</span>}
          </div>
          <div className="feedback-admin-snippet">{row.firstMessage}</div>
        </div>
        <span className="text-faint" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
          {when(row.lastMessageAt)}
        </span>
      </button>
      {open && <FeedbackDetail id={row.id} onChanged={onChanged} onError={onError} />}
    </div>
  );
}

function FeedbackDetail({
  id,
  onChanged,
  onError,
}: {
  id: string;
  onChanged: () => void;
  onError: (msg: string | null) => void;
}) {
  const [thread, setThread] = useState<AdminFeedbackDetail | null>(null);
  const [shotUrl, setShotUrl] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminApi
      .feedbackThread(id)
      .then((r) => setThread(r.thread))
      .catch((err) => onError(err instanceof ApiError ? err.message : 'Failed to load feedback'));
  }, [id, onError]);

  useEffect(() => {
    if (!thread?.hasScreenshot) return;
    let url: string | null = null;
    fetchImageUrl(`/admin/feedback/${thread.id}/screenshot`)
      .then((u) => {
        url = u;
        setShotUrl(u);
      })
      .catch(() => {});
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [thread?.id, thread?.hasScreenshot]);

  async function sendReply() {
    if (!reply.trim() || busy) return;
    setBusy(true);
    try {
      const r = await adminApi.replyFeedback(id, reply.trim());
      setThread(r.thread);
      setReply('');
      onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Failed to send the reply');
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: 'open' | 'closed') {
    setBusy(true);
    try {
      const r = await adminApi.setFeedbackStatus(id, status);
      setThread(r.thread);
      onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Failed to update');
    } finally {
      setBusy(false);
    }
  }

  if (!thread) {
    return (
      <div className="feedback-admin-detail">
        <span className="spinner" />
      </div>
    );
  }

  return (
    <div className="feedback-admin-detail">
      <div className="text-faint" style={{ fontSize: 12.5 }}>
        Page: {thread.pagePath || 'unknown'} · Window: {thread.viewport || 'unknown'}
        <br />
        {thread.userAgent}
      </div>
      {shotUrl && (
        <a href={shotUrl} target="_blank" rel="noreferrer" className="messages-shot">
          <img src={shotUrl} alt="Learner's screenshot" />
        </a>
      )}
      <div className="messages-thread" style={{ marginTop: 4 }}>
        {thread.messages.map((m, i) => (
          <div key={i} className={`messages-bubble from-${m.from}`}>
            <div className="messages-bubble-head">
              <strong>{AUTHOR[m.from]}</strong>
              <span className="text-faint">{when(m.createdAt)}</span>
            </div>
            <div className="messages-bubble-body">{m.body}</div>
          </div>
        ))}
      </div>
      <textarea
        className="input feedback-reply"
        rows={4}
        maxLength={4000}
        placeholder="Reply to the learner (shows up in their Messages)"
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        disabled={busy}
      />
      <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
        <button className="btn btn-sm btn-primary" onClick={() => void sendReply()} disabled={busy || !reply.trim()}>
          Send reply
        </button>
        {thread.status === 'open' ? (
          <button className="btn btn-sm" onClick={() => void setStatus('closed')} disabled={busy}>
            Close
          </button>
        ) : (
          <button className="btn btn-sm" onClick={() => void setStatus('open')} disabled={busy}>
            Reopen
          </button>
        )}
      </div>
    </div>
  );
}
