import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { profileApi, roadmapApi } from '../api/endpoints';
import type { ActivitySummary, RoadmapRequest } from '../api/types';
import Heatmap from '../components/Heatmap';
import RecentActivityList from '../components/RecentActivityList';
import ConnectAccountsBanner from '../components/ConnectAccountsBanner';
import { Emoji } from '../components/Emoji';

export default function DashboardPage() {
  const { user } = useAuth();
  // Arriving straight from a completed Stripe checkout (see BillingPage).
  const [searchParams, setSearchParams] = useSearchParams();
  const welcome = searchParams.get('welcome');
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
      {welcome && (
        <div className="card welcome-banner">
          <div>
            <strong>You're in! <Emoji>🎉</Emoji></strong>
            <div className="text-dim" style={{ fontSize: 14 }}>
              {welcome === 'trial'
                ? 'Your 7-day free trial has started. Have fun, and say hi to Trak!'
                : 'Your TrakCode membership is active. Welcome!'}
            </div>
          </div>
          <button className="btn btn-sm" onClick={() => setSearchParams({}, { replace: true })}>
            Dismiss
          </button>
        </div>
      )}
      {user && !user.hasAccess ? (
        <div className="card trial-cta">
          <div>
            <strong>Start your free trial to unlock TrakCode</strong>
            <div className="text-dim" style={{ fontSize: 14 }}>
              Lessons, Practice Mode and Trak are all waiting for you. Try everything free for 7 days.
            </div>
          </div>
          <Link to="/billing" className="btn btn-primary">
            Start free trial
          </Link>
        </div>
      ) : (
        <ConnectAccountsBanner />
      )}
      <h1>Welcome back, {user?.name.split(' ')[0]}</h1>

      {loading ? (
        <div className="empty-state">
          <span className="spinner" />
        </div>
      ) : (
        <>
          <div className="grid grid-4" style={{ marginBottom: 24 }}>
            <div className="card">
              <div className="text-dim" style={{ fontSize: 13 }}>
                Learning streak
              </div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{activity?.learningStreak.currentStreak ?? 0}<Emoji>🔥</Emoji></div>
              <div className="text-dim" style={{ fontSize: 12 }}>
                Best: {activity?.learningStreak.longestStreak ?? 0}
              </div>
            </div>
            <div className="card">
              <div className="text-dim" style={{ fontSize: 13 }}>
                Practice streak
              </div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{activity?.practiceStreak.currentStreak ?? 0}<Emoji>🔥</Emoji></div>
              <div className="text-dim" style={{ fontSize: 12 }}>
                Best: {activity?.practiceStreak.longestStreak ?? 0}
              </div>
            </div>
            <div className="card">
              <div className="text-dim" style={{ fontSize: 13 }}>
                Lessons completed
              </div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{activity?.totalLessonsCompleted ?? 0}</div>
            </div>
            <div className="card">
              <div className="text-dim" style={{ fontSize: 13 }}>
                Submissions made
              </div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{activity?.totalSubmissions ?? 0}</div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0 }}>Learning activity</h3>
              <Link to="/settings/profile" className="text-dim" style={{ fontSize: 13 }}>
                View public profile settings →
              </Link>
            </div>
            <div className="activity-row">
              <RecentActivityList
                entries={activity?.learningHeatmap ?? []}
                emptyLabel="No learning activity yet. Start a lesson to see it here."
                itemLabel={(n) => (n === 1 ? 'lesson completed' : 'lessons completed')}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Heatmap entries={activity?.learningHeatmap ?? []} variant="learning" />
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Practice activity</h3>
            <div className="activity-row">
              <RecentActivityList
                entries={activity?.practiceHeatmap ?? []}
                emptyLabel="No practice activity yet. Try a problem to see it here."
                itemLabel={(n) => (n === 1 ? 'submission made' : 'submissions made')}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Heatmap entries={activity?.practiceHeatmap ?? []} variant="practice" />
              </div>
            </div>
          </div>

          {/* Placeholder: awards are designed later. */}
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 4 }}>Awards</h3>
            <p className="text-dim" style={{ marginTop: 0 }}>
              Earn awards for streaks, finished topics and passed practice problems. Coming soon.
            </p>
            <div className="awards-row" aria-hidden="true">
              {['🔥', '📚', '🏆', '⭐'].map((icon) => (
                <div key={icon} className="award-slot">
                  <Emoji>{icon}</Emoji>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-2" style={{ marginBottom: 24 }}>
            <div className="card">
              <h3>Continue learning</h3>
              <p>Pick up where you left off in Python: Beginner.</p>
              <Link to="/course/python_beginner" className="btn btn-primary">
                Continue learning
              </Link>
            </div>
            <div className="card">
              <h3>Practice now</h3>
              <p>Work on a hands-on assignment: practice the basics, or stretch into new concepts.</p>
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
                  <strong>{roadmapTeaser.title}</strong> is on the roadmap with {roadmapTeaser.votes} vote
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
