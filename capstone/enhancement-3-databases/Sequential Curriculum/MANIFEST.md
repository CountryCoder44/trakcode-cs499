# Python course — manifest

Locked structure: **15 topics in 3 parts** (trimmed from an earlier 22-topic
outline on 2026-09-16 to meet a launch date — see "Post-launch roadmap" below
for what got deferred, not deleted; nothing authored was lost, since every
dropped topic was still a frontmatter-only stub). From Topic 2 on, ≥50% of
required items and learner time is live coding; Topic 1 is the stated
exception.

Status per topic: `stub` (frontmatter only) → `authored` (lessons written,
awaiting external validation) → `validated` (signed off) → **`locked`**
(content + Trak narration both reviewed and approved — see the
`python-seq-locked` project memory for exactly which items/clips).
Format contract: [`_FORMAT.md`](_FORMAT.md). Engine rules: [`_PLATFORM.md`](_PLATFORM.md).

**Narration (TTS):** see [`AUDIO.md`](AUDIO.md).

**Playable in the app:** every `py-topic-*.md` directly under `Python/` is
imported on server boot into `seqTopics` and rendered at `/course/python`. A
stub topic imports with 0 items and shows a "being rebuilt" state. Topics
dropped for launch have had their files moved to
`Python/_post-launch-roadmap/` — outside the importer's (non-recursive)
directory scan — so they don't linger as dangling stub slots; nothing is
deleted.

**Section note:** the `section:` frontmatter field still only takes the three
existing values `foundations`/`core`/`professional` (the client's
`SeqCoursePage.tsx` groups by this fixed set) — they're just relabeled to the
new Part names below rather than given new slugs, to avoid silently dropping
a topic from the course page.

---

## Part 1 — Python Foundations (`section: foundations`)

| # | Topic | Status |
|---|---|---|
| 1 | Introduction to Python | **locked** — concept-only (2 lessons, 18 items, no checkpoint); content + narration reviewed and approved |
| 2 | Variables, Data Types, and Input | 8 lessons (print → variables → int/float → str → bool/None/type() → conversion → f-strings → input) + checkpoint; Lessons 2.1–2.3 **locked** (content + narration); 2.4–2.8 + checkpoint authored, awaiting narration |
| 3 | Operators and Expressions | authored — 6 lessons + checkpoint, 39 items; awaiting narration |
| 4 | Working With Strings | **locked** — 8 lessons + checkpoint, 59 items; content + narration fully reviewed and approved |
| 5 | Lists and Tuples | 9 lessons + checkpoint, 54 required items (exactly 50% live coding each) + 9 hidden `practice_group` debugging-pool items (one per lesson, same hidden-until-launch pattern as Topic 2) + checkpoint; Lessons 5.1–5.8 **locked** (content + narration); 5.9 + checkpoint narration in progress |
| 6 | Dictionaries and Sets | authored (2026-09-18 total rewrite from a fresh user-supplied dump; 2026-09-20 added a `reading` item — a new item type — as the first item of every lesson) — 9 lessons + checkpoint, 63 lesson items (54 concept/practical + 9 reading) + checkpoint, variable-length lessons, no `practice_group` items in this version; 5 of 9 lessons now sit at 43% live coding (below the ≥50% floor) since a reading item counts as required but isn't live coding — a known, accepted tradeoff, not a gap to silently fix; Lessons 6.1-6.2 narrated except the new reading items (text-only per direction); awaiting external validation |

## Part 2 — Program Logic (`section: core`)

| # | Topic | Status |
|---|---|---|
| 7 | Conditional Logic | stub |
| 8 | Loops | stub |
| 9 | Functions | stub |
| 10 | Errors, Exceptions, and Debugging | stub — scope broadened from the old "Exception Handling" to include debugging technique (reading tracebacks, print-debugging) |

## Part 3 — Building Complete Programs (`section: professional`)

| # | Topic | Status |
|---|---|---|
| 11 | Files and Structured Data | stub |
| 12 | Modules, Packages, and Environments | stub |
| 13 | Object-Oriented Programming Essentials | stub — deliberately scoped to essentials (classes/objects/inheritance basics), not a deep dive |
| 14 | Testing and Code Quality | stub — new subject for this file slot, replacing the dropped "Comprehensions & Functional Tools"; promotes the testing angle of the old, never-authored "Testing, Debugging & Logging" topic (now archived — see roadmap) |
| 15 | Final Python Project | stub — new capstone topic, replacing the dropped "Data Structures & Algorithms Fundamentals"; **project brief/scope not yet defined — needs direction before authoring starts** |

---

## Checkpoint focus (intended, per topic — to be authored with each topic)

| Topic | Checkpoint focus |
|---|---|
| 1 | (none — concept-only intro) |
| 2 | Read name + current age + a favorite number from input, convert, do arithmetic (+10, ×2), print a 4-line f-string summary. *(`hidden-tests`)* |
| 3 | Translate written requirements into working expressions. *(`hidden-tests`, no branching allowed; read `base`/`bonus`/`limit`, compute a score with `**`/`*`/`+=`, print a 4-line report)* |
| 4 | Build a small text formatter / profile generator. *(`hidden-tests`; clean + display-case a first/last name via indexing and slicing, build and reverse a short code, then search/count/replace inside a normalized message)* |
| 5 | Choose list vs tuple and manipulate the stored data. |
| 6 | Build a structured record; remove or compare duplicate data. |
| 7 | Rules-based decision program with several possible outcomes. |
| 8 | Process a collection and produce a calculated result. |
| 9 | Refactor a procedural program into small reusable functions. |
| 10 | Diagnose and handle invalid input/errors without crashing; demonstrate reading a traceback. |
| 11 | Small persistent app that saves and reloads data. |
| 12 | Turn a single-file program into an organized multi-module project. |
| 13 | Model a small real-world system with cooperating classes. |
| 14 | Write a small test suite for a program with an intentional defect; find and fix it via the tests. |
| 15 | TBD — depends on the project brief (see status table above). |

---

## Post-launch roadmap (trimmed from the 15-topic launch outline, 2026-09-16)

Deferred, not deleted — every one of these was still a frontmatter-only stub
with zero authored content, so nothing written was lost. Files archived at
`Sequential Curriculum/Python/_post-launch-roadmap/` (outside the live import
path).

| Old # | Topic | Notes |
|---|---|---|
| 14 | Comprehensions & Functional Tools | List/dict comprehensions explicitly cut from v1 (not folded into Loops, per direction); map/filter/reduce/lambda deferred with it |
| 15 | Data Structures & Algorithms Fundamentals | File slot repurposed for the Topic 15 capstone; subject itself deferred |
| 16 | Iterators, Generators & Decorators | |
| 17 | Testing, Debugging & Logging | Testing angle promoted into the new Topic 14; debugging angle promoted into the new Topic 10; logging itself deferred |
| 18 | Working with Databases | |
| 19 | Regular Expressions & Date/Time Handling | |
| 20 | Working with APIs & Web Integration | |
| 21 | Concurrency Basics | |
| 22 | Professional Best Practices | Some threads (documented/typed/tested project) may resurface inside the Topic 15 capstone |

**Also on the horizon (a course-level decision, not a curriculum topic):**
whether to keep C++ as a third stack — left exactly as-is for now per
direction; revisit once Python and TypeScript are both complete to see if
there's still runway before launch.
