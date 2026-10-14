# Python: Beginner course — manifest

A **separate, parallel Python course** (`course: python_beginner`, topic ids
`py-b1`..`py-b11`, item ids `py-bN.M-II`) — not a replacement for the
original `python` course, which was deleted on 2026-10-12 (this is now the only Python course). Built to test an alternate teaching approach: every lesson
opens with a required `reading` item (see [`_FORMAT.python-beginner.md`](_FORMAT.python-beginner.md)
§2), closing questions are word problems in a believable scenario rather than
term-matching questions (§3), and every item carries `concepts_required`/
`concepts_introduced` tags for a planned, not-yet-built Practice Mode
restriction (§5).

Format contract: this file's own addendum,
[`_FORMAT.python-beginner.md`](_FORMAT.python-beginner.md) — read it together
with the shared [`_FORMAT.md`](_FORMAT.md); the addendum only states deltas.
Engine rules: [`_PLATFORM.md`](_PLATFORM.md) (shared, unchanged).

Status per topic: `todo` (nothing authored) → `authored` (lessons written,
awaiting external validation) → `validated` (signed off) → `locked` (content
reviewed and approved).

**Playable in the app once any topic is authored:** `COURSE_DIRS` in
`server/src/seeds/seqCurriculum.import.ts` is already registered for
`python_beginner` → `Sequential Curriculum/PythonBeginner/`. No further engine
wiring is needed to bring a topic live — author the `.md`, drop it in that
directory, reimport.

**Not yet done, tracked separately (see `_FORMAT.python-beginner.md` §5):**
the actual Practice Mode restriction logic (Beginner-only, completed-lessons-only
generation) — concept tags are captured at authoring time, but nothing consumes
them yet. `python_beginner` is not yet a `Stack` value, so it has no dedicated
Practice Mode track (Deep Dive/Flash Card) of its own yet either — Learn Mode
works fully without this.

---

## Course map — 11 topics in 3 parts

### Part 1 — Python Foundations (`section: foundations`)

| # | Topic | Status |
|---|---|---|
| 1 | Introduction to Python | live: rewritten 2026-10-12, 3 lessons x 6 concept items (18), no checkpoint |
| 2 | Values, Variables, Output, and Types | live 2026-10-12: rebuilt to the new outline, 6 lessons + checkpoint, 37 items, 25 live |
| 3 | User Input and Type Conversion | live 2026-10-12: rebuilt to the new outline, 5 lessons + checkpoint, 31 items, 21 live |
| 4 | Operators and Expressions | live 2026-10-12: 6 lessons + checkpoint, 37 items, 25 live |
| 5 | Decisions and Conditional Logic | live 2026-10-12: 5 lessons + checkpoint, 31 items, 21 live |

### Part 2 - Working with Data (`section: core`)

| # | Topic | Status |
|---|---|---|
| 6 | String Processing | live 2026-10-12: 6 lessons + checkpoint, 37 items, 25 live |
| 7 | Lists and Sequence Basics | live 2026-10-12: 6 lessons + checkpoint, 37 items, 25 live |
| 8 | Loops and Basic Algorithms | live 2026-10-12: 6 lessons + checkpoint, 37 items, 25 live |
| 9 | Functions and Scope | live 2026-10-12: 6 lessons + checkpoint, 37 items, 25 live |

### Part 3 - Problem Solving (`section: professional`)

| # | Topic | Status |
|---|---|---|
| 10 | Introduction to Exception Handling | live 2026-10-12: 6 lessons + checkpoint, 37 items, 25 live |
| 11 | Capstone: Study Session Tracker | live 2026-10-12: 6 lessons + final checkpoint, 37 items, 25 live |

---

## Reserved, not built: Advanced Python

A separate future course (own course identifier, own Practice Mode track) per
the user's outline — scope listed there (deeper functions/type hints, dicts/
tuples/sets, comprehensions, modules/packages, file I/O, OOP, iterators/
generators, decorators, recursion, testing, DS&A, regex, dates, dependency
management, async/concurrency, packaging). **None of this scope may appear in
Beginner Python content, hidden tests, or generated practice** — the outline is
explicit that Beginner and Advanced must never cross-contaminate. Not
scaffolded at all yet (no `COURSE_DIRS` entry, no directory) — do that only
when the user actually starts it, not preemptively.
