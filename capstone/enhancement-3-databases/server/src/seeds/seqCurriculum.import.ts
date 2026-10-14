import { promises as fs } from 'fs';
import path from 'path';
import { SeqTopic } from '../models/SeqTopic';
import { parseTopicMarkdown, ParsedTopic } from './seqCurriculum.parse';
import { SeqItem } from '../models/SeqTopic';
import { loadGeneratedAudio, AudioClipRef } from '../tts/audioManifest';

// Attach generated narration clips (if any) to a parsed topic's items, keyed by
// "<itemId>.<field>" in the audio manifest. No-op until `npm run tts:generate`
// has produced clips.
function attachItemAudio(item: SeqItem, audio: Record<string, AudioClipRef>): void {
  const put = (field: 'read' | 'do' | 'brief' | 'question') => {
    const clip = audio[`${item.itemId}.${field}`];
    if (clip) item.audio = { ...(item.audio ?? {}), [field]: clip };
  };
  put('read');
  put('do');
  put('brief');
  put('question');

  // one clip per answer choice, keyed by its authored letter
  const options: Record<string, AudioClipRef> = {};
  for (const o of item.options ?? []) {
    const clip = audio[`${item.itemId}.opt-${o.letter}`];
    if (clip) options[o.letter] = clip;
  }
  if (Object.keys(options).length) item.audio = { ...(item.audio ?? {}), options };

  // one clip per requirement bullet, keyed by its position in the list
  const requirements: Record<string, AudioClipRef> = {};
  (item.requirements ?? []).forEach((_, i) => {
    const clip = audio[`${item.itemId}.req-${i}`];
    if (clip) requirements[i] = clip;
  });
  if (Object.keys(requirements).length) item.audio = { ...(item.audio ?? {}), requirements };
}

function attachAudio(parsed: ParsedTopic, audio: Record<string, AudioClipRef>): void {
  for (const lesson of parsed.lessons) {
    for (const item of lesson.items) attachItemAudio(item, audio);
  }
  if (parsed.checkpoint) attachItemAudio(parsed.checkpoint, audio);
}

// Repo root is three levels up from server/src/seeds at runtime (tsx) and from
// server/dist/seeds after a build. `Sequential Curriculum/` lives at the root.
// Each course: the folder under `Sequential Curriculum/` and a regex whose
// ONE capture group extracts that file's `topic_id` from its filename (no
// parsing needed). This MUST exactly reproduce the string every topic's
// frontmatter puts in `topic_id`, character for character — the reconciliation
// pass below (`presentTopicIds`) compares this filename-derived id against the
// DB's stored `topicId` to decide which topics still have a file on disk, and
// deletes anything that doesn't match. A mismatch here would silently delete
// topics that DO still have a file, just because the id it derived from the
// filename didn't match what's actually in that file's frontmatter.
const COURSE_DIRS: Record<string, { dir: string; fileRe: RegExp }> = {
  python: { dir: 'Python', fileRe: /^(py-topic-\d+).*\.md$/ },
  typescript: { dir: 'TypeScript', fileRe: /^(ts-topic-\d+).*\.md$/ },
};

function repoRoot(): string {
  // server/src/seeds -> server/src -> server -> <root>
  return path.resolve(__dirname, '..', '..', '..');
}

export interface ImportReport {
  imported: { topicId: string; title: string; lessons: number; items: number; file: string }[];
  skipped: { file: string; error: string }[];
  // Topics removed because no file for them exists in the scanned directory
  // any more (e.g. archived to `_post-launch-roadmap/`) — see the reconciliation
  // step below. Distinct from `skipped`: a skipped file still exists but failed
  // to parse this run, so its last-known-good DB copy is deliberately left alone.
  removed: { topicId: string; title: string }[];
}

export async function importSeqCurriculum(opts: { quiet?: boolean } = {}): Promise<ImportReport> {
  const report: ImportReport = { imported: [], skipped: [], removed: [] };
  const root = repoRoot();
  // Narration clips currently exist for the Python course only (see AUDIO.md);
  // keys are `py-*`, so attaching to another course is a no-op regardless.
  const generatedAudio = await loadGeneratedAudio();
  const audioCount = Object.keys(generatedAudio).length;

  for (const [course, { dir: dirName, fileRe }] of Object.entries(COURSE_DIRS)) {
    const dir = path.join(root, 'Sequential Curriculum', dirName);
    // presentTopicIds (below) captures the topic id from each filename so a
    // reconciliation pass can tell which DB topics still have a file on disk
    // without needing to parse it — a file that exists but currently fails to
    // parse must NOT count as "gone" (see the deliberate distinction from
    // `skipped` above).
    let entries: string[] = [];
    try {
      entries = (await fs.readdir(dir)).filter((f) => fileRe.test(f)).sort();
    } catch {
      if (!opts.quiet) console.warn(`⚠️  Sequential Curriculum dir not found: ${dir}`);
      continue;
    }
    const presentTopicIds = new Set(
      entries.map((f) => f.match(fileRe)?.[1]).filter((id): id is string => !!id)
    );

    for (const file of entries) {
      const full = path.join(dir, file);
      const rel = path.join('Sequential Curriculum', dirName, file);
      try {
        const text = await fs.readFile(full, 'utf8');
        const parsed = parseTopicMarkdown(text, rel);
        if (parsed.course !== course) {
          throw new Error(`frontmatter course "${parsed.course}" != folder course "${course}"`);
        }
        if (course === 'python') attachAudio(parsed, generatedAudio);

        const itemCount =
          parsed.lessons.reduce((n, l) => n + l.items.length, 0) + (parsed.checkpoint ? 1 : 0);

        await SeqTopic.findOneAndUpdate(
          { topicId: parsed.topicId },
          {
            topicId: parsed.topicId,
            course: parsed.course,
            section: parsed.section,
            topicNumber: parsed.topicNumber,
            order: parsed.topicNumber,
            title: parsed.title,
            slug: parsed.slug,
            overview: parsed.overview,
            liveCodingException: parsed.liveCodingException,
            lessons: parsed.lessons,
            checkpoint: parsed.checkpoint,
            sourceFile: rel,
            importedAt: new Date(),
          },
          { upsert: true, new: true }
        );

        report.imported.push({
          topicId: parsed.topicId,
          title: parsed.title,
          lessons: parsed.lessons.length,
          items: itemCount,
          file: rel,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        report.skipped.push({ file: rel, error: msg });
        if (!opts.quiet) console.warn(`⚠️  Skipped ${rel}: ${msg}`);
      }
    }

    // Reconcile: a topic whose file no longer exists in this course's
    // directory at all (moved, e.g. to `_post-launch-roadmap/`, or deleted)
    // must not linger in the DB just because upsert-only writes never remove
    // anything. A topic that's merely failing to parse THIS run still has a
    // file on disk, so it's protected by `presentTopicIds` above and skipped
    // here, not deleted.
    const stale = await SeqTopic.find({ course, topicId: { $nin: [...presentTopicIds] } }).select(
      'topicId title'
    );
    if (stale.length) {
      await SeqTopic.deleteMany({ course, topicId: { $nin: [...presentTopicIds] } });
      report.removed.push(...stale.map((t) => ({ topicId: t.topicId, title: t.title })));
    }
  }

  if (!opts.quiet) {
    const ok = report.imported.map((r) => `${r.topicId} (${r.lessons} lessons, ${r.items} items)`).join(', ');
    console.log(`📚 Sequential Curriculum imported: ${ok || 'none'}${audioCount ? ` — ${audioCount} narration clips attached` : ''}`);
    if (report.removed.length) {
      console.log(
        `🗑️  Removed ${report.removed.length} stale topic(s) with no matching file: ${report.removed
          .map((r) => `${r.topicId} (${r.title})`)
          .join(', ')}`
      );
    }
  }
  return report;
}
