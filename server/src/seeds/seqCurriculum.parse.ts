import { SeqItem, SeqLesson, SeqItemType, SeqEvaluator, SeqOption, SeqHiddenTest } from '../models/SeqTopic';

// Parser for the Sequential Curriculum `.md` source-of-truth format
// (see `Sequential Curriculum/_FORMAT.md`). Purpose-built and line-based —
// we own the format, so this is deterministic rather than a general Markdown
// parser. It fails LOUD on anything it can't account for, matching the
// "throw rather than silently ship a broken lesson" convention already used
// by curriculum.seed.ts.

export interface ParsedTopic {
  topicId: string;
  course: string;
  section: string;
  topicNumber: number;
  title: string;
  slug: string;
  overview: string;
  liveCodingException: boolean;
  // A topic MAY omit its checkpoint (concept-only topics like the browser-only
  // intro): drop `checkpoint_id` from frontmatter and the `## Checkpoint`
  // section together. When absent the topic completes once every lesson item
  // passes.
  checkpointId: string | null;
  lessons: SeqLesson[];
  checkpoint: SeqItem | null;
}

class ParseError extends Error {
  constructor(msg: string, file: string, lineNo?: number) {
    super(`[${file}${lineNo != null ? `:${lineNo}` : ''}] ${msg}`);
    this.name = 'SeqParseError';
  }
}

const FIELD_RE = /^(\s*)- \*\*([a-z_]+):\*\*\s?(.*)$/;
const OPTION_RE = /^\s*- ([A-Z])\.\s+(.*)$/;
const LESSON_RE = /^##\s+Lesson\s+([\d.]+)\s+[—-]\s+(.+?)\s*\{#([\w.-]+)\}\s*$/;
const CHECKPOINT_RE = /^##\s+Checkpoint\b.*\{#([\w.-]+)\}\s*$/;
const ITEM_RE = /^###\s+(\S+)\s+·\s+(.+?)\s*$/;
const TOPIC_H1_RE = /^#\s+Topic\s+\d+\s+[—-]\s+(.+?)\s*$/;

// snake_case field name -> camelCase key used in the parsed field map.
// Includes lesson/checkpoint-scope keys (objective, estimated_time, …) which
// buildItem simply ignores when they aren't part of an item.
const FIELD_KEY: Record<string, string> = {
  type: 'type',
  read: 'read',
  check: 'check',
  answer: 'answer',
  rationale: 'rationale',
  if_incorrect: 'ifIncorrect',
  branch_key: 'branchKey',
  do: 'do',
  brief: 'brief',
  requirements: 'requirements',
  starter_code: 'starterCode',
  code: 'code',
  solution: 'solution', // admin answer key — never sent to a non-admin client
  evaluator: 'evaluator',
  expect_exact_output: 'expectExactOutput',
  expect_output_contains: 'expectOutputContains',
  expect_exit_code: 'expectExitCode',
  require_code: 'requireCode', // regex list — every pattern must match the submission
  forbid_code: 'forbidCode', // regex list — no pattern may match the submission
  concepts_required: 'conceptsRequired', // comma-separated concept-tag list — see _FORMAT.md
  concepts_introduced: 'conceptsIntroduced', // comma-separated concept-tag list — see _FORMAT.md
  accept_pattern: 'acceptPattern',
  accept_commands: 'acceptCommands',
  hidden_tests: 'hiddenTests',
  tutor: 'tutor',
  pass_rule: 'passRule',
  practice_group: 'practiceGroup', // optional pick-any-one-of-N bonus pool, see _FORMAT.md
  objective: 'objective', // lesson/checkpoint scope
  estimated_time: 'estimatedTime',
  item_count: 'itemCount',
  live_coding_items: 'liveCodingItems',
};

interface Line {
  raw: string;
  no: number;
}

function dedent(lines: string[]): string {
  const nonEmpty = lines.filter((l) => l.trim() !== '');
  if (nonEmpty.length === 0) return '';
  const min = Math.min(...nonEmpty.map((l) => l.match(/^ */)![0].length));
  return lines.map((l) => l.slice(min)).join('\n').replace(/\s+$/, '');
}

// ---- frontmatter ----

function parseFrontmatter(text: string, file: string): { fm: Record<string, string>; bodyStart: number } {
  const lines = text.split('\n');
  if (lines[0].trim() !== '---') throw new ParseError('file must start with YAML frontmatter (---)', file, 1);
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      end = i;
      break;
    }
  }
  if (end === -1) throw new ParseError('unterminated frontmatter', file, 1);
  const fm: Record<string, string> = {};
  for (let i = 1; i < end; i++) {
    const l = lines[i];
    if (l.trim() === '') continue;
    const m = l.match(/^([a-z_]+):\s*(.*)$/);
    if (!m) throw new ParseError(`bad frontmatter line: ${JSON.stringify(l)}`, file, i + 1);
    fm[m[1]] = m[2].trim();
  }
  return { fm, bodyStart: end + 1 };
}

// ---- field-block reader ----
// Given the lines of one item/lesson/checkpoint block, produce a field map.
// Understands: inline values (+ indented continuation), fenced ``` blocks,
// YAML `|` blocks, `check:` option sub-lists, and `requirements:` sub-bullets.
function readFields(blockLines: Line[], file: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  let i = 0;
  while (i < blockLines.length) {
    const { raw, no } = blockLines[i];
    if (raw.trim() === '') {
      i++;
      continue;
    }
    const fm = raw.match(FIELD_RE);
    if (!fm) {
      // Stray line that isn't a field — only tolerated if blank-ish; else loud.
      throw new ParseError(`expected a "- **field:**" line, got ${JSON.stringify(raw)}`, file, no);
    }
    const name = fm[2];
    const inline = fm[3].trim();
    const key = FIELD_KEY[name];
    if (!key) throw new ParseError(`unknown field "${name}"`, file, no);
    i++;

    // Gather this field's continuation region: everything up to the next
    // top-level "- **field:**" line (indent 0) or end of block.
    const region: Line[] = [];
    while (i < blockLines.length) {
      const l = blockLines[i];
      if (/^- \*\*[a-z_]+:\*\*/.test(l.raw)) break;
      region.push(l);
      i++;
    }

    out[key] = interpretValue(name, inline, region, file, no);
  }
  return out;
}

function interpretValue(name: string, inline: string, region: Line[], file: string, no: number): unknown {
  // fenced code block inside the region
  const fenceIdx = region.findIndex((l) => l.raw.trim().startsWith('```'));

  if (name === 'check') {
    // Region layout: [question continuation lines] [optional ```fenced code```]
    // [ "- A. …" options, each possibly wrapping onto indented lines ].
    const options: SeqOption[] = [];
    const qLines: Line[] = [];
    let checkCode: string | undefined;
    let sawOption = false;
    let i = 0;
    while (i < region.length) {
      const raw = region[i].raw;
      if (raw.trim().startsWith('```')) {
        const rel = region.slice(i + 1).findIndex((l) => l.raw.trim().startsWith('```'));
        if (rel === -1) throw new ParseError('unterminated code block inside check', file, region[i].no);
        checkCode = dedent(region.slice(i + 1, i + 1 + rel).map((l) => l.raw));
        i += rel + 2;
        continue;
      }
      const om = raw.match(OPTION_RE);
      if (om) {
        options.push({ letter: om[1], text: om[2].trim() });
        sawOption = true;
      } else if (sawOption) {
        if (raw.trim() && options.length) options[options.length - 1].text += ' ' + raw.trim();
      } else {
        qLines.push(region[i]);
      }
      i++;
    }
    return {
      __check: [inline, joinProse(qLines)].filter(Boolean).join(' ').trim(),
      __options: options,
      __checkCode: checkCode,
    };
  }

  if (name === 'requirements') {
    const reqs: string[] = [];
    for (const l of region) {
      if (l.raw.trim() === '') continue;
      const t = l.raw.replace(/^\s+/, '');
      if (t.startsWith('- ')) {
        const depth = (l.raw.match(/^ */)![0].length);
        if (depth <= 3) reqs.push(t.slice(2).trim());
        else if (reqs.length) reqs[reqs.length - 1] += '\n  ' + t.slice(2).trim();
      } else if (reqs.length) {
        // A plain word-wrapped continuation of the previous bullet's prose —
        // no "- " marker of its own, just an indented line that keeps the
        // same sentence going (the normal case for a bullet too long for one
        // line). Was silently dropped entirely before this fix — join with a
        // space so it reads as one continuous sentence, not a newline (that's
        // reserved for the nested-bullet case above).
        reqs[reqs.length - 1] += ' ' + t.trim();
      }
    }
    return reqs;
  }

  if (name === 'require_code' || name === 'forbid_code') {
    // A `- ` list of regex patterns, one per line. Authors wrap each in
    // `backticks` for readability; strip them so the value is the raw pattern.
    const pats: string[] = [];
    for (const l of region) {
      const t = l.raw.replace(/^\s+/, '');
      if (t.startsWith('- ')) pats.push(unwrapInlineCode(t.slice(2).trim()));
    }
    return pats;
  }

  if (name === 'concepts_required' || name === 'concepts_introduced') {
    // A single-line, comma-separated tag list — concept names, not code, so
    // no backtick-unwrapping needed. Empty entries (a trailing comma, a blank
    // value) are dropped rather than kept as ''.
    return inline
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (name === 'hidden_tests') {
    if (fenceIdx === -1) throw new ParseError('hidden_tests needs a fenced ```yaml block', file, no);
    const body = extractFence(region, fenceIdx);
    return parseHiddenTests(body, file, no);
  }

  if (name === 'starter_code' || name === 'code' || name === 'solution') {
    if (fenceIdx === -1) throw new ParseError(`${name} needs a fenced code block`, file, no);
    return extractFence(region, fenceIdx);
  }

  if (name === 'expect_exact_output') {
    if (inline === '|') return dedent(region.map((l) => l.raw));
    if (fenceIdx !== -1) return extractFence(region, fenceIdx);
    if (inline) return unwrapInlineCode(inline);
    throw new ParseError('expect_exact_output needs a value (| block, fenced block, or inline)', file, no);
  }

  // Scalar config fields are frequently written wrapped in `backticks` in the
  // source for readability — strip a single surrounding pair so the value is
  // the literal regex / string / letter, not "`...`".
  if (['answer', 'evaluator', 'type', 'branch_key', 'accept_pattern', 'expect_output_contains'].includes(name)) {
    return unwrapInlineCode(inline);
  }

  if (name === 'accept_commands') {
    try {
      return JSON.parse(inline);
    } catch {
      throw new ParseError(`accept_commands must be a JSON array, got ${JSON.stringify(inline)}`, file, no);
    }
  }

  if (name === 'item_count' || name === 'live_coding_items' || name === 'expect_exit_code') {
    const n = Number(inline);
    if (!Number.isFinite(n)) throw new ParseError(`${name} must be a number`, file, no);
    return n;
  }

  if (name === 'practice_group') {
    const v = inline.trim().toLowerCase();
    if (v !== 'true' && v !== 'false') {
      throw new ParseError(`practice_group must be true or false, got ${JSON.stringify(inline)}`, file, no);
    }
    return v === 'true';
  }

  // default: inline + prose continuation joined
  const prose = joinProse(region);
  return [inline, prose].filter(Boolean).join(' ').trim();
}

function unwrapInlineCode(s: string): string {
  const t = s.trim();
  const m = t.match(/^`([^`]*)`$/);
  return m ? m[1] : t;
}

function joinProse(region: Line[]): string {
  return region
    .map((l) => l.raw.trim())
    .filter((t) => t !== '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractFence(region: Line[], fenceIdx: number): string {
  const closeRel = region.slice(fenceIdx + 1).findIndex((l) => l.raw.trim().startsWith('```'));
  if (closeRel === -1) throw new Error('unterminated fenced block');
  const inner = region.slice(fenceIdx + 1, fenceIdx + 1 + closeRel).map((l) => l.raw);
  return dedent(inner);
}

function parseHiddenTests(body: string, file: string, no: number): SeqHiddenTest[] {
  const tests: SeqHiddenTest[] = [];
  let cur: Partial<SeqHiddenTest> | null = null;
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    if (line === '') continue;
    let m = line.match(/^-\s+stdin:\s*(.*)$/);
    if (m) {
      if (cur) tests.push(finishTest(cur, file, no));
      cur = { stdin: unquoteYaml(m[1], file, no) };
      continue;
    }
    m = line.match(/^stdout:\s*(.*)$/);
    if (m) {
      if (!cur) throw new ParseError('hidden_tests: stdout before stdin', file, no);
      cur.stdout = unquoteYaml(m[1], file, no);
      continue;
    }
    m = line.match(/^stdin:\s*(.*)$/);
    if (m) {
      if (cur) tests.push(finishTest(cur, file, no));
      cur = { stdin: unquoteYaml(m[1], file, no) };
      continue;
    }
    throw new ParseError(`hidden_tests: unparseable line ${JSON.stringify(line)}`, file, no);
  }
  if (cur) tests.push(finishTest(cur, file, no));
  if (tests.length === 0) throw new ParseError('hidden_tests block is empty', file, no);
  return tests;
}

function finishTest(t: Partial<SeqHiddenTest>, file: string, no: number): SeqHiddenTest {
  if (t.stdin === undefined || t.stdout === undefined) {
    throw new ParseError(`hidden_tests entry missing stdin/stdout: ${JSON.stringify(t)}`, file, no);
  }
  return { stdin: t.stdin, stdout: t.stdout };
}

function unquoteYaml(v: string, file: string, no: number): string {
  const s = v.trim();
  if (s.startsWith('"') && s.endsWith('"')) {
    try {
      return JSON.parse(s);
    } catch {
      throw new ParseError(`bad quoted string ${JSON.stringify(s)}`, file, no);
    }
  }
  // bare scalar — treat literal, translate escaped \n
  return s.replace(/\\n/g, '\n');
}

// ---- item assembly ----

function buildItem(itemId: string, title: string, fields: Record<string, unknown>, file: string, defaultType: SeqItemType | null): SeqItem {
  const type = (fields.type as SeqItemType) ?? defaultType;
  if (!type || !['concept', 'practical', 'checkpoint', 'reading'].includes(type)) {
    throw new ParseError(`item ${itemId}: missing/invalid "type" (${type})`, file);
  }

  const item: SeqItem = { itemId, title, type };

  if ('read' in fields) item.read = fields.read as string;
  if ('check' in fields) {
    const c = fields.check as { __check: string; __options: SeqOption[]; __checkCode?: string };
    item.check = c.__check;
    if (c.__options.length) item.options = c.__options;
    if (c.__checkCode) item.checkCode = c.__checkCode;
  }
  if ('answer' in fields) item.answer = String(fields.answer).toUpperCase().replace(/\s/g, '');
  if ('rationale' in fields) item.rationale = fields.rationale as string;
  if ('ifIncorrect' in fields) item.ifIncorrect = fields.ifIncorrect as string;
  if ('branchKey' in fields) item.branchKey = fields.branchKey as string;
  if ('do' in fields) item.do = fields.do as string;
  if ('brief' in fields) item.brief = fields.brief as string;
  if ('requirements' in fields) item.requirements = fields.requirements as string[];
  if ('starterCode' in fields) item.starterCode = fields.starterCode as string;
  if ('code' in fields) item.code = fields.code as string;
  if ('solution' in fields) item.solution = fields.solution as string;
  if ('evaluator' in fields) item.evaluator = fields.evaluator as SeqEvaluator;
  if ('expectExactOutput' in fields) item.expectExactOutput = fields.expectExactOutput as string;
  if ('expectOutputContains' in fields) item.expectOutputContains = fields.expectOutputContains as string;
  if ('expectExitCode' in fields) item.expectExitCode = fields.expectExitCode as number;
  if ('requireCode' in fields) item.requireCode = fields.requireCode as string[];
  if ('forbidCode' in fields) item.forbidCode = fields.forbidCode as string[];
  if ('conceptsRequired' in fields) item.conceptsRequired = fields.conceptsRequired as string[];
  if ('conceptsIntroduced' in fields) item.conceptsIntroduced = fields.conceptsIntroduced as string[];
  if ('acceptPattern' in fields) item.acceptPattern = fields.acceptPattern as string;
  if ('acceptCommands' in fields) item.acceptCommands = fields.acceptCommands as string[];
  if ('hiddenTests' in fields) item.hiddenTests = fields.hiddenTests as SeqHiddenTest[];
  if ('tutor' in fields) item.tutor = fields.tutor as string;
  if ('passRule' in fields) item.passRule = fields.passRule as string;
  if ('practiceGroup' in fields) item.practiceGroup = fields.practiceGroup as boolean;

  validateItem(item, file);
  return item;
}

function validateItem(item: SeqItem, file: string): void {
  if (item.type === 'concept') {
    if (!item.check) throw new ParseError(`concept ${item.itemId}: no check`, file);
    if (!item.options || item.options.length < 2) throw new ParseError(`concept ${item.itemId}: needs >=2 options`, file);
    if (!item.answer) throw new ParseError(`concept ${item.itemId}: no answer`, file);
    for (const a of item.answer.split(',')) {
      if (!item.options.some((o) => o.letter === a)) {
        throw new ParseError(`concept ${item.itemId}: answer "${a}" not among options`, file);
      }
    }
    // branch-select is authored as a concept with evaluator: branch-select
    if (item.evaluator && !['mc', 'branch-select'].includes(item.evaluator)) {
      throw new ParseError(`concept ${item.itemId}: unexpected evaluator ${item.evaluator}`, file);
    }
  } else if (item.type === 'reading') {
    // A pure framing paragraph — no evaluator, no answer key, nothing to
    // grade. Passes unconditionally the moment the learner acknowledges it.
    if (!item.read) throw new ParseError(`reading ${item.itemId}: no read`, file);
    if (item.evaluator) throw new ParseError(`reading ${item.itemId}: reading items don't take an evaluator`, file);
  } else {
    // practical / checkpoint
    const ev = item.evaluator;
    if (!ev) throw new ParseError(`${item.type} ${item.itemId}: no evaluator`, file);
    if (ev === 'browser-exec' && !item.expectExactOutput && !item.expectOutputContains) {
      throw new ParseError(`${item.itemId}: browser-exec needs expect_exact_output or expect_output_contains`, file);
    }
    if (ev === 'hidden-tests' && (!item.hiddenTests || item.hiddenTests.length === 0)) {
      throw new ParseError(`${item.itemId}: hidden-tests needs hidden_tests`, file);
    }
    // Source assertions apply only to code the sandbox runs.
    for (const [key, pats] of [
      ['require_code', item.requireCode],
      ['forbid_code', item.forbidCode],
    ] as const) {
      if (!pats || pats.length === 0) continue;
      if (ev !== 'browser-exec' && ev !== 'hidden-tests') {
        throw new ParseError(`${item.itemId}: ${key} only applies to browser-exec / hidden-tests`, file);
      }
      for (const p of pats) {
        try {
          new RegExp(p);
        } catch (e) {
          throw new ParseError(`${item.itemId}: ${key} has an invalid regex ${JSON.stringify(p)} — ${(e as Error).message}`, file);
        }
      }
    }
  }
}

// ---- top-level parse ----

export function parseTopicMarkdown(rawText: string, file: string): ParsedTopic {
  const text = rawText.replace(/\r\n?/g, '\n'); // tolerate CRLF / CR line endings
  const { fm, bodyStart } = parseFrontmatter(text, file);
  const need = (k: string): string => {
    if (!(k in fm)) throw new ParseError(`frontmatter missing "${k}"`, file);
    return fm[k];
  };

  const lessonIds = parseInlineList(need('lessons'));
  const checkpointId = 'checkpoint_id' in fm ? fm['checkpoint_id'].trim() : null;

  const allLines: Line[] = text.split('\n').map((raw, idx) => ({ raw, no: idx + 1 }));
  const body = allLines.slice(bodyStart);

  // Split body into: overview (before first "## "), then a run of "## " sections.
  const sectionStarts: number[] = [];
  body.forEach((l, idx) => {
    if (/^##\s+/.test(l.raw)) sectionStarts.push(idx);
  });

  // A frontmatter-only stub (topic exists in the outline, lessons not yet
  // authored). Valid: the importer stores it with no lessons/checkpoint and the
  // app shows a "being built" state. Requires `lessons: []` in frontmatter.
  if (sectionStarts.length === 0) {
    if (lessonIds.length > 0) {
      throw new ParseError(
        `no "## Lesson" sections, but frontmatter lists lessons [${lessonIds.join(', ')}] — set "lessons: []" for a stub`,
        file
      );
    }
    if (checkpointId) throw new ParseError('stub topic must not declare a checkpoint_id', file);
    return {
      topicId: need('topic_id'),
      course: need('course'),
      section: need('section'),
      topicNumber: Number(need('topic_number')),
      title: need('title'),
      slug: need('slug'),
      overview: '',
      liveCodingException: (fm.live_coding_exception ?? 'false').trim() === 'true',
      checkpointId: null,
      lessons: [],
      checkpoint: null,
    };
  }

  const overviewLines = body.slice(0, sectionStarts[0]).map((l) => l.raw);
  // drop a leading "# Topic N — ..." line from the overview
  const overview = dedent(overviewLines.filter((l) => !TOPIC_H1_RE.test(l))).trim();

  const lessons: SeqLesson[] = [];
  let checkpoint: SeqItem | null = null;

  for (let s = 0; s < sectionStarts.length; s++) {
    const start = sectionStarts[s];
    const end = s + 1 < sectionStarts.length ? sectionStarts[s + 1] : body.length;
    const sectionLines = body.slice(start, end);
    const head = sectionLines[0].raw;

    const lm = head.match(LESSON_RE);
    const cm = head.match(CHECKPOINT_RE);

    if (lm) {
      lessons.push(parseLessonSection(lm, sectionLines.slice(1), file));
    } else if (cm) {
      checkpoint = parseCheckpointSection(cm[1], sectionLines.slice(1), file);
    } else if (/^##\s+/.test(head)) {
      // Non lesson/checkpoint "## " section (e.g. a stray notes heading) — ignore
      // its body but don't fail; keeps the format forgiving for prose headings.
      continue;
    }
  }

  if (checkpointId && !checkpoint) {
    throw new ParseError(`frontmatter has checkpoint_id ${checkpointId} but no "## Checkpoint" section`, file);
  }
  if (checkpoint && !checkpointId) {
    throw new ParseError(`"## Checkpoint" section present but frontmatter has no checkpoint_id`, file);
  }
  if (checkpoint && checkpointId && checkpoint.itemId !== checkpointId) {
    throw new ParseError(`checkpoint anchor ${checkpoint.itemId} != frontmatter checkpoint_id ${checkpointId}`, file);
  }

  const gotLessonIds = lessons.map((l) => l.lessonId);
  for (const id of lessonIds) {
    if (!gotLessonIds.includes(id)) throw new ParseError(`frontmatter lists lesson ${id} but no "## Lesson … {#${id}}" section`, file);
  }

  return {
    topicId: need('topic_id'),
    course: need('course'),
    section: need('section'),
    topicNumber: Number(need('topic_number')),
    title: need('title'),
    slug: need('slug'),
    overview,
    liveCodingException: (fm.live_coding_exception ?? 'false').trim() === 'true',
    checkpointId,
    lessons,
    checkpoint,
  };
}

function parseInlineList(v: string): string[] {
  const s = v.trim().replace(/^\[/, '').replace(/\]$/, '');
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseLessonSection(lm: RegExpMatchArray, rest: Line[], file: string): SeqLesson {
  const number = lm[1];
  const title = lm[2].trim();
  const lessonId = lm[3];

  // lesson-scope fields (before the first "### ") vs. items
  const itemStarts: number[] = [];
  rest.forEach((l, idx) => {
    if (ITEM_RE.test(l.raw)) itemStarts.push(idx);
  });
  const scopeEnd = itemStarts.length ? itemStarts[0] : rest.length;
  const scopeFields = readFields(rest.slice(0, scopeEnd), file);

  const items: SeqItem[] = [];
  for (let k = 0; k < itemStarts.length; k++) {
    const a = itemStarts[k];
    const b = k + 1 < itemStarts.length ? itemStarts[k + 1] : rest.length;
    const im = rest[a].raw.match(ITEM_RE)!;
    const fields = readFields(dropTrailingHr(rest.slice(a + 1, b)), file);
    items.push(buildItem(im[1], im[2].trim(), fields, file, null));
  }

  if (items.length === 0) throw new ParseError(`lesson ${lessonId} has no "### " items`, file);

  return {
    lessonId,
    number,
    title,
    objective: scopeFields.objective as string | undefined,
    estimatedTime: scopeFields.estimatedTime as string | undefined,
    itemCount: scopeFields.itemCount as number | undefined,
    liveCodingItems: scopeFields.liveCodingItems as number | undefined,
    items,
  };
}

function parseCheckpointSection(anchorId: string, rest: Line[], file: string): SeqItem {
  const fields = readFields(dropTrailingHr(rest), file);
  // checkpoint section carries objective/estimated_time at the same scope as
  // the item fields; buildItem ignores the lesson-only ones it doesn't map.
  const title = 'Checkpoint';
  return buildItem(anchorId, title, fields, file, 'checkpoint');
}

// strip a trailing "---" horizontal rule and blank lines a section may end with
function dropTrailingHr(lines: Line[]): Line[] {
  const out = [...lines];
  while (out.length && (out[out.length - 1].raw.trim() === '' || out[out.length - 1].raw.trim() === '---')) {
    out.pop();
  }
  return out;
}
