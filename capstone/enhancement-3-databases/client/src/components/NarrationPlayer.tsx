import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { mediaUrl } from '../api/client';
import type { SeqAudioClip, SeqAudioTimings } from '../api/types';
import Markdown from './Markdown';
import { renderReadAlong } from '../utils/readAlong';

// One play button for a multi-part narration: a concept item's reading, then
// its question, then each answer choice (in the shuffled order they're
// displayed); or a practical/checkpoint's requirement bullets, one after the
// other. The progress bar is split into coloured sections per kind. When a
// `readText` + reading clip are given it also renders the reading as a
// read-along paragraph, highlighting the sentence being spoken. Renders
// nothing when there are no clips.
//
// `parts` must be in play order and stable (useMemo it in the parent).

export type NarrationKind = 'read' | 'question' | 'option' | 'requirement';
export interface NarrationPart {
  kind: NarrationKind;
  clip: SeqAudioClip;
}

interface Props {
  parts: NarrationPart[];
  /** The reading text — rendered as a read-along paragraph under the controls
      when a `read` part is present (falls back to plain markdown while its
      timings load). */
  readText?: string;
  /** Fires with the part now playing (or null when stopped) so the page can
      highlight it — `partIndex` is this part's position among parts of the
      same kind (e.g. which answer choice, or which requirement bullet). */
  onActive?: (a: { kind: NarrationKind; partIndex: number } | null) => void;
  /** Fires whenever audio starts/stops actually playing — e.g. to drive the
      Trak avatar's "talking" state. */
  onPlayingChange?: (playing: boolean) => void;
}

const SPEEDS = [1, 1.25, 1.5, 0.9];

export default function NarrationPlayer({ parts, readText, onActive, onPlayingChange }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const wantPlay = useRef(false); // resume playing after a part switch
  const seekWithin = useRef<number | null>(null); // currentTime to apply once metadata loads

  const [idx, setIdx] = useState(0);
  const [partTime, setPartTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [engaged, setEngaged] = useState(false); // playback has started and hasn't run off the end
  // True once the LAST part has actually ended (not just paused mid-way).
  // The <audio> element is left sitting at that last clip's own end, so
  // calling .play() on it directly would just replay that one clip (browsers
  // seek a finished element back to ITS OWN start on play(), not to part 0)
  // — toggle() checks this to restart the whole sequence instead.
  const [finished, setFinished] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [readTimings, setReadTimings] = useState<SeqAudioTimings | null>(null);
  const [readTimingsFailed, setReadTimingsFailed] = useState(false);

  const readIdx = useMemo(() => parts.findIndex((p) => p.kind === 'read'), [parts]);
  const readClip = readIdx >= 0 ? parts[readIdx].clip : undefined;

  // Which reading sentence is being spoken (or was last seeked to) — -1
  // before the first interaction, whenever the reading part isn't the active
  // one, or in the brief gap between two sentences' clips.
  let readSentenceIdx = -1;
  if ((engaged || partTime > 0) && idx === readIdx && readTimings) {
    const s = readTimings.sentences;
    for (let i = 0; i < s.length; i++) {
      if (partTime >= s[i].start && partTime < s[i].end) {
        readSentenceIdx = i;
        break;
      }
    }
    if (readSentenceIdx === -1 && s.length && partTime >= s[s.length - 1].end - 0.15) {
      readSentenceIdx = s.length - 1;
    }
  }
  // Sentence-boundary data only exists for the read-along part. Elsewhere
  // (question/option/requirement clips have no sub-clip timing), or if the
  // timings never loaded, treat the whole clip as continuously spoken.
  const hasReadTimingData = idx === readIdx && !!readTimings && !readTimingsFailed;
  // A brief "idle" blip in the gap between two read-along sentences, so the
  // Trak avatar's talking/idle images can flicker slightly rather than
  // holding one static "talking" pose for the whole reading.
  const isSpeakingNow = playing && (!hasReadTimingData || readSentenceIdx !== -1);

  // inline `code` tokens from the reading source, so the read-along still shows
  // code styling (the timings file carries plain text)
  const codeTokens = useMemo(
    () =>
      Array.from((readText ?? '').matchAll(/`([^`]+)`/g))
        .map((m) => m[1])
        .sort((a, b) => b.length - a.length),
    [readText]
  );

  // fetch the reading clip's sentence timings for the read-along
  useEffect(() => {
    if (!readText || !readClip) {
      setReadTimings(null);
      return;
    }
    let alive = true;
    setReadTimings(null);
    setReadTimingsFailed(false);
    fetch(mediaUrl(readClip.timings))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((t: SeqAudioTimings) => alive && setReadTimings(t))
      .catch(() => alive && setReadTimingsFailed(true));
    return () => {
      alive = false;
    };
  }, [readText, readClip]);

  const durations = useMemo(() => parts.map((p) => Math.max(0.1, p.clip.durationSec || 0)), [parts]);
  const offsets = useMemo(() => {
    const o: number[] = [];
    let acc = 0;
    for (const d of durations) {
      o.push(acc);
      acc += d;
    }
    return o;
  }, [durations]);
  const total = useMemo(() => durations.reduce((a, b) => a + b, 0), [durations]);
  const globalTime = (offsets[idx] ?? 0) + partTime;
  const pct = total > 0 ? Math.min(100, (globalTime / total) * 100) : 0;

  // reset when the part list changes (e.g. options re-shuffled on a wrong
  // answer, or the learner moved to a different item — CodeView/ConceptView
  // don't remount this component between items, so without this reset a
  // speed change on ANY earlier item would silently keep applying to every
  // item after it, indefinitely, until a full page reload. Found live: a
  // clip reported as "stretched out" was actually just still on a slower
  // speed left over from a completely unrelated earlier item.
  useEffect(() => {
    wantPlay.current = false;
    seekWithin.current = null;
    setIdx(0);
    setPartTime(0);
    setPlaying(false);
    setEngaged(false);
    setFinished(false);
    setSpeedIdx(0);
    const a = audioRef.current;
    if (a) a.pause();
  }, [parts]);

  // load the current part's audio
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !parts[idx]) return;
    a.src = mediaUrl(parts[idx].clip.src);
    a.playbackRate = SPEEDS[speedIdx];
    a.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, parts]);

  // tell the parent which part is active (only once playback is engaged, so
  // nothing is highlighted before the learner presses play or after it ends)
  useEffect(() => {
    if (!onActive) return;
    const p = parts[idx];
    if (!engaged || !p) {
      onActive(null);
      return;
    }
    const partIndex = parts.slice(0, idx + 1).filter((x) => x.kind === p.kind).length - 1;
    onActive({ kind: p.kind, partIndex });
  }, [idx, parts, onActive, engaged]);

  useEffect(() => () => onActive?.(null), [onActive]);

  useEffect(() => {
    onPlayingChange?.(isSpeakingNow);
  }, [isSpeakingNow, onPlayingChange]);
  useEffect(() => () => onPlayingChange?.(false), [onPlayingChange]);

  const goToPart = useCallback(
    (j: number, within = 0, autoplay = playing) => {
      const clamped = Math.max(0, Math.min(j, parts.length - 1));
      seekWithin.current = within;
      wantPlay.current = autoplay;
      // Any explicit seek (a read-along sentence click, dragging the
      // progress bar, or restart() itself) moves off "the sequence just
      // naturally ran to its true end" — without this, seeking to a
      // specific spot after finishing and then pressing play would
      // incorrectly restart from part 0 instead of playing from there.
      setFinished(false);
      if (clamped === idx) {
        const a = audioRef.current;
        if (a) {
          a.currentTime = within;
          setPartTime(within);
          if (autoplay) void a.play().catch((e: DOMException) => setErr(e?.message ?? 'Could not play.'));
        }
      } else {
        setIdx(clamped);
      }
    },
    [idx, parts.length, playing]
  );

  function onLoadedMeta() {
    const a = audioRef.current!;
    if (seekWithin.current != null) {
      a.currentTime = Math.min(seekWithin.current, a.duration || seekWithin.current);
      seekWithin.current = null;
    }
    setPartTime(a.currentTime);
    if (wantPlay.current) {
      wantPlay.current = false;
      void a.play().catch((e: DOMException) => setErr(e?.message ?? 'Could not play.'));
    }
  }

  function onEnded() {
    if (idx + 1 < parts.length) goToPart(idx + 1, 0, true);
    else {
      setPlaying(false);
      setEngaged(false);
      setFinished(true);
      setPartTime(durations[idx] ?? 0);
    }
  }

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    setErr(null);
    if (finished) {
      restart();
      return;
    }
    if (a.paused) {
      a.playbackRate = SPEEDS[speedIdx];
      void a.play().catch((e: DOMException) => setErr(e?.message ?? 'Could not play.'));
    } else a.pause();
  }
  function restart() {
    goToPart(0, 0, true);
  }
  function seekGlobal(t: number) {
    const clamped = Math.max(0, Math.min(t, Math.max(0, total - 0.05)));
    let j = 0;
    while (j < parts.length - 1 && clamped >= offsets[j] + durations[j]) j++;
    goToPart(j, clamped - offsets[j], playing);
  }
  const barRef = useRef<HTMLDivElement>(null);
  function onBarClick(e: ReactMouseEvent<HTMLDivElement>) {
    const r = barRef.current?.getBoundingClientRect();
    if (!r || !r.width) return;
    seekGlobal(((e.clientX - r.left) / r.width) * total);
  }
  function cycleSpeed() {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
  }

  if (parts.length === 0) return null;

  const activeKind = engaged ? parts[idx]?.kind : undefined;
  const kinds = new Set(parts.map((p) => p.kind));

  return (
    <div className="flex-col gap-2">
      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={onLoadedMeta}
        onPlay={() => {
          setPlaying(true);
          setEngaged(true);
          setFinished(false);
        }}
        onPause={() => setPlaying(false)}
        onEnded={onEnded}
        onTimeUpdate={(e) => setPartTime(e.currentTarget.currentTime)}
        onError={() => setErr('Audio failed to load.')}
      />

      <div className="flex items-center gap-2" style={{ fontSize: 13 }}>
        <button className="btn btn-sm btn-primary" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '❚❚ Pause' : '▶ Listen'}
        </button>
        <button className="btn btn-sm" onClick={restart} title="Restart" aria-label="Restart">
          ⏮
        </button>

        <div className="narr-bar" ref={barRef} onClick={onBarClick} aria-label="Narration progress — click to seek">
          {parts.map((p, i) => (
            <span key={i} className={`narr-seg narr-seg-${p.kind}`} style={{ flexGrow: durations[i] }} />
          ))}
          <span className="narr-curtain" style={{ left: `${pct}%` }} />
          <span className="narr-head" style={{ left: `${pct}%` }} />
        </div>

        <span
          className="text-faint"
          style={{ minWidth: 82, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
        >
          {fmt(globalTime)} / {fmt(total)}
        </span>
        <button className="btn btn-sm" onClick={cycleSpeed} title="Playback speed">
          {SPEEDS[speedIdx]}×
        </button>
      </div>

      <div className="narr-legend text-faint" style={{ fontSize: 11 }}>
        {kinds.has('read') && (
          <span className={activeKind === 'read' ? 'is-active' : undefined}>
            <i className="narr-dot narr-seg-read" /> Reading
          </span>
        )}
        {kinds.has('question') && (
          <span className={activeKind === 'question' ? 'is-active' : undefined}>
            <i className="narr-dot narr-seg-question" /> Question
          </span>
        )}
        {kinds.has('option') && (
          <span className={activeKind === 'option' ? 'is-active' : undefined}>
            <i className="narr-dot narr-seg-option" /> Answers
          </span>
        )}
        {kinds.has('requirement') && (
          <span className={activeKind === 'requirement' ? 'is-active' : undefined}>
            <i className="narr-dot narr-seg-requirement" /> Requirements
          </span>
        )}
      </div>

      {err && (
        <div style={{ fontSize: 12, color: 'var(--danger)' }}>{err}</div>
      )}

      {readText != null &&
        readClip &&
        (readTimings && !readTimingsFailed ? (
          <p className="narr-readalong" style={{ margin: 0, lineHeight: 1.7 }}>
            {readTimings.sentences.map((s, i) => (
              <span
                key={i}
                className={i === readSentenceIdx ? 'tts-active' : undefined}
                onClick={() => goToPart(readIdx, s.start + 0.01, playing)}
                style={{ cursor: 'pointer' }}
              >
                {renderReadAlong(s.text, codeTokens, s.segments)}{' '}
              </span>
            ))}
          </p>
        ) : (
          <Markdown content={readText} />
        ))}
    </div>
  );
}

function fmt(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
