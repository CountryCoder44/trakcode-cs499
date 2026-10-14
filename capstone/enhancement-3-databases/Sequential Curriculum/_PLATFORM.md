# Platform rules for the Sequential Curriculum

Engine behavior shared by every topic. Topic files reference these rules; they do
not restate them. (Lifted out of the Topic 1 draft, where "Learning Flow and
Platform Rules" + "Platform Implementation Notes" were inlined.)

---

## Learning flow

Core pattern: short reading or action → one focused check → pass → unlock the
next item. If the learner does not pass, they get feedback, may ask the AI tutor,
and retry without penalty.

The required sequence:

1. Show exactly one required item as the current task.
2. Let the learner read, answer, or complete the action.
3. Evaluate the item as passed or not-yet-passed.
4. When passed, mark it complete and unlock exactly the next item.
5. When not yet passed, explain the misconception, offer the AI tutor, allow
   another attempt.
6. Finish the lesson only when every required item has passed, in order.
7. A topic completes when its checkpoint passes; a concept-only topic (one with
   no checkpoint) completes when its last lesson item passes.

**Practice groups.** A lesson may end with a pool of optional items (authored
`practice_group: true` in `_FORMAT.md`, e.g. a set of debugging exercises) that
don't unlock one-by-one against each other. Once every required item *before*
the group has passed, the whole group becomes available at once — the learner
sees all of them and picks whichever they want. Passing any single one finishes
the lesson exactly as rule 6 describes; the rest stay available afterward as
optional bonus practice, not required and never re-locked. The UI marks these
items so the learner knows only one is needed ("Complete any one of these to
continue"), and re-labels the rest "Bonus practice" once the lesson is done.

**Multiple-choice option order.** The engine presents a concept item's options in
a fresh random order every time the question is opened, and re-scrambles them
(clearing the current selection) after a wrong answer before the learner may try
again. Grading is by each option's stable internal key, which travels with it, so
authored answer-key position carries no signal — `_FORMAT.md` §5's "spread the
answer key across letters" is a nicety, not a correctness requirement. Authors
still write distractors that encode real misconceptions.

**No grades.** Never display percentages, letter grades, points, streak
penalties, or "failed attempt" counts. Progress is only: incomplete, current, or
complete. Attempt count may be stored for adaptive feedback but is never shown as
a score.

---

## Progress states

| State | Meaning | Interface behavior |
|---|---|---|
| Locked | An earlier required item is not complete | Visible in sequence, cannot be opened |
| Current | Available now | Reading/action, check, and AI tutor enabled |
| Complete | Pass condition satisfied | Checkmark shown; content stays reviewable |

Unlock query: an item is available only when the immediately preceding required
item is complete. A lesson is complete only when its last required item is
complete. A checkpoint, if the topic has one, is available only when every lesson
in its topic is complete. **Exception — practice groups:** once every item
before the group is complete, every item in the group is available at once
(not one at a time), and the lesson counts as complete once any single group
item is complete; the rest of the group stays available (never re-locked) as
optional practice.

---

## AI tutor behavior

- The tutor knows the current topic, lesson, item, its reading/prompt, the
  learner's selected answer or submitted code, and previous attempts on this item.
- Before the first attempt on a concept item: it explains concepts and
  vocabulary but does not identify the correct option.
- After an incorrect attempt: it addresses the specific misconception and may
  eliminate one option or give a targeted hint before offering more.
- It asks the learner to reason in their own words rather than just handing over
  an answer.
- For practical/setup items: it may troubleshoot the learner's OS, command, PATH,
  interpreter, working directory, filename, and error message.
- The tutor never advances the learner. Only the item evaluator marks an item
  passed.

### Tutor guardrails

- Never falsely mark an item complete; tutor suggestions are separate from
  evaluation.
- Do not reveal the correct option letter before the learner's first attempt.
- After an incorrect attempt, explain the concept and give a narrowing hint
  before offering the answer.
- For code or setup problems, ask for the exact error message and the relevant
  command instead of guessing.
- Never ask for passwords, tokens, API keys, or unrelated personal data.

---

## Evaluation types

| Type | Pass condition | Retry behavior |
|---|---|---|
| Multiple choice (`mc`) | Correct option selected | Explain misconception; re-scramble the options and clear the selection before re-enabling |
| Browser execution (`browser-exec`) | Expected output + successful exit — plus, if the item declares `require_code` / `forbid_code`, the submitted source must satisfy those patterns | Show output/error; tutor gets execution context. A source-assertion miss shows a nudge ("output right, but you skipped the point"), no advance |
| Hidden tests (`hidden-tests`) | All hidden stdin/stdout cases pass (plus any `require_code` / `forbid_code`) | Show which cases failed, with real input/expected/actual for each (not redacted — the near-miss hint already narrows things down, and the case set itself stays unseen until submitted); tutor gets the diff |
| Local verification (`local-verify`) | Submitted version/output matches the rule | Tutor troubleshoots OS, command, path, interpreter |
| Branch selection (`branch-select`) | One valid branch selected | Allow changing the branch until dependent items begin |

---

## Required data per item (for the importer / progress store)

- Stable item ID (`_FORMAT.md` §2) and order index (from file position)
- Reading or action block
- Single check or evaluator config
- Hidden answer / evaluation rule
- Correct-answer rationale
- Incorrect-answer feedback
- AI-tutor context and disclosure policy
- Pass state, completion timestamp, next-item ID

Progress record stores: `courseId`, `topicId`, `lessonId`, `itemId`, `state`,
attempt count (for adaptive feedback, not shown), selected responses / submitted
code, completion timestamp, and practical execution result.
