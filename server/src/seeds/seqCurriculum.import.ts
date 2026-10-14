import { promises as fs } from 'fs';
import path from 'path';
import { SeqTopic } from '../models/SeqTopic';
import { SeqProgress } from '../models/SeqProgress';
import { parseTopicMarkdown } from './seqCurriculum.parse';

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
//
// The launch courses. Topic ids use a compact scheme: `<lang>-b<N>` (`py-b1`,
// `jv-b2`, `cpp-b1`), item ids `<lang>-bN.M-II`. Mirror of COURSES in
// client/src/courses.ts (both must list a course for it to appear).
const COURSE_DIRS: Record<string, { dir: string; fileRe: RegExp }> = {
  python_beginner: { dir: 'PythonBeginner', fileRe: /^(py-b\d+).*\.md$/ },
  java_beginner: { dir: 'JavaBeginner', fileRe: /^(jv-b\d+).*\.md$/ },
  cpp_beginner: { dir: 'CppBeginner', fileRe: /^(cpp-b\d+).*\.md$/ },
};

/**
 * Courses that were removed (2026-10-12: the original Python and TypeScript
 * courses; their content lives on only in git history). Their topics, progress
 * and Learn edit-mode edits are deleted on import. Named explicitly, never
 * "anything not in COURSE_DIRS", so a typo in the registry can't wipe a live
 * course.
 */
const RETIRED_COURSES: Record<string, RegExp> = {
  python: /^py-topic-\d+$/,
  typescript: /^ts-topic-\d+$/,
};

async function retireCourses(report: ImportReport): Promise<void> {
  const courses = Object.keys(RETIRED_COURSES);
  const topics = await SeqTopic.find({ course: { $in: courses } }).select('topicId title');
  const topicIds = topics.map((t) => t.topicId);
  if (!topics.length && !(await SeqProgress.exists({ course: { $in: courses } }))) return;
  await SeqProgress.deleteMany({ course: { $in: courses } });
  await SeqTopic.deleteMany({ course: { $in: courses } });
  report.removed.push(...topics.map((t) => ({ topicId: t.topicId, title: t.title })));
}

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

  await retireCourses(report);

  if (!opts.quiet) {
    const ok = report.imported.map((r) => `${r.topicId} (${r.lessons} lessons, ${r.items} items)`).join(', ');
    console.log(`📚 Sequential Curriculum imported: ${ok || 'none'}`);
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
