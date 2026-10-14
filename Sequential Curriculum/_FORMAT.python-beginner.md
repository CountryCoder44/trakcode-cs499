# Python: Beginner — format addendum

This course reuses the **same engine and the same base contract** as
[`_FORMAT.md`](_FORMAT.md): same `.md`-is-source-of-truth model, same item
types (`reading`/`concept`/`practical`/`checkpoint`), same evaluators,
same `require_code`/`forbid_code` discipline, same `practice_group` pattern
for optional debugging drills, same per-serve MC option shuffle. **Read
`_FORMAT.md` first.** This file only states where Python: Beginner
deliberately differs, per the course outline the user provided 2026-09-21.

A separate, parallel course from the existing `python` Sequential
Curriculum — not a replacement, not a rename. Both stay live; a learner (or
this project) can compare how each teaches the same underlying language.

---

## 1. Identity

| | |
|---|---|
| `course` frontmatter value | `python_beginner` |
| Topic ID | `py-bN` (e.g. `py-b1`, `py-b2`, ... `py-b11` — the user's own compact scheme, no `-topic-` segment, no leading-zero padding) |
| Lesson ID | `py-bN.M` (e.g. `py-b1.1`) |
| Item ID | `py-bN.M-II` (e.g. `py-b1.1-01`) |
| Checkpoint ID | `py-bN.CP` |
| Directory | `Sequential Curriculum/PythonBeginner/py-bN-slug.md` *(see note)* |
| Manifest | `Sequential Curriculum/MANIFEST.python-beginner.md` |
| Sandbox language | `python` (via `COURSE_LANGUAGE` in `seq.controller.ts`) |
| Section values | Same three (`foundations`/`core`/`professional`) the client's course page already groups by — this course's 3 parts map onto them: Part 1 → `foundations`, Part 2 → `core`, Part 3 → `professional`. |

**Note on the id scheme**: item ids are `py-bN.M-II`, not `py-N.M-II` — the
`b` disambiguates from the existing `python` course's own `py-N.M-II`
namespace, since item/lesson/topic ids are global keys throughout the app
(`SeqProgress`, tutor session `contextId`s) and a collision
would be silent and serious. `COURSE_DIRS` in
`server/src/seeds/seqCurriculum.import.ts` is registered for
`python_beginner` with its own filename-matching regex (`/^(py-b\d+).*\.md$/`,
not the `<prefix>-topic-<NN>` shape `python`/`typescript` use) — that regex's
one capture group MUST exactly reproduce each file's `topic_id` frontmatter
value character-for-character, or the importer's stale-topic reconciliation
pass can silently delete a topic that still has a file on disk. If a topic's
`topic_id` ever needs to deviate from `py-b<digits>`, update that regex in
the same change.

## 2. The Lesson Page Contract → `reading` items

The user's outline requires **every lesson to open with a reading before any
question or task**, with eight specific content requirements (what/why/
connects-to-prior/example/trace-the-example/vocabulary-before-assessment/
misconception-warning/no-forward-references). This is exactly what the
existing `reading` item type (`_FORMAT.md` §3) already does mechanically —
built this session for the main `python` course's Topic 6 — extended here
into a **required**, not optional, part of every lesson's authoring:

- Every lesson MUST open with one `type: reading` item, ID `py-bN.M-00`
  (the `-00` convention — see `_FORMAT.md` §3's `reading` entry for why a
  fresh number, not a renumbering of `01`+, is used).
- Its `read:` field must satisfy the user's 8-point checklist. Since
  `read:` collapses to a single flowing paragraph (no preserved blank
  lines — a real gotcha hit authoring Topic 6, see
  [[trak-tutor-features]]), write it as one continuous paragraph (or a
  couple of sentences addressing each point in sequence), not as visually
  separate paragraphs that will silently merge.
- Voice: conversational, concise, technically correct — "a patient
  instructor speaking directly to the learner," explicitly NOT condensed
  reference documentation. Match the tone of Topic 6's reading items in the
  `python` course as the reference example, not the terser `overview`-style
  prose elsewhere.
- Topic 1's readings are the ONLY readings in the whole course allowed to
  reference syntax that's "recognition only" ahead of when it's formally
  taught (per the outline's own Topic 1 assessment boundary) — every other
  topic's readings must stay strictly within what's already been taught.

**Topic 2 exception (2026-09-27, deliberate A/B test — not a mistake to
"fix" back):** Topic 2 was rewritten from a user-generated content dump
that uses a different pattern: no separate `py-b2.M-00` reading item at
all. Instead, every single item (`concept` and `practical` alike) opens
with its own 4+ sentence `read:`/`do:` lead-in before its question or
task, and the lesson goes straight from item `-01` onward. This roughly
doubled the lesson's item count (4 → 6 per lesson) and pushed the topic
comfortably past the ≥50% live-coding floor (67.6%) without a reading
item diluting it. The user is testing whether this per-item-reading style
works better than the one-reading-item-per-lesson convention above —
until told otherwise, treat Topic 2 as the intentionally divergent
sample, not the new default; don't retrofit this pattern onto Topics 1 or
3, and don't add a `-00` reading item back into Topic 2 without being
asked.

## 3. Closing word problems, not term-matching questions

Every lesson ends with one or two **word problems** — a concept embedded in
a believable scenario, requiring the learner to identify the relevant
information and produce a result, never a bare "which operator does X"
question. This is a *quality* rule for how `concept`/`practical` items are
worded, not a new item type or field — author `check:`/`do:` text as a
scenario, per the outline's own before/after example:

- Avoid: "Which operator calculates a remainder?"
- Prefer: "A teacher has 29 pencils and puts 6 pencils in each supply box.
  Write code that displays how many pencils remain after filling as many
  complete boxes as possible."

Requirements on these closing items specifically:
- Use only concepts/syntax from the current reading or an earlier completed
  lesson (no forward references — stricter version of the general rule).
- Vary names/values/context per item — never let a learner pattern-match a
  memorized example instead of transferring the concept.
- Never word the problem so it gives away the required operator, type,
  statement, or function name.
- **Topic 1**: closing problems are scenario-based *reasoning* questions
  (concept items) — Topic 1's code is read-only, so nothing is live-coded
  yet. **From Topic 2 on**: at least one closing problem per lesson should
  normally be a live-coding task (`practical`); a second may trace, repair,
  or explain code instead when that fits the lesson better.

## 4. Concept tagging — `concepts_required` / `concepts_introduced`

New, optional item-level fields (added to the shared engine this session,
usable by any course, but specifically for this course's Practice Mode
plan): a single-line, comma-separated list of concept-tag names.

```
- **concepts_required:** variables, assignment, print()
- **concepts_introduced:** type()
```

- `concepts_required`: everything this item assumes the learner already
  knows (from an earlier lesson, or the current reading).
- `concepts_introduced`: anything genuinely new this item teaches for the
  first time (usually only non-empty on a lesson's `reading`/first
  `concept` item; most items introduce nothing new and just practice).
- Server-only (never sent to `publicItem`, same as `require_code`).
- **Not yet consumed by any grading or Practice Mode logic** — this is
  metadata capture only, so authoring doesn't need to be retrofitted once
  the scoping logic described below is actually built. Author these tags
  as content is written; don't invent a controlled vocabulary yet, just be
  consistent with a term once you've used it once in this course.

Course/topic/lesson identifiers (also called for in the outline) need no
new field — they're already fully encoded in every item's `itemId`
(`py-bN.M-II`). "Item format" is `type` + `evaluator`. "Whether live
execution is required" is derivable from `evaluator` (`browser-exec` /
`hidden-tests` need it, `mc` / `local-verify` don't) — same signal
`hasCodeEditor` already computes in `tutorContext.service.ts`.

## 5. Practice Mode boundary — planned, NOT built this pass

The outline requires Beginner Practice Mode to generate only from
`python_beginner` concepts the learner has actually completed, with
Advanced Python (unbuilt, reserved) never leaking in. **Deliberately
deferred until real content exists to scope against** — building the
restriction logic blind, before any lesson is authored, risks the same
mistake already made once this session building against assumed-but-wrong
requirements. The existing `seqPracticeScope.service.ts` (`resolveTopicScope`/
`getCompletedTopicNumbers`) already scopes Deep Dive/Flash Card generation
per-course by topic number; extending it to use the new concept tags above
for finer-grained scoping is the next real piece of work here, once Topics
1-3 land and the tags exist to test against. `python_beginner` is **not**
yet added to the `Stack` type (`types/domain.ts`) — it's a Sequential
Curriculum `course` only for now, which is sufficient for Learn Mode; adding
it to `Stack` (needed for a real, separate Practice Mode track, per the
outline's "Practice track: Beginner Python") is part of that same deferred
work, not done here.

## 6. Everything else — unchanged from `_FORMAT.md`

Checkpoint every topic from 2 on (Topic 1 has none, matching the outline's
own "Topic 1 remains the read-only introduction and has no practical
checkpoint"); ≥50% of a lesson's required items and time is live coding
from Topic 2 on; debugging drills are a `practice_group` bonus pool,
separate from numbered lesson content (per the outline's own "Dedicated
debugging drills remain separate from the numbered lesson content" — same
mechanism, same reasoning, as the main course's Topics 2/5/6); `require_code`/
`forbid_code` on every construct-focused practical; MC options shuffled
per-serve (engine-wide already, nothing course-specific to do).
