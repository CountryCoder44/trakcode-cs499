import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { mediaUrl } from '../api/client';
import type { SeqAudioClip, SeqAudioTimings } from '../api/types';
import Markdown from './Markdown';
import { renderReadAlong } from '../utils/readAlong';

// Read-along narration for a lesson's written section. Falls back to plain
// rendered markdown whenever there is no `clip` (nothing generated yet) or the
// timing file fails to load — so it is safe to mount everywhere now, before any
// audio exists. See Sequential Curriculum/AUDIO.md.

interface Props {
  text: string;
  clip?: SeqAudioClip;
  /** Fires whenever audio starts/stops actually playing — e.g. to drive the
      Trak avatar's "talking" state. */
  onPlayingChange?: (playing: boolean) => void;
}

const SPEEDS = [1, 1.25, 1.5, 0.9];

export default function LessonAudioPlayer({ text, clip, onPlayingChange }: Props) {
  const [timings, setTimings] = useState<SeqAudioTimings | null>(null);
  const [failed, setFailed] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!clip) return;
    let alive = true;
    setTimings(null);
    setFailed(false);
    setCurrent(0);
    setPlaying(false);
    setAudioError(null);
    // Same fix as NarrationPlayer.tsx: this component isn't remounted between
    // items (LocalVerifyView renders it in the same tree position regardless
    // of which item is active), so without resetting it here, a speed change
    // on an earlier item would silently keep applying to every item after it.
    setSpeedIdx(0);
    fetch(mediaUrl(clip.timings))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((t: SeqAudioTimings) => alive && setTimings(t))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [clip]);

  // code tokens from the source markdown, so the plain read-along text can still
  // show inline code styling
  const codeTokens = useMemo(
    () => Array.from(text.matchAll(/`([^`]+)`/g)).map((m) => m[1]).sort((a, b) => b.length - a.length),
    [text]
  );

  const activeIndex = useMemo(() => {
    if (!timings) return -1;
    const s = timings.sentences;
    for (let i = 0; i < s.length; i++) if (current >= s[i].start && current < s[i].end) return i;
    if (s.length && current >= s[s.length - 1].end - 0.15) return s.length - 1;
    return -1;
  }, [timings, current]);

  // A brief "idle" blip in the gap between two read-along sentences, so the
  // Trak avatar's talking/idle images can flicker slightly rather than
  // holding one static "talking" pose for the whole reading. `activeIndex`
  // is already -1 before timings load, so this only ever reads as "idle" —
  // never wrongly "talking" — until real sentence data is available.
  const isSpeakingNow = playing && activeIndex !== -1;
  useEffect(() => {
    onPlayingChange?.(isSpeakingNow);
  }, [isSpeakingNow, onPlayingChange]);
  useEffect(() => () => onPlayingChange?.(false), [onPlayingChange]);

  // no clip, load failed, or still loading -> just the rendered text
  if (!clip || failed || !timings) return <Markdown content={text} />;

  const audio = () => audioRef.current!;
  const duration = timings.durationSec || audio()?.duration || 0;

  function play(a: HTMLAudioElement) {
    a.playbackRate = SPEEDS[speedIdx];
    setAudioError(null);
    a.play().catch((err: DOMException) => setAudioError(err?.message || 'Could not play audio.'));
  }
  function toggle() {
    const a = audio();
    if (a.paused) play(a);
    else a.pause();
  }
  function restart() {
    const a = audio();
    a.currentTime = 0;
    play(a);
  }
  function seekTo(t: number) {
    audio().currentTime = Math.max(0, Math.min(t, duration));
    setCurrent(audio().currentTime);
  }
  function cycleSpeed() {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
  }

  return (
    <div className="flex-col gap-2">
      <audio
        ref={audioRef}
        src={mediaUrl(clip.src)}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setAudioError('Audio failed to load.')}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
      />

      {audioError && (
        <div className="text-faint" style={{ fontSize: 12, color: 'var(--danger)' }}>
          {audioError}
        </div>
      )}

      <div className="flex items-center gap-2" style={{ fontSize: 13 }}>
        <button className="btn btn-sm btn-primary" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '❚❚ Pause' : '▶ Listen'}
        </button>
        <button className="btn btn-sm" onClick={restart} aria-label="Restart" title="Restart">
          ⏮
        </button>
        <input
          type="range"
          className="audio-seek"
          min={0}
          max={duration || 1}
          step={0.05}
          value={current}
          onChange={(e) => seekTo(Number(e.target.value))}
          style={
            {
              flex: 1,
              accentColor: 'var(--accent)',
              '--seek-pct': `${duration ? Math.min(100, (current / duration) * 100) : 0}%`,
            } as CSSProperties
          }
          aria-label="Seek"
        />
        <span className="text-faint" style={{ minWidth: 84, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
          {fmt(current)} / {fmt(duration)}
        </span>
        <button className="btn btn-sm" onClick={cycleSpeed} title="Playback speed">
          {SPEEDS[speedIdx]}×
        </button>
      </div>

      <p style={{ margin: 0, lineHeight: 1.7 }}>
        {timings.sentences.map((s, i) => (
          <span
            key={i}
            className={i === activeIndex ? 'tts-active' : undefined}
            onClick={() => seekTo(s.start + 0.01)}
            style={{ cursor: 'pointer' }}
          >
            {renderReadAlong(s.text, codeTokens, s.segments)}{' '}
          </span>
        ))}
      </p>
    </div>
  );
}

function fmt(sec: number): string {
  if (!isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
