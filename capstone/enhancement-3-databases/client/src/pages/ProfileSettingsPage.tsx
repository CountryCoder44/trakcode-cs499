import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { profileApi } from '../api/endpoints';
import { ApiError } from '../api/client';

export default function ProfileSettingsPage() {
  const { user, refreshUser } = useAuth();
  const [slug, setSlug] = useState(user?.profile.slug ?? '');
  const [isPublic, setIsPublic] = useState(user?.profile.isPublic ?? false);
  const [showPortfolioLinks, setShowPortfolioLinks] = useState(user?.profile.showPortfolioLinks ?? true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      await profileApi.updateSettings({ slug: slug.trim() || undefined, isPublic, showPortfolioLinks });
      await refreshUser();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container-narrow">
      <h1>Profile settings</h1>
      <div className="card">
        {error && <div className="error-banner">{error}</div>}
        {success && (
          <div className="badge badge-success" style={{ display: 'block', marginBottom: 16 }}>
            Saved
          </div>
        )}
        <form onSubmit={handleSave}>
          <div className="field">
            <label htmlFor="slug">Public profile slug</label>
            <input
              id="slug"
              className="input"
              placeholder="e.g. priya-codes"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
            {slug && (
              <span className="text-faint" style={{ fontSize: 12 }}>
                Your profile: <Link to={`/u/${slug}`}>trakcode.com/u/{slug}</Link>
              </span>
            )}
          </div>
          <div className="field">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              Make my profile public
            </label>
          </div>
          <div className="field">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showPortfolioLinks}
                onChange={(e) => setShowPortfolioLinks(e.target.checked)}
              />
              Show pushed GitHub repos on my public profile
            </label>
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? <span className="spinner" /> : 'Save settings'}
          </button>
        </form>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Account</h3>
        <p>
          {user?.name} — {user?.email}
        </p>
        <Link to="/billing" className="btn">
          Manage billing
        </Link>
      </div>
    </div>
  );
}
