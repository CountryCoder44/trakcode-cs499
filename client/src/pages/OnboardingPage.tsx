import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { billingApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import TrakAvatar from '../components/TrakAvatar';

// First stop after signing up: a short introduction to Trak, the tutor who
// sits beside the editor throughout the app. Trak is the focus of the page;
// there's nothing to fill in, just one button onward.
const INTRO_POINTS = [
  {
    title: 'I can see your code',
    body: "I sit right next to your editor, so you can ask me about what you're writing anytime. No copy-pasting needed.",
  },
  {
    title: "I'll nudge, not just tell",
    body: "I'll help you find the answer yourself, because that's what makes it stick. If you're really stuck, I'll offer to walk you through it.",
  },
  {
    title: 'I remember what matters',
    body: "Tell me what you're working toward and I'll keep it in mind, so we can pick up right where we left off.",
  },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Only promise a free trial if this email hasn't used one already.
  const [trialAvailable, setTrialAvailable] = useState(true);
  useEffect(() => {
    if (user && !user.hasAccess) {
      billingApi
        .status()
        .then((s) => setTrialAvailable(s.trialAvailable))
        .catch(() => {});
    }
  }, [user]);
  const firstName = user?.name.trim().split(/\s+/)[0];

  return (
    <div className="container-narrow onboarding">
      <TrakAvatar state="talking" size="hero" />

      <h1 className="onboarding-title">Hey{firstName ? ` ${firstName}` : ''}! I'm Trak.</h1>
      <p className="onboarding-lede">
        I'm your coding tutor here at TrakCode. I'll be with you in every lesson and practice problem, ready whenever
        you want a hand.
      </p>

      <div className="onboarding-points">
        {INTRO_POINTS.map((point) => (
          <div key={point.title} className="card onboarding-point">
            <h3>{point.title}</h3>
            <p>{point.body}</p>
          </div>
        ))}
      </div>

      {/* New learners start their trial (Billing) before reaching the dashboard;
          anyone who already has access goes straight there. */}
      {user?.hasAccess ? (
        <button className="btn btn-primary btn-block onboarding-cta" onClick={() => navigate('/dashboard')}>
          Take me to my dashboard
        </button>
      ) : (
        <button className="btn btn-primary btn-block onboarding-cta" onClick={() => navigate('/billing')}>
          {trialAvailable ? 'Start my 7-day free trial' : 'Continue to membership'}
        </button>
      )}
    </div>
  );
}
