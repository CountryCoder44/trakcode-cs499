---
topic_id: ts-topic-01
course: typescript
section: foundations
topic_number: 1
title: Introduction to TypeScript
slug: introduction
lessons: [ts-1.1, ts-1.2, ts-1.3, ts-1.4, ts-1.5, ts-1.8]
checkpoint_id: ts-1.CP
live_coding_exception: true
format_version: 1
---

# Topic 1 — Introduction to TypeScript

This topic builds a correct mental model of TypeScript: what it adds to
JavaScript, the difference between compile time and runtime, and how the
compiler turns a `.ts` file into JavaScript that a runtime can execute. All work
is in the TrakCode browser workspace — installing Node.js and a local compiler
are not part of learning the language and are left to the learner's own tooling.
The topic ends with `tsconfig.json` and strict mode.

**Scope boundaries.** `console.log` is used as a copy-this-line tool so you can
run something; it is not studied here. Type annotations appear only in the
checkpoint, where fixing one deliberate compiler error is the point of the
topic — annotations, inference, and the primitive types are Topic 2. Operators
are Topic 3. `if` is Topic 7. Modules, packages, and dependency management are
Topic 16.

**Live-coding note.** Topic 1 is the stated exception to the "≥ 50% live coding"
rule — most items are short reading plus a concept check. The few practicals and
the checkpoint run entirely in the browser workspace.

**Strict from the start.** Every practical in this course — starting with the
Topic 1 checkpoint — is type-checked with `--strict` before it runs. Code that
does not type-check does not pass, even if it would have produced the right
output.

---

## Lesson 1.1 — What Is TypeScript?  {#ts-1.1}

- **objective:** Describe TypeScript as a typed layer over JavaScript and state
  what a type checker does for a program.
- **estimated_time:** 15–25 min
- **item_count:** 5
- **live_coding_items:** 0

### ts-1.1-01 · TypeScript Adds Types to JavaScript

- **type:** concept
- **read:** TypeScript is a programming language that takes JavaScript and adds
  a static type system: a way to describe, in the code itself, what kind of
  value each variable, parameter, and return holds. A tool called the TypeScript
  compiler then checks that the code respects those descriptions.
- **check:** Which best describes TypeScript?
  - A. A replacement for JavaScript that runs in browsers directly
  - B. JavaScript plus a static type system, checked by a compiler
  - C. A JavaScript testing framework
  - D. A code editor for JavaScript
- **answer:** B
- **rationale:** TypeScript is JavaScript with added type annotations and a
  compiler that checks them; it is not a separate runtime.
- **if_incorrect:** Focus on "adds a type system" versus "replaces" or "tests" —
  TypeScript keeps JavaScript's behavior and layers checking on top.
- **tutor:** Ask the learner what a "type" of a value is (number, text, list) and
  why writing that down might help catch mistakes.
- **pass_rule:** Learner selects B.

### ts-1.1-02 · A Type Describes What a Value Can Be

- **type:** concept
- **read:** A type is a label that says what a value is and what you can do with
  it. `number` means arithmetic is allowed; `string` means text operations are
  allowed. Giving a variable a type lets the compiler reject operations that do
  not make sense for that type.
- **check:** What does giving a variable the type `number` let the compiler do?
  - A. Make the program run faster at runtime
  - B. Reject code that treats the variable as text
  - C. Convert any value assigned to it into a number
  - D. Prevent the variable from ever changing
- **answer:** B
- **rationale:** A type is a compile-time constraint: the checker flags misuse.
  It does not convert values or change runtime speed.
- **if_incorrect:** Separate "the compiler checks and complains" from "the
  program does something different when it runs."
- **tutor:** Ask what should happen if code tries to multiply a piece of text —
  should a tool warn about that before the program runs?
- **pass_rule:** Learner selects B.

### ts-1.1-03 · The Type Checker Runs Before the Program

- **type:** concept
- **read:** The TypeScript compiler analyzes your code without running it. It
  reports type errors as messages, each pointing to a file, line, and column.
  Fixing those messages is part of writing TypeScript, the same way fixing
  syntax errors is part of writing any language.
- **check:** When does the TypeScript type checker find a type error?
  - A. While the program is running, as an exception
  - B. Only after the program finishes
  - C. Before the program runs, by analyzing the source
  - D. Never — type errors are only style warnings
- **answer:** C
- **rationale:** Type checking is a static analysis step that happens before
  execution.
- **if_incorrect:** Contrast a message from a tool that read your code with an
  error thrown while the code is executing.
- **tutor:** Ask whether a spell-checker needs you to read the document aloud to
  find a misspelling.
- **pass_rule:** Learner selects C.

### ts-1.1-04 · Why Teams Use TypeScript

- **type:** concept
- **read:** Types act as always-current documentation, let editors offer
  accurate autocomplete and refactoring, and catch a class of bugs — passing the
  wrong kind of value — before code ships. Types do not catch logic mistakes: a
  wrong formula with correct types still type-checks.
- **check:** Which problem will TypeScript's type checker NOT catch on its own?
  - A. Passing a string where a number is expected
  - B. Calling a function with too few arguments
  - C. Using a variable name that was never declared
  - D. A tax calculation that uses the wrong percentage
- **answer:** D
- **rationale:** Types constrain the *kinds* of values, not whether the logic is
  correct. A, B, and C are all type/compile errors.
- **if_incorrect:** Ask whether `price * 0.07` and `price * 0.7` have different
  types. They do not — both are `number`.
- **tutor:** Ask the learner to name one bug types catch and one they do not.
- **pass_rule:** Learner selects D.

### ts-1.1-05 · Keep the Language, Compiler, and Runtime Separate

- **type:** concept
- **read:** TypeScript is the language. `tsc` (the compiler) checks types and
  produces JavaScript. A runtime — Node.js or a browser — executes that
  JavaScript. Keeping these three roles separate makes the next lessons easier.
- **check:** Which tool actually executes the finished code?
  - A. The TypeScript language
  - B. `tsc`, the compiler
  - C. A runtime such as Node.js or a browser
  - D. The `.ts` file extension
- **answer:** C
- **rationale:** The compiler produces JavaScript; a runtime runs it.
- **if_incorrect:** Review each role: language describes, compiler checks and
  emits, runtime executes.
- **tutor:** Use a three-part analogy: the grammar of a language, an editor who
  checks a manuscript, and the printing press that produces the book.
- **pass_rule:** Learner selects C. Passing this item completes Lesson 1.1 and
  unlocks Lesson 1.2.

---

## Lesson 1.2 — TypeScript and JavaScript  {#ts-1.2}

- **objective:** Explain that every TypeScript program is JavaScript with types
  added, and that types are removed before the code runs.
- **estimated_time:** 15–25 min
- **item_count:** 5
- **live_coding_items:** 1

### ts-1.2-01 · TypeScript Is a Superset of JavaScript

- **type:** concept
- **read:** Valid JavaScript is also valid TypeScript. TypeScript adds syntax on
  top — mainly type annotations like `: number` — but it does not remove or
  change any JavaScript feature. Anything you can do in JavaScript, you can do in
  TypeScript.
- **check:** A file contains only ordinary JavaScript, no annotations. Is it
  valid TypeScript?
  - A. Yes — TypeScript is a superset of JavaScript
  - B. No — TypeScript requires a type on every variable
  - C. No — TypeScript cannot read `.js` syntax
  - D. Only if it has no functions
- **answer:** A
- **rationale:** TypeScript is a superset: plain JavaScript is accepted, though
  strict mode will ask for types in some places.
- **if_incorrect:** "Superset" means "everything in the smaller set, plus more."
- **tutor:** Ask what "superset" means for two circles in a diagram.
- **pass_rule:** Learner selects A.

### ts-1.2-02 · Annotations Are the Main Addition

- **type:** concept
- **read:** The most common TypeScript-only syntax is the annotation: a colon and
  a type after a name, as in `let count: number = 0`. The `: number` part is not
  JavaScript and is removed by the compiler. The rest of the line is ordinary
  JavaScript.
- **check:** In `let count: number = 0`, which part is TypeScript-only?
  - A. `let count`
  - B. `: number`
  - C. `= 0`
  - D. the whole line
- **answer:** B
- **rationale:** `: number` is the annotation; `let count = 0` is plain
  JavaScript.
- **if_incorrect:** Cover the `: type` fragment with your finger — what is left
  is JavaScript.
- **tutor:** Ask the learner to point at the colon and read only what follows it.
- **pass_rule:** Learner selects B.

### ts-1.2-03 · Types Are Erased Before Running

- **type:** concept
- **read:** Runtimes do not understand type annotations. The compiler removes
  every annotation when it produces JavaScript — this is called type erasure. At
  runtime there is no `number` type tag on a value; there is just the value.
- **check:** After compilation, where do the type annotations go?
  - A. They are kept in the JavaScript as comments
  - B. They are removed — the runtime never sees them
  - C. They become runtime checks that throw on mismatch
  - D. They are stored in a separate types file the runtime loads
- **answer:** B
- **rationale:** Annotations are erased; the emitted JavaScript has no type
  information.
- **if_incorrect:** The runtime runs JavaScript, and JavaScript has no `: number`
  syntax — so it must be gone by then.
- **tutor:** Ask what a JavaScript engine would do if it actually saw `: number`
  in the code.
- **pass_rule:** Learner selects B.

### ts-1.2-04 · A Type Error Does Not Stop the Runtime

- **type:** concept
- **read:** Because types are erased, a type error is a message from the
  compiler, not a runtime crash. If you ignore `tsc` and run the emitted
  JavaScript anyway, it will execute — possibly with the very bug the type error
  warned about. The value of TypeScript comes from acting on the messages.
- **check:** You have a type error but run the compiled JavaScript anyway. What
  happens?
  - A. The runtime refuses to start
  - B. The JavaScript runs; the type error was only a compile-time message
  - C. The runtime shows the same type error
  - D. The file is automatically deleted
- **answer:** B
- **rationale:** Type errors live at compile time. The emitted JavaScript still
  runs; TypeScript's protection only helps if you fix the reported errors.
- **if_incorrect:** Recall type erasure — the running code has no idea a type
  error was reported.
- **tutor:** Ask why fixing the compiler's messages, rather than ignoring them,
  is the whole point.
- **pass_rule:** Learner selects B.

### ts-1.2-05 · Run Plain JavaScript Written as TypeScript

- **type:** practical
- **do:** This is ordinary JavaScript with no annotations — and therefore valid
  TypeScript. Run it in the TrakCode workspace and read the output.
- **starter_code:**
  ```ts
  console.log("Every JS line is also TS");
  ```
- **evaluator:** browser-exec
- **expect_exact_output:** |
  Every JS line is also TS
- **tutor:** If nothing runs, check the quotation marks match and the line ends
  with `)`. Nothing here needs a type annotation.
- **pass_rule:** Run exits 0 and stdout is exactly `Every JS line is also TS`.
  Passing completes Lesson 1.2 and unlocks Lesson 1.3.

---

## Lesson 1.3 — Compile Time and Runtime  {#ts-1.3}

- **objective:** Classify an error as compile-time or runtime, and explain why
  the distinction matters for TypeScript.
- **estimated_time:** 20–30 min
- **item_count:** 5
- **live_coding_items:** 1

### ts-1.3-01 · Compile Time Is When the Compiler Reads Your Code

- **type:** concept
- **read:** Compile time is the phase where `tsc` parses your source, checks
  types, and emits JavaScript. Nothing executes during compile time. Errors found
  here — syntax errors, type errors — are reported as text and stop the emit for
  that file if severe enough.
- **check:** What is happening at "compile time"?
  - A. The program is running and producing output
  - B. `tsc` is analyzing the source and checking types
  - C. A user is typing into the running program
  - D. The operating system is starting Node.js
- **answer:** B
- **rationale:** Compile time is the static analysis + emit phase, before any
  execution.
- **if_incorrect:** "Compile" = translate and check; "run" = execute. They are
  different phases.
- **tutor:** Ask which phase a spelling mistake in a keyword belongs to.
- **pass_rule:** Learner selects B.

### ts-1.3-02 · Runtime Is When the Runtime Executes the Code

- **type:** concept
- **read:** Runtime is the phase where Node.js or a browser executes the emitted
  JavaScript, top to bottom. Errors here — dividing by a missing value, calling
  something that is not a function — are exceptions thrown while the program
  runs.
- **check:** A program starts, prints one line, then throws an error and stops.
  When did that error occur?
  - A. At compile time
  - B. At runtime
  - C. Before compile time
  - D. It is not an error
- **answer:** B
- **rationale:** The program was executing and printing output, so the failure
  is a runtime error.
- **if_incorrect:** If output already appeared, the program was running — that is
  runtime.
- **tutor:** Ask what had to be true for the first line to have printed at all.
- **pass_rule:** Learner selects B.

### ts-1.3-03 · TypeScript Moves Some Errors Earlier

- **type:** concept
- **read:** Many bugs that would be runtime errors in plain JavaScript become
  compile-time errors in TypeScript. Passing a string to a function that expects
  a number is caught by `tsc` before you run anything, instead of failing
  partway through execution.
- **check:** What is the main benefit of catching an error at compile time
  instead of runtime?
  - A. It makes the program run faster
  - B. It is found before the code runs, often before it ships
  - C. It uses less memory
  - D. It removes the need for tests
- **answer:** B
- **rationale:** Earlier detection means the bug is fixed before execution and
  before users encounter it. It does not replace testing.
- **if_incorrect:** Focus on *when* the bug is found, not on speed or memory.
- **tutor:** Ask whether it is cheaper to fix a typo before or after printing
  10,000 copies.
- **pass_rule:** Learner selects B.

### ts-1.3-04 · Type Checking Cannot Catch Everything

- **type:** concept
- **read:** Data that arrives while the program runs — user input, a file, a
  network response — has no compile-time type the checker can trust. TypeScript
  helps you *describe* and *validate* that data, but a value that is wrong at
  runtime is still a runtime concern.
- **check:** Why can't the type checker guarantee a value read from a file is a
  number?
  - A. Files cannot contain numbers
  - B. The file's contents are not known until the program runs
  - C. `tsc` never checks function calls
  - D. Numbers have no type in TypeScript
- **answer:** B
- **rationale:** The checker only sees the source. What a file actually contains
  is a runtime fact.
- **if_incorrect:** The compiler reads code, not the data the code will later
  load.
- **tutor:** Ask what the compiler could possibly know about a file that does not
  exist yet.
- **pass_rule:** Learner selects B.

### ts-1.3-05 · Trigger a Runtime Error on Purpose

- **type:** practical
- **do:** This code type-checks fine, but it throws when it runs. Run it in the
  workspace and read the error. Then change the second line to
  `console.log(items.length)` so it prints `3`.
- **starter_code:**
  ```ts
  const items = [10, 20, 30];
  console.log(itemz.length);
  ```
- **evaluator:** browser-exec
- **expect_exact_output:** |
  3
- **tutor:** `itemz` is a different name from `items` — that mismatch is what
  fails. Under strict TypeScript this particular typo is actually caught at
  compile time too; fix the name and read `.length`.
- **pass_rule:** Run exits 0 and stdout is exactly `3`. Passing completes
  Lesson 1.3 and unlocks Lesson 1.4.

---

## Lesson 1.4 — How TypeScript Becomes JavaScript  {#ts-1.4}

- **objective:** Trace a `.ts` file through `tsc` to an emitted `.js` file and
  then to a runtime, and name what each step produces.
- **estimated_time:** 20–30 min
- **item_count:** 5
- **live_coding_items:** 1

### ts-1.4-01 · `tsc` Reads `.ts` and Writes `.js`

- **type:** concept
- **read:** The compiler takes a `.ts` file, checks it, and writes a `.js` file
  next to it (or into an output folder you configure). `greeting.ts` becomes
  `greeting.js`. The `.js` file is what a runtime actually executes.
- **check:** Running `tsc greeting.ts` with no errors produces what?
  - A. A running program
  - B. A `greeting.js` file
  - C. A `greeting.exe` file
  - D. Nothing — `tsc` only prints errors
- **answer:** B
- **rationale:** `tsc` emits JavaScript; here that is `greeting.js`.
- **if_incorrect:** The compiler's job is to *emit* JavaScript, not to run it.
- **tutor:** Ask what file a runtime like Node needs to be handed.
- **pass_rule:** Learner selects B.

### ts-1.4-02 · The Emitted JavaScript Is Recognizable

- **type:** concept
- **read:** The emitted `.js` looks much like your `.ts` with the annotations
  removed. `let count: number = 0` becomes `let count = 0`. Depending on the
  target setting, newer syntax may be rewritten to older equivalents, but the
  logic is unchanged.
- **check:** Your `.ts` has `let total: number = 5`. What is the most likely
  emitted line?
  - A. `let total: number = 5`
  - B. `let total = 5`
  - C. `var total = "5"`
  - D. `const total: number = 5`
- **answer:** B
- **rationale:** The annotation is erased; the rest is kept as-is.
- **if_incorrect:** Type erasure again: `: number` disappears, `let total = 5`
  remains.
- **tutor:** Ask the learner to write the line with the `: number` crossed out.
- **pass_rule:** Learner selects B.

### ts-1.4-03 · Then a Runtime Executes the `.js`

- **type:** concept
- **read:** After `tsc` emits `greeting.js`, you run it with a runtime:
  `node greeting.js`. The full path for a script is: write `.ts` → `tsc` checks
  and emits `.js` → `node` runs `.js` → output or a runtime error.
- **check:** Put the steps in order: (1) `node` runs the file, (2) you write
  `.ts`, (3) `tsc` emits `.js`.
  - A. 2, 3, 1
  - B. 1, 2, 3
  - C. 3, 2, 1
  - D. 2, 1, 3
- **answer:** A
- **rationale:** Author the TypeScript, compile it, then run the JavaScript.
- **if_incorrect:** You cannot run a file that has not been emitted, and it is
  not emitted until you compile what you wrote.
- **tutor:** Ask which step produces the file the next step needs.
- **pass_rule:** Learner selects A.

### ts-1.4-04 · Tools Can Combine the Steps

- **type:** concept
- **read:** Runners such as `ts-node` and `tsx`, and the TrakCode workspace,
  compile and run in one action so you do not manage a separate `.js` file
  during practice. The two phases still happen — they are just hidden behind one
  command.
- **check:** The TrakCode workspace runs your `.ts` with one click. Does that
  remove the compile step?
  - A. Yes — there is no compilation anymore
  - B. No — compilation still happens; it is just automatic and hidden
  - C. Yes — the browser runs TypeScript directly
  - D. No — the workspace only checks syntax, never runs code
- **answer:** B
- **rationale:** A one-step runner still compiles; it just does not leave a
  `.js` file for you to manage.
- **if_incorrect:** "Automatic" is not the same as "absent" — the phase is still
  there.
- **tutor:** Ask whether a coffee machine that grinds and brews in one press has
  stopped grinding the beans.
- **pass_rule:** Learner selects B.

### ts-1.4-05 · Compile-and-Run in the Workspace

- **type:** practical
- **do:** Run this file in the TrakCode workspace. It compiles and executes in
  one step. Confirm the exact output.
- **starter_code:**
  ```ts
  const stack: string = "TypeScript";
  console.log(stack + " compiled and ran");
  ```
- **evaluator:** browser-exec
- **expect_exact_output:** |
  TypeScript compiled and ran
- **tutor:** `stack` is annotated `: string` and assigned a string, so it
  type-checks. `stack + " compiled and ran"` joins two strings.
- **pass_rule:** Run exits 0 and stdout is exactly `TypeScript compiled and ran`.
  Passing completes Lesson 1.4 and unlocks Lesson 1.5.

---

## Lesson 1.5 — The TrakCode TypeScript Workspace  {#ts-1.5}

- **objective:** Use the browser workspace to write, run, and read the output and
  errors of a strict TypeScript program.
- **estimated_time:** 20–30 min
- **item_count:** 5
- **live_coding_items:** 3

### ts-1.5-01 · What the Workspace Gives You

- **type:** concept
- **read:** The TrakCode workspace has an editor, a Run action, an output panel,
  and a place errors appear. It compiles your `.ts` with strict settings and then
  runs the result, so both type errors and runtime output show up in one place.
- **check:** When you press Run in the workspace, what happens to your code?
  - A. Only its syntax is checked; it never executes
  - B. It is type-checked with strict settings, then executed
  - C. It is uploaded to a server and stored
  - D. It is converted to Python and run
- **answer:** B
- **rationale:** The workspace does a strict compile followed by execution.
- **if_incorrect:** Two things happen on Run: a strict type check, then a run of
  the result.
- **tutor:** Ask where a type error would appear versus where `console.log`
  output would appear.
- **pass_rule:** Learner selects B.

### ts-1.5-02 · Run Your First Workspace Program

- **type:** practical
- **do:** In the workspace editor, write a program that prints exactly
  `Workspace ready`. Then run it.
- **starter_code:**
  ```ts
  // print exactly: Workspace ready
  ```
- **evaluator:** browser-exec
- **expect_exact_output:** |
  Workspace ready
- **tutor:** One line: `console.log("Workspace ready");`. Match the capital `W`
  and the single space.
- **pass_rule:** Run exits 0 and stdout is exactly `Workspace ready`.

### ts-1.5-03 · Read a Compile Error in the Workspace

- **type:** practical
- **do:** This program has a type error. Run it once and read the message. Then
  fix it so it prints `42` — change `"42"` to the number `42`.
- **starter_code:**
  ```ts
  const answer: number = "42";
  console.log(answer);
  ```
- **evaluator:** browser-exec
- **expect_exact_output:** |
  42
- **tutor:** The message says a `string` is not assignable to `number`, pointing
  at line 1. The fix is to remove the quotes so the value is the number `42`.
- **pass_rule:** After the fix the program type-checks and stdout is exactly
  `42`.

### ts-1.5-04 · Output Panel vs. Error Panel

- **type:** concept
- **read:** `console.log` text appears in the output panel. Compiler messages and
  thrown runtime errors appear in the error area. A run that shows a compiler
  message and no output means the code never executed — fix the message first.
- **check:** You press Run and see a compiler message but no `console.log`
  output. What does that tell you?
  - A. The output panel is broken
  - B. The code did not run because it failed to compile
  - C. The program ran but produced nothing
  - D. `console.log` is disabled in the workspace
- **answer:** B
- **rationale:** A compile failure means no JavaScript was executed, so there is
  no output.
- **if_incorrect:** Compile happens first; if it fails, the run never starts.
- **tutor:** Ask what has to succeed before any `console.log` can print.
- **pass_rule:** Learner selects B.

### ts-1.5-05 · Print Two Lines

- **type:** practical
- **do:** Write a program that prints exactly two lines: `line one` then
  `line two`.
- **starter_code:**
  ```ts
  // print "line one" then "line two"
  ```
- **evaluator:** browser-exec
- **expect_exact_output:** |
  line one
  line two
- **tutor:** Two `console.log` calls, one per line. Each call adds its own line
  break.
- **pass_rule:** Run exits 0 and stdout is exactly those two lines in order.
  Passing completes Lesson 1.5 and unlocks Lesson 1.8.

---

## Lesson 1.8 — Introduction to tsconfig.json and Strict Mode  {#ts-1.8}

- **objective:** Explain what `tsconfig.json` is for and what turning on
  `strict` changes about type checking.
- **estimated_time:** 15–25 min
- **item_count:** 5
- **live_coding_items:** 1

### ts-1.8-01 · `tsconfig.json` Configures the Compiler

- **type:** concept
- **read:** `tsconfig.json` is a file at the root of a TypeScript project. It
  tells `tsc` which files to include, which JavaScript version to target, where
  to put output, and how strict to be. With a `tsconfig.json` present, you can
  run just `tsc` with no filenames.
- **check:** What is `tsconfig.json` for?
  - A. Storing your program's runtime data
  - B. Configuring how `tsc` compiles the project
  - C. Listing the packages installed from npm
  - D. Recording type errors from the last run
- **answer:** B
- **rationale:** It is the compiler's configuration file for the project.
- **if_incorrect:** It configures the *build*, not the program's data or its
  dependencies (that is `package.json`).
- **tutor:** Ask what changes if you want output in a `dist/` folder instead of
  next to the source.
- **pass_rule:** Learner selects B.

### ts-1.8-02 · `strict` Turns On a Group of Checks

- **type:** concept
- **read:** Setting `"strict": true` enables a group of stricter checks at once,
  including `noImplicitAny` (every value must have a known type, not a silent
  "anything") and `strictNullChecks` (`null` and `undefined` are tracked
  separately and cannot be used where a real value is required).
- **check:** `"strict": true` is a shortcut for what?
  - A. Making the compiler ignore more errors
  - B. Enabling a group of stricter type checks together
  - C. Turning off type checking for faster builds
  - D. Requiring semicolons on every line
- **answer:** B
- **rationale:** `strict` is an umbrella flag that switches on several individual
  strictness options.
- **if_incorrect:** "Strict" makes the checker *pickier*, not more lenient.
- **tutor:** Ask whether stricter checking would report more problems or fewer.
- **pass_rule:** Learner selects B.

### ts-1.8-03 · `noImplicitAny` in Practice

- **type:** concept
- **read:** Without an annotation and without enough context to infer a type,
  `strict` mode refuses to silently treat a value as "any type." A function
  parameter with no annotation, like `function f(x) { ... }`, is an error under
  `strict` until you write `x: number` (or the right type).
- **check:** Under `strict`, why is `function double(n) { return n * 2 }` an
  error?
  - A. `double` is a reserved word
  - B. `n` has no annotation and cannot be inferred, so its type is an implicit
    `any`
  - C. `return` is not allowed in TypeScript
  - D. `n * 2` must be written `n ** 2`
- **answer:** B
- **rationale:** `strict` forbids implicit `any`; the parameter needs a type such
  as `n: number`.
- **if_incorrect:** The problem is the missing type on `n`, not the arithmetic or
  the keyword.
- **tutor:** Ask what type `n` should have for `n * 2` to make sense, then write
  it as `n: number`.
- **pass_rule:** Learner selects B.

### ts-1.8-04 · This Course Uses `strict` Everywhere

- **type:** concept
- **read:** Every workspace practical and checkpoint in this course compiles with
  `strict` on. That is deliberate: strict TypeScript catches more, and learning
  the loose style first would mean unlearning it. Your code must type-check under
  `strict` to pass, in addition to producing the right output.
- **check:** In this course, a practical that produces the right output but has a
  `strict` type error will:
  - A. Pass — output is all that matters
  - B. Not pass — it must type-check under `strict` as well
  - C. Pass with a warning
  - D. Be skipped
- **answer:** B
- **rationale:** The strict compile is a gate: no clean compile, no pass.
- **if_incorrect:** Two conditions must both hold: compiles under `strict`, and
  output matches.
- **tutor:** Ask why a course would enforce the stricter setting from day one.
- **pass_rule:** Learner selects B.

### ts-1.8-05 · Fix an Implicit `any`

- **type:** practical
- **do:** This does not compile under `strict` — the parameter `n` has no type.
  Add the annotation `: number` to `n` so it prints `20`.
- **starter_code:**
  ```ts
  function triple(n) {
    return n * 3;
  }
  console.log(triple(6) + 2);
  ```
- **evaluator:** browser-exec
- **expect_exact_output:** |
  20
- **tutor:** Write `function triple(n: number)`. `triple(6)` is `18`, plus `2` is
  `20`. Functions and their parameter types are studied properly in Topic 9 —
  here you are just satisfying `strict`.
- **pass_rule:** After adding `n: number` the code type-checks and stdout is
  exactly `20`. Passing completes Lesson 1.8 and unlocks the Topic 1 checkpoint.

---

## Checkpoint — Topic 1  {#ts-1.CP}

- **objective:** Write a short TypeScript program in the workspace, fix the one
  deliberate compiler-detected type error, and run it to produce an exact
  result.
- **estimated_time:** 10–20 min
- **type:** checkpoint
- **brief:** In the TrakCode workspace, start from the code below. One line has a
  type error the strict compiler rejects — fix it. Then make the program print
  exactly the four lines described, in order, and run it.
- **requirements:**
  - Fix the single type error so the program compiles under `strict`.
  - The program prints exactly these four lines, in this order, and nothing
    else:
    - `TypeScript adds static types to JavaScript.`
    - `Type checking happens at compile time.`
    - `tsc turns my .ts file into .js.`
    - `I ran strict TypeScript in the browser workspace.`
  - The program runs with exit code 0 and no runtime error.
  - Output uses `console.log` and has no leading or trailing blank lines.
- **starter_code:**
  ```ts
  // Fix the type error on the next line, then print the four lines exactly.
  const toolName: number = "TypeScript";

  console.log(toolName + " adds static types to JavaScript.");
  console.log("Type checking happens at compile time.");
  console.log("tsc turns my .ts file into .js.");
  console.log("I ran strict TypeScript in the browser workspace.");
  ```
- **evaluator:** browser-exec
- **expect_exact_output:** |
  TypeScript adds static types to JavaScript.
  Type checking happens at compile time.
  tsc turns my .ts file into .js.
  I ran strict TypeScript in the browser workspace.
- **tutor:** The error is on `const toolName: number = "TypeScript"` — a string
  assigned to a `number`. The intended fix is `: string` (or letting inference
  choose by removing `: number`). The learner has not been taught annotations
  formally yet — keep guidance to "the annotation must match the value" and
  reading the expected-vs-actual output diff. Do not introduce new concepts.
- **pass_rule:** Code type-checks under `strict`, stdout matches
  `expect_exact_output` byte for byte after trailing-newline normalization, exit
  code 0. Passing the checkpoint completes Topic 1 and unlocks Topic 2.
