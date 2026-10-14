---
topic_id: py-b2
course: python_beginner
section: foundations
topic_number: 2
title: Values, Variables, Output, and Types
slug: values-variables-output-types
lessons: [py-b2.1, py-b2.2, py-b2.3, py-b2.4, py-b2.5, py-b2.6]
checkpoint_id: py-b2.CP
live_coding_exception: false
format_version: 1
---

# Topic 2 - Values, Variables, Output, and Types

Teach learners to display information, recognize basic values, store values
under useful names, inspect their types, and update stored information.

**Topic boundaries.** No user input, arithmetic, comparisons, conditions,
loops, or functions defined by learners. Covered values are `str`, `int`,
`float`, `bool`, and `None`. `type()` inspects values but does not convert
them. `print()` may receive comma-separated values for simple labeled output.
Every lesson has six items and ends with a contextual coding problem. Every
item has a reading of at least four complete sentences.

## Lesson 2.1 - Displaying a Result with print()  {#py-b2.1}

- **objective:** Display text with `print()`, one call per output line, in
  the order the calls are written.
- **estimated_time:** 15-20 min
- **item_count:** 6
- **live_coding_items:** 4

### py-b2.1-01 · Programs Can Display Information

- **type:** concept
- **read:** A running program often needs to show information to the person
  using it. Python uses `print()` to place a value in the output. The value
  goes between the parentheses. For example, `print("Hello")` displays the
  word Hello without displaying the quotation marks.
- **check:** What does `print("Hello")` display?
  - A. Hello
  - B. "Hello"
  - C. print
  - D. Nothing
- **answer:** A
- **rationale:** The quotation marks identify text in the code, but they are
  not part of the displayed word.
- **if_incorrect:** Return to the example and follow the program from top to
  bottom.
- **concepts_introduced:** print-function
- **concepts_required:** output, source-code
- **pass_rule:** Learner selects A.

### py-b2.1-02 · Display One Message

- **type:** practical
- **do:** A `print()` call is a complete instruction. Text written directly
  in code must be surrounded by matching quotation marks. Python displays
  the characters between those marks. The instruction finishes after that
  one line is shown. **Display `Welcome to Python`.**
- **starter_code:**
  ```python
  # Display the message below.
  ```
- **solution:**
  ```python
  print("Welcome to Python")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `print\s*\(\s*["']Welcome to Python["']\s*\)`
- **expect_exact_output:** |
  Welcome to Python
- **if_incorrect:** Check quotation marks, names, capitalization, and
  statement order.
- **concepts_required:** print-function
- **pass_rule:** Run exits 0 and stdout is exactly `Welcome to Python`.

### py-b2.1-03 · Display Two Lines

- **type:** practical
- **do:** Python normally runs simple instructions from top to bottom. Two
  `print()` calls therefore produce two output lines in the same order. Each
  call handles the value inside its own parentheses. Changing the statement
  order changes the output order. **Display `First step` and then `Second
  step` on separate lines, with one `print()` call for each.**
- **starter_code:**
  ```python
  # Display the two lines in order.
  ```
- **solution:**
  ```python
  print("First step")
  print("Second step")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `print\s*\(\s*["']First step["']\s*\)[\s\S]*print\s*\(\s*["']Second step["']\s*\)`
- **expect_exact_output:** |
  First step
  Second step
- **if_incorrect:** Check quotation marks, names, capitalization, and
  statement order.
- **concepts_introduced:** statement-order
- **concepts_required:** print-function
- **pass_rule:** Run exits 0 and stdout is `First step` then `Second step`.

### py-b2.1-04 · Quotation Marks Mark Text

- **type:** concept
- **read:** Python accepts matching single or double quotation marks around a
  short string. The opening and closing marks must match. The marks tell
  Python that the characters are text rather than an instruction name. The
  displayed output does not include those surrounding marks.
- **check:** Which line correctly displays Ready?
  - A. `print("Ready")`
  - B. `print(Ready)`
  - C. `print("Ready')`
  - D. `"print(Ready)"`
- **answer:** A
- **rationale:** Matching quotation marks correctly identify Ready as text.
- **if_incorrect:** Return to the example and follow the program from top to
  bottom.
- **concepts_introduced:** string-literal
- **concepts_required:** print-function
- **pass_rule:** Learner selects A.

### py-b2.1-05 · Display Punctuation Exactly

- **type:** practical
- **do:** Punctuation inside a string is part of the displayed text. Capital
  letters and spaces are also preserved. Python does not rewrite the message
  for the learner. Exact output therefore depends on writing the string
  exactly as requested. **Display `Ready, set, code!` exactly.**
- **starter_code:**
  ```python
  # Display the message exactly, punctuation included.
  ```
- **solution:**
  ```python
  print("Ready, set, code!")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `print\s*\(\s*["']Ready, set, code!["']\s*\)`
- **expect_exact_output:** |
  Ready, set, code!
- **if_incorrect:** Check quotation marks, names, capitalization, and
  statement order.
- **concepts_required:** string-literal
- **pass_rule:** Run exits 0 and stdout is exactly `Ready, set, code!`.

### py-b2.1-06 · Word Problem: Create a Welcome Screen

- **type:** practical
- **do:** A welcome screen gives a user immediate context when a program
  starts. Separate `print()` calls can place a title and instruction on
  different lines. The statements run in their written order. Both messages
  must match the requested capitalization and punctuation. **A practice
  program needs a two-line welcome screen. Display `TrakCode` first and
  `Choose a lesson.` second.**
- **starter_code:**
  ```python
  # Display the two-line welcome screen.
  ```
- **solution:**
  ```python
  print("TrakCode")
  print("Choose a lesson.")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `print\s*\(\s*["']TrakCode["']\s*\)[\s\S]*print\s*\(\s*["']Choose a lesson\.["']\s*\)`
- **expect_exact_output:** |
  TrakCode
  Choose a lesson.
- **if_incorrect:** Check quotation marks, names, capitalization, and
  statement order.
- **concepts_required:** statement-order, string-literal
- **pass_rule:** Run exits 0 and stdout matches both lines.

## Lesson 2.2 - Values and Literals  {#py-b2.2}

- **objective:** Write text, whole-number, decimal, and Boolean values
  directly in code and display them.
- **estimated_time:** 15-20 min
- **item_count:** 6
- **live_coding_items:** 4

### py-b2.2-01 · A Literal Writes a Value Directly

- **type:** concept
- **read:** A value is a piece of information a program can use. A literal
  is a value written directly in the source code. `"Python"` is a text
  literal, while `12` is a whole-number literal. `print()` can display
  either kind of value.
- **check:** Which choice is a whole-number literal?
  - A. `12`
  - B. `"12"`
  - C. `print`
  - D. `value`
- **answer:** A
- **rationale:** The unquoted digits represent a whole number written
  directly in code.
- **if_incorrect:** Return to the example and follow the program from top to
  bottom.
- **concepts_introduced:** literal, int-literal
- **concepts_required:** string-literal
- **pass_rule:** Learner selects A.

### py-b2.2-02 · Display Text and a Number

- **type:** practical
- **do:** Quotation marks make text different from numeric values.
  `print("12")` displays text that looks numeric. `print(12)` displays the
  whole number itself. The visible characters look similar even though
  Python stores different kinds of values. **Display the text `Score:` and
  then the whole number `12` (not text) on separate lines.**
- **starter_code:**
  ```python
  # Display the label, then the whole number.
  ```
- **solution:**
  ```python
  print("Score:")
  print(12)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `print\s*\(\s*["']Score:["']\s*\)`
  - `print\s*\(\s*12\s*\)`
- **expect_exact_output:** |
  Score:
  12
- **if_incorrect:** Check quotation marks, names, capitalization, and
  statement order.
- **concepts_required:** int-literal, string-literal
- **pass_rule:** Run exits 0, `12` is printed as a number, and stdout matches
  both lines.

### py-b2.2-03 · Display a Decimal Value

- **type:** practical
- **do:** A number containing a decimal point is written without quotation
  marks. Python treats `3.5` as a numeric value. `print()` can display that
  value directly. Adding quotation marks would instead create text.
  **Display the decimal value `3.5` (not text).**
- **starter_code:**
  ```python
  # Display the decimal number.
  ```
- **solution:**
  ```python
  print(3.5)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `print\s*\(\s*3\.5\s*\)`
- **expect_exact_output:** |
  3.5
- **if_incorrect:** Check quotation marks, names, capitalization, and
  statement order.
- **concepts_introduced:** float-literal
- **concepts_required:** literal
- **pass_rule:** Run exits 0, `3.5` is printed as a number, and stdout is
  exactly `3.5`.

### py-b2.2-04 · Boolean Literals Represent Two Possibilities

- **type:** concept
- **read:** A Boolean value represents either `True` or `False`. Python
  spells both with an uppercase first letter and no quotation marks. These
  values are useful for yes-or-no facts. Quoted `"True"` would be text
  rather than a Boolean.
- **check:** Which choice is a Boolean literal?
  - A. `True`
  - B. `"True"`
  - C. `true`
  - D. `YES`
- **answer:** A
- **rationale:** Python's Boolean literal uses an uppercase T and no
  quotation marks.
- **if_incorrect:** Return to the example and follow the program from top to
  bottom.
- **concepts_introduced:** bool-literal
- **concepts_required:** literal
- **pass_rule:** Learner selects A.

### py-b2.2-05 · Display Several Basic Values

- **type:** practical
- **do:** Python can display different kinds of literal values in one
  program. Each `print()` call receives one value in this task. Text uses
  quotation marks, while numbers and Booleans do not. The output order
  follows the statement order. **Display `Python`, `10`, `2.5`, and `True`
  on separate lines, writing each as the right kind of value (text, whole
  number, decimal, Boolean).**
- **starter_code:**
  ```python
  # Display the four values, one per line.
  ```
- **solution:**
  ```python
  print("Python")
  print(10)
  print(2.5)
  print(True)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `print\s*\(\s*["']Python["']\s*\)`
  - `print\s*\(\s*10\s*\)`
  - `print\s*\(\s*2\.5\s*\)`
  - `print\s*\(\s*True\s*\)`
- **expect_exact_output:** |
  Python
  10
  2.5
  True
- **if_incorrect:** Check quotation marks, names, capitalization, and
  statement order.
- **concepts_required:** int-literal, float-literal, bool-literal
- **pass_rule:** Run exits 0, each value has the right kind, and stdout
  matches all four lines.

### py-b2.2-06 · Word Problem: Show a Course Snapshot

- **type:** practical
- **do:** A course snapshot may contain text, a lesson count, a completion
  percentage, and an availability fact. Those pieces use different kinds of
  values. Writing them as literals lets a short program display the
  snapshot. Each value should keep the form described in the scenario.
  **Display `Beginner Python`, the whole number `11`, the decimal `72.5`,
  and the Boolean `True` on separate lines.**
- **starter_code:**
  ```python
  # Display the four snapshot values, one per line.
  ```
- **solution:**
  ```python
  print("Beginner Python")
  print(11)
  print(72.5)
  print(True)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `print\s*\(\s*["']Beginner Python["']\s*\)`
  - `print\s*\(\s*11\s*\)`
  - `print\s*\(\s*72\.5\s*\)`
  - `print\s*\(\s*True\s*\)`
- **expect_exact_output:** |
  Beginner Python
  11
  72.5
  True
- **if_incorrect:** Check quotation marks, names, capitalization, and
  statement order.
- **concepts_required:** int-literal, float-literal, bool-literal
- **pass_rule:** Run exits 0, each value has the right kind, and stdout
  matches all four lines.

## Lesson 2.3 - Variables and Assignment  {#py-b2.3}

- **objective:** Store values in named variables with `=` and display them,
  alone or beside a label.
- **estimated_time:** 15-20 min
- **item_count:** 6
- **live_coding_items:** 4

### py-b2.3-01 · A Variable Gives a Value a Name

- **type:** concept
- **read:** A variable is a useful name connected to a value. Assignment uses
  one equals sign to connect the name on the left with the value on the
  right. In `course_name = "Python"`, the name `course_name` refers to the
  text Python. Printing `course_name` uses the stored value rather than
  displaying the variable's spelling.
- **check:** What does `name = "Ada"` do?
  - A. Connects `name` with the text Ada
  - B. Displays Ada immediately
  - C. Compares two values
  - D. Creates the text name
- **answer:** A
- **rationale:** A single equals sign performs assignment.
- **if_incorrect:** Return to the example and follow the program from top to
  bottom.
- **concepts_introduced:** variable, assignment
- **concepts_required:** literal
- **pass_rule:** Learner selects A.

### py-b2.3-02 · Store and Display Text

- **type:** practical
- **do:** A variable can keep a value for later instructions. The assignment
  runs before the `print()` call. Quotation marks belong around the text
  when it is assigned. The variable name is not quoted when its stored value
  should be displayed. **Store `Python` in `language` and display
  `language`.**
- **starter_code:**
  ```python
  # Store the text in language, then display it.
  ```
- **solution:**
  ```python
  language = "Python"
  print(language)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `language\s*=\s*["']Python["']`
  - `print\s*\(\s*language\s*\)`
- **expect_exact_output:** |
  Python
- **if_incorrect:** Check quotation marks, names, capitalization, and
  statement order.
- **concepts_required:** variable, assignment
- **pass_rule:** Run exits 0, `language` is printed, and stdout is exactly
  `Python`.

### py-b2.3-03 · Store More Than One Value

- **type:** practical
- **do:** A program can create several variables. Each name should describe
  the value it stores. Later statements can use those names in any required
  order. The assignments themselves do not display output. **Store `Ada` in
  `learner` and `4` in `level`. Display `learner` and `level` on separate
  lines.**
- **starter_code:**
  ```python
  # Store both values, then display them.
  ```
- **solution:**
  ```python
  learner = "Ada"
  level = 4
  print(learner)
  print(level)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `learner\s*=\s*["']Ada["']`
  - `level\s*=\s*4\b`
  - `print\s*\(\s*learner\s*\)`
  - `print\s*\(\s*level\s*\)`
- **expect_exact_output:** |
  Ada
  4
- **if_incorrect:** Check quotation marks, names, capitalization, and
  statement order.
- **concepts_required:** variable, assignment
- **pass_rule:** Run exits 0, both variables are printed, and stdout is `Ada`
  then `4`.

### py-b2.3-04 · Names and Text Are Different

- **type:** concept
- **read:** An unquoted name asks Python for the value stored under that
  variable. A quoted name is ordinary text. If `color` stores `"blue"`,
  `print(color)` displays blue while `print("color")` displays color.
  Choosing whether to use quotation marks changes the meaning.
- **check:** If `color = "blue"`, what does `print(color)` display?
  - A. blue
  - B. color
  - C. "color"
  - D. Nothing
- **answer:** A
- **rationale:** The unquoted variable name supplies its stored value.
- **if_incorrect:** Return to the example and follow the program from top to
  bottom.
- **concepts_introduced:** name-vs-text
- **concepts_required:** variable
- **pass_rule:** Learner selects A.

### py-b2.3-05 · Place a Label Beside a Variable

- **type:** practical
- **do:** `print()` can receive several comma-separated values. Python
  displays them on one line with a space between neighboring values. Fixed
  labels remain quoted, while variable names remain unquoted. This creates a
  readable line without later formatting features. **Store `12` in `score`
  and display `Score: 12` with one `print()` call that uses `score`.**
- **starter_code:**
  ```python
  # Store the score, then display it beside a label.
  ```
- **solution:**
  ```python
  score = 12
  print("Score:", score)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `score\s*=\s*12\b`
  - `print\s*\(\s*["']Score:["']\s*,\s*score\s*\)`
- **expect_exact_output:** |
  Score: 12
- **if_incorrect:** Check quotation marks, names, capitalization, and
  statement order.
- **concepts_introduced:** labeled-print
- **concepts_required:** variable, name-vs-text
- **pass_rule:** Run exits 0, one `print()` shows the label and `score`, and
  stdout is exactly `Score: 12`.

### py-b2.3-06 · Word Problem: Build a Small Profile

- **type:** practical
- **do:** A small profile uses names to preserve related pieces of
  information. Text and numbers can be stored in separate variables. Labels
  explain each value when it is displayed. Comma-separated `print()` values
  automatically receive one space between them. **Store `Mina` in `name`
  and `3` in `completed_lessons`. Display `Name: Mina` and `Lessons: 3` on
  separate lines, using the variables.**
- **starter_code:**
  ```python
  # Store the profile values, then display them with labels.
  ```
- **solution:**
  ```python
  name = "Mina"
  completed_lessons = 3
  print("Name:", name)
  print("Lessons:", completed_lessons)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `name\s*=\s*["']Mina["']`
  - `completed_lessons\s*=\s*3\b`
  - `print\s*\(\s*["']Name:["']\s*,\s*name\s*\)`
  - `print\s*\(\s*["']Lessons:["']\s*,\s*completed_lessons\s*\)`
- **expect_exact_output:** |
  Name: Mina
  Lessons: 3
- **if_incorrect:** Check quotation marks, names, capitalization, and
  statement order.
- **concepts_required:** labeled-print, variable
- **pass_rule:** Run exits 0, both labeled lines use the variables, and
  stdout matches both lines.

## Lesson 2.4 - Basic Python Types and None  {#py-b2.4}

- **objective:** Recognize `str`, `int`, `float`, and `bool` values, keep
  codes as text, and use `None` for a value that isn't known yet.
- **estimated_time:** 15-20 min
- **item_count:** 6
- **live_coding_items:** 4

### py-b2.4-01 · Types Describe Kinds of Values

- **type:** concept
- **read:** Every Python value has a type that describes what kind of
  information it represents. `str` represents text, `int` represents whole
  numbers, `float` represents decimal numbers, and `bool` represents `True`
  or `False`. A value's type affects how Python can use it. Quotation marks
  are an important clue that a literal is a string.
- **check:** Which type describes the value `25`?
  - A. `int`
  - B. `str`
  - C. `float`
  - D. `bool`
- **answer:** A
- **rationale:** An unquoted whole number is an `int` value.
- **if_incorrect:** Return to the example and follow the program from top to
  bottom.
- **concepts_introduced:** basic-types
- **concepts_required:** literal
- **pass_rule:** Learner selects A.

### py-b2.4-02 · Store the Four Basic Types

- **type:** practical
- **do:** Variables can refer to values of different types. The variable
  name does not determine the type. Python looks at the current stored
  value. Printing each variable displays its value in a familiar form.
  **Create `text_value = "hello"`, `whole_value = 7`,
  `decimal_value = 2.5`, and `flag_value = False`. Display each value on its
  own line, in that order.**
- **starter_code:**
  ```python
  # Create the four variables, then display each one.
  ```
- **solution:**
  ```python
  text_value = "hello"
  whole_value = 7
  decimal_value = 2.5
  flag_value = False
  print(text_value)
  print(whole_value)
  print(decimal_value)
  print(flag_value)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `text_value\s*=\s*["']hello["']`
  - `whole_value\s*=\s*7\b`
  - `decimal_value\s*=\s*2\.5\b`
  - `flag_value\s*=\s*False\b`
  - `print\s*\(\s*text_value\s*\)`
  - `print\s*\(\s*whole_value\s*\)`
  - `print\s*\(\s*decimal_value\s*\)`
  - `print\s*\(\s*flag_value\s*\)`
- **expect_exact_output:** |
  hello
  7
  2.5
  False
- **if_incorrect:** Check quotation marks, names, capitalization, and
  statement order.
- **concepts_required:** basic-types, variable
- **pass_rule:** Run exits 0, all four variables are printed, and stdout
  matches all four lines.

### py-b2.4-03 · Keep Numeric-Looking Text as Text

- **type:** practical
- **do:** Characters can look like a number while still belonging to a
  string. Quotation marks make `"204"` text. This is useful for codes that
  are not meant to be calculated. Printing the variable shows the characters
  without revealing the quotation marks. **Store the text `"204"` in
  `room_code` and display `Room: 204` using the variable.**
- **starter_code:**
  ```python
  # Store the room code as text, then display it with a label.
  ```
- **solution:**
  ```python
  room_code = "204"
  print("Room:", room_code)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `room_code\s*=\s*["']204["']`
  - `print\s*\(\s*["']Room:["']\s*,\s*room_code\s*\)`
- **expect_exact_output:** |
  Room: 204
- **if_incorrect:** Check quotation marks, names, capitalization, and
  statement order.
- **concepts_introduced:** numeric-text
- **concepts_required:** basic-types, labeled-print
- **pass_rule:** Run exits 0, `room_code` holds text, and stdout is exactly
  `Room: 204`.

### py-b2.4-04 · None Represents No Value Yet

- **type:** concept
- **read:** `None` is Python's special value for a deliberate absence of
  information. It is written with an uppercase N and no quotation marks. A
  variable may store `None` until a real value becomes available. `None` is
  different from zero, `False`, and an empty string.
- **check:** What does `None` communicate?
  - A. No value is available yet
  - B. The number zero
  - C. The Boolean `False` only
  - D. The text None
- **answer:** A
- **rationale:** `None` represents deliberate absence rather than another
  ordinary value.
- **if_incorrect:** Return to the example and follow the program from top to
  bottom.
- **concepts_introduced:** none-value
- **concepts_required:** basic-types
- **pass_rule:** Learner selects A.

### py-b2.4-05 · Store a Missing Value

- **type:** practical
- **do:** A program may create a variable before its information is known.
  Assigning `None` makes that absence explicit. `print()` displays None when
  asked to show the value. Later lessons can use decisions to react to
  missing data. **Set `selected_lesson` to `None` and display `Selected:
  None` using the variable.**
- **starter_code:**
  ```python
  # Store None, then display it with a label.
  ```
- **solution:**
  ```python
  selected_lesson = None
  print("Selected:", selected_lesson)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `selected_lesson\s*=\s*None\b`
  - `print\s*\(\s*["']Selected:["']\s*,\s*selected_lesson\s*\)`
- **expect_exact_output:** |
  Selected: None
- **if_incorrect:** Check quotation marks, names, capitalization, and
  statement order.
- **concepts_required:** none-value, labeled-print
- **pass_rule:** Run exits 0, `selected_lesson` holds `None`, and stdout is
  exactly `Selected: None`.

### py-b2.4-06 · Word Problem: Represent an Incomplete Account

- **type:** practical
- **do:** An account record can contain known and unknown information. A
  username may already be available while a profile picture is not. A
  Boolean can record whether setup is complete. `None` clearly marks the
  field that has no value yet. **Store `Ada` in `username`, `None` in
  `profile_picture`, and `False` in `setup_complete`. Display them with the
  labels `Username:`, `Picture:`, and `Setup complete:`, one per line.**
- **starter_code:**
  ```python
  # Store the account fields, then display them with labels.
  ```
- **solution:**
  ```python
  username = "Ada"
  profile_picture = None
  setup_complete = False
  print("Username:", username)
  print("Picture:", profile_picture)
  print("Setup complete:", setup_complete)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `username\s*=\s*["']Ada["']`
  - `profile_picture\s*=\s*None\b`
  - `setup_complete\s*=\s*False\b`
  - `print\s*\(\s*["']Username:["']\s*,\s*username\s*\)`
  - `print\s*\(\s*["']Picture:["']\s*,\s*profile_picture\s*\)`
  - `print\s*\(\s*["']Setup complete:["']\s*,\s*setup_complete\s*\)`
- **expect_exact_output:** |
  Username: Ada
  Picture: None
  Setup complete: False
- **if_incorrect:** Check quotation marks, names, capitalization, and
  statement order.
- **concepts_required:** none-value, bool-literal, labeled-print
- **pass_rule:** Run exits 0, each labeled line uses its variable, and stdout
  matches all three lines.

## Lesson 2.5 - Inspecting a Type with type()  {#py-b2.5}

- **objective:** Use `type()` to report the type of a value or variable
  without changing it.
- **estimated_time:** 15-20 min
- **item_count:** 6
- **live_coding_items:** 4

### py-b2.5-01 · type() Reports the Current Type

- **type:** concept
- **read:** The `type()` function reports the runtime type of a value. It
  helps learners confirm how Python understands something written in code.
  `type()` does not change or convert the value. Printing `type(7)` displays
  `<class 'int'>`.
- **check:** What does `type()` do in this lesson?
  - A. Reports a value's current type
  - B. Converts every value to text
  - C. Displays the value twice
  - D. Creates a variable name
- **answer:** A
- **rationale:** `type()` inspects the value without changing it.
- **if_incorrect:** Return to the example and follow the program from top to
  bottom.
- **concepts_introduced:** type-function
- **concepts_required:** basic-types
- **pass_rule:** Learner selects A.

### py-b2.5-02 · Inspect a String

- **type:** practical
- **do:** A quoted value has the type `str`. `type()` returns the type
  information. `print()` makes that information visible. The original value
  remains unchanged after inspection. **Set `message` to `hello` and display
  `type(message)`.**
- **starter_code:**
  ```python
  # Store the text, then display its type.
  ```
- **solution:**
  ```python
  message = "hello"
  print(type(message))
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `message\s*=\s*["']hello["']`
  - `print\s*\(\s*type\s*\(\s*message\s*\)\s*\)`
- **expect_exact_output:** |
  <class 'str'>
- **if_incorrect:** Check quotation marks, names, capitalization, and
  statement order.
- **concepts_required:** type-function, variable
- **pass_rule:** Run exits 0, `type(message)` is displayed, and stdout is
  exactly `<class 'str'>`.

### py-b2.5-03 · Inspect Numeric Types

- **type:** practical
- **do:** Whole numbers and decimal numbers have different types. An `int`
  has no decimal point in its literal form. A `float` includes a decimal
  point. Inspecting both values makes the difference visible. **Set `count`
  to `5` and `price` to `5.0`. Display `type(count)` and `type(price)` on
  separate lines.**
- **starter_code:**
  ```python
  # Store both numbers, then display their types.
  ```
- **solution:**
  ```python
  count = 5
  price = 5.0
  print(type(count))
  print(type(price))
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `count\s*=\s*5\b(?!\.)`
  - `price\s*=\s*5\.0\b`
  - `print\s*\(\s*type\s*\(\s*count\s*\)\s*\)`
  - `print\s*\(\s*type\s*\(\s*price\s*\)\s*\)`
- **expect_exact_output:** |
  <class 'int'>
  <class 'float'>
- **if_incorrect:** Check quotation marks, names, capitalization, and
  statement order.
- **concepts_required:** type-function, int-literal, float-literal
- **pass_rule:** Run exits 0, both variables are inspected, and stdout shows
  `int` then `float`.

### py-b2.5-04 · type() Inspects Variables Too

- **type:** concept
- **read:** `type()` can receive a literal or a variable. When it receives a
  variable, Python inspects the value currently connected to that name. The
  variable's spelling does not affect the result. A name such as `total` can
  store an `int`, `float`, or another type.
- **check:** If `total = 9.5`, what does `type(total)` report?
  - A. `<class 'float'>`
  - B. `<class 'int'>`
  - C. `<class 'total'>`
  - D. `9.5`
- **answer:** A
- **rationale:** The stored decimal value determines the variable's current
  type.
- **if_incorrect:** Return to the example and follow the program from top to
  bottom.
- **concepts_required:** type-function, variable
- **pass_rule:** Learner selects A.

### py-b2.5-05 · Inspect None and a Boolean

- **type:** practical
- **do:** `None` has its own type, called `NoneType`. A Boolean has the type
  `bool`. `type()` can report both without changing them. Their displayed
  values remain None and True when printed normally. **Set `missing` to
  `None` and `active` to `True`. Display `type(missing)` and
  `type(active)` on separate lines.**
- **starter_code:**
  ```python
  # Store both values, then display their types.
  ```
- **solution:**
  ```python
  missing = None
  active = True
  print(type(missing))
  print(type(active))
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `missing\s*=\s*None\b`
  - `active\s*=\s*True\b`
  - `print\s*\(\s*type\s*\(\s*missing\s*\)\s*\)`
  - `print\s*\(\s*type\s*\(\s*active\s*\)\s*\)`
- **expect_exact_output:** |
  <class 'NoneType'>
  <class 'bool'>
- **if_incorrect:** Check quotation marks, names, capitalization, and
  statement order.
- **concepts_required:** type-function, none-value, bool-literal
- **pass_rule:** Run exits 0, both variables are inspected, and stdout shows
  `NoneType` then `bool`.

### py-b2.5-06 · Word Problem: Check a Product Record

- **type:** practical
- **do:** Inspecting types can confirm that a product record uses the
  intended kinds of values. A name should be text, a quantity should be a
  whole number, and a price may be a decimal number. `type()` reports each
  stored type. The program does not perform any conversion. **Store
  `notebook` in `product`, `4` in `quantity`, and `2.5` in `price`. Display
  their three types in that order.**
- **starter_code:**
  ```python
  # Store the product record, then display each field's type.
  ```
- **solution:**
  ```python
  product = "notebook"
  quantity = 4
  price = 2.5
  print(type(product))
  print(type(quantity))
  print(type(price))
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `product\s*=\s*["']notebook["']`
  - `quantity\s*=\s*4\b`
  - `price\s*=\s*2\.5\b`
  - `print\s*\(\s*type\s*\(\s*product\s*\)\s*\)`
  - `print\s*\(\s*type\s*\(\s*quantity\s*\)\s*\)`
  - `print\s*\(\s*type\s*\(\s*price\s*\)\s*\)`
- **expect_exact_output:** |
  <class 'str'>
  <class 'int'>
  <class 'float'>
- **if_incorrect:** Check quotation marks, names, capitalization, and
  statement order.
- **concepts_required:** type-function, basic-types
- **pass_rule:** Run exits 0, all three variables are inspected, and stdout
  matches all three lines.

## Lesson 2.6 - Reassignment and Clear Names  {#py-b2.6}

- **objective:** Reassign variables to new values and choose clear
  snake_case names.
- **estimated_time:** 15-20 min
- **item_count:** 6
- **live_coding_items:** 4

### py-b2.6-01 · Reassignment Stores a New Value

- **type:** concept
- **read:** A variable can later be assigned another value. This is called
  reassignment. After `score = 10` and `score = 12`, the name `score` refers
  to 12. Printing `score` afterward displays the most recently assigned
  value.
- **check:** What does `score` contain after `score = 5` followed by
  `score = 8`?
  - A. `8`
  - B. `5`
  - C. `13`
  - D. Both values at once
- **answer:** A
- **rationale:** The second assignment replaces the value currently
  connected to `score`.
- **if_incorrect:** Return to the example and follow the program from top to
  bottom.
- **concepts_introduced:** reassignment
- **concepts_required:** assignment
- **pass_rule:** Learner selects A.

### py-b2.6-02 · Update a Status

- **type:** practical
- **do:** Reassignment uses the same equals-sign syntax as the first
  assignment. The new value appears on the right. Later instructions see the
  updated value. Earlier output is not changed retroactively. **Set `status`
  to `waiting` and display it. Then reassign `status` to `ready` and display
  it again.**
- **starter_code:**
  ```python
  # Set status, display it, reassign it, then display it again.
  ```
- **solution:**
  ```python
  status = "waiting"
  print(status)
  status = "ready"
  print(status)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `status\s*=\s*["']waiting["'][\s\S]*print\s*\(\s*status\s*\)[\s\S]*status\s*=\s*["']ready["'][\s\S]*print\s*\(\s*status\s*\)`
- **expect_exact_output:** |
  waiting
  ready
- **if_incorrect:** Check quotation marks, names, capitalization, and
  statement order.
- **concepts_required:** reassignment, variable
- **pass_rule:** Run exits 0, `status` is printed before and after the
  reassignment, and stdout is `waiting` then `ready`.

### py-b2.6-03 · Change a Variable's Type

- **type:** practical
- **do:** Python allows a variable to receive a value of another type later.
  The current value determines the current type. Reassigning an `int`
  variable to text changes what `type()` reports. Clear programs avoid
  unnecessary type changes because they can make a name harder to
  understand. **Set `value` to `7` and display `type(value)`. Reassign
  `value` to the text `"seven"` and display `type(value)` again.**
- **starter_code:**
  ```python
  # Set value, show its type, reassign it to text, then show the type again.
  ```
- **solution:**
  ```python
  value = 7
  print(type(value))
  value = "seven"
  print(type(value))
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `value\s*=\s*7\b[\s\S]*print\s*\(\s*type\s*\(\s*value\s*\)\s*\)[\s\S]*value\s*=\s*["']seven["'][\s\S]*print\s*\(\s*type\s*\(\s*value\s*\)\s*\)`
- **expect_exact_output:** |
  <class 'int'>
  <class 'str'>
- **if_incorrect:** Check quotation marks, names, capitalization, and
  statement order.
- **concepts_required:** reassignment, type-function
- **pass_rule:** Run exits 0, `type(value)` is shown before and after the
  reassignment, and stdout shows `int` then `str`.

### py-b2.6-04 · Clear Names Explain Stored Values

- **type:** concept
- **read:** A useful variable name describes the information it stores.
  Python commonly writes multiword names in snake_case, using lowercase
  words separated by underscores. Names cannot contain spaces or begin with
  a number. A clear name reduces the need to remember what a vague letter
  means.
- **check:** Which name best stores the number of completed lessons?
  - A. `completed_lessons`
  - B. `x`
  - C. `completed lessons`
  - D. `2lessons`
- **answer:** A
- **rationale:** It is descriptive and follows valid snake_case form.
- **if_incorrect:** Return to the example and follow the program from top to
  bottom.
- **concepts_introduced:** snake-case
- **concepts_required:** variable
- **pass_rule:** Learner selects A.

### py-b2.6-05 · Use Descriptive Names

- **type:** practical
- **do:** Descriptive names make output code easier to follow. The name
  tells a reader what value will appear beside each label. Assignment and
  printing work exactly as they do with shorter names. The improvement is
  clarity rather than different behavior. **Store `6` in
  `completed_lessons` and `False` in `certificate_earned`. Display them with
  the labels `Completed lessons:` and `Certificate earned:`, one per line.**
- **starter_code:**
  ```python
  # Store both values, then display them with labels.
  ```
- **solution:**
  ```python
  completed_lessons = 6
  certificate_earned = False
  print("Completed lessons:", completed_lessons)
  print("Certificate earned:", certificate_earned)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `completed_lessons\s*=\s*6\b`
  - `certificate_earned\s*=\s*False\b`
  - `print\s*\(\s*["']Completed lessons:["']\s*,\s*completed_lessons\s*\)`
  - `print\s*\(\s*["']Certificate earned:["']\s*,\s*certificate_earned\s*\)`
- **expect_exact_output:** |
  Completed lessons: 6
  Certificate earned: False
- **if_incorrect:** Check quotation marks, names, capitalization, and
  statement order.
- **concepts_required:** snake-case, labeled-print
- **pass_rule:** Run exits 0, both labeled lines use the variables, and
  stdout matches both lines.

### py-b2.6-06 · Word Problem: Update a Download Status

- **type:** practical
- **do:** A download status changes as work progresses. One descriptive
  variable can store each stage in sequence. Printing before and after
  reassignment shows that the current value changed. The name remains
  meaningful during both stages. **Store `pending` in `download_status` and
  display `Status: pending`. Then reassign it to `complete` and display
  `Status: complete`, using the variable both times.**
- **starter_code:**
  ```python
  # Store the status, display it, update it, then display it again.
  ```
- **solution:**
  ```python
  download_status = "pending"
  print("Status:", download_status)
  download_status = "complete"
  print("Status:", download_status)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `download_status\s*=\s*["']pending["'][\s\S]*print\s*\(\s*["']Status:["']\s*,\s*download_status\s*\)[\s\S]*download_status\s*=\s*["']complete["'][\s\S]*print\s*\(\s*["']Status:["']\s*,\s*download_status\s*\)`
- **expect_exact_output:** |
  Status: pending
  Status: complete
- **if_incorrect:** Check quotation marks, names, capitalization, and
  statement order.
- **concepts_required:** reassignment, snake-case, labeled-print
- **pass_rule:** Run exits 0, the status is printed before and after the
  reassignment, and stdout matches both lines.

## Checkpoint - Topic 2  {#py-b2.CP}

- **objective:** Combine variables of every basic type, a reassignment, and
  labeled output into a learner information card.
- **estimated_time:** 15-20 min
- **type:** checkpoint
- **brief:** This checkpoint combines only skills already introduced in
  Topic 2. Variables store text, numeric, Boolean, and missing values.
  Comma-separated `print()` values create clear labeled lines. One
  reassignment updates the learner's current status before the final card
  is displayed. Create variables named `learner_name`, `completed_lessons`,
  `average_score`, `active`, and `next_lesson`, storing `Mina`, `4`, `92.5`,
  `True`, and `None`. Reassign `next_lesson` to `Variables`, then display
  the five labeled lines shown below using the variables.
- **requirements:**
  - Create the five variables with the names and values given.
  - Reassign `next_lesson` from `None` to `"Variables"`.
  - Display `Name:`, `Completed:`, `Average:`, `Active:`, and `Next lesson:`
    lines, each using its variable.
  - Do not use input, arithmetic, comparisons, or conditions.
- **solution:**
  ```python
  learner_name = "Mina"
  completed_lessons = 4
  average_score = 92.5
  active = True
  next_lesson = None
  next_lesson = "Variables"
  print("Name:", learner_name)
  print("Completed:", completed_lessons)
  print("Average:", average_score)
  print("Active:", active)
  print("Next lesson:", next_lesson)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `learner_name\s*=\s*["']Mina["']`
  - `completed_lessons\s*=\s*4\b`
  - `average_score\s*=\s*92\.5\b`
  - `active\s*=\s*True\b`
  - `next_lesson\s*=\s*None\b[\s\S]*next_lesson\s*=\s*["']Variables["']`
  - `print\s*\(\s*["']Name:["']\s*,\s*learner_name\s*\)`
  - `print\s*\(\s*["']Completed:["']\s*,\s*completed_lessons\s*\)`
  - `print\s*\(\s*["']Average:["']\s*,\s*average_score\s*\)`
  - `print\s*\(\s*["']Active:["']\s*,\s*active\s*\)`
  - `print\s*\(\s*["']Next lesson:["']\s*,\s*next_lesson\s*\)`
- **expect_exact_output:** |
  Name: Mina
  Completed: 4
  Average: 92.5
  Active: True
  Next lesson: Variables
- **tutor:** Check quotation marks, names, capitalization, and statement
  order. Make the reassignment before the last `print()` so the card shows
  the updated lesson.
- **pass_rule:** Run exits 0, every line uses its variable, and stdout
  matches all five lines.
