# Curriculum source-of-truth format (`v1`)

Every topic is authored as **one Markdown file** in its course folder
(`Sequential Curriculum/Python/py-topic-NN-slug.md`). The `.md` is the single
source of truth. Any `.docx` in the same folder is a **read-only export** — never
hand-edit both.

An importer parses these files into the platform's `Lesson` / `LessonItem`
records (data model TBD). This document is the contract that parser depends on.
If a topic file deviates from it, the importer breaks — so keep it exact.

---

## 1. File skeleton

````markdown
---
topic_id: py-topic-02
course: python
section: foundations          # foundations | core | professional
topic_number: 2
title: Variables, Data Types & Type Conversion
slug: variables-types
lessons: [py-2.1, py-2.2, py-2.3, py-2.4, py-2.5, py-2.6]
checkpoint_id: py-2.CP         # OMIT for a concept-only topic (drop the `## Checkpoint` section too)
live_coding_exception: false  # true only for Topic 1
format_version: 1
---

# Topic 2 — Variables, Data Types & Type Conversion

Short topic overview (1–2 paragraphs). State scope boundaries here: what is
deliberately deferred, and to which topic.

## Lesson 2.1 — Values, Variables, and Assignment  {#py-2.1}

- **objective:** One sentence: what the learner can do after this lesson.
- **estimated_time:** 20–30 min
- **item_count:** 8
- **live_coding_items:** 5      # count of `type: practical` items in this lesson

### py-2.1-01 · A Value Is a Piece of Data

- **type:** concept
- **read:** Prose. May run several lines; the value continues until the next
  `- **field:**` line or the next `###`/`##`.
- **check:** The question shown to the learner.
  - A. option text
  - B. option text
  - C. option text
  - D. option text
- **answer:** B
- **rationale:** Why B is correct (shown after a correct answer).
- **if_incorrect:** Targeted feedback addressing the likely misconception. Do NOT
  restate global mechanics ("keep the item open, offer the tutor, retry, no
  score") — that is platform-wide policy, see `_PLATFORM.md`.
- **tutor:** Guidance for the AI tutor for THIS item (what to ask, what not to
  reveal, what analogy to use).
- **pass_rule:** The exact condition that marks this item complete.

### py-2.1-04 · Bind Your First Variable

- **type:** practical
- **do:** Instructions for what to write and run in the workspace editor.
- **starter_code:**
  ```python
  # visible to the learner in the editor when the item opens
  city =
  ```
- **evaluator:** browser-exec
- **expect_exact_output:** |
  Denver
- **tutor:** Per-item tutor guidance.
- **pass_rule:** Workspace run exits 0 and stdout matches `expect_exact_output`.

## Checkpoint — Topic 2  {#py-2.CP}

- **objective:** One sentence describing the end-to-end task.
- **estimated_time:** 15–25 min
- **type:** checkpoint
- **brief:** Learner-facing description of the program to build.
- **requirements:**
  - Bullet list of everything the solution must do.
  - Written so each bullet is independently checkable.
- **starter_code:**
  ```python
  ```
- **evaluator:** hidden-tests
- **hidden_tests:**
  ```yaml
  - stdin: "Ada Lovelace\n36\nLondon\n7"
    stdout: "Name: Ada Lovelace\nAge: 36\nCity: London\nIn 10 years you will be 46\nFavorite number doubled: 14"
  - stdin: "Grace Hopper\n45\nNew York\n3"
    stdout: "Name: Grace Hopper\nAge: 45\nCity: New York\nIn 10 years you will be 55\nFavorite number doubled: 6"
  ```
- **tutor:** Per-checkpoint tutor guidance.
- **pass_rule:** All hidden tests pass. Passing the checkpoint completes the topic.
````

---

## 2. IDs

| Level | Pattern | Example | Rule |
|---|---|---|---|
| Topic | `py-topic-NN` | `py-topic-07` | `NN` zero-padded, matches `topic_number` |
| Lesson | `py-N.M` | `py-7.3` | `N` = topic number, `M` = lesson number |
| Item | `py-N.M-II` | `py-7.3-04` | `II` zero-padded, **assigned once and never reused** |
| Checkpoint | `py-N.CP` | `py-7.CP` | one per topic |
| Checkpoint item | `py-N.CP-II` | `py-7.CP-02` | when a checkpoint has multiple graded parts |

Course prefix is the `Stack` value: `py` (Python), `ts` (TypeScript), `cpp`.
Files live under `Sequential Curriculum/<Course>/<prefix>-topic-NN-slug.md`
(`Python/`, `TypeScript/`, …) and the boot-time importer scans each course dir
for its own prefix.

**Item IDs are positional-independent.** To insert an item between `-03` and
`-04`, give it the next unused number for that lesson (e.g. `-09`) and place it
where it belongs in the file; `order` comes from file position, not the ID.
Never renumber an existing item — stored learner progress is keyed to the ID.

---

## 3. Item types

### `reading`
**Optional, experimental as of 2026-09-19.** A pure framing paragraph, no
quiz and no code, on the lesson's real-world practical value: why this
construct matters outside the exercises. Required field: `read` only. No
`evaluator`, `check`/`answer`, or expectation fields — it can't take one, and
`validateItem` rejects an `evaluator` on a `reading` item. Passes
unconditionally the instant the learner clicks Continue (`gradeReading()`
always returns `passed: true`); still a normal, required, ordered item like
any other (gates the next item, counts toward `item_count`, shows in the
rail) — NOT a `practice_group` bonus. Convention when used: one per lesson,
authored as the FIRST item with a fresh, never-reused item number `py-N.M-00`
(numbering existing items 01+ untouched — inserting at 01 would mean
renumbering everything after it, which breaks learners' saved progress
for that lesson). Because it's a required item that isn't live-coding, it
does dilute a lesson's live-coding ratio against the ≥50% rule below — that's
an accepted, known tradeoff for a lesson that adds one, not something to
silently work around by inflating `live_coding_items`.

### `concept`
Short reading, then one check. Required fields: `read`, `check` (+ 2–6 lettered
options as a sub-list), `answer`, `rationale`, `if_incorrect`, `tutor`,
`pass_rule`.

- `answer` is one letter, or several comma-separated (`A,C`) for multi-select.
- Options are `  - X. text` lines directly under `check:`, `X` ∈ `A..F`.

### `practical`
Learner writes and runs code. Required fields: `do`, `evaluator`, `tutor`,
`pass_rule`. Optional: `starter_code`, plus one or more expectation fields (§4),
`practice_group: true` (see §6 rule 1a).

### `checkpoint`
The topic-ending pass/fail practical, in a `## Checkpoint` section. **Optional**
— at most one per topic. A concept-only topic (e.g. the browser-only intro) omits
both the `## Checkpoint` section and the `checkpoint_id` frontmatter key; it
completes once every lesson item passes. When present, required fields:
`objective`, `type: checkpoint`, `brief`, `requirements`, `evaluator`, `tutor`,
`pass_rule`. Optional: `starter_code`, `hidden_tests`.

---

## 4. Evaluators and expectation fields

| `evaluator` | Meaning | Expectation fields it reads |
|---|---|---|
| `mc` | multiple-choice (implicit for every `concept`) | `answer` |
| `browser-exec` | run code in the TrakCode workspace sandbox | `expect_exact_output` / `expect_output_contains` / `expect_exit_code` / `require_code` / `forbid_code` |
| `hidden-tests` | run against stdin/stdout cases the learner can't see | `hidden_tests` (YAML list of `{stdin, stdout}`) / `require_code` / `forbid_code` |
| `local-verify` | learner pastes terminal output from their own machine | `accept_pattern` (regex) / `accept_commands` (list) |
| `branch-select` | learner picks one option that steers later items | `answer` + `branch_key` |

Rules:
- `expect_exact_output` — full stdout after trailing-newline normalization must
  equal this block, byte for byte.
- `expect_output_contains` — stdout must contain this substring.
- `expect_exit_code` — defaults to `0` if omitted.
- Multi-line expectation values use a YAML `|` block or `\n` escapes; the importer
  accepts either. Keep one style per file.
- `hidden_tests` stdin/stdout use `\n` for newlines. Sandbox normalizes `\r\n`
  → `\n` on captured streams (see the execution-sandbox notes), so author with
  `\n` only.
- Before Topic 2 Lesson 2.6, **no practical may read stdin** — user input is not
  taught yet. Use literal values and `expect_exact_output`. From 2.6 on,
  `hidden-tests` with stdin is allowed.
- `require_code` / `forbid_code` — a `- ` list of regex patterns (wrap each in
  `backticks`; the importer strips them). Checked against the submitted source
  **only after the output already matched**: every `require_code` pattern must
  match, no `forbid_code` pattern may. A violation is a hard fail with a nudge —
  the run's output was right but the code sidestepped the point (e.g.
  `print("Denver")` for an exercise about using a variable). Patterns are matched
  with the `m` flag; an un-compilable pattern fails the import. Server-only — the
  learner never sees these. Assert **only the construct the lesson teaches**;
  everything else about the solution stays freeform.

### Per-course notes

- **Python** — the stdin rule above.
- **TypeScript** — the grader runs a **strict `tsc --noEmit` gate before every
  code item** (any course-configured language; TS is the one that uses it). A
  practical passes only when the submission both type-checks under `--strict`
  *and* produces the expected output; a type error comes back through
  `compile_error`, same channel as a C++ compile error. So: every reference
  solution and every *fixed* form of a "repair" starter must be strict-clean.
  Reading `input()`-style stdin is not taught anywhere in Part I (Topics 1–8),
  so **all** Part I practicals and checkpoints use literal values +
  `expect_exact_output` (no `hidden-tests`). Two recurring strict gotchas to
  design around: `const x = <literal>` gives a *literal* type, so
  `x === <other literal>` is a "no overlap" compile error — annotate the
  operand (`const x: number = 75`) or use `let`; and `!"str"` / `0 ?? x` on a
  literal is an "always truthy/nullish" compile error — narrow via annotated
  unions, not literals.

---

## 5. Code blocks

- Always fence with a language (` ```python `, ` ```text `, ` ```yaml `).
- One fenced block per field. The block immediately following a `- **field:**`
  line belongs to that field.
- `starter_code` = what is pre-loaded into the editor.
- `solution` (optional, `practical` / `checkpoint`) = a correct reference
  solution, as a fenced code block. It is the **admin answer key**: the importer
  keeps it, but the API sends it **only to an admin** (see `publicItem`), for the
  "Reveal answer / Fill solution" button in the lesson player's admin tools.
  Author it alongside the exercise and keep it passing — it is also the obvious
  place to store what a verification pass checks.
- For terminal transcripts / multi-OS command lists, use ` ```text ` and label
  lines inside the block (`Windows:  py --version`). Do not put prose in a
  ```python block.

---

## 6. Global rules baked into every topic

1. Items within a lesson are strictly ordered; each unlocks only when the
   previous one passes. Lessons unlock in order. The checkpoint (if any) unlocks
   only when every lesson in the topic is complete.
   1a. **Practice groups (optional, standing pattern):** a lesson may end with a
       pool of `practical` items each marked `practice_group: true` — e.g. a set
       of debugging exercises. These are NOT ordered against each other: once
       every item *before* the group has passed, the whole group opens at once,
       and passing **any single one** of them satisfies the lesson (unlocking
       the next lesson/checkpoint) exactly as if every item had passed. The
       group's remaining items stay open afterward as ungated bonus practice —
       optional, never required, never re-locked. A lesson with no
       `practice_group` items behaves exactly as rule 1 describes with no
       change.
       **Launch visibility (v1 launch push, 2026-09-16):** authoring continues
       as normal — the user will keep handing off debugging-exercise drafts
       for Topics 5+ same as Topic 2's — but `practice_group` items are now
       hidden from every non-admin request, and non-gating in the unlock math,
       until `PRACTICE_GROUPS_LAUNCHED` (`server/src/config/constants.ts`)
       flips to `true`. See `seq.controller.ts`'s `topicView()`. This keeps
       validation moving without the debugging-exercise content needing to
       be launch-ready on the same clock as the rest of the course.
2. No grades, points, percentages, or attempt penalties anywhere. Progress is
   `locked` / `current` / `complete`. (Full policy: `_PLATFORM.md`.)
3. Most topics end with a `checkpoint`; passing it = topic complete. A
   concept-only topic may omit the checkpoint, and completes when its last
   lesson item passes.
4. **From Topic 2 onward, ≥ 50% of required items AND estimated learner time is
   live coding** (`type: practical` / `checkpoint`). Topic 1 is the only
   exception (`live_coding_exception: true`). The `live_coding_items` field per
   lesson exists so this is mechanically checkable.
5. A concept item's distractors must encode *real* misconceptions (ideally the
   ones named in its own `if_incorrect`), not throwaway absurd options. Spread
   the answer key across letters.
6. **From Topic 2 onward, a `browser-exec` / `hidden-tests` practical whose point
   is a specific construct must (a) state the requirement in its `do:` in plain
   words ("declare a string variable and print that variable") and (b) carry a
   `require_code` regex list asserting that construct is present** — so a bare
   `print("<expected output>")` can't pass. Assert only the taught concept; the
   rest of the solution stays freeform (any variable name, any spacing, etc.).

---

## 7. Authoring status

Tracked in `Sequential Curriculum/MANIFEST.md`:
`todo` → `authored` (content complete, awaiting external validation) →
`validated` (signed off). The importer only consumes `authored` or `validated`.

**Stub files.** A topic in the outline whose lessons are not yet written is a
frontmatter-only file: the identity keys, `lessons: []`, no `checkpoint_id`, and
nothing below the frontmatter. The importer accepts it (0 items) so the topic
keeps its place in the course; the app shows a "being rebuilt" state. Every
practical must use only concepts introduced by an earlier item — build a running
"introduced so far" ledger per topic and check each practical/checkpoint's
`do` + `starter_code` + reference solution against it.
