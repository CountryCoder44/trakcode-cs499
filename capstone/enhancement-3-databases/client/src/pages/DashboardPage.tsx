import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { profileApi, roadmapApi } from '../api/endpoints';
import type { ActivitySummary, RoadmapRequest } from '../api/types';
import Heatmap from '../components/Heatmap';

export default function DashboardPage() {
  const { user } = useAuth();
  const [activity, setActivity] = useState<ActivitySummary | null>(null);
  const [roadmapTeaser, setRoadmapTeaser] = useState<RoadmapRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([profileApi.myActivity(), roadmapApi.list()])
      .then(([activityRes, roadmapRes]) => {
        setActivity(activityRes);
        const upcoming = roadmapRes.requests.filter((r) => r.status !== 'live').sort((a, b) => b.votes - a.votes)[0];
        setRoadmapTeaser(upcoming ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1>Welcome back, {user?.name.split(' ')[0]}</h1>

      {loading ? (
        <div className="empty-state">
          <span className="spinner" />
        </div>
      ) : (
        <>
          <div className="grid grid-3" style={{ marginBottom: 24 }}>
            <div className="card">
              <div className="text-dim" style={{ fontSize: 13 }}>
                Current streak
              </div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{activity?.streak.currentStreak ?? 0}🔥</div>
            </div>
            <div className="card">
              <div className="text-dim" style={{ fontSize: 13 }}>
                Longest streak
              </div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{activity?.streak.longestStreak ?? 0}</div>
            </div>
            <div className="card">
              <div className="text-dim" style={{ fontSize: 13 }}>
                Lessons completed
              </div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{activity?.totalLessonsCompleted ?? 0}</div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Activity</h3>
              <Link to="/settings/profile" className="text-dim" style={{ fontSize: 13 }}>
                View public profile settings →
              </Link>
            </div>
            <Heatmap entries={[...(activity?.learningHeatmap ?? []), ...(activity?.practiceHeatmap ?? [])]} />
          </div>

          <div className="grid grid-2" style={{ marginBottom: 24 }}>
            <div className="card">
              <h3>Continue learning</h3>
              <p>Pick up where you left off in the Python course.</p>
              <Link to="/course/python" className="btn btn-primary">
                Continue learning
              </Link>
            </div>
            <div className="card">
              <h3>Practice now</h3>
              <p>Sharpen up with a deep-dive problem or a round of flash cards.</p>
              <Link to="/practice" className="btn btn-primary">
                Practice now
              </Link>
            </div>
          </div>

          {roadmapTeaser && (
            <div className="card flex justify-between items-center">
              <div>
                <div className="badge badge-accent" style={{ marginBottom: 6 }}>
                  Coming soon
                </div>
                <div>
                  <strong>{roadmapTeaser.title}</strong> is on the roadmap — {roadmapTeaser.votes} vote
                  {roadmapTeaser.votes === 1 ? '' : 's'} so far.
                </div>
              </div>
              <Link to="/roadmap" className="btn">
                Vote
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
