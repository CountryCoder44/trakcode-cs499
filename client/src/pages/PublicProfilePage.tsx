import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { profileApi } from '../api/endpoints';
import type { PublicProfile } from '../api/types';
import { ApiError } from '../api/client';
import Heatmap from '../components/Heatmap';
import { Emoji } from '../components/Emoji';

/**
 * Public profiles stay out of search engines unless the learner opted in
 * (Profile settings). While this page is open, a robots meta tag says so.
 */
function useNoIndex(noIndex: boolean) {
  useEffect(() => {
    if (!noIndex) return;
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [noIndex]);
}

export default function PublicProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  useNoIndex(!profile?.searchIndexable);

  useEffect(() => {
    if (!slug) return;
    profileApi
      .getPublic(slug)
      .then(setProfile)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
      });
  }, [slug]);

  if (notFound) {
    return (
      <div className="empty-state">
        <h3>Profile not found</h3>
        <p>This profile doesn't exist or isn't public.</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="empty-state">
        <span className="spinner" />
      </div>
    );
  }

  return (
    <div className="container-narrow">
      <h1>{profile.name}</h1>
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="text-dim" style={{ fontSize: 13 }}>
            Learning streak
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{profile.learningStreak.currentStreak}<Emoji>🔥</Emoji></div>
        </div>
        <div className="card">
          <div className="text-dim" style={{ fontSize: 13 }}>
            Practice streak
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{profile.practiceStreak.currentStreak}<Emoji>🔥</Emoji></div>
        </div>
        <div className="card">
          <div className="text-dim" style={{ fontSize: 13 }}>
            Lessons completed
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{profile.totalLessonsCompleted}</div>
        </div>
        <div className="card">
          <div className="text-dim" style={{ fontSize: 13 }}>
            Submissions
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{profile.totalSubmissions}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Learning activity</h3>
        <Heatmap entries={profile.learningHeatmap} variant="learning" />
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Practice activity</h3>
        <Heatmap entries={profile.practiceHeatmap} variant="practice" />
      </div>

      {profile.portfolioLinks.length > 0 && (
        <div className="card">
          <h3>Portfolio</h3>
          <div className="flex-col gap-2">
            {profile.portfolioLinks.map((link) => (
              <a key={link.githubRepoUrl} href={link.githubRepoUrl} target="_blank" rel="noreferrer">
                {link.githubRepoUrl}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
