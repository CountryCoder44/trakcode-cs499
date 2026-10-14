---
topic_id: py-b1
course: python_beginner
section: foundations
topic_number: 1
title: Introduction to Python
slug: introduction-to-python
lessons: [py-b1.1, py-b1.2, py-b1.3]
live_coding_exception: true
format_version: 1
---

# Topic 1 - Introduction to Python

Give learners a short, useful mental model of programming and Python before
they begin writing code. Learners examine clear instructions, major
real-world uses of Python, the path from source code to output, and the
difference between syntax and runtime errors.

**Topic boundaries.** All Python code is read-only. `print()` and quoted
text may appear only for recognition and tracing. Writing, completing,
correcting, or running code begins in Topic 2. Variables, types, input,
conversion, and operators are not assessed. Real-world uses remain
conceptual; no libraries, frameworks, APIs, commands, databases, or
implementation details are assessed. Every item has a reading of at least
four complete sentences. Each lesson has six items and ends with a
contextual problem. This topic has no checkpoint.

## Lesson 1.1 - Programming Is Giving Instructions  {#py-b1.1}

- **objective:** Understand programming as turning a goal into precise,
  ordered instructions that a computer can carry out.
- **estimated_time:** 10-15 min
- **item_count:** 6
- **live_coding_items:** 0

### py-b1.1-01 · What Programming Means

- **type:** concept
- **read:** Programming is the work of designing instructions that a
  computer can follow. A computer can carry out instructions quickly and
  consistently, but it does not automatically know what result a person
  intended. The programmer must describe the work clearly enough for the
  computer to perform it. Programming therefore involves planning and
  reasoning, not merely typing commands.
- **check:** Which statement best describes programming?
  - A. Installing software that someone else created
  - B. Designing instructions that a computer can carry out
  - C. Memorizing every available command
  - D. Repairing physical computer parts
- **answer:** B
- **rationale:** Programming turns a goal or problem into instructions that
  a computer can execute.
- **if_incorrect:** Separate creating instructions from installing software,
  memorizing terms, or repairing hardware.
- **concepts_introduced:** programming, instructions
- **pass_rule:** Learner selects B.

### py-b1.1-02 · Goals and Instructions

- **type:** concept
- **read:** A goal describes the result someone wants, while instructions
  explain how to reach that result. "Make the weekly report correct"
  communicates an outcome but leaves the necessary work unstated. A computer
  would still need steps for collecting, checking, and presenting the
  information. A program must turn the broad goal into actions that can
  actually be followed.
- **check:** Why is "Make the weekly report correct" not yet a complete
  program?
  - A. Reports cannot be created by computers.
  - B. A program must always connect to the internet.
  - C. The sentence contains ordinary English words.
  - D. It states a goal without describing the required steps.
- **answer:** D
- **rationale:** The computer still needs explicit instructions for
  producing the requested result.
- **if_incorrect:** Ask whether the statement gives the computer actions to
  follow or only names the desired outcome.
- **concepts_required:** programming, instructions
- **pass_rule:** Learner selects D.

### py-b1.1-03 · Order Matters

- **type:** concept
- **read:** Instructions often need to occur in a particular order. A
  shipping label cannot be attached correctly before the correct package has
  been identified. Computers follow the sequence provided by the program
  rather than rearranging steps according to common sense. Planning the
  order is therefore part of designing a reliable solution.
- **check:** Which order makes the most sense for preparing a package?
  - A. Ship it, identify it, then attach the label.
  - B. Attach any label, ship it, then identify it.
  - C. Identify it, create the correct label, then ship it.
  - D. Perform the steps in any order.
- **answer:** C
- **rationale:** Each step prepares the information or object needed by the
  next step.
- **if_incorrect:** Consider what must already be known or completed before
  each later action can succeed.
- **concepts_introduced:** instruction-order
- **concepts_required:** instructions
- **pass_rule:** Learner selects C.

### py-b1.1-04 · Computers Do Not Guess Intent

- **type:** concept
- **read:** People often fill in missing details using experience and
  context. A computer does not safely assume those missing details unless
  the program provides rules for doing so. An unclear instruction may fail
  or produce a result different from what the programmer wanted. Precise
  instructions reduce the gap between the programmer's intention and the
  computer's behavior.
- **check:** What is most likely when a program's instructions leave out an
  important step?
  - A. The computer always invents the correct step.
  - B. The computer may produce an incomplete or incorrect result.
  - C. The computer asks another program to guess.
  - D. The missing step never matters.
- **answer:** B
- **rationale:** The computer follows the provided instructions rather than
  automatically recovering the programmer's unstated intention.
- **if_incorrect:** Remember that speed and consistency do not give a
  computer human judgment about missing intent.
- **concepts_introduced:** explicit-instructions
- **concepts_required:** instructions
- **pass_rule:** Learner selects B.

### py-b1.1-05 · Checking a Process

- **type:** concept
- **read:** Writing instructions is only part of programming. A programmer
  also checks whether those instructions produce the intended result. If
  the result is wrong, the programmer examines the steps and revises them.
  This cycle of planning, testing, and improving is a normal part of
  building software.
- **check:** Why does a programmer test a set of instructions?
  - A. To confirm that the instructions produce the intended result
  - B. To make the computer physically larger
  - C. To replace every instruction with ordinary conversation
  - D. To avoid understanding the original problem
- **answer:** A
- **rationale:** Testing provides evidence about whether the planned steps
  actually solve the problem.
- **if_incorrect:** Connect testing to the difference between what the
  programmer intended and what the computer actually did.
- **concepts_introduced:** testing
- **concepts_required:** instructions
- **pass_rule:** Learner selects A.

### py-b1.1-06 · Word Problem: Delivery Robot

- **type:** concept
- **read:** A robot needs actions it can perform in a defined sequence.
  Instructions such as "do the right thing" depend on judgment that the
  program has not supplied. Distances, directions, and a named destination
  are more concrete. The best instruction set minimizes the number of
  decisions the robot must guess.
- **check:** A delivery robot must carry a package from a desk to a shelf.
  Which instruction set is most suitable for the program controlling it?
  - A. Pick up the package, move forward two meters, turn right, move
      forward one meter, and place the package on the lower shelf.
  - B. Take the package where it belongs.
  - C. Make a good decision about the package.
  - D. Finish the delivery without making a mistake.
- **answer:** A
- **rationale:** It provides specific actions in a defined order. The other
  choices express goals or expectations without enough detail for the robot
  to act without guessing.
- **if_incorrect:** Ask whether the robot could follow the option without
  deciding what words such as "belongs," "good," or "mistake" mean.
- **concepts_required:** instructions, instruction-order, explicit-instructions
- **pass_rule:** Learner selects A.

## Lesson 1.2 - Python and Its Real-World Uses  {#py-b1.2}

- **objective:** Understand Python as a general-purpose language and
  recognize several realistic ways it is used without treating it as an
  automatic solution.
- **estimated_time:** 10-15 min
- **item_count:** 6
- **live_coding_items:** 0

### py-b1.2-01 · Language or Program?

- **type:** concept
- **read:** Python is a programming language with rules and vocabulary for
  expressing computer instructions. A Python program is one particular set
  of instructions written using that language. This is similar to the
  difference between English and a recipe written in English. The language
  makes communication possible, while the program describes one specific
  task.
- **check:** Which option is a Python program rather than the Python
  language itself?
  - A. The general rules that describe valid Python
  - B. The word Python written on a webpage
  - C. A file containing Python instructions for displaying a greeting
  - D. A keyboard used to enter source code
- **answer:** C
- **rationale:** Python is the language, while the file contains one program
  written in that language.
- **if_incorrect:** Compare "English" with "a recipe written in English."
- **concepts_introduced:** python-language, python-program
- **pass_rule:** Learner selects C.

### py-b1.2-02 · Python Is General Purpose

- **type:** concept
- **read:** Python is called a general-purpose language because it can be
  used for many different kinds of software. It is not limited to one
  profession, device, or problem category. The same core language can
  support a small personal script, a web service, or part of a scientific
  project. Additional tools are chosen according to the job the program
  needs to perform.
- **check:** What does general purpose mean in this context?
  - A. Python can be used for many kinds of programming tasks.
  - B. Python can run only scientific programs.
  - C. Python is one finished program with a single purpose.
  - D. Python removes the need to understand a problem.
- **answer:** A
- **rationale:** The language can support multiple fields and types of
  software rather than one narrow category.
- **if_incorrect:** Focus on the range of problems the language can express,
  not on one particular Python program.
- **concepts_introduced:** general-purpose
- **concepts_required:** python-language
- **pass_rule:** Learner selects A.

### py-b1.2-03 · Automation and Repetitive Work

- **type:** concept
- **read:** Python is often used to automate repetitive computer work. A
  script might rename many files, organize records, create routine reports,
  or move data between approved systems. Automation is valuable when the
  steps are clear and need to be repeated consistently. A person still has
  to define the rules and check that the automated process handles the
  intended cases.
- **check:** Which task is a strong example of automation?
  - A. Renaming hundreds of files according to a consistent rule
  - B. Asking the computer to invent an unstated filing system
  - C. Physically replacing a broken monitor
  - D. Deciding a company's values without human input
- **answer:** A
- **rationale:** The task contains repeatable steps that software can
  perform consistently.
- **if_incorrect:** Look for a computer-based process with clear rules and
  repeated actions.
- **concepts_introduced:** automation
- **concepts_required:** python-language
- **pass_rule:** Learner selects A.

### py-b1.2-04 · Websites and Online Services

- **type:** concept
- **read:** Python can run on servers that support websites and online
  services. Server code may receive a request, work with stored information,
  apply application rules, and send a response. The buttons and layouts
  visible in a browser often use other technologies, while Python works
  behind the scenes. A complete web product can therefore contain Python
  alongside several other languages and services.
- **check:** Which role can Python perform in a web application?
  - A. Handle requests and application rules on a server
  - B. Become the physical internet cable
  - C. Replace every visual design decision automatically
  - D. Guarantee that the website never has an error
- **answer:** A
- **rationale:** Python is commonly used for behind-the-scenes web behavior,
  often alongside other technologies.
- **if_incorrect:** Separate software running on a server from physical
  network equipment and unrealistic guarantees.
- **concepts_introduced:** web-services
- **concepts_required:** python-language
- **pass_rule:** Learner selects A.

### py-b1.2-05 · Data, AI, Science, and Technical Work

- **type:** concept
- **read:** Python is widely used for data analysis, artificial
  intelligence, scientific research, engineering, and authorized system
  administration. In these fields, Python helps people process information,
  automate defined procedures, evaluate results, or connect specialized
  tools. The language supports the technical work, but it does not replace
  suitable data, subject knowledge, permission, or careful human judgment.
  Python is therefore usually one part of a larger responsible process.
- **check:** Which statement best describes Python's role across these
  fields?
  - A. Python can support analysis and automation while people remain
    responsible for the data, rules, permissions, and conclusions.
  - B. Python guarantees that every result is accurate and fair.
  - C. Python removes the need to understand the field being studied.
  - D. Python authorizes access to any computer system.
- **answer:** A
- **rationale:** Python supports the work without replacing expertise or
  responsibility. The language provides useful tools, but people remain
  responsible for how those tools are used and interpreted.
- **if_incorrect:** Choose the realistic supporting role rather than an
  automatic guarantee or claim of unlimited authority.
- **concepts_introduced:** data-ai-science
- **concepts_required:** python-language, general-purpose
- **pass_rule:** Learner selects A.

### py-b1.2-06 · Word Problem: Choosing a Realistic Use

- **type:** concept
- **read:** Python's flexibility lets one organization use it for several
  different kinds of work. A realistic project still needs clear
  requirements, suitable data or resources, and people who understand the
  problem. Python may provide the main program or only one component inside
  a larger system. The best use case is one where its instructions and tools
  support a defined need.
- **check:** A community clinic wants to reduce time spent preparing a
  weekly summary from approved appointment records. Which proposal is the
  most realistic use of Python?
  - A. Write a program that reads the approved records and prepares the
    repeated summary using defined rules.
  - B. Ask Python to decide every medical question without clinicians or
    data.
  - C. Expect the word Python to update the report automatically.
  - D. Use Python to physically repair damaged clinic furniture.
- **answer:** A
- **rationale:** Automate the defined reporting steps using approved
  records. The proposal gives Python a clear, repeatable
  information-processing task while keeping the program within an
  appropriate role.
- **if_incorrect:** Choose the option with available information, defined
  steps, and a realistic software responsibility.
- **concepts_required:** automation, general-purpose
- **pass_rule:** Learner selects A.

## Lesson 1.3 - From Source Code to Output  {#py-b1.3}

- **objective:** Recognize source files, the interpreter, source code,
  output, execution order, and the basic difference between syntax and
  runtime errors.
- **estimated_time:** 10-15 min
- **item_count:** 6
- **live_coding_items:** 0

### py-b1.3-01 · Python Source Files

- **type:** concept
- **read:** Python instructions are often saved in a source file. A Python
  source filename commonly ends in `.py`, such as `greeting.py`. The
  extension helps people and tools recognize the file's intended contents.
  Saving a file stores its instructions, but saving alone does not execute
  them.
- **check:** What is the main role of a file named `greeting.py`?
  - A. Store Python source code
  - B. Execute itself whenever it is saved
  - C. Replace the Python language
  - D. Repair the computer's hardware
- **answer:** A
- **rationale:** The source file contains the written instructions that
  another tool can later execute.
- **if_incorrect:** Separate storing instructions from running them.
- **concepts_introduced:** source-file
- **pass_rule:** Learner selects A.

### py-b1.3-02 · The Interpreter's Job

- **type:** concept
- **read:** The Python interpreter is software that reads and carries out
  Python instructions. It uses the language's rules to understand the source
  code. The interpreter may execute a saved file or instructions supplied
  through another approved environment. Without execution, the source file
  remains stored text rather than a running program.
- **check:** Which component reads Python source code and carries out its
  instructions?
  - A. The `.py` filename extension
  - B. The Python interpreter
  - C. The editor's visual theme
  - D. The keyboard
- **answer:** B
- **rationale:** The interpreter is the component responsible for executing
  Python instructions.
- **if_incorrect:** The file stores code and the editor helps write it; the
  interpreter runs it.
- **concepts_introduced:** interpreter
- **concepts_required:** source-file
- **pass_rule:** Learner selects B.

### py-b1.3-03 · Source Code and Output

- **type:** concept
- **read:** Source code is the human-readable program text written by a
  programmer. Output is information the program produces when its
  instructions run. The source may contain `print("Hello")`, while the
  visible output contains Hello without the instruction's punctuation.
  Keeping source and output separate helps learners describe both what the
  program says and what the user sees.
- **check:** What is source code?
  - A. Human-readable program instructions written by a programmer
  - B. Only the text displayed after a program runs
  - C. The physical processor inside the computer
  - D. The colors used by a code editor
- **answer:** A
- **rationale:** Source code contains instructions; output is a result of
  executing them.
- **if_incorrect:** Ask whether the option is a written instruction or a
  result produced later.
- **concepts_introduced:** source-code, output
- **concepts_required:** source-file, interpreter
- **pass_rule:** Learner selects A.

### py-b1.3-04 · Top-to-Bottom Order

- **type:** concept
- **read:** The simple scripts in this topic run from the first instruction
  downward. Each shown `print()` instruction produces its output before the
  next line runs. If the source lines are rearranged, their displayed
  results are rearranged too. Later topics introduce choices and repetition,
  but code will always execute from top to bottom as written in the source
  code.
- **check:** Which word is displayed second?
  ```python
  print("Pack")
  print("Label")
  print("Ship")
  ```
  - A. Pack
  - B. Ship
  - C. Label
  - D. The order is random.
- **answer:** C
- **rationale:** The second instruction displays Label after the first
  instruction displays Pack.
- **if_incorrect:** Trace one source line at a time from the top.
- **concepts_introduced:** execution-order
- **concepts_required:** source-code, output
- **pass_rule:** Learner selects C.

### py-b1.3-05 · Syntax Errors and Runtime Errors

- **type:** concept
- **read:** An error tells the programmer that Python could not understand
  or complete part of a program. A ==syntax error== means an instruction
  does not follow Python's grammar, so Python cannot correctly understand
  that specific instruction and cannot continue. A ==runtime error== happens
  after the program has started running, when it reaches an instruction it
  cannot carry out. The distinction describes when the problem appears,
  while the error itself provides useful information for later
  investigation.
- **check:** Which statement correctly distinguishes the two categories?
  - A. A ==syntax error== concerns invalid source code, while a ==runtime
      error== occurs after execution has begun.
  - B. A ==syntax error== always repairs itself, while a ==runtime error==
      never matters.
  - C. Both terms describe the editor's color settings.
  - D. Both errors prove that the computer is physically damaged.
- **answer:** A
- **rationale:** Syntax concerns how code is written; runtime concerns a
  failure during execution. The two categories identify different stages at
  which Python encounters a problem.
- **if_incorrect:** Use runtime as a reminder that the second category
  occurs while the program is running.
- **concepts_introduced:** syntax-error, runtime-error
- **concepts_required:** source-code, interpreter
- **pass_rule:** Learner selects A.

### py-b1.3-06 · Word Problem: An Error Partway Through

- **type:** concept
- **read:** A program can display messages as it runs. If a message appears
  before an error, you know the program reached the instruction that
  displayed it. The error can then stop the program before later
  instructions run. This means a program can start running successfully but
  still stop before it finishes.
- **check:** A program displays “Starting program,” then reports an error.
  It stops before displaying “Program finished.” What does this tell you?
  - A. The program started running, then an error stopped it before it
      finished.
  - B. The program never started running.
  - C. The program finished every instruction successfully.
  - D. Python ran the instructions from bottom to top.
- **answer:** A
- **rationale:** “Starting program” could only appear if the program was
  already running. The error then stopped it before it reached the
  instruction that displays “Program finished.”
- **if_incorrect:** Use the first message as evidence: it shows the program
  had already started before the error stopped it.
- **concepts_required:** execution-order, runtime-error, output
- **pass_rule:** Learner selects A.
