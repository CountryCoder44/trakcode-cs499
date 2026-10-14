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
// Each course: the folder under `Sequential Curriculum/` and the topic-file id
// prefix (`_FORMAT.md` §2 — the `Stack` value: `py`, `ts`, `cpp`).
const COURSE_DIRS: Record<string, { dir: string; prefix: string }> = {
  python: { dir: 'Python', prefix: 'py' },
  typescript: { dir: 'TypeScript', prefix: 'ts' },
};

function repoRoot(): string {
  // server/src/seeds -> server/src -> server -> <root>
  return path.resolve(__dirname, '..', '..', '..');
}

export interface ImportReport {
  imported: { topicId: string; title: string; lessons: number; items: number; file: string }[];
  skipped: { file: string; error: string }[];
}

export async function importSeqCurriculum(opts: { quiet?: boolean } = {}): Promise<ImportReport> {
  const report: ImportReport = { imported: [], skipped: [] };
  const root = repoRoot();
  // Narration clips currently exist for the Python course only (see AUDIO.md);
  // keys are `py-*`, so attaching to another course is a no-op regardless.
  const generatedAudio = await loadGeneratedAudio();
  const audioCount = Object.keys(generatedAudio).length;

  for (const [course, { dir: dirName, prefix }] of Object.entries(COURSE_DIRS)) {
    const dir = path.join(root, 'Sequential Curriculum', dirName);
    const fileRe = new RegExp(`^${prefix}-topic-\\d+.*\\.md$`);
    let entries: string[] = [];
    try {
      entries = (await fs.readdir(dir)).filter((f) => fileRe.test(f)).sort();
    } catch {
      if (!opts.quiet) console.warn(`⚠️  Sequential Curriculum dir not found: ${dir}`);
      continue;
    }

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
  }

  if (!opts.quiet) {
    const ok = report.imported.map((r) => `${r.topicId} (${r.lessons} lessons, ${r.items} items)`).join(', ');
    console.log(`📚 Sequential Curriculum imported: ${ok || 'none'}${audioCount ? ` — ${audioCount} narration clips attached` : ''}`);
  }
  return report;
}
