import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/PublicLayout';
import { billingApi } from '../../api/endpoints';

// Mirrors the Stripe price. Visitors without an account can't call the billing
// API, so the numbers live here; keep them in step with Stripe.
const PRICE = '$29.99';
const FOUNDER_PRICE = '$23.99';
const TRIAL_DAYS = 7;

const INCLUDED = [
  'Every Learn course, start to finish',
  'Practice Mode problems matched to what you have learned, with 20 new ones each month',
  'Trak, your AI tutor, in every lesson and problem: 100 questions a week, with extra question packs available',
  'Push your solutions to your GitHub portfolio',
];

/** "Join by April 30, 2027", once the launch date (and so the end) is set. */
function useFoundingPeriod() {
  const [period, setPeriod] = useState<{ open: boolean; lastDay: string | null } | null>(null);
  useEffect(() => {
    billingApi
      .founding()
      .then(setPeriod)
      .catch(() => setPeriod(null));
  }, []);
  return period;
}

export default function PricingPage() {
  const founding = useFoundingPeriod();
  const lastDay = founding?.lastDay
    ? new Date(founding.lastDay).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'America/New_York',
      })
    : null;
  return (
    <PublicLayout>
      <div className="container-narrow" style={{ paddingTop: 48 }}>
        <h1 className="text-center">One plan. Everything included.</h1>
        <p className="text-center text-dim" style={{ marginBottom: 32 }}>
          No free tier and no upsells. Try it free for {TRIAL_DAYS} days.
        </p>

        <div className="card billing-offer" style={{ maxWidth: 440, margin: '0 auto' }}>
          <h2 style={{ margin: 0 }}>TrakCode membership</h2>
          <div className="billing-price">
            <span className="billing-price-now">{PRICE}</span>
            <span className="text-dim"> / month</span>
            <span className="text-faint" style={{ fontSize: 13 }}> plus applicable tax</span>
          </div>
          <ul className="billing-included">
            {INCLUDED.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <Link to="/signup" className="btn btn-primary btn-block">
            Start my {TRIAL_DAYS}-day free trial
          </Link>
          <div className="text-faint" style={{ fontSize: 13, marginTop: 8, textAlign: 'center' }}>
            Card required. Billed monthly after the trial. Cancel anytime.
          </div>
        </div>

        <div className="card" style={{ maxWidth: 440, margin: '24px auto 0' }}>
          <strong>Founding members: 20% off for life</strong>
          <p className="text-dim" style={{ marginBottom: 0 }}>
            Sign up in our first months and you pay {FOUNDER_PRICE} / month instead of {PRICE} (plus applicable tax), for
            life. It's tied to
            your email address, so it's still yours if you cancel and come back later.
          </p>
          <p className="text-faint" style={{ fontSize: 13, marginBottom: 0 }}>
            {founding && !founding.open
              ? 'The founding period has ended.'
              : lastDay
                ? `The founding period ends ${lastDay} (Eastern time). Create your account by then.`
                : 'The founding period runs from our public launch to the end of the sixth month after it.'}
          </p>
        </div>

        <div style={{ maxWidth: 560, margin: '40px auto 0' }}>
          <h3>Questions</h3>
          <p>
            <strong>What happens if I cancel during the trial?</strong>
            <br />
            You aren't charged, your access ends right away, and you can't start another free trial.
          </p>
          <p>
            <strong>What happens if I cancel a paid month?</strong>
            <br />
            You keep access until the end of the period you paid for. We don't give partial refunds. See{' '}
            <Link to="/refunds">cancellations & refunds</Link>.
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
