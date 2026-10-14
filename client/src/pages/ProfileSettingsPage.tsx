import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { profileApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import ConnectedAccounts from '../components/ConnectedAccounts';
import DeleteAccount from '../components/DeleteAccount';

/**
 * Tidies a profile link as it's typed: lowercase, spaces become hyphens, other
 * characters are dropped, no doubled hyphens. A trailing hyphen is kept while
 * typing (so "ada-" can become "ada-lovelace"); `finishLink` trims it.
 */
function tidyLink(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')
    .slice(0, 40);
}

const finishLink = (text: string) => tidyLink(text).replace(/-+$/, '');

export default function ProfileSettingsPage() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [slug, setSlug] = useState(user?.profile.slug ?? '');
  const [isPublic, setIsPublic] = useState(user?.profile.isPublic ?? false);
  const [showPortfolioLinks, setShowPortfolioLinks] = useState(user?.profile.showPortfolioLinks ?? true);
  const [searchIndexable, setSearchIndexable] = useState(user?.profile.searchIndexable ?? false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    const link = finishLink(slug);
    if (link && link.length < 3) {
      setError('Your profile link needs at least 3 characters.');
      return;
    }
    if (isPublic && !link) {
      setError('Choose a profile link before making your profile public.');
      return;
    }
    setSlug(link);
    setSuccess(false);
    setSaving(true);
    try {
      await profileApi.updateSettings({
        name: name.trim(),
        slug: link || undefined,
        isPublic,
        showPortfolioLinks,
        searchIndexable: isPublic && searchIndexable,
      });
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
            <label htmlFor="name">Name</label>
            <input
              id="name"
              className="input"
              autoComplete="name"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <span className="text-faint" style={{ fontSize: 12 }}>
              Shown on your public profile, if you make it public.
            </span>
          </div>
          <div className="field">
            <label htmlFor="slug">Profile link</label>
            <div className="input-with-prefix">
              <span className="input-prefix" aria-hidden="true">
                trakcode.com/u/
              </span>
              <input
                id="slug"
                className="input"
                placeholder="your-name"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={slug}
                onChange={(e) => setSlug(tidyLink(e.target.value))}
                aria-describedby="slug-help"
              />
            </div>
            <span id="slug-help" className="text-faint" style={{ fontSize: 12 }}>
              The web address of your public profile, so you can share it with employers or friends. Letters, numbers and
              hyphens, 3 to 40 characters. If you change it later, the old link stops working.
              {user?.profile.isPublic && user.profile.slug && (
                <>
                  {' '}
                  Your profile is live at <Link to={`/u/${user.profile.slug}`}>trakcode.com/u/{user.profile.slug}</Link>.
                </>
              )}
            </span>
          </div>
          <div className="field">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => {
                  setIsPublic(e.target.checked);
                  // Suggest a link from their name the first time they go public.
                  if (e.target.checked && !slug) setSlug(finishLink(name));
                }}
              />
              Make my profile public
            </label>
            <span className="text-faint" style={{ fontSize: 12 }}>
              Anyone with the link can see it. Turning this off hides it right away.
            </span>
          </div>
          <div className="field">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPublic && searchIndexable}
                disabled={!isPublic}
                onChange={(e) => setSearchIndexable(e.target.checked)}
              />
              Let search engines like Google show my profile
            </label>
            <span className="text-faint" style={{ fontSize: 12 }}>
              Off by default. If you turn it off later, search results can take a few weeks to drop it.
            </span>
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

      <ConnectedAccounts />

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Account</h3>
        <p>
          {user?.name} · {user?.email}
        </p>
        <Link to="/billing" className="btn">
          Manage billing
        </Link>
        <DeleteAccount />
      </div>
    </div>
  );
}
