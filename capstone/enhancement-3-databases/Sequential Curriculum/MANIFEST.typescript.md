# TypeScript course — manifest

Locked structure: 25 topics in 4 parts (Foundations 1–8, Type System 9–16, Real
Applications 17–22, Advanced & Professional 23–25). From Topic 2 on, ≥ 50% of
required items and learner time is live coding; Topic 1 is the stated exception.
**Strict TypeScript from the first lesson** — every practical is type-checked
with `--strict` before it runs (see the per-course note in [`_FORMAT.md`](_FORMAT.md)).

**Lesson rebuild in progress (2026-09-02).** The previously-authored lessons
(Topics 1–25) were found to assume concepts not yet taught at that point in the
sequence. Topics 2–25 have been reset to **frontmatter-only stubs** and are being
rebuilt from scratch, one topic at a time, against a per-topic "introduced so
far" ledger. Topic 1 is rebuilt (browser workspace only — no local Node/`tsc`
install steps; the `## Checkpoint` is kept). The pre-reset content (all 25 fully
authored topics) is in git at commit `8d92156`.

Status per topic: `stub` (frontmatter only) → `authored` (lessons written,
awaiting external validation) → `validated` (signed off).
Engine rules: [`_PLATFORM.md`](_PLATFORM.md).

**Playable in the app:** every `ts-topic-*.md` in `TypeScript/` is imported on
server boot into `seqTopics` and rendered at `/course/typescript` (nav: Learn →
courses → TypeScript). Grading is live behind the strict `tsc` gate. A stub topic
imports with 0 items and shows a "being rebuilt" state, keeping its outline slot.

**Engine pieces that carry the course (unchanged by the reset):** multi-course
`seq` importer (`COURSE_DIRS`), strict `tsc` gate in the sandbox
(`services/execution-sandbox/src/runners/typeCheck.ts`, opt-in via
`strictTypeCheck`), `/courses` picker (`client/src/courses.ts` + `CoursesPage`),
optional checkpoints, per-serve MC option shuffle.

---

## Part I — TypeScript Foundations

| # | Topic | Section | Status |
|---|---|---|---|
| 1 | Introduction to TypeScript | foundations | rebuilt — browser-only (6 lessons + checkpoint); awaiting external validation |
| 2 | Variables, Primitive Types & Inference | foundations | stub |
| 3 | Operators, Conversion & Expressions | foundations | stub |
| 4 | Strings & Text Processing | foundations | stub |
| 5 | Arrays, Tuples & Readonly Data | foundations | stub |
| 6 | Objects & Structural Typing | foundations | stub |
| 7 | Conditional Logic & Basic Narrowing | foundations | stub |
| 8 | Loops & Iteration | foundations | stub |

## Part II — The TypeScript Type System

| # | Topic | Section | Status |
|---|---|---|---|
| 9 | Functions, Parameters & Return Types | core | stub |
| 10 | Type Aliases & Interfaces | core | stub |
| 11 | Unions, Literals & Discriminated Unions | core | stub |
| 12 | Safe and Unsafe Type Operations | core | stub |
| 13 | Generics | core | stub |
| 14 | Classes & Object-Oriented TypeScript | core | stub |
| 15 | Errors & Reliable Program Flow | core | stub |
| 16 | Modules, Packages & Project Organization | core | stub |

## Part III — Building Real TypeScript Applications

| # | Topic | Section | Status |
|---|---|---|---|
| 17 | Collections & Functional Data Processing | professional | stub |
| 18 | Asynchronous TypeScript & the Event Loop | professional | stub |
| 19 | APIs, JSON & Runtime Validation | professional | stub |
| 20 | Node.js Applications & File I/O | professional | stub |
| 21 | Browser TypeScript & the DOM | professional | stub |
| 22 | Testing, Debugging & Logging | professional | stub |

## Part IV — Advanced & Professional TypeScript

| # | Topic | Section | Status |
|---|---|---|---|
| 23 | Advanced Type Construction | professional | stub |
| 24 | Data Structures & Algorithms in TypeScript | professional | stub |
| 25 | Professional TypeScript Practices | professional | stub |
