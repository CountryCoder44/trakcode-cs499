---
topic_id: py-topic-01
course: python
section: foundations
topic_number: 1
title: Introduction to Python
slug: introduction
lessons: [py-1.1, py-1.2]
live_coding_exception: true
format_version: 1
---

# Topic 1 — Introduction to Python

This topic builds a correct mental model of programming and Python, then traces
how Python turns source code into output or an error. All work is in the
TrakCode browser workspace — installing Python and setting up a local editor are
not part of learning to program and are left to the learner's own tooling.

**Scope boundaries.** Code examples containing `print()` are shown only to
illustrate execution order, output, and errors — learners are **not** yet
expected to write or modify `print()` statements, and `print()` is taught
properly in Topic 2 alongside values and variables. Seeing quoted text, names,
or error types inside those examples does **not** mean that strings, variables,
functions, or exception handling have been taught; each is introduced later
(strings and variables in Topic 2, functions in Topic 9, exception handling in
Topic 10). Type conversion and user input are Topic 2. Virtual environments and
dependency isolation are Topic 12.

**Live-coding note.** Topic 1 is the stated exception to the "≥ 50% live coding"
rule — every item is short reading plus a concept check, and there is no
checkpoint. Hands-on coding starts in Topic 2.

---

## Lesson 1.1 — What Is Python?  {#py-1.1}

- **objective:** Build a correct mental model of programming, of Python as a
  language, and of the kinds of problems Python is used to solve.
- **estimated_time:** 15–25 min
- **item_count:** 8
- **live_coding_items:** 0

### py-1.1-01 · Programming Is Giving Instructions

- **type:** concept
- **read:** Programming means designing and writing instructions a computer can
  carry out. Here's the catch: a computer only follows what you actually tell it
  — it has no idea what result you *meant* to get. That's why clear steps and
  exact rules matter so much.
- **check:** Which statement best describes programming?
  - A. Installing applications
  - B. Designing instructions a computer can carry out
  - C. Using software that someone else already built
  - D. Memorizing every command in a language
- **answer:** B
- **rationale:** Programming is about creating instructions and solving problems.
- **if_incorrect:** Contrast *creating* instructions with *installing* or *using*
  software that already exists.
- **tutor:** Ask the learner to describe a precise set of instructions for a
  familiar task (making tea, tying a shoe), then connect that back to programming.
- **pass_rule:** Learner selects B.

### py-1.1-02 · A Language Is Not a Program

- **type:** concept
- **read:** A programming language gives you vocabulary, a set of structural
  rules called *syntax*, and a way to express instructions with real meaning. A
  program, on the other hand, is a specific set of instructions written using
  that language. Python is the language; a file that adds up a total is a Python
  program.
- **check:** Which item is a Python program?
  - A. The rules of Python syntax
  - B. A file containing Python instructions that calculate a total
  - C. A description of what a program should accomplish, with no instructions
  - D. The name "Python" by itself
- **answer:** B
- **rationale:** A program is a concrete set of instructions written for a task.
- **if_incorrect:** A program is the *instructions themselves*. The syntax rules
  (A) are the language; a goal with no steps (C) is not yet a program; and a
  name (D) is just a label.
- **tutor:** Ask, "Is a recipe the English language, or something written using
  English?"
- **pass_rule:** Learner selects B.

### py-1.1-03 · Python Is a Programming Language

- **type:** concept
- **read:** Python is a **high-level**, **general-purpose** programming
  language. *High-level* means you can work without managing a lot of
  machine-level detail yourself. *General-purpose* means it's suited to many
  different kinds of work, not just one. It was first released publicly back in
  1991, and it's used by total beginners and professional teams alike. Python
  leans hard into readable code, but that doesn't mean the rules are optional —
  it still needs valid syntax. (The next two items dig into each of those
  terms.)
- **check:** Which description of Python is accurate?
  - A. A single program written for one particular task
  - B. A language used only by beginning programmers
  - C. A high-level, general-purpose programming language
  - D. A language designed for only one category of work
- **answer:** C
- **rationale:** Python is a language used to express computer instructions.
- **if_incorrect:** Python is a language, not one particular program (A). It is
  used by both beginners and professional teams (B), and it supports many
  categories of work rather than only one (D).
- **tutor:** Invite the learner to ask what "high-level" or "general-purpose"
  means — those are the next two items.
- **pass_rule:** Learner selects C.

### py-1.1-04 · What "High-Level" Means

- **type:** concept
- **read:** A high-level language lets you work with concepts closer to how
  humans actually think through problems, while the software running Python
  handles a lot of the machine-level details behind the scenes. Just to be
  clear, "high-level" does **not** mean "only for experts," and it doesn't
  guarantee a program runs fast either.
- **check:** Why is Python called high-level?
  - A. Only advanced programmers can use it
  - B. It hides many low-level machine details behind useful concepts
  - C. It always runs faster than every other language
  - D. Its instructions work directly with the computer's hardware
- **answer:** B
- **rationale:** "High-level" describes abstraction away from machine details.
- **if_incorrect:** Use the analogy of driving a car without directly controlling
  fuel-injection timing.
- **tutor:** Explain abstraction in one sentence, then ask the learner to choose
  again.
- **pass_rule:** Learner selects B.

### py-1.1-05 · What "General-Purpose" Means

- **type:** concept
- **read:** A general-purpose language can be put to work across a huge range of
  categories. Python shows up in automation, web backends, data analysis,
  artificial intelligence, testing, scientific computing, and developer tools,
  among other things. It's flexible — but flexible doesn't mean it's
  automatically the best choice for every situation.
- **check:** What does "general-purpose" mean?
  - A. Python can be used for many categories of problem
  - B. Python automatically solves every problem
  - C. Python is only meant for small, beginner-level tasks
  - D. Every project should be written in Python
- **answer:** A
- **rationale:** General-purpose means broad applicability, not unlimited
  capability.
- **if_incorrect:** Contrast "many kinds of work" with "the correct choice for
  every job."
- **tutor:** Ask the learner to name two very different tasks that could both use
  Python.
- **pass_rule:** Learner selects A.

### py-1.1-06 · A Common Python Use: Automation

- **type:** concept
- **read:** Automation is using code to do repeatable work consistently, every
  time. A Python program might rename thousands of files, generate a recurring
  report, organize folders, or check on a set of web services. It's most
  valuable when a task follows a clear rule and needs to happen over and over.
- **check:** Why is renaming 4,000 files according to one rule a good automation
  task?
  - A. The same clear rule must be applied repeatedly
  - B. Every filename requires a different human judgment
  - C. The task has no rule describing the desired names
  - D. The computer must decide what the company intended
- **answer:** A
- **rationale:** Automation is most useful when code can apply a clear rule
  repeatedly and consistently.
- **if_incorrect:** Automation needs a clear rule; it does not invent the
  intended result (C, D). If every case required different human judgment (B),
  one repeated rule would not be enough.
- **tutor:** Ask which parts of the task are repetitive and predictable.
- **pass_rule:** Learner selects A.

### py-1.1-07 · Why Python Is Popular

- **type:** concept
- **read:** Part of why Python is so popular: its syntax is approachable,
  there's a huge amount of learning material out there, the community is large,
  and you can reuse code other people have already written and shared. It also
  runs on all the common operating systems — Windows, macOS, and Linux.
  Readable code is easier for people to review, test, maintain, and change...
  though readable code can still absolutely contain mistakes.
- **check:** Why is readability valuable in software?
  - A. Code is read, tested, reviewed, and changed repeatedly
  - B. Readable code can never contain defects
  - C. Readable code is useful only to the computer running it
  - D. Readable code never needs to be tested or reviewed
- **answer:** A
- **rationale:** Readability helps people work with software over time.
- **if_incorrect:** Readability helps *people* — the reading says readable code
  is easier to review, test, and change. It still needs testing and review (D),
  it still matters to people, not just the computer (C), and it can still contain
  mistakes (B).
- **tutor:** Ask who might need to read a program after its original author is
  finished with it.
- **pass_rule:** Learner selects A.

### py-1.1-08 · Keep the Language, Program, and Tools Separate

- **type:** concept
- **read:** Python is the language. A `.py` file stores Python source code. An
  interpreter is what executes that code. A code editor is just the tool that
  helps you write and organize it. Keeping these roles straight in your head
  makes the next few items click a lot easier.
- **check:** Which component reads a `.py` file and executes its instructions?
  - A. The Python language itself
  - B. The interpreter
  - C. The code editor the file was typed in
  - D. The `.py` filename extension
- **answer:** B
- **rationale:** The interpreter is the software that executes the code.
- **if_incorrect:** Each role has one job. The language (A) is the rules; the
  editor (C) helps you write the code; the `.py` extension (D) only labels the
  file. Only the interpreter *runs* it.
- **tutor:** Use a four-part analogy: the language, the recipe, the writer's
  desk, and the cook.
- **pass_rule:** Learner selects B. Passing this item completes Lesson 1.1 and
  unlocks Lesson 1.2.

---

## Lesson 1.2 — How Python Executes Code  {#py-1.2}

- **objective:** Trace source code — from a saved file or the interactive prompt —
  through the interpreter to output or an error.
- **estimated_time:** 20–35 min
- **item_count:** 10
- **live_coding_items:** 0

### py-1.2-01 · Source Code Is Program Text

- **type:** concept
- **read:** Source code is just the human-readable text of a program — the
  actual instructions a programmer writes out. It's not the result the program
  produces when it runs, it's not the language's own rules, and it's not the
  editor you typed it into.
- **check:** What is source code?
  - A. Human-readable program text
  - B. The result a program produces when it runs
  - C. The rules and vocabulary that make up Python
  - D. The editor a person types the code into
- **answer:** A
- **rationale:** Source code is the text used to express the program.
- **if_incorrect:** Source code is the instructions themselves. It is not the
  result they produce (B), not the language's rules (C), and not the editor used
  to write them (D).
- **tutor:** Compare source code to a written recipe and output to the finished
  meal.
- **pass_rule:** Learner selects A.

### py-1.2-02 · Python Files Usually End in `.py`

- **type:** concept
- **read:** Python source files conventionally end in `.py` — something like
  `greeting.py`. That extension just tells people and tools what kind of source
  code the file likely holds. And saving a `.py` file doesn't automatically run
  it.
- **check:** What does `.py` normally identify?
  - A. A Python source file
  - B. A file that is guaranteed to be valid, error-free Python
  - C. A program that runs the moment it is saved
  - D. The Python interpreter itself
- **answer:** A
- **rationale:** The `.py` extension conventionally identifies Python source.
- **if_incorrect:** The `.py` extension only labels a file as Python source. It
  does not check that the code is valid (B), it does not run the file when you
  save it (C), and it is not the interpreter (D).
- **tutor:** Ask what still has to happen after the file is saved.
- **pass_rule:** Learner selects A.

### py-1.2-03 · The Interpreter Executes Code

- **type:** concept
- **read:** The Python interpreter is the software that reads your instructions
  and actually carries them out. Here's a useful beginner mental model: source
  code goes into the interpreter, the interpreter runs the instructions, and the
  program produces a result or an error. The interpreter follows the
  instructions exactly as written — it won't quietly rewrite them to match what
  you meant, and it won't try to guess what you were going for.
- **check:** What is the interpreter's role?
  - A. Decide the program's goal
  - B. Read and execute Python instructions
  - C. Correct the programmer's mistakes automatically
  - D. Write and organize the source code for the programmer
- **answer:** B
- **rationale:** The interpreter carries out the instructions that were written.
- **if_incorrect:** The interpreter runs the instructions as written. It does not
  decide the program's purpose (A), it does not fix mistakes (C), and it does not
  write or organize the code (D) — that is the editor's job.
- **tutor:** Ask the learner to explain the source → interpreter → result path in
  their own words.
- **pass_rule:** Learner selects B.

### py-1.2-04 · Execution Usually Starts at the Top

- **type:** concept
- **read:** In a simple, straight-line program like the one below, Python starts
  at the first instruction and works its way down, one after another. The order
  things run in is the order the results show up in. Just for reading this
  example: each `print(...)` instruction displays the text between its
  quotation marks — you'll get to write `print` yourself in Topic 2.
- **code:**
  ```python
  print("First")
  print("Second")
  print("Third")
  ```
- **check:** Which word appears first in the displayed text?
  - A. Third
  - B. Second
  - C. First
  - D. A word chosen at random each run
- **answer:** C
- **rationale:** The first instruction runs first in this simple, straight-line
  program.
- **if_incorrect:** Trace each line with the learner from top to bottom.
- **tutor:** Ask the learner to point to the exact line Python reaches first.
- **pass_rule:** Learner selects C.

### py-1.2-05 · Output Is a Program Result

- **type:** concept
- **read:** Output is just information a program produces. It might show up on
  screen or in an output area, but a program can just as easily create files or
  update stored data instead. A program can even run successfully without ever
  displaying any text at all.
- **check:** Which statement about output is correct?
  - A. Every successful program must display something on the screen
  - B. Output can be displayed text, a file, or another produced result
  - C. Output is the source code, before the interpreter runs it
  - D. A created file cannot be output because nothing is shown on the screen
- **answer:** B
- **rationale:** Programs can produce different kinds of results.
- **if_incorrect:** Output is anything a program produces — screen text, a saved
  file, or updated data. A program can finish successfully while showing nothing
  (A, D), and output is never the source code, which exists before the program
  runs (C).
- **tutor:** Ask what result a report generator might produce besides text on the
  screen.
- **pass_rule:** Learner selects B.

### py-1.2-06 · A Terminal Runs Commands

- **type:** concept
- **read:** A terminal is a text interface for giving commands to the operating
  system and to command-line programs. It's important to note the terminal
  itself is not Python — it's just something you can use to start the
  interpreter or ask Python to run a file.
- **check:** Which statement is accurate?
  - A. A terminal is the Python language
  - B. A terminal is a text interface that can start Python
  - C. A terminal is a `.py` file
  - D. A terminal performs the same role as a code editor
- **answer:** B
- **rationale:** The terminal accepts commands; Python is a separate tool it can
  start.
- **if_incorrect:** A terminal is a text interface for running commands. It is
  not the Python language (A), not a `.py` file (C), and not a code editor —
  an editor is for writing code, a terminal is for running commands (D).
- **tutor:** Ask what tool receives a command such as `python3 greeting.py`.
- **pass_rule:** Learner selects B.

### py-1.2-07 · The REPL Is Interactive Python

- **type:** concept
- **read:** REPL stands for Read–Eval–Print Loop. It lets you type in a small
  piece of Python code, run it immediately, see a result when there is one, and
  then type in more. Those `>>>` symbols you'll see are just the Python prompt
  — they're not part of the code itself. Think of the REPL as a place for quick
  experiments, not somewhere to build up a program over several days or hand
  finished software to someone else.
- **check:** When is the REPL most useful?
  - A. Quickly trying a short piece of code
  - B. Building a program over many days
  - C. Keeping code you will need to run again next week
  - D. Publishing a finished application for other people
- **answer:** A
- **rationale:** The REPL is best for immediate, small experiments.
- **if_incorrect:** The REPL is for quick, temporary experiments. Anything you
  need to keep (C), build up over days (B), or share with others (D) belongs in
  a saved file instead.
- **tutor:** Ask whether the learner needs to keep the experiment for later.
- **pass_rule:** Learner selects A.

### py-1.2-08 · A Script Is Saved and Repeatable

- **type:** concept
- **read:** A script is just source code saved in a file. Compared to a
  temporary REPL session, scripts are much easier to edit, rerun, share, test,
  and hold onto. A script only runs when you actually ask an interpreter to
  execute it.
- **check:** You are building a program over several days. Which approach fits
  best?
  - A. A saved `.py` script
  - B. A screenshot of the REPL session
  - C. An editor tab you never save
  - D. Retyping the code into the REPL each day
- **answer:** A
- **rationale:** A script preserves the program for future work.
- **if_incorrect:** Emphasize repeatability and saved source.
- **tutor:** Ask what will still exist after the current session closes.
- **pass_rule:** Learner selects A.

### py-1.2-09 · Syntax Errors Stop Normal Execution

- **type:** concept
- **read:** A syntax error means the code breaks Python's structural rules. In
  the example below, that opening quotation mark starts a piece of text, but
  there's no matching closing quotation mark anywhere. Since the instruction is
  left incomplete, Python can't make sense of it as valid code — so it reports a
  syntax error instead of running it.
- **code:**
  ```python
  print("Hello)
  ```
- **check:** What kind of problem is shown?
  - A. Syntax error
  - B. Successful execution
  - C. A mistake in the file's name rather than its code
  - D. A warning Python notes but then runs the line anyway
- **answer:** A
- **rationale:** The text in the example is missing its closing quotation mark,
  so the instruction is incomplete and invalid.
- **if_incorrect:** The opening quotation mark has no matching closing quotation
  mark, so the code breaks Python's structural rules. Python reports a syntax
  error rather than treating it as a filename problem or an ignorable warning.
- **tutor:** Ask the learner to compare the opening and closing punctuation.
- **pass_rule:** Learner selects A.

### py-1.2-10 · Runtime Errors Happen During Execution

- **type:** concept
- **read:** A runtime error happens after execution has already started —
  Python gets partway through and hits an instruction it can't complete. When
  that error goes unhandled (meaning the program has no way to recover from it),
  normal execution just stops, so nothing after it runs. In the example below,
  `print("Ready")` runs fine; then Python reaches `pritn("Go")`. Since the
  misspelled `pritn` doesn't match any name Python recognizes, it raises a
  `NameError` and stops right there. `print("Finished")` never gets a chance to
  run.
- **code:**
  ```python
  print("Ready")
  pritn("Go")
  print("Finished")
  ```
- **check:** What will most likely happen?
  - A. Python silently corrects `pritn` to `print`
  - B. Python raises a `NameError` when it reaches `pritn`
  - C. Python skips the bad line, so `Ready` and `Finished` both print
  - D. Nothing runs at all — not even `Ready`
- **answer:** B
- **rationale:** Python reaches the misspelled name, cannot match it to anything,
  raises `NameError`, and stops — so `Ready` prints but `Finished` does not.
- **if_incorrect:** Trace the program in order: `Ready` prints first, `pritn`
  then raises a `NameError`, and normal execution stops before `Finished` can
  print.
- **tutor:** Ask the learner to identify the smallest spelling difference.
- **pass_rule:** Learner selects B. Passing this item completes Lesson 1.2 and
  Topic 1.
