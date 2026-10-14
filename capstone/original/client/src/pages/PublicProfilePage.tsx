import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { profileApi } from '../api/endpoints';
import type { PublicProfile } from '../api/types';
import { ApiError } from '../api/client';
import Heatmap from '../components/Heatmap';

export default function PublicProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [notFound, setNotFound] = useState(false);

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
      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="text-dim" style={{ fontSize: 13 }}>
            Current streak
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{profile.streak.currentStreak}🔥</div>
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
        <Heatmap entries={profile.learningHeatmap} />
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Practice activity</h3>
        <Heatmap entries={profile.practiceHeatmap} />
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
