import { useState } from 'react';
import { portfolioApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { PushDestination, PushResult } from '../api/types';

// Shared repo every solution goes into by default (server: DEFAULT_PORTFOLIO_REPO).
const DEFAULT_REPO = 'trakcode-solutions';

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60) || 'solution'
  );
}

function titleCase(text: string): string {
  return text.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Props {
  /** Pushes a Deep Dive submission… */
  submissionId?: string;
  /** …or anything else (a practice attempt) via its own push call. */
  push?: (body: { title: string; destination: PushDestination; newRepoName?: string }) => Promise<PushResult>;
  topic: string; // used to suggest a name
  language: string; // python | typescript | cpp — the folder it lands in
  onClose: () => void;
  onPushed: (result: PushResult) => void;
}

/**
 * "Push to GitHub" popup: the learner names the push and picks where it goes.
 * Default: a new folder in their `trakcode-solutions` repo, committed to main
 * (so it shows on their GitHub contribution heatmap). Or: a brand-new repo.
 */
export default function PushToGithubModal({ submissionId, push, topic, language, onClose, onPushed }: Props) {
  const [title, setTitle] = useState(() => titleCase(topic));
  const [destination, setDestination] = useState<PushDestination>('default');
  const [repoName, setRepoName] = useState<string | null>(null); // null = follow the title
  const [error, setError] = useState<string | null>(null);
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState<PushResult | null>(null);

  const effectiveRepoName = repoName ?? slugify(title);
  const preview =
    destination === 'default'
      ? `${DEFAULT_REPO}/${language}/${slugify(title)}/`
      : `${effectiveRepoName}/ (new repo)`;

  async function handlePush(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPushing(true);
    try {
      const body = { title: title.trim(), destination, newRepoName: destination === 'new' ? effectiveRepoName : undefined };
      const res = push ? await push(body) : await portfolioApi.push({ submissionId: submissionId!, ...body });
      setResult(res);
      onPushed(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Push to GitHub failed');
    } finally {
      setPushing(false);
    }
  }

  return (
    <div className="console-popup-backdrop" onClick={pushing ? undefined : onClose}>
      <div className="console-popup push-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="console-popup-header">
          <strong>Push to GitHub</strong>
          <button className="btn btn-sm" onClick={onClose} disabled={pushing}>
            Close
          </button>
        </div>

        {result ? (
          <div className="push-modal-body">
            <p style={{ marginTop: 0 }}>
              <strong>Pushed!</strong> Your solution is on GitHub in <code>{result.repoName}</code>.
            </p>
            <p className="text-dim" style={{ fontSize: 13 }}>
              It counts toward your GitHub contribution graph. New commits can take a few minutes to show there.
            </p>
            <div className="flex gap-2">
              <a href={result.githubRepoUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
                View on GitHub →
              </a>
              <button className="btn" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form className="push-modal-body" onSubmit={handlePush}>
            {error && <div className="error-banner">{error}</div>}

            <div className="field">
              <label htmlFor="push-title">Name</label>
              <input
                id="push-title"
                className="input"
                value={title}
                maxLength={80}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="field">
              <label>Where should it go?</label>
              <label className={`push-option${destination === 'default' ? ' selected' : ''}`}>
                <input
                  type="radio"
                  name="destination"
                  checked={destination === 'default'}
                  onChange={() => setDestination('default')}
                />
                <span>
                  <strong>My TrakCode repo</strong>
                  <span className="text-dim">
                    Adds it as a new folder in <code>{DEFAULT_REPO}</code>, created for you on your first push.
                  </span>
                </span>
              </label>
              <label className={`push-option${destination === 'new' ? ' selected' : ''}`}>
                <input type="radio" name="destination" checked={destination === 'new'} onChange={() => setDestination('new')} />
                <span>
                  <strong>A new repo</strong>
                  <span className="text-dim">Gives this solution a repo of its own.</span>
                </span>
              </label>
            </div>

            {destination === 'new' && (
              <div className="field">
                <label htmlFor="push-repo">Repo name</label>
                <input
                  id="push-repo"
                  className="input"
                  value={effectiveRepoName}
                  maxLength={100}
                  pattern="[A-Za-z0-9._\-]+"
                  title='Letters, numbers, "-", "_" and "." only'
                  onChange={(e) => setRepoName(e.target.value)}
                  required
                />
              </div>
            )}

            <p className="text-faint" style={{ fontSize: 13 }}>
              Will create: <code>{preview}</code>
            </p>

            <button className="btn btn-primary btn-block" type="submit" disabled={pushing || !title.trim()}>
              {pushing ? <span className="spinner" /> : 'Push to GitHub'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
