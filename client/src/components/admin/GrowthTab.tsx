import { useEffect, useRef, useState } from 'react';
import { adminApi } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import type { GrowthPoint, GrowthRange, GrowthReport } from '../../api/types';

// Admin, Growth: paying members against the year-one goal, trial conversion,
// churn, and a chart by week, month, 6 months or year. Built from the log of
// every membership change (server/src/services/growth.service.ts).

const RANGES: { id: GrowthRange; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: '6months', label: '6 months' },
  { id: 'year', label: 'Year' },
];

const pct = (v: number | null) => (v === null ? 'n/a' : `${Math.round(v * 100)}%`);
const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const monthLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short' });
const monthYear = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

export default function GrowthTab({ onError }: { onError: (msg: string | null) => void }) {
  const [range, setRange] = useState<GrowthRange>('month');
  const [report, setReport] = useState<GrowthReport | null>(null);

  useEffect(() => {
    setReport(null);
    adminApi
      .growth(range)
      .then(setReport)
      .catch((err) => onError(err instanceof ApiError ? err.message : 'Failed to load growth'));
  }, [range, onError]);

  if (!report) return <div className="spinner" />;
  const { goal, now, last30 } = report;

  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Year-one goal</h3>
        <div className="growth-goal-line">
          <strong className="growth-big">{now.paying}</strong> of {goal.target} paying members
          <span className="text-faint">
            {' '}
            · by {new Date(goal.deadline).toLocaleDateString()} ({goal.monthsLeft} months left)
          </span>
        </div>
        <div className="growth-progress" aria-label={`${Math.round(goal.progress * 100)}% of goal`}>
          <div style={{ width: `${Math.min(100, goal.progress * 100)}%` }} />
        </div>
        <p style={{ marginBottom: 0 }}>
          {goal.neededPerMonth === null ? (
            'The goal date has passed.'
          ) : (
            <>
              To get there: about <strong>{goal.neededPerMonth} new paying members a month</strong> (
              {goal.trialsNeededPerMonth} trials a month). Last 30 days: <strong>{last30.newPaid}</strong>{' '}
              {goal.onPace ? (
                <span className="badge badge-success">on pace</span>
              ) : (
                <span className="badge badge-warning">behind pace</span>
              )}
            </>
          )}
        </p>
        <p className="text-faint" style={{ fontSize: 13, marginBottom: 0 }}>
          Based on {pct(goal.churnUsed)} of members cancelling a month
          {goal.churnIsAssumed ? ' (assumed until 20+ members)' : ' (measured)'} and {pct(goal.conversionUsed)} of
          trials converting{goal.conversionIsAssumed ? ' (assumed until 20+ finished trials)' : ' (measured)'}.
        </p>
      </div>

      <div className="growth-stats">
        <Stat label="Paying now" value={now.paying} />
        <Stat label="On free trial" value={now.trials} />
        <Stat label="Free access" value={now.freeAccess} />
        <Stat label="New members (30 days)" value={last30.newPaid} />
        <Stat label="Cancelled (30 days)" value={last30.paidCancels} />
        <Stat label="Trial conversion (30 days)" value={pct(last30.conversion)} />
        <Stat label="Monthly churn" value={pct(last30.churn)} />
        <Stat label="Trials refused (card reused)" value={report.allTime.refusedTrials} />
      </div>

      <div className="card">
        <div className="growth-chart-head">
          <h3 style={{ margin: 0 }}>Members over time</h3>
          <div className="tabs growth-ranges" role="tablist">
            {RANGES.map((r) => (
              <button
                key={r.id}
                role="tab"
                aria-selected={range === r.id}
                className={`tab${range === r.id ? ' active' : ''}`}
                onClick={() => setRange(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <GrowthChart points={report.series} range={range} />
        <div className="growth-legend">
          <span className="growth-key paying" /> Paying members
          <span className="growth-key trials" /> On trial
          <span className="growth-key gained" /> New members
          <span className="growth-key lost" /> Cancelled
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card growth-stat">
      <div className="growth-stat-value">{value}</div>
      <div className="text-faint">{label}</div>
    </div>
  );
}

// Lines for paying members and trials; bars below for members gained (up) and lost (down).
function GrowthChart({ points, range }: { points: GrowthPoint[]; range: GrowthRange }) {
  const [hover, setHover] = useState<number | null>(null);
  // Drawn at the chart's real width, so labels stay readable on a phone.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(800);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = W < 500 ? 260 : 300;
  const pad = { l: 40, r: 12, t: 12, b: 28 };
  const lineH = 190; // top area for the lines
  const barTop = pad.t + lineH + 8;
  const barH = H - pad.b - barTop;
  const n = points.length;
  const step = (W - pad.l - pad.r) / n;
  const x = (i: number) => pad.l + step * (i + 0.5);

  const maxCount = Math.max(5, ...points.map((p) => Math.max(p.paying, p.trials)));
  const yTop = (v: number) => pad.t + lineH - (v / maxCount) * lineH;
  const maxBar = Math.max(1, ...points.map((p) => Math.max(p.newPaid, p.paidCancels)));
  const mid = barTop + barH / 2;
  const barScale = (barH / 2 - 2) / maxBar;
  const path = (key: 'paying' | 'trials') => points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${yTop(p[key])}`).join(' ');
  const label = (p: GrowthPoint) => (range === 'year' ? monthLabel(p.start) : shortDate(p.start));
  const every = Math.ceil(n / (W < 500 ? 4 : 7)); // about 4 or 7 x-axis labels
  const ticks = [0, Math.round(maxCount / 2), maxCount];
  const h = hover !== null ? points[hover] : null;

  return (
    <div className="growth-chart" ref={box} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Members over time">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={yTop(t)} y2={yTop(t)} className="growth-grid" />
            <text x={pad.l - 6} y={yTop(t) + 4} textAnchor="end" className="growth-axis">
              {t}
            </text>
          </g>
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={mid} y2={mid} className="growth-grid" />
        {points.map((p, i) => (
          <g key={p.start}>
            {p.newPaid > 0 && (
              <rect
                x={x(i) - step * 0.3}
                width={step * 0.6}
                y={mid - p.newPaid * barScale}
                height={p.newPaid * barScale}
                className="growth-bar gained"
              />
            )}
            {p.paidCancels > 0 && (
              <rect
                x={x(i) - step * 0.3}
                width={step * 0.6}
                y={mid}
                height={p.paidCancels * barScale}
                className="growth-bar lost"
              />
            )}
            {i % every === 0 && (
              <text x={x(i)} y={H - 8} textAnchor="middle" className="growth-axis">
                {label(p)}
              </text>
            )}
            <rect
              x={x(i) - step / 2}
              width={step}
              y={pad.t}
              height={H - pad.t - pad.b}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onClick={() => setHover(i)}
            />
          </g>
        ))}
        <path d={path('trials')} className="growth-line trials" />
        <path d={path('paying')} className="growth-line paying" />
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} className="growth-cursor" />}
      </svg>
      {h && (
        <div className="growth-tip" style={{ left: `${Math.min(85, Math.max(15, (x(hover!) / W) * 100))}%` }}>
          <strong>
            {range === 'year'
              ? monthYear(h.start)
              : range === '6months'
                ? `Week of ${shortDate(h.start)}`
                : shortDate(h.start)}
          </strong>
          <div>Paying: {h.paying}</div>
          <div>On trial: {h.trials}</div>
          <div>New members: {h.newPaid}</div>
          <div>Cancelled: {h.paidCancels}</div>
          <div>Trials started: {h.trialStarts}</div>
          <div>Converted: {h.conversions}</div>
        </div>
      )}
    </div>
  );
}
