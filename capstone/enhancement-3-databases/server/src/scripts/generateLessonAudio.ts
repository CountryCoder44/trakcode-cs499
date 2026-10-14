/**
 * Lesson narration pipeline for the Sequential Curriculum.
 *
 *   npm run tts:scripts        prepare + write the reviewable spoken scripts
 *                              and the manifest. NO API call. Safe to run now.
 *
 *   npm run tts:generate       generate audio + word-timing for every segment
 *                              whose script changed. Requires TTS_ENABLED=true
 *                              AND ELEVENLABS_API_KEY AND ELEVENLABS_VOICE_ID.
 *     ... -- --dry-run         list what would be generated, call nothing.
 *     ... -- --force           regenerate every segment, even if unchanged.
 *
 * Files (all under `Sequential Curriculum/Python/audio/`):
 *   scripts/<segmentId>.txt    the exact text sent to TTS (review / edit the
 *                              lexicon, not these — they are regenerated)
 *   clips/<segmentId>.mp3      generated narration
 *   clips/<segmentId>.json     { durationSec, sentences: [{text,start,end}] }
 *   manifest.json              index: hash, sentences, status, voice/model used
 *
 * See `Sequential Curriculum/AUDIO.md`.
 */
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { env } from '../config/env';
import { parseTopicMarkdown } from '../seeds/seqCurriculum.parse';
import { SeqItem } from '../models/SeqTopic';
import { prepareTtsScript, PreparedSentence, DisplaySegment } from '../tts/prepareScript';
import { synthesize, ttsReadiness } from '../tts/synth';

const execFileAsync = promisify(execFile);

const ROOT = path.resolve(__dirname, '..', '..', '..');
const PY_DIR = path.join(ROOT, 'Sequential Curriculum', 'Python');
const AUDIO_DIR = path.join(PY_DIR, 'audio');
const SCRIPTS_DIR = path.join(AUDIO_DIR, 'scripts');
const CLIPS_DIR = path.join(AUDIO_DIR, 'clips');
const LIBRARY_DIR = path.join(AUDIO_DIR, 'library');
const MANIFEST = path.join(AUDIO_DIR, 'manifest.json');

// A one-time-approved library of individual letter/number clips (built
// 2026-09-17 after "a"/"e" alone needed 7+ retakes between them — bare,
// context-free single characters are genuinely high-variance for this model
// no matter how the generation settings are tuned, so instead of re-rolling
// the dice on every future item that happens to use one as an answer, a
// CONFIRMED-good clip is captured once and reused everywhere. Scoped
// deliberately narrow: only an OPTION whose entire raw text is exactly one
// quoted letter or one (optionally negative) bare integer qualifies — mid-
// sentence occurrences inside a `read`/`do` field still go through the
// normal LETTER_NAMES text-substitution path in prepareScript.ts, since
// splicing a separate pre-recorded clip into the middle of an otherwise
// freshly-synthesized sentence isn't something this pipeline can do.
function libraryKeyFor(rawOptionText: string): string | null {
  const t = rawOptionText.trim();
  const letterMatch = /^`"([a-zA-Z])"`$/.exec(t);
  if (letterMatch) return `letter-${letterMatch[1].toLowerCase()}`;
  const numberMatch = /^`(-?\d+)`$/.exec(t);
  if (numberMatch) {
    const n = numberMatch[1];
    return n.startsWith('-') ? `number-neg-${n.slice(1)}` : `number-${n}`;
  }
  return null;
}

async function copyFromLibrary(
  libraryKey: string,
  segId: string
): Promise<{ durationSec: number; sentences: PreparedSentence[]; voiceId: string } | null> {
  try {
    const [audio, jsonRaw] = await Promise.all([
      fs.readFile(path.join(LIBRARY_DIR, `${libraryKey}.mp3`)),
      fs.readFile(path.join(LIBRARY_DIR, `${libraryKey}.json`), 'utf8'),
    ]);
    const lib = JSON.parse(jsonRaw) as { voiceId: string; durationSec: number; sentences: PreparedSentence[] };
    await fs.writeFile(path.join(CLIPS_DIR, `${segId}.mp3`), audio);
    await fs.writeFile(
      path.join(CLIPS_DIR, `${segId}.json`),
      JSON.stringify({ segmentId: segId, voiceId: lib.voiceId, durationSec: lib.durationSec, sentences: lib.sentences }, null, 1) + '\n',
      'utf8'
    );
    return { durationSec: lib.durationSec, sentences: lib.sentences, voiceId: lib.voiceId };
  } catch {
    return null; // no library entry for this key yet — fall back to normal synthesis
  }
}

// A multi-digit quoted string as a WHOLE option (e.g. `"246"`) — distinct from
// libraryKeyFor's single-digit case above. ElevenLabs stayed unreliable on
// several of these even after prepareScript.ts's SPELL_OUT_RUNS text fix
// (period-separated digits in the script) — the SCRIPT was correct, but the
// model's actual reading of it wasn't consistently clean. Splices the exact
// already-approved single-digit library clips together with ffmpeg instead of
// asking ElevenLabs to read the whole run as one utterance.
// **Deliberately NOT auto-inferred from content** (unlike libraryKeyFor,
// wired into every option automatically) — never wired into the normal
// generation loop's segment selection. A quoted 2+-digit string can
// legitimately need to be read AS THE NUMBER instead of digit-by-digit (Topic
// 2, locked: `"42"`/`"10"`/`"71"` — that lesson's whole point is "the string
// '42' looks like the number 42, just stored as text"), so which segments get
// this treatment is a per-item human call, made via the explicit `--splice
// <segId1,segId2,...>` flag, never inferred automatically from a segment's
// text the way libraryKeyFor's single-character case safely can be.
function digitRunOf(rawOptionSource: string): string | null {
  const m = /^`"(\d{2,})"`\.?$/.exec(rawOptionSource.trim());
  return m ? m[1] : null;
}

async function spliceDigitsFromLibrary(
  digits: string,
  segId: string,
  sentence: PreparedSentence
): Promise<{ durationSec: number; voiceId: string } | null> {
  const libPaths = digits.split('').map((d) => path.join(LIBRARY_DIR, `number-${d}.mp3`));
  try {
    await Promise.all(libPaths.map((p) => fs.access(p)));
  } catch {
    return null; // a digit here has no library clip yet
  }
  const firstMeta = JSON.parse(await fs.readFile(path.join(LIBRARY_DIR, `number-${digits[0]}.json`), 'utf8')) as {
    voiceId: string;
  };
  const listPath = path.join(CLIPS_DIR, `.concat-${segId}.txt`);
  // ffmpeg's concat demuxer resolves relative paths against the LIST file's
  // own directory, not cwd — use absolute, forward-slash paths (the native
  // Windows ffmpeg binary rejects a bare msys-style "/c/..." path) to avoid
  // that ambiguity entirely.
  const listContent = libPaths.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n');
  await fs.writeFile(listPath, listContent, 'utf8');
  const outPath = path.join(CLIPS_DIR, `${segId}.mp3`);
  try {
    // All library clips share the same codec/sample-rate/channel/bitrate
    // (same ElevenLabs voice+model, synthesized in the same batch), so a
    // stream copy (-c copy, no re-encode) concatenates cleanly.
    await execFileAsync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outPath]);
  } finally {
    await fs.unlink(listPath).catch(() => {});
  }
  // The concatenated file's real duration is measured, not summed from the
  // parts — MP3 stream-copy concatenation can add a small amount of
  // frame-boundary padding, confirmed via a manual test (0.65+0.743+0.65 =
  // 2.043s summed vs. 2.113s actually measured for "246").
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', outPath,
  ]);
  const durationSec = Math.round(parseFloat(stdout.trim()) * 1000) / 1000;
  const timings = {
    segmentId: segId,
    voiceId: firstMeta.voiceId,
    durationSec,
    sentences: [{ text: sentence.display, start: 0, end: durationSec, segments: sentence.segments }],
  };
  await fs.writeFile(path.join(CLIPS_DIR, `${segId}.json`), JSON.stringify(timings, null, 1) + '\n', 'utf8');
  return { durationSec, voiceId: firstMeta.voiceId };
}

// A short, isolated clip (an MC option that's just a bare word/name/tuple, or
// one that OPENS on an invented respelling like "perren") is a distinct
// failure mode from spliceDigitsFromLibrary's above: a real ElevenLabs call,
// not a library concat, but one that keeps mis-rendering (wrong vowel,
// drifted accent, ...) no matter how many times it's re-rolled or how the
// voice_settings are tuned — while the EXACT SAME TEXT embedded mid-sentence
// elsewhere in the curriculum (a `.read` field, say) always comes out right.
// Root-caused 2026-09-18 on `py-5.8-01.opt-C` ("(10, 20)" opening cold on the
// made-up word "perren") and confirmed again the same day on `py-5.8-03`
// ("Ada" alone, and "Ada" as the 3rd word of an otherwise-cold option) — the
// model needs SOME real lead-in context to land an ambiguous/invented word
// correctly; a bare, context-free utterance doesn't give it one.
//
// Fix: synthesize ONE continuous take of "<lead-in>, <the real text>" (real
// context in the SAME synthesis call — NOT separately-recorded clips glued
// together, which was already proven to cause an audible tone mismatch
// during the py-4.8-04 "an" saga), reuse the same character-alignment
// offset math synth.ts already computes for sentence-highlighting timings to
// find exactly where the real text starts in the padded audio, then
// ffmpeg-re-encode (not a raw frame copy, for a clean cut) a trim from that
// timestamp to the end. The shipped clip is still only the real text —
// nothing extra audible — but it was generated WITH an anchor instead of cold.
//
// Opt-in per segment ID via `--pad-context <segId1,segId2,...>` (never
// automatic — same reasoning as --splice: whether a given short clip needs
// this is a human judgment call after listening, not something to infer from
// text shape alone). Requires a real ElevenLabs call (unlike --splice).
const CONTEXT_LEAD_IN = 'Like this,';

async function padContextAndGenerate(
  segId: string,
  sentence: PreparedSentence
): Promise<{ durationSec: number; voiceId: string; modelId: string } | null> {
  const leadIn: PreparedSentence = { display: CONTEXT_LEAD_IN, spoken: CONTEXT_LEAD_IN, segments: [] };
  const sentences = [leadIn, sentence];
  const script = sentences.map((s) => s.spoken).join('\n');
  const result = await synthesize({ script, sentences });
  const realStart = result.sentences[1].start;

  const tmpFull = path.join(CLIPS_DIR, `.pad-context-${segId}.full.mp3`);
  const outPath = path.join(CLIPS_DIR, `${segId}.mp3`);
  await fs.writeFile(tmpFull, result.audio);
  try {
    await execFileAsync('ffmpeg', [
      '-y', '-i', tmpFull, '-ss', String(realStart), '-acodec', 'libmp3lame', '-qscale:a', '2', outPath,
    ]);
  } finally {
    await fs.unlink(tmpFull).catch(() => {});
  }
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', outPath,
  ]);
  const durationSec = Math.round(parseFloat(stdout.trim()) * 1000) / 1000;
  const timings = {
    segmentId: segId,
    voiceId: result.voiceId,
    durationSec,
    sentences: [{ text: sentence.display, start: 0, end: durationSec, segments: sentence.segments }],
  };
  await fs.writeFile(path.join(CLIPS_DIR, `${segId}.json`), JSON.stringify(timings, null, 1) + '\n', 'utf8');
  return { durationSec, voiceId: result.voiceId, modelId: result.modelId };
}

interface Segment {
  id: string; // "<itemId>.<field>" e.g. "py-4.1-01.read", "py-4.1-01.opt-B"
  topicId: string;
  field: 'read' | 'do' | 'brief' | 'question' | 'option' | 'requirement';
  source: string; // raw markdown
  // A lesson's optional trailing debugging-exercise pool (see _FORMAT.md §6
  // rule 1a). Excluded from --generate by default — see --include-practice-group.
  practiceGroup: boolean;
  // Set only for an `option` segment whose entire raw text is a bare quoted
  // letter or integer — see libraryKeyFor() above.
  libraryKey?: string;
}

// A concept item is narrated as separate parts so the player can play the
// answer choices in the (shuffled) order they are displayed: `.question` is the
// stem alone, and `.opt-<letter>` is one clip per choice, keyed by its stable
// authored letter.
const endStop = (s: string) => (/[.?!]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);
interface ManifestEntry {
  hash: string;
  chars: number;
  sentences: PreparedSentence[];
  status: 'script-ready' | 'generated';
  audioFile: string | null;
  timingsFile: string | null;
  durationSec?: number;
  voiceId?: string;
  modelId?: string;
  generatedAt?: string;
}
interface Manifest {
  updatedAt: string;
  note: string;
  segments: Record<string, ManifestEntry>;
}

const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

async function collectSegments(): Promise<Segment[]> {
  const files = (await fs.readdir(PY_DIR)).filter((f) => /^py-topic-\d+.*\.md$/.test(f)).sort();
  const segs: Segment[] = [];

  // Requirements (a `- ` bullet list on a practical/checkpoint) get their own
  // player on the client, sequencing through each bullet — so, like a
  // concept's answer choices, each one is its own clip, keyed by its stable
  // position in the list.
  const pushItem = (item: SeqItem, topicId: string) => {
    const practiceGroup = !!item.practiceGroup;
    if (item.read) segs.push({ id: `${item.itemId}.read`, topicId, field: 'read', source: item.read, practiceGroup });
    if (item.do) segs.push({ id: `${item.itemId}.do`, topicId, field: 'do', source: item.do, practiceGroup });
    if (item.brief) segs.push({ id: `${item.itemId}.brief`, topicId, field: 'brief', source: item.brief, practiceGroup });
    if (item.check) {
      segs.push({ id: `${item.itemId}.question`, topicId, field: 'question', source: endStop(item.check), practiceGroup });
      for (const o of item.options ?? []) {
        segs.push({
          id: `${item.itemId}.opt-${o.letter}`,
          topicId,
          field: 'option',
          source: endStop(o.text),
          practiceGroup,
          libraryKey: libraryKeyFor(o.text) ?? undefined,
        });
      }
    }
    (item.requirements ?? []).forEach((r, i) => {
      segs.push({ id: `${item.itemId}.req-${i}`, topicId, field: 'requirement', source: endStop(r), practiceGroup });
    });
  };

  for (const f of files) {
    const topic = parseTopicMarkdown(await fs.readFile(path.join(PY_DIR, f), 'utf8'), f);
    for (const lesson of topic.lessons) {
      for (const item of lesson.items) pushItem(item, topic.topicId);
    }
    if (topic.checkpoint) pushItem(topic.checkpoint, topic.topicId);
  }
  return segs;
}

async function loadManifest(): Promise<Manifest> {
  try {
    return JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
  } catch {
    return { updatedAt: '', note: 'Generated by server/src/scripts/generateLessonAudio.ts — do not hand-edit.', segments: {} };
  }
}

// TTS synthesis (ElevenLabs / Windows SAPI) lives in ../tts/synth.

// ---- run ----

async function main() {
  const argv = process.argv.slice(2);
  const mode = argv.includes('--generate') ? 'generate' : 'scripts';
  const dryRun = argv.includes('--dry-run');
  const force = argv.includes('--force');
  // --only <prefix>  restrict GENERATION to segment ids starting with <prefix>
  // (e.g. "py-1.1" for one lesson, "py-topic-01" for one topic). Scripts +
  // manifest are still refreshed for everything.
  const onlyIdx = argv.indexOf('--only');
  const onlyPrefix = onlyIdx >= 0 ? argv[onlyIdx + 1] : null;
  // Debugging-exercise (practice_group) items are excluded from --generate by
  // default — they're already hidden from real learners behind the
  // launch-visibility gate (PRACTICE_GROUPS_LAUNCHED), so narrating them now
  // just burns ElevenLabs credits ahead of when it's actually needed. Pass
  // --include-practice-group to override for a deliberate, explicit request.
  const includePracticeGroup = argv.includes('--include-practice-group');
  // --splice <segId1,segId2,...>  build these exact segments by concatenating
  // already-approved single-digit library clips instead of calling the TTS
  // API — see spliceDigitsFromLibrary() above for why this is opt-in per
  // segment ID, never inferred automatically. No TTS provider/API key needed.
  const spliceIdx = argv.indexOf('--splice');
  const spliceIds = spliceIdx >= 0 ? argv[spliceIdx + 1].split(',').map((s) => s.trim()).filter(Boolean) : null;
  // --pad-context <segId1,segId2,...>  regenerate these exact segments with a
  // synthesized lead-in phrase that gets trimmed back out afterward — see
  // padContextAndGenerate() above for why (isolated short clips that open on
  // an ambiguous/invented word are prone to accent drift / wrong-vowel
  // mispronunciation no matter how many times they're re-rolled). Real
  // ElevenLabs call, unlike --splice.
  const padContextIdx = argv.indexOf('--pad-context');
  const padContextIds = padContextIdx >= 0 ? argv[padContextIdx + 1].split(',').map((s) => s.trim()).filter(Boolean) : null;

  await fs.mkdir(SCRIPTS_DIR, { recursive: true });
  const manifest = await loadManifest();
  const segments = await collectSegments();

  console.log(`Found ${segments.length} narration segments across the curriculum.\n`);

  const prepared = new Map<string, { script: string; sentences: PreparedSentence[]; hash: string }>();
  let changed = 0;
  for (const seg of segments) {
    const { script, sentences } = await prepareTtsScript(seg.source);
    const hash = sha(script);
    prepared.set(seg.id, { script, sentences, hash });
    await fs.writeFile(path.join(SCRIPTS_DIR, `${seg.id}.txt`), script + '\n', 'utf8');
    const prev = manifest.segments[seg.id];
    const isChanged = !prev || prev.hash !== hash;
    if (isChanged) changed++;
    manifest.segments[seg.id] = {
      hash,
      chars: script.length,
      sentences,
      status: isChanged ? 'script-ready' : prev.status,
      audioFile: isChanged ? null : prev.audioFile,
      timingsFile: isChanged ? null : prev.timingsFile,
      durationSec: isChanged ? undefined : prev.durationSec,
      voiceId: isChanged ? undefined : prev.voiceId,
      modelId: isChanged ? undefined : prev.modelId,
      generatedAt: isChanged ? undefined : prev.generatedAt,
    };
  }

  // prune manifest entries whose segment no longer exists
  for (const id of Object.keys(manifest.segments)) {
    if (!prepared.has(id)) delete manifest.segments[id];
  }

  manifest.updatedAt = new Date().toISOString();
  await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 1) + '\n', 'utf8');

  const totalChars = segments.reduce((n, s) => n + (prepared.get(s.id)?.script.length ?? 0), 0);
  console.log(`Wrote ${segments.length} scripts to ${path.relative(ROOT, SCRIPTS_DIR)}/`);
  console.log(`Manifest: ${path.relative(ROOT, MANIFEST)}  (${changed} new/changed since last run)`);
  console.log(`Total characters to narrate: ${totalChars.toLocaleString()}\n`);

  if (spliceIds) {
    await fs.mkdir(CLIPS_DIR, { recursive: true });
    console.log(`--splice: building ${spliceIds.length} segment(s) from the digit library (no API calls).`);
    let ok = 0;
    for (const segId of spliceIds) {
      const seg = segments.find((s) => s.id === segId);
      const p = prepared.get(segId);
      if (!seg || !p) {
        console.log(`  ${segId} … skipped: no such segment.`);
        continue;
      }
      const digits = digitRunOf(seg.source);
      if (!digits) {
        console.log(`  ${segId} … skipped: not a whole quoted-digit-string option (e.g. \`"246"\`).`);
        continue;
      }
      const result = await spliceDigitsFromLibrary(digits, segId, p.sentences[0]).catch((err: Error) => {
        console.log(`  ${segId} … FAILED: ${err.message}`);
        return null;
      });
      if (!result) continue;
      manifest.segments[segId] = {
        ...manifest.segments[segId],
        status: 'generated',
        audioFile: `clips/${segId}.mp3`,
        timingsFile: `clips/${segId}.json`,
        durationSec: result.durationSec,
        voiceId: result.voiceId,
        modelId: `spliced-library:${digits}`,
        generatedAt: new Date().toISOString(),
      };
      ok++;
      console.log(`  ${segId} … spliced from [${digits.split('').join(', ')}] (${result.durationSec}s, no API call)`);
    }
    manifest.updatedAt = new Date().toISOString();
    await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 1) + '\n', 'utf8');
    console.log(`\nSpliced ${ok}/${spliceIds.length} segment(s) from the library. Manifest updated.`);
    return;
  }

  if (padContextIds) {
    const { ready, provider, why } = ttsReadiness();
    if (!ready || provider !== 'elevenlabs') {
      console.error(`--pad-context requires TTS_PROVIDER=elevenlabs and readiness:`);
      for (const w of why) console.error(`  - ${w}`);
      process.exit(1);
    }
    await fs.mkdir(CLIPS_DIR, { recursive: true });
    console.log(`--pad-context: regenerating ${padContextIds.length} segment(s) with a synthesized lead-in ("${CONTEXT_LEAD_IN}"), then trimming it back out.`);
    let ok = 0;
    for (const segId of padContextIds) {
      const seg = segments.find((s) => s.id === segId);
      const p = prepared.get(segId);
      if (!seg || !p) {
        console.log(`  ${segId} … skipped: no such segment.`);
        continue;
      }
      const result = await padContextAndGenerate(segId, p.sentences[0]).catch((err: Error) => {
        console.log(`  ${segId} … FAILED: ${err.message}`);
        return null;
      });
      if (!result) continue;
      manifest.segments[segId] = {
        ...manifest.segments[segId],
        status: 'generated',
        audioFile: `clips/${segId}.mp3`,
        timingsFile: `clips/${segId}.json`,
        durationSec: result.durationSec,
        voiceId: result.voiceId,
        modelId: result.modelId,
        generatedAt: new Date().toISOString(),
      };
      ok++;
      console.log(`  ${segId} … generated with context-pad + trim (${result.durationSec}s)`);
    }
    manifest.updatedAt = new Date().toISOString();
    await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 1) + '\n', 'utf8');
    console.log(`\nGenerated ${ok}/${padContextIds.length} segment(s) via context-pad + trim. Manifest updated.`);
    return;
  }

  if (mode === 'scripts') {
    console.log('Scripts-only run — no audio generated. Review the .txt files and the');
    console.log('lexicon (Sequential Curriculum/tts-lexicon.json), then run: npm run tts:generate');
    console.log('  free placeholder narration:  TTS_ENABLED=true TTS_PROVIDER=sapi   (Windows, no cost)');
    console.log('  final Trak voice:            TTS_ENABLED=true TTS_PROVIDER=elevenlabs + key + voice id');
    return;
  }

  // ---- generate mode ----
  const { ready, provider, why } = ttsReadiness();
  if (!ready) {
    console.error(`Cannot generate audio with TTS_PROVIDER=${provider}:`);
    for (const w of why) console.error(`  - ${w}`);
    process.exit(1);
  }

  await fs.mkdir(CLIPS_DIR, { recursive: true });
  const wantExt = provider === 'sapi' ? '.wav' : '.mp3';
  const skippedPracticeGroup = new Set<string>();
  const todo = segments.filter((s) => {
    if (onlyPrefix && !s.id.startsWith(onlyPrefix)) return false;
    if (s.practiceGroup && !includePracticeGroup) {
      skippedPracticeGroup.add(s.id);
      return false;
    }
    const m = manifest.segments[s.id];
    // regenerate if: forced, never generated, content changed, or the existing
    // clip was made by the other provider (wrong extension).
    return force || !m.audioFile || m.hash !== prepared.get(s.id)!.hash || !m.audioFile.endsWith(wantExt);
  });
  if (onlyPrefix) console.log(`--only ${onlyPrefix}: ${todo.length} matching segment(s).`);
  if (skippedPracticeGroup.size) {
    console.log(
      `Skipped ${skippedPracticeGroup.size} debugging-exercise segment(s) (practice_group items — pass --include-practice-group to narrate them anyway).`
    );
  }

  const todoChars = todo.reduce((n, s) => n + prepared.get(s.id)!.script.length, 0);
  const voiceLabel = provider === 'sapi' ? (env.SAPI_VOICE || 'Windows SAPI default') : `${env.ELEVENLABS_VOICE_ID} / ${env.ELEVENLABS_MODEL_ID}`;
  console.log(`${todo.length} segment(s) / ~${todoChars.toLocaleString()} chars to generate — provider ${provider}, voice ${voiceLabel}.`);
  if (dryRun) {
    todo.forEach((s) => console.log(`  would generate  ${s.id}  (${prepared.get(s.id)!.script.length} chars)`));
    console.log('\n--dry-run: nothing was generated.');
    return;
  }

  // Spending guard applies only to the paid provider. `sapi` is free/offline.
  const LARGE = 12;
  if (provider === 'elevenlabs' && todo.length > LARGE && !argv.includes('--yes')) {
    console.error(
      `\nRefusing to generate ${todo.length} segments (~${todoChars.toLocaleString()} chars) with ElevenLabs (costs credits).\n` +
        `  • free placeholder:  TTS_PROVIDER=sapi npm run tts:generate -w server -- --force\n` +
        `  • scope it:          npm run tts:generate -w server -- --only py-1.1\n` +
        `  • preview it:        npm run tts:generate -w server -- --dry-run\n` +
        `  • really do all:     npm run tts:generate -w server -- --yes`
    );
    process.exit(1);
  }

  // Clips whose audio is unchanged still get their read-along `text` refreshed
  // from the current lexicon / prepareScript output. Display text is cheap to
  // recompute and must not lag a rule change (e.g. a `spokenOnly` rule that
  // stops "2.3" being shown as "2 point 3"). The per-sentence start/end are
  // kept — the SPOKEN text, hence the audio, is unchanged.
  const todoIds = new Set(todo.map((s) => s.id));
  let refreshed = 0;
  for (const seg of segments) {
    if (todoIds.has(seg.id)) continue;
    if (onlyPrefix && !seg.id.startsWith(onlyPrefix)) continue;
    const clipJson = path.join(CLIPS_DIR, `${seg.id}.json`);
    let existing: {
      sentences?: { text: string; start: number; end: number; segments?: DisplaySegment[] }[];
    };
    try {
      existing = JSON.parse(await fs.readFile(clipJson, 'utf8'));
    } catch {
      continue; // no clip on disk yet — nothing to refresh
    }
    const fresh = prepared.get(seg.id)!.sentences;
    if (!existing.sentences || existing.sentences.length !== fresh.length) continue;
    let dirty = false;
    existing.sentences.forEach((s, i) => {
      if (s.text !== fresh[i].display) {
        s.text = fresh[i].display;
        dirty = true;
      }
      if (JSON.stringify(s.segments) !== JSON.stringify(fresh[i].segments)) {
        s.segments = fresh[i].segments;
        dirty = true;
      }
    });
    if (dirty) {
      await fs.writeFile(clipJson, JSON.stringify(existing, null, 1) + '\n', 'utf8');
      // Bump generatedAt so audioManifest's `?v=` cache-buster changes — the
      // served clip content (its display text) did change, even if the audio
      // did not, so a browser must not keep the stale copy.
      const m = manifest.segments[seg.id];
      if (m) m.generatedAt = new Date().toISOString();
      refreshed++;
    }
  }
  if (refreshed) {
    manifest.updatedAt = new Date().toISOString();
    await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 1) + '\n', 'utf8');
    console.log(`Refreshed read-along text on ${refreshed} unchanged clip(s).`);
  }

  let done = 0;
  let reused = 0;
  for (const seg of todo) {
    const p = prepared.get(seg.id)!;
    process.stdout.write(`  ${seg.id} … `);
    try {
      const fromLibrary = seg.libraryKey ? await copyFromLibrary(seg.libraryKey, seg.id) : null;
      if (fromLibrary) {
        manifest.segments[seg.id] = {
          ...manifest.segments[seg.id],
          status: 'generated',
          audioFile: `clips/${seg.id}.mp3`,
          timingsFile: `clips/${seg.id}.json`,
          durationSec: fromLibrary.durationSec,
          voiceId: fromLibrary.voiceId,
          modelId: `shared-library:${seg.libraryKey}`,
          generatedAt: new Date().toISOString(),
        };
        reused++;
        console.log(`reused from library/${seg.libraryKey} (${fromLibrary.durationSec}s, no API call)`);
        manifest.updatedAt = new Date().toISOString();
        await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 1) + '\n', 'utf8');
        continue;
      }

      const r = await synthesize(p);
      await fs.writeFile(path.join(CLIPS_DIR, `${seg.id}.${r.ext}`), r.audio);
      const timings = {
        segmentId: seg.id,
        voiceId: r.voiceId,
        durationSec: r.durationSec,
        sentences: r.sentences,
      };
      await fs.writeFile(path.join(CLIPS_DIR, `${seg.id}.json`), JSON.stringify(timings, null, 1) + '\n', 'utf8');
      manifest.segments[seg.id] = {
        ...manifest.segments[seg.id],
        status: 'generated',
        audioFile: `clips/${seg.id}.${r.ext}`,
        timingsFile: `clips/${seg.id}.json`,
        durationSec: r.durationSec,
        voiceId: r.voiceId,
        modelId: r.modelId,
        generatedAt: new Date().toISOString(),
      };
      done++;
      console.log(`ok (${r.durationSec}s)`);
      manifest.updatedAt = new Date().toISOString();
      await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 1) + '\n', 'utf8'); // checkpoint each
    } catch (err) {
      console.log(`FAILED: ${(err as Error).message}`);
    }
  }
  const reusedNote = reused ? `, ${reused} reused from the shared library (no API call)` : '';
  console.log(`\nGenerated ${done}/${todo.length} with ${provider}${reusedNote}. Manifest updated.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
