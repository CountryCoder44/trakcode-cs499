import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { profileApi } from '../api/endpoints';
import SkipTrialDialog from './SkipTrialDialog';
import { ApiError } from '../api/client';
import type { UsageSummary } from '../api/types';

// Shared by both Trak chats (TutorChat, AskTrakPanel): the "You can ask Trak N
// more questions this week" line, the notice when an allowance runs out, and
// sending that waits out the speed limit instead of failing. Limits themselves
// live on the server (server/src/services/usageLimits.service.ts).

const TRIAL_UPGRADE = 'Skip the trial for 100 a week.';

/** The learner's allowances, fetched once and refreshed from each Trak reply. */
export function useUsage() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const refresh = useCallback(() => {
    profileApi
      .usage()
      .then((r) => setUsage(r.usage))
      .catch(() => {
        /* the line just stays hidden */
      });
  }, []);
  useEffect(refresh, [refresh]);
  return { usage, setUsage, refresh };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** At this share of the monthly fair-use limit, the allowance lines start mentioning it. */
export const FAIR_USE_WARN_PERCENT = 80;

function FairUseNote({ usage }: { usage: UsageSummary }) {
  const f = usage.fairUse;
  if (!f || f.percentUsed < FAIR_USE_WARN_PERCENT) return null;
  return <> · {f.percentUsed}% of this month's fair-use limit used</>;
}

/** "Fair-use limit: 12% used this month" for Billing. Hidden when there's no limit. */
export function FairUseMeter({ usage }: { usage: UsageSummary | null }) {
  const f = usage?.fairUse;
  if (!f) return null;
  const warn = f.percentUsed >= FAIR_USE_WARN_PERCENT;
  return (
    <div className="fair-use">
      <div className="flex justify-between" style={{ fontSize: 13 }}>
        <span>
          Monthly fair-use limit{' '}
          <a href="/terms#allowances" target="_blank" rel="noopener noreferrer" className="text-faint">
            (what's this?)
          </a>
        </span>
        <span className={warn ? 'fair-use-warn' : 'text-dim'}>{f.percentUsed}% used</span>
      </div>
      <div className={`fair-use-bar${warn ? ' warn' : ''}`} aria-hidden="true">
        <span style={{ width: `${f.percentUsed}%` }} />
      </div>
      <div className="text-faint" style={{ fontSize: 12 }}>
        Covers Trak and new practice questions together. Resets {resetDate(f.resetsAt)}.
      </div>
    </div>
  );
}

/** One quiet line under the chat box. Turns amber when running low. */
export function TrakAllowanceLine({ usage, onUpgraded }: { usage: UsageSummary | null; onUpgraded?: () => void }) {
  const [skipOpen, setSkipOpen] = useState(false);
  const trak = usage?.trak;
  if (!usage || !trak) return null;
  if (trak.remaining <= 0) {
    if (usage.bonusTrak <= 0) return null;
    return (
      <div className={`trak-allowance${usage.bonusTrak <= 10 ? ' low' : ''}`}>
        This week's questions are used up. Using your bought questions: {usage.bonusTrak} left.
        <FairUseNote usage={usage} />
      </div>
    );
  }
  const low =
    (usage.plan === 'trial' ? trak.remaining <= 5 : trak.remaining <= 20) ||
    (usage.fairUse?.percentUsed ?? 0) >= FAIR_USE_WARN_PERCENT;
  return (
    <div className={`trak-allowance${low ? ' low' : ''}`}>
      {usage.plan === 'trial' ? (
        <>
          Free trial: {plural(trak.remaining, 'Trak question')} left today.{' '}
          <button type="button" className="btn-link" onClick={() => setSkipOpen(true)}>
            {TRIAL_UPGRADE}
          </button>
          {skipOpen && <SkipTrialDialog onClose={() => setSkipOpen(false)} onStarted={onUpgraded} />}
          <FairUseNote usage={usage} />
        </>
      ) : (
        <>
          You can ask Trak {plural(trak.remaining, 'more question')} this week · resets Monday
          {usage.bonusTrak > 0 && <> · plus {usage.bonusTrak} bought</>}
          <FairUseNote usage={usage} />
        </>
      )}
    </div>
  );
}

export type TrakLimitCode = 'TRAK_LIMIT' | 'TRAK_MONTHLY_BACKSTOP';

/** If this error is an allowance running out, which one (and the latest usage). */
export function trakLimitFrom(err: unknown): { code: TrakLimitCode; usage: UsageSummary | null } | null {
  if (!(err instanceof ApiError) || err.status !== 429) return null;
  const code = err.details?.code;
  if (code !== 'TRAK_LIMIT' && code !== 'TRAK_MONTHLY_BACKSTOP') return null;
  return {
    code,
    usage: (err.details?.usage as UsageSummary | undefined) ?? null,
  };
}

/** Shown in place of the chat box once an allowance is used up. */
export function TrakLimitNotice({
  code,
  usage,
  onUpgraded,
}: {
  code: TrakLimitCode;
  usage: UsageSummary | null;
  onUpgraded?: () => void;
}) {
  const [skipOpen, setSkipOpen] = useState(false);
  const stillWorks = 'Lessons, grading and Practice Mode still work.';
  if (code === 'TRAK_MONTHLY_BACKSTOP') {
    return (
      <div className="trak-limit">
        You've reached this month's fair-use limit, which covers Trak and new practice questions together. It resets
        on the 1st (Eastern time). {stillWorks} Questions?{' '}
        <a href="mailto:support@trakcode.com">support@trakcode.com</a>
      </div>
    );
  }
  if (usage?.plan === 'trial') {
    return (
      <div className="trak-limit">
        <div>
          That's today's free-trial limit of {usage.trak?.limit ?? 20} Trak questions. Trak is back tomorrow.{' '}
          {stillWorks}
        </div>
        <button type="button" className="btn btn-sm btn-primary" style={{ marginTop: 8 }} onClick={() => setSkipOpen(true)}>
          Start membership now for 100 a week
        </button>
        {skipOpen && <SkipTrialDialog onClose={() => setSkipOpen(false)} onStarted={onUpgraded} />}
      </div>
    );
  }
  return (
    <div className="trak-limit">
      <div>
        You've used this week's {usage?.trak?.limit ?? 100} Trak questions. Trak is back Monday. {stillWorks}
      </div>
      <Link to="/billing#trak-packs" className="btn btn-sm" style={{ marginTop: 8 }}>
        Get more Trak questions
      </Link>
    </div>
  );
}

// ---- sending that waits out the speed limit ----------------------------------
// The server allows a short burst, then one message every few minutes, and
// answers anything faster with 429 TRAK_SLOW_DOWN + retryAfterMs. Rather than
// show an error, the message stays "thinking" and is sent again when allowed.
// It's also saved in this browser until it goes through, so a refresh while
// it waits doesn't lose it (resendPending picks it up on the next visit).

const PENDING_KEY = 'trakcode_pending_trak';
const PENDING_MAX_AGE_MS = 30 * 60 * 1000;

interface Pending {
  key: string;
  text: string;
  at: number;
}

function savePending(p: Pending | null) {
  try {
    if (p) localStorage.setItem(PENDING_KEY, JSON.stringify(p));
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    /* storage blocked: the message just isn't kept across a refresh */
  }
}

/** A message saved for this chat (same `key`) that never got through, if recent. */
export function takePending(key: string): string | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Pending;
    if (p.key !== key || Date.now() - p.at > PENDING_MAX_AGE_MS) return null;
    return p.text;
  } catch {
    return null;
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends one learner message, waiting and retrying while the server says it's
 * too soon. `key` identifies the chat (so a saved message goes back to the
 * right one). Any other error is thrown as usual.
 */
export async function sendQueued<T>(key: string, text: string, send: () => Promise<T>): Promise<T> {
  savePending({ key, text, at: Date.now() });
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        const result = await send();
        savePending(null);
        return result;
      } catch (err) {
        const retryAfterMs =
          err instanceof ApiError && err.details?.code === 'TRAK_SLOW_DOWN' ? Number(err.details.retryAfterMs) : NaN;
        if (!Number.isFinite(retryAfterMs) || attempt >= 10) throw err;
        await wait(Math.min(Math.max(retryAfterMs, 1000), 5 * 60 * 1000) + 250);
      }
    }
  } catch (err) {
    savePending(null);
    throw err;
  }
}

// ---- new practice questions ---------------------------------------------------

function resetDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) : '';
}

/** "New practice questions left this month: N" under Practice Mode's start button. */
export function PracticeAllowanceLine({ usage }: { usage: UsageSummary | null }) {
  const practice = usage?.practice;
  if (!usage || !practice) return null;
  return (
    <div className="text-faint" style={{ fontSize: 12, marginTop: 8, textAlign: 'center' }}>
      {usage.plan === 'trial'
        ? `Free trial: ${plural(practice.remaining, 'new practice question')} left. Questions already in our bank don't count.`
        : `${plural(practice.remaining, 'new practice question')} left this month. Questions already in our bank don't count.`}
      <FairUseNote usage={usage} />
    </div>
  );
}

/** If a practice request hit the new-question allowance, what to tell the learner. */
export function PracticeLimitNotice({ error }: { error: unknown }) {
  if (!(error instanceof ApiError) || error.details?.code !== 'PRACTICE_LIMIT') return null;
  const usage = (error.details?.usage as UsageSummary | undefined) ?? null;
  if (usage?.fairUse && usage.fairUse.percentUsed >= 100) {
    return (
      <div className="error-banner">
        You've reached this month's fair-use limit, which covers Trak and new practice questions together, and there
        isn't a question in our bank for these topics yet. It resets on {resetDate(usage.fairUse.resetsAt)}. Questions
        already in our bank still work.
      </div>
    );
  }
  if (usage?.plan === 'trial') {
    return (
      <div className="error-banner">
        You've used the free trial's {usage.practice?.limit ?? 5} new practice questions, and there isn't one in our
        bank for these topics yet. <Link to="/billing">Start your membership now</Link> for 20 new questions a month.
      </div>
    );
  }
  return (
    <div className="error-banner">
      You've used this month's {usage?.practice?.limit ?? 20} new practice questions, and there isn't one in our bank
      for these topics yet. More unlock on {resetDate(usage?.practice?.resetsAt ?? null)}. Try other topics, or a flash
      card.
    </div>
  );
}
