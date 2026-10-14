import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { seqApi } from '../api/endpoints';
import type { SeqTopicDetail, SeqPublicItem, SeqSubmitResult, SeqOption, SeqTopicSummary } from '../api/types';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Markdown, { renderInline } from '../components/Markdown';
import CodeEditor from '../components/CodeEditor';
import TrakAvatar, { type TrakAvatarState } from '../components/TrakAvatar';
import AskTrakPanel from '../components/AskTrakPanel';
import { courseMeta, type EditorLanguage } from '../courses';
import { withEmoji, Emoji } from '../components/Emoji';

interface FlatEntry {
  lessonId: string | null;
  lessonNumber: string | null;
  lessonTitle: string | null;
  item: SeqPublicItem;
}

// Fisher–Yates. Multiple-choice options are presented in a fresh random order
// every time a question is opened, and re-scrambled after a wrong answer before
// the learner can try again — so the answer's position never carries a hint.
// Grading is by the option's `letter`, which travels with it, so this is
// display-only. The server also shuffles on each fetch; this covers navigating
// between already-loaded items and the no-refetch retry path.
function shuffleOptions(options: SeqOption[]): SeqOption[] {
  const out = [...options];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Code exercises open with at least this many lines in the editor, so a
// one-line comment starter isn't a lonely mark at the top of a big empty box.
// Blank lines are padded below; trailing whitespace is trimmed at grade time.
const MIN_STARTER_LINES = 3;
function padStarter(src: string): string {
  const lines = src.replace(/\s+$/, '').split('\n');
  while (lines.length < MIN_STARTER_LINES) lines.push('');
  return lines.join('\n');
}

function flatten(detail: SeqTopicDetail): FlatEntry[] {
  const out: FlatEntry[] = [];
  for (const l of detail.lessons) {
    for (const item of l.items) {
      out.push({ lessonId: l.lessonId, lessonNumber: l.number, lessonTitle: l.title, item });
    }
  }
  if (detail.checkpoint) {
    out.push({ lessonId: null, lessonNumber: null, lessonTitle: null, item: detail.checkpoint });
  }
  return out;
}

export default function SeqTopicPage() {
  const { course = 'python', topicId } = useParams<{ course: string; topicId: string }>();
  const meta = courseMeta(course);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [detail, setDetail] = useState<SeqTopicDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  // Phones: the item list is collapsed above the lesson until opened.
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false); // admin-only; auto-on for admins (see effect below)
  const previewTouched = useRef(false); // set once the admin manually toggles it, so we stop forcing it on
  const [skipping, setSkipping] = useState(false);

  const [choice, setChoice] = useState('');
  const [optionOrder, setOptionOrder] = useState<SeqOption[]>([]);
  const [code, setCode] = useState('');
  const [text, setText] = useState('');
  const [result, setResult] = useState<SeqSubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [showAskTrak, setShowAskTrak] = useState(false);

  // The topic after this one, for the "Start Topic N" button once this topic's
  // last item (checkpoint, or last lesson item when there's no checkpoint)
  // passes. Fetched alongside the topic itself — cheap, and by the time a
  // learner can possibly finish the topic this has long since resolved.
  const [nextTopic, setNextTopic] = useState<SeqTopicSummary | null>(null);
  const [nextTopicLoaded, setNextTopicLoaded] = useState(false);

  const loadedFor = useRef<string | null>(null);

  async function load(preserveActive = false) {
    if (!topicId) return;
    try {
      const d = await seqApi.getTopic(topicId, { previewAsLearner: true });
      setDetail(d);
      if (!preserveActive) {
        setActiveItemId(
          d.progress.currentItemId ?? d.checkpoint?.itemId ?? d.lessons[0]?.items[0]?.itemId ?? null
        );
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load topic');
    }
  }

  useEffect(() => {
    if (!topicId || loadedFor.current === topicId) return;
    loadedFor.current = topicId;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  // Admins get preview mode on by default (it's the safe way to test items —
  // grades fully, saves nothing). They can still switch it off; once they do,
  // we leave it alone for the rest of this mount.
  useEffect(() => {
    if (isAdmin && !previewTouched.current) setPreviewMode(true);
  }, [isAdmin]);

  const topicNumber = detail?.topic.topicNumber;
  useEffect(() => {
    if (topicNumber == null) return;
    let alive = true;
    setNextTopicLoaded(false);
    seqApi
      .listTopics(course)
      .then((r) => {
        if (!alive) return;
        setNextTopic(r.topics.find((t) => t.topicNumber === topicNumber + 1) ?? null);
        setNextTopicLoaded(true);
      })
      .catch(() => alive && setNextTopicLoaded(true));
    return () => {
      alive = false;
    };
  }, [course, topicNumber]);

  // `detail` itself already reflects the "preview as launched" toggle — the
  // server strips hidden practice-group items out of the response entirely
  // when `previewAsLearner` was sent (see `load()`), so `flat` never needs a
  // second, client-side filtering pass on top of it.
  const flat = useMemo(() => (detail ? flatten(detail) : []), [detail]);
  const passedSet = useMemo(() => new Set(detail?.progress.completedItemIds ?? []), [detail]);
  const currentItemId = detail?.progress.currentItemId ?? null;
  // Usually just `currentItemId` — but once a lesson's practice-group (its
  // pick-any-one-of-N bonus exercises) opens, every item in that group is
  // open at once, not just one.
  const openItemIds = useMemo(() => new Set(detail?.progress.openItemIds ?? []), [detail]);

  const active = flat.find((f) => f.item.itemId === activeItemId) ?? null;

  // reset per-item working state whenever the active item changes
  useEffect(() => {
    setChoice('');
    setText('');
    setResult(null);
    setCode(padStarter(active?.item.starterCode ?? ''));
    setOptionOrder(shuffleOptions(active?.item.options ?? []));
    // Deliberately NOT resetting showAskTrak here — Ask Trak is one
    // continuous thread that follows the learner from item to item (see
    // AskTrakPanel.tsx), so if it's open, it stays open across navigation
    // instead of being force-closed every time the active item changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItemId]);

  // `displayOptions` matches exactly what's passed to ConceptView. Kept above
  // the early returns below (Rules of Hooks), using `active?.item` since
  // `active` isn't guaranteed non-null yet at this point.
  const activeItem = active?.item;
  const displayOptions = useMemo(
    () => (optionOrder.length ? optionOrder : (activeItem?.options ?? [])),
    [optionOrder, activeItem?.options]
  );
  const briefText = activeItem?.do ?? activeItem?.brief;
  if (error) return <div className="error-banner">{error}</div>;
  if (detail && flat.length === 0) {
    return (
      <div className="flex-col gap-3" style={{ maxWidth: 560, margin: '48px auto', textAlign: 'center' }}>
        <Link to={`/course/${course}`} className="text-dim" style={{ fontSize: 13 }}>
          ← All {meta.label} topics
        </Link>
        <h2 style={{ margin: 0 }}>
          Topic {detail.topic.topicNumber}: {detail.topic.title}
        </h2>
        <p className="text-dim">
          This topic is being rebuilt from scratch and has no lessons yet. Check back soon.
        </p>
      </div>
    );
  }
  if (!detail || !active) {
    return (
      <div className="empty-state">
        <span className="spinner" />
      </div>
    );
  }

  const item = active.item;
  const isPassed = passedSet.has(item.itemId);
  const isLocked = !isPassed && !previewMode && !openItemIds.has(item.itemId);
  const activeLesson = detail.lessons.find((l) => l.lessonId === active.lessonId);
  const groupSatisfied = !!activeLesson?.items.some((i) => i.practiceGroup && passedSet.has(i.itemId));

  // Driven by this render's fresh grading result, not persisted completion
  // (`isPassed`/passedSet) — that would stay stuck green forever on an
  // already-completed item you navigate back to. `result` clears whenever
  // the active item changes (see the reset effect above), so this resets
  // completely on the way out and never lingers into a later visit.
  const avatarState: TrakAvatarState = result?.passed === true ? 'passed' : result?.passed === false ? 'wrong' : 'resting';

  const showRead = (item.type === 'concept' || item.type === 'reading') && !!item.read;
  const showBrief = item.type !== 'concept' && !!briefText;

  async function submit(kind: 'choice' | 'code' | 'text' | 'ack', value: string) {
    if (!topicId) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await seqApi.submit(topicId, item.itemId, {
        kind,
        value,
        preview: previewMode || undefined,
        previewAsLearner: true,
      });
      setResult(r);
      if (r.passed && !r.preview) {
        await load(true); // refresh progress, keep the learner where they are
      } else if (kind === 'choice' && !r.passed) {
        // wrong answer — re-scramble the options and drop the selection so the
        // learner has to re-read before trying again.
        setOptionOrder((prev) => shuffleOptions(prev));
        setChoice('');
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    // In preview the server can't advance progress, so step through the flat list.
    if (previewMode) {
      const idx = flat.findIndex((f) => f.item.itemId === activeItemId);
      if (idx >= 0 && idx + 1 < flat.length) setActiveItemId(flat[idx + 1].item.itemId);
      return;
    }
    const next = result?.nextItemId ?? null;
    if (next) setActiveItemId(next);
  }

  // After a passing submit, each view swaps its action button ("Run & check" /
  // "Submit answer" / "Check") for a "Next →". Resets when the item changes
  // (the per-item effect clears `result`). When that pass finishes the whole
  // topic (the checkpoint, or the last lesson item on a checkpoint-less topic),
  // the button becomes "Start Topic N" instead and jumps straight there.
  const curIdx = flat.findIndex((f) => f.item.itemId === activeItemId);
  const hasFollowingItem = curIdx >= 0 && curIdx + 1 < flat.length;
  const topicJustCompleted = result?.passed === true && result?.topicComplete === true;
  const showNextButton =
    result?.passed === true && !topicJustCompleted && (previewMode ? hasFollowingItem : !!result?.nextItemId);
  const nextTopicLabel = !nextTopicLoaded
    ? 'Loading next topic…'
    : nextTopic
      ? `Start Topic ${nextTopic.topicNumber} →`
      : 'Course complete! Back to overview';
  function goToNextTopic() {
    navigate(nextTopic ? `/course/${course}/${nextTopic.topicId}` : `/course/${course}`);
  }

  async function skipIntro() {
    if (!topicId) return;
    setSkipping(true);
    try {
      await seqApi.skipTopic(topicId);
      navigate(`/course/${course}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not skip this topic');
      setSkipping(false);
    }
  }

  async function resetTopic() {
    if (!topicId) return;
    const name = detail ? `Topic ${detail.topic.topicNumber}: ${detail.topic.title}` : 'this topic';
    if (!window.confirm(`Reset ${name}? This permanently clears your progress on every item in it.`)) return;
    setResetting(true);
    try {
      await seqApi.resetTopic(topicId);
      loadedFor.current = null;
      await load();
    } finally {
      setResetting(false);
    }
  }

  const total = flat.length;
  const done = flat.filter((f) => passedSet.has(f.item.itemId)).length;

  return (
    <div className="seq-layout">
      {/* ---- rail (independent scroll) ---- */}
      <aside className="seq-rail flex-col gap-2">
        <Link to={`/course/${course}`} className="text-dim" style={{ fontSize: 13 }}>
          ← All {meta.label} topics
        </Link>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>
            Topic {detail.topic.topicNumber}: {detail.topic.title}
          </div>
          <div className="text-faint" style={{ fontSize: 12, margin: '4px 0 8px' }}>
            {done}/{total} items
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-elevated-2)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round((done / total) * 100)}%`, background: 'var(--accent)' }} />
          </div>
          <button className="btn btn-sm" style={{ marginTop: 10, width: '100%' }} onClick={resetTopic} disabled={resetting}>
            {resetting ? <span className="spinner" /> : 'Reset topic'}
          </button>
        </div>

        <button
          type="button"
          className="btn btn-sm seq-outline-toggle"
          aria-expanded={outlineOpen}
          onClick={() => setOutlineOpen((o) => !o)}
        >
          {outlineOpen ? 'Hide all items' : `Show all items (${done}/${total})`}
        </button>
        <nav
          className={`flex-col seq-outline${outlineOpen ? ' seq-outline-open' : ''}`}
          style={{ gap: 2, fontSize: 13 }}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('button')) setOutlineOpen(false);
          }}
        >
          {detail.lessons.map((l) => (
            <div key={l.lessonId} style={{ marginTop: 6 }}>
              <div className="text-faint" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, padding: '2px 6px' }}>
                {l.number} · {l.title}
              </div>
              {(() => {
                // Once any one item in this lesson's practice group has
                // passed, the group is satisfied — the rest are pure bonus
                // rather than "pick one of these to continue".
                const groupSatisfied = l.items.some((i) => i.practiceGroup && passedSet.has(i.itemId));
                return l.items.map((it) => (
                  <RailRow
                    key={it.itemId}
                    label={it.title}
                    passed={passedSet.has(it.itemId)}
                    current={currentItemId === it.itemId}
                    active={activeItemId === it.itemId}
                    locked={!previewMode && !passedSet.has(it.itemId) && !openItemIds.has(it.itemId)}
                    kind={it.type}
                    badge={it.practiceGroup ? (groupSatisfied ? 'Bonus' : 'Pick any one') : undefined}
                    onClick={() => setActiveItemId(it.itemId)}
                  />
                ));
              })()}
            </div>
          ))}
          {detail.checkpoint && (
            <div style={{ marginTop: 6 }}>
              <div className="text-faint" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, padding: '2px 6px' }}>
                Checkpoint
              </div>
              <RailRow
                label={detail.checkpoint.title}
                passed={passedSet.has(detail.checkpoint.itemId)}
                current={currentItemId === detail.checkpoint.itemId}
                active={activeItemId === detail.checkpoint.itemId}
                locked={
                  !previewMode &&
                  !passedSet.has(detail.checkpoint.itemId) &&
                  !openItemIds.has(detail.checkpoint.itemId)
                }
                kind="checkpoint"
                onClick={() => setActiveItemId(detail.checkpoint!.itemId)}
              />
            </div>
          )}
        </nav>
      </aside>

      {/* ---- main (independent scroll) ---- */}
      <main className="seq-main flex-col gap-3">
        {isAdmin && (
          <div
            className="card flex-col gap-2"
            style={{ borderColor: 'var(--warning)', background: 'var(--warning-dim)', padding: '10px 14px' }}
          >
            <div className="flex items-center justify-between gap-3">
              <div style={{ fontSize: 13 }}>
                <strong>Admin tools</strong> · Preview mode lets you open any item and test it.{' '}
                <em>Nothing is saved to your progress</em>.
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2" style={{ fontSize: 13, whiteSpace: 'nowrap', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={previewMode}
                    onChange={(e) => {
                      previewTouched.current = true;
                      setPreviewMode(e.target.checked);
                    }}
                  />
                  Preview mode
                </label>
              </div>
            </div>
          </div>
        )}

        {detail.topic.liveCodingException && !detail.progress.topicComplete && (
          <div className="card flex items-center justify-between gap-3" style={{ padding: '10px 14px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13 }}>
              This is the introductory topic. Already comfortable with the basics? Skip it and jump to hands-on practice.
            </div>
            <button className="btn btn-sm" style={{ whiteSpace: 'nowrap' }} onClick={skipIntro} disabled={skipping}>
              {skipping ? <span className="spinner" /> : 'Skip the introduction'}
            </button>
          </div>
        )}

        {detail.progress.topicComplete && (
          <div
            className="card flex items-center justify-between gap-3"
            style={{ borderColor: 'var(--success)', background: 'var(--success-dim)', flexWrap: 'wrap' }}
          >
            <div>
              {detail.progress.skipped
                ? '↪ This topic was skipped. Open any item to work through it anyway.'
                : withEmoji(`🎉 Topic complete! Every item${detail.checkpoint ? ' and the checkpoint' : ''} passed. You can keep reviewing any item.`)}
            </div>
            {!detail.progress.skipped && (
              <Link to="/practice" className="btn btn-sm" style={{ whiteSpace: 'nowrap' }}>
                Try Practice Mode
              </Link>
            )}
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}

        <div className="card flex-col gap-3">
          <div className="flex items-start gap-3 seq-item-head">
            <div className="flex-col gap-2 seq-item-avatar" style={{ flexShrink: 0 }}>
              <TrakAvatar state={avatarState} />
              {!isLocked && (
                <button className="btn btn-sm" style={{ width: 112 }} onClick={() => setShowAskTrak(true)}>
                  Ask Trak
                </button>
              )}
            </div>
            <div className="flex-col gap-2" style={{ flex: 1, minWidth: 0 }}>
              <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                <span className="badge badge-neutral">{item.itemId}</span>
                <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                  {item.type}
                </span>
                {isPassed && <span className="badge badge-success">Passed</span>}
                {isLocked && <span className="badge badge-warning">Locked</span>}
                {item.practiceGroup && (
                  <span className="badge badge-accent">
                    {groupSatisfied ? 'Bonus practice' : 'Complete any one of these to continue'}
                  </span>
                )}
                {previewMode && <span className="badge badge-warning">Admin preview (not saved)</span>}
              </div>

              <h2 style={{ margin: 0 }}>{item.title}</h2>

              {!isLocked && (
                <>
                  {showRead && <Markdown content={item.read!} />}
                  {showBrief && <Markdown content={briefText!} />}
                </>
              )}
            </div>
          </div>

          {isLocked ? (
            <p className="text-dim">Finish the earlier items in order to unlock this one.</p>
          ) : item.type === 'reading' ? (
            <ReadingView
              disabled={submitting}
              onSubmit={() => submit('ack', '')}
              showNext={showNextButton}
              onNext={goNext}
              topicJustCompleted={topicJustCompleted}
              nextTopicLabel={nextTopicLabel}
              onGoNextTopic={goToNextTopic}
            />
          ) : item.type === 'concept' ? (
            <ConceptView
              item={item}
              options={displayOptions}
              choice={choice}
              setChoice={setChoice}
              disabled={submitting}
              onSubmit={() => submit('choice', choice)}
              showNext={showNextButton}
              onNext={goNext}
              topicJustCompleted={topicJustCompleted}
              nextTopicLabel={nextTopicLabel}
              onGoNextTopic={goToNextTopic}
              language={meta.editorLanguage}
            />
          ) : item.evaluator === 'local-verify' ? (
            <LocalVerifyView
              item={item}
              text={text}
              setText={setText}
              disabled={submitting}
              onSubmit={() => submit('text', text)}
              showNext={showNextButton}
              onNext={goNext}
              topicJustCompleted={topicJustCompleted}
              nextTopicLabel={nextTopicLabel}
              onGoNextTopic={goToNextTopic}
            />
          ) : (
            <CodeView
              item={item}
              code={code}
              setCode={setCode}
              disabled={submitting}
              language={meta.editorLanguage}
              onSubmit={() => submit('code', code)}
              showNext={showNextButton}
              onNext={goNext}
              topicJustCompleted={topicJustCompleted}
              nextTopicLabel={nextTopicLabel}
              onGoNextTopic={goToNextTopic}
            />
          )}

          {result && <ResultView result={result} />}
        </div>
      </main>

      {showAskTrak && topicId && (
        <AskTrakPanel
          contextId={`${topicId}::${item.itemId}`}
          code={item.type !== 'concept' && item.evaluator !== 'local-verify' ? code : undefined}
          onClose={() => setShowAskTrak(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function RailRow({
  label,
  passed,
  current,
  active,
  locked,
  kind,
  badge,
  onClick,
}: {
  label: string;
  passed: boolean;
  current: boolean;
  active: boolean;
  locked: boolean;
  kind: string;
  badge?: string;
  onClick: () => void;
}) {
  const icon = passed ? '✓' : current ? '▸' : locked ? '·' : '○';
  return (
    <button
      onClick={onClick}
      disabled={locked}
      title={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        textAlign: 'left',
        padding: '5px 6px',
        borderRadius: 6,
        border: 'none',
        cursor: locked ? 'default' : 'pointer',
        background: active ? 'var(--bg-elevated-2)' : 'transparent',
        color: locked ? 'var(--text-faint)' : 'var(--text)',
        fontWeight: current ? 600 : 400,
      }}
    >
      <span
        style={{
          width: 16,
          textAlign: 'center',
          color: passed ? 'var(--success)' : current ? 'var(--accent)' : 'var(--text-faint)',
        }}
      >
        {icon}
      </span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
        {kind === 'practical' && '⌨ '}
        {kind === 'reading' && <><Emoji>📖</Emoji> </>}
        {label}
      </span>
      {badge && (
        <span
          className="text-faint"
          style={{
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 999,
            border: '1px solid var(--border)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// The one action button under a lesson item, shared by all three item views.
// Three mutually-exclusive states, in priority order: this pass just finished
// the whole topic ("Start Topic N"); this pass finished the item but the
// topic continues ("Next →"); nothing passed yet (the view's own submit
// label, e.g. "Run & check").
interface ActionButtonProps {
  topicJustCompleted: boolean;
  nextTopicLabel: string;
  onGoNextTopic: () => void;
  showNext: boolean;
  onNext: () => void;
  disabled: boolean;
  onSubmit: () => void;
  submitLabel: ReactNode;
}
function ActionButton({
  topicJustCompleted,
  nextTopicLabel,
  onGoNextTopic,
  showNext,
  onNext,
  disabled,
  onSubmit,
  submitLabel,
}: ActionButtonProps) {
  if (topicJustCompleted) {
    return (
      <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
        <button className="btn btn-primary seq-action-btn" onClick={onGoNextTopic} style={{ minWidth: 220 }}>
          {nextTopicLabel}
        </button>
        <Link to="/practice" className="btn seq-action-btn">
          Try Practice Mode
        </Link>
      </div>
    );
  }
  if (showNext) {
    return (
      <button className="btn btn-primary seq-action-btn" onClick={onNext}>
        Next →
      </button>
    );
  }
  return (
    <button className="btn btn-primary seq-action-btn" disabled={disabled} onClick={onSubmit}>
      {submitLabel}
    </button>
  );
}

// A pure framing paragraph, no quiz or code — the read text itself is
// rendered above (by the shared read/brief block),
// this is just the "mark as read and move on" action.
function ReadingView({
  disabled,
  onSubmit,
  showNext,
  onNext,
  topicJustCompleted,
  nextTopicLabel,
  onGoNextTopic,
}: {
  disabled: boolean;
  onSubmit: () => void;
  showNext: boolean;
  onNext: () => void;
  topicJustCompleted: boolean;
  nextTopicLabel: string;
  onGoNextTopic: () => void;
}) {
  return (
    <ActionButton
      topicJustCompleted={topicJustCompleted}
      nextTopicLabel={nextTopicLabel}
      onGoNextTopic={onGoNextTopic}
      showNext={showNext}
      onNext={onNext}
      disabled={disabled}
      onSubmit={onSubmit}
      submitLabel="Continue"
    />
  );
}

function ConceptView({
  item,
  options,
  choice,
  setChoice,
  disabled,
  onSubmit,
  showNext,
  onNext,
  topicJustCompleted,
  nextTopicLabel,
  onGoNextTopic,
  language,
}: {
  item: SeqPublicItem;
  options: SeqOption[];
  choice: string;
  setChoice: (v: string) => void;
  disabled: boolean;
  onSubmit: () => void;
  showNext: boolean;
  onNext: () => void;
  topicJustCompleted: boolean;
  nextTopicLabel: string;
  onGoNextTopic: () => void;
  language: EditorLanguage;
}) {

  return (
    <>
      {item.code && (
        <div style={{ height: 120, overflow: 'hidden' }}>
          <CodeEditor value={item.code} onChange={() => {}} language={language} readOnly />
        </div>
      )}

      <div className="seq-question flex-col gap-2">
        {item.check && (
          <p style={{ fontWeight: 600, margin: 0, padding: '2px 6px' }}>
            {renderInline(item.check)}
          </p>
        )}
        {item.checkCode && (
          <pre className="code-editor" style={{ minHeight: 'auto', whiteSpace: 'pre', padding: 12, overflowX: 'auto' }}>
            {item.checkCode}
          </pre>
        )}
        <div className="flex-col gap-2">
        {options.map((o) => (
          <label
            key={o.letter}
            style={{
              display: 'flex',
              gap: 10,
              padding: '10px 12px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              cursor: disabled ? 'default' : 'pointer',
              background: choice === o.letter ? 'var(--bg-elevated-2)' : 'transparent',
            }}
          >
            <input
              type="radio"
              name={item.itemId}
              value={o.letter}
              checked={choice === o.letter}
              disabled={disabled}
              onChange={() => setChoice(o.letter)}
            />
            {/* No "A." / "B." prefix — the radio button already marks the choice.
                o.letter stays the internal value/answer key. Inline markdown so
                `code` spans render (and show as code, not quoted text). */}
            <span>{renderInline(o.text)}</span>
          </label>
        ))}
        </div>
      </div>
      <ActionButton
        topicJustCompleted={topicJustCompleted}
        nextTopicLabel={nextTopicLabel}
        onGoNextTopic={onGoNextTopic}
        showNext={showNext}
        onNext={onNext}
        disabled={disabled || !choice}
        onSubmit={onSubmit}
        submitLabel="Submit answer"
      />
    </>
  );
}

function CodeView({
  item,
  code,
  setCode,
  disabled,
  language,
  onSubmit,
  showNext,
  onNext,
  topicJustCompleted,
  nextTopicLabel,
  onGoNextTopic,
}: {
  item: SeqPublicItem;
  code: string;
  setCode: (v: string) => void;
  disabled: boolean;
  language: EditorLanguage;
  onSubmit: () => void;
  showNext: boolean;
  onNext: () => void;
  topicJustCompleted: boolean;
  nextTopicLabel: string;
  onGoNextTopic: () => void;
}) {

  return (
    <>
      {item.requirements && item.requirements.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {item.requirements.map((r, i) => (
            <li key={i} style={{ whiteSpace: 'pre-wrap', margin: '0 0 4px' }}>
              <Markdown content={r} />
            </li>
          ))}
        </ul>
      )}
      {item.practiceGroup && item.expectExactOutput && (
        <div className="flex-col gap-1">
          <div className="text-faint" style={{ fontSize: 12 }}>
            Target output. Repair the code until it prints exactly this:
          </div>
          <pre
            style={{
              margin: 0,
              padding: '8px 12px',
              borderRadius: 'var(--radius)',
              background: 'var(--editor-bg)',
              color: 'var(--editor-text)',
              fontSize: 13,
              overflowX: 'auto',
            }}
          >
            {item.expectExactOutput}
          </pre>
        </div>
      )}
      {item.exampleTest && (
        <div className="flex-col gap-2">
          <div className="text-faint" style={{ fontSize: 12 }}>
            Example: for this input, your program should print exactly this:
          </div>
          <div className="flex-col gap-1">
            <div className="text-faint" style={{ fontSize: 11 }}>
              Input
            </div>
            <pre
              style={{
                margin: 0,
                padding: '8px 12px',
                borderRadius: 'var(--radius)',
                background: 'var(--editor-bg)',
                color: 'var(--editor-text)',
                fontSize: 13,
                overflowX: 'auto',
              }}
            >
              {item.exampleTest.input}
            </pre>
          </div>
          <div className="flex-col gap-1">
            <div className="text-faint" style={{ fontSize: 11 }}>
              Output
            </div>
            <pre
              style={{
                margin: 0,
                padding: '8px 12px',
                borderRadius: 'var(--radius)',
                background: 'var(--editor-bg)',
                color: 'var(--editor-text)',
                fontSize: 13,
                overflowX: 'auto',
              }}
            >
              {item.exampleTest.output}
            </pre>
          </div>
        </div>
      )}
      {item.code && (
        <div style={{ height: 120, overflow: 'hidden' }}>
          <CodeEditor value={item.code} onChange={() => {}} language={language} readOnly />
        </div>
      )}
      <div className="seq-code-editor-auto">
        <CodeEditor value={code} onChange={setCode} language={language} autoHeight />
      </div>
      <ActionButton
        topicJustCompleted={topicJustCompleted}
        nextTopicLabel={nextTopicLabel}
        onGoNextTopic={onGoNextTopic}
        showNext={showNext}
        onNext={onNext}
        disabled={disabled}
        onSubmit={onSubmit}
        submitLabel={disabled ? <span className="spinner" /> : 'Run & check'}
      />
    </>
  );
}

function LocalVerifyView({
  item,
  text,
  setText,
  disabled,
  onSubmit,
  showNext,
  onNext,
  topicJustCompleted,
  nextTopicLabel,
  onGoNextTopic,
}: {
  item: SeqPublicItem;
  text: string;
  setText: (v: string) => void;
  disabled: boolean;
  onSubmit: () => void;
  showNext: boolean;
  onNext: () => void;
  topicJustCompleted: boolean;
  nextTopicLabel: string;
  onGoNextTopic: () => void;
}) {
  return (
    <>
      {item.code && (
        <pre className="code-editor" style={{ minHeight: 'auto', whiteSpace: 'pre-wrap', padding: 12 }}>
          {item.code}
        </pre>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste the exact output from your terminal here…"
        rows={4}
        style={{
          width: '100%',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          padding: 10,
          background: 'var(--editor-bg)',
          color: 'var(--editor-text)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
        }}
      />
      <ActionButton
        topicJustCompleted={topicJustCompleted}
        nextTopicLabel={nextTopicLabel}
        onGoNextTopic={onGoNextTopic}
        showNext={showNext}
        onNext={onNext}
        disabled={disabled}
        onSubmit={onSubmit}
        submitLabel={disabled ? <span className="spinner" /> : 'Check'}
      />
    </>
  );
}

function ResultView({ result }: { result: SeqSubmitResult }) {
  // The single-case exec modes (exact / contains) come back as one test labelled
  // "Output"; hidden-tests come back as "Hidden test N". Show the program's real
  // stdout for the former on every run — pass or fail — instead of only exposing
  // it inside the failure detail.
  const tests = result.tests ?? [];
  const outputTest = tests.find((t) => t.label === 'Output');
  const hiddenTests = tests.filter((t) => t !== outputTest);
  const show = (s: string) => (s === '' ? '(no output)' : s);

  return (
    <div
      className="flex-col gap-2"
      style={{
        padding: 12,
        borderRadius: 'var(--radius)',
        border: `1px solid ${result.passed ? 'var(--success)' : 'var(--warning)'}`,
        background: result.passed ? 'var(--success-dim)' : 'var(--warning-dim)',
      }}
    >
      <div className="flex items-center gap-2">
        <span className={`badge badge-${result.passed ? 'success' : 'warning'}`}>{result.passed ? 'Passed' : 'Not yet'}</span>
        {result.lessonJustCompleted && <span className="badge badge-accent">Lesson complete</span>}
        {result.topicComplete && <span className="badge badge-success">Topic complete</span>}
      </div>

      {result.rationale && <p style={{ margin: 0 }}>{renderInline(result.rationale)}</p>}
      {result.ifIncorrect && <p style={{ margin: 0 }}>{renderInline(result.ifIncorrect)}</p>}
      {result.message && <p style={{ margin: 0 }}>{renderInline(result.message)}</p>}

      {!result.passed && result.hint && (
        <div
          className="flex items-center gap-2"
          style={{
            margin: 0,
            padding: '8px 10px',
            borderRadius: 'var(--radius)',
            background: 'var(--accent-dim)',
            border: '1px solid var(--accent)',
            fontSize: 13,
          }}
        >
          <span className="emoji" aria-hidden>💡</span>
          <span>{renderInline(result.hint)}</span>
        </div>
      )}

      {result.compileError && (
        <div className="flex-col gap-1">
          <span className="text-faint" style={{ fontSize: 12 }}>Compiler error</span>
          <pre className="code-editor seq-output" style={{ color: 'var(--danger)' }}>{result.compileError}</pre>
        </div>
      )}

      {outputTest && !result.compileError && (
        <div className="flex-col gap-1">
          <span className="text-faint" style={{ fontSize: 12 }}>Program output</span>
          <pre className="code-editor seq-output">{show(outputTest.actual)}</pre>
          {!outputTest.passed && (
            <>
              <span className="text-faint" style={{ fontSize: 12, marginTop: 4 }}>Expected</span>
              <pre className="code-editor seq-output">{show(outputTest.expected)}</pre>
            </>
          )}
        </div>
      )}

      {hiddenTests.length > 0 && (
        <div className="flex-col gap-2">
          {hiddenTests.map((t, i) => (
            <div key={i} style={{ fontSize: 13 }}>
              <div className="flex items-center gap-2">
                <span className={`badge badge-${t.passed ? 'success' : 'danger'}`}>{t.passed ? 'pass' : 'fail'}</span>
                <span className="text-faint">{t.label}</span>
              </div>
              <div style={{ marginTop: 4 }}>
                {t.input !== undefined && <Field label="input" value={t.input} />}
                <Field label="expected" value={t.expected} />
                <Field label="actual" value={t.actual} />
              </div>
            </div>
          ))}
        </div>
      )}

      {result.stderr && (
        <div className="flex-col gap-1">
          <span className="text-faint" style={{ fontSize: 12 }}>stderr</span>
          <pre className="code-editor seq-output">{result.stderr}</pre>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
      <span className="text-faint" style={{ minWidth: 64, fontSize: 12 }}>
        {label}
      </span>
      <pre
        className="code-editor"
        style={{ minHeight: 'auto', whiteSpace: 'pre-wrap', padding: '4px 8px', margin: 0, flex: 1 }}
      >
        {value === '' ? '(empty)' : value}
      </pre>
    </div>
  );
}
