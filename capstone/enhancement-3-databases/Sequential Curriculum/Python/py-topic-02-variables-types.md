---
topic_id: py-topic-02
course: python
section: foundations
topic_number: 2
title: Variables, Data Types, and Input
slug: variables-types
lessons: [py-2.1, py-2.2, py-2.3, py-2.4, py-2.5, py-2.6, py-2.7, py-2.8]
checkpoint_id: py-2.CP
live_coding_exception: false
format_version: 1
---

# Topic 2 — Variables, Data Types, and Input

The learner writes their first real Python: displaying values with `print()`, naming values with variables, the core built-in types (`int`, `float`, `str`, `bool`, `NoneType`), inspecting a type with `type()`, converting deliberately between types, formatting output with f-strings, and reading a line of input. **Scope boundaries.** Arithmetic is limited to simple expressions using one operator at a time. Operator precedence and comparison/logical operators are Topic 3. String methods and slicing are Topic 4. `if`/`else` is Topic 7, so nothing here branches on a value. Invalid-input recovery with `try`/`except` is Topic 10; every conversion in this topic uses valid input. **Live coding.** At least half of every lesson's required items and expected learner time is live coding. Lessons 2.1–2.7 use fixed values; Lesson 2.8 and the checkpoint read `input()` and are graded against hidden input/output cases. When a task requires a particular technique, that technique must be checked structurally rather than inferred from matching output alone. This topic teaches calls to provided built-in functions; defining new functions is deferred until Topic 9.

---

## Lesson 2.1 — Printing Values  {#py-2.1}

- **objective:** Use `print()` to display text and numbers — one value, several values on a line, and output across multiple lines.
- **estimated_time:** 20–30 min
- **item_count:** 11
- **live_coding_items:** 8

### py-2.1-01 · print() Shows a Value

- **type:** concept
- **read:** `print()` is a built-in Python function — meaning Python provides it
  for you — and its job is to display information. Using a function like this
  is called making a **function call**. In `print("Denver")`, the parentheses
  hold the value you want displayed. Notice the text sits between quotes —
  `"Denver"` or `'Denver'` both work — and those quotes just mark where the text
  starts and ends; they never show up in the output itself. A number like `42`,
  on the other hand, is written **without** quotes. So `print("Denver")`
  displays `Denver` and then moves down to a new line.
- **check:** What does `print("Cheese")` display?
  - A. `"Cheese"` (with the quotes)
  - B. `Cheese`
  - C. `print("Cheese")`
  - D. nothing
- **answer:** B
- **rationale:** The quotes only delimit the text in your code; the output is
  the text itself, `Cheese`.
- **if_incorrect:** Separate the code you write from what appears on screen —
  the quotes are punctuation for Python, not characters to display.
- **tutor:** Ask the learner which characters of `"Cheese"` are the actual text
  and which are just markers.
- **pass_rule:** Learner selects B.

### py-2.1-02 · Print Some Text

- **type:** practical
- **do:** Write one line that prints the text: `Hello, world`
- **solution:**
  ```python
  print("Hello, world")
  ```
- **evaluator:** browser-exec
- **expect_exact_output:** |
  Hello, world
- **tutor:** `print("Hello, world")`. A `SyntaxError` usually means a missing
  quote or a missing closing parenthesis.
- **pass_rule:** Run exits 0 and stdout is exactly `Hello, world`.

### py-2.1-03 · Print a Number

- **type:** practical
- **do:** Write one line that prints the number `42`. Numbers are written
  **without** quotes. The quotes are what tell Python "this is text — treat it
  exactly as written." A bare `42` is a number, while `"42"` is text. Their
  types are introduced in Lessons 2.3 and 2.4. **Write `42` as a bare number,
  not `"42"` in quotes.**
- **solution:**
  ```python
  print(42)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `(?<!["'])\b42\b(?!["'])`
- **expect_exact_output:** |
  42
- **tutor:** `print(42)` — no quotes, because `42` is a number, not text.
  `print("42")` would also show `42`, but that `"42"` is text, not a number you
  could add to.
- **pass_rule:** Run exits 0 and stdout is exactly `42`.

### py-2.1-04 · print() Moves to a New Line

- **type:** concept
- **read:** Every `print(...)` call ends by moving down to a new line, so
  calling `print` twice puts the two outputs on separate lines. And if you call
  `print()` with nothing between the parentheses, you just get an empty line.
- **check:** How many lines of output do `print("cat")` and `print("dog")` produce?
  - A. 1 line
  - B. 2 lines
  - C. 0 lines
  - D. 3 lines
- **answer:** B
- **rationale:** Each `print` call writes its value and then a line break, so
  two calls make two lines.
- **if_incorrect:** Every `print` ends its own line — count the `print` calls.
- **tutor:** Ask what the screen looks like after the first `print` finishes,
  and where the second one starts writing.
- **pass_rule:** Learner selects B.

### py-2.1-05 · Two Lines

- **type:** practical
- **do:** Print `first` on one line and `second` on the next line, using two
  separate `print()` calls. **Use one `print()` call for each line.**
- **solution:**
  ```python
  print("first")
  print("second")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `(?:print\s*\([\s\S]*?){2}`
- **expect_exact_output:** |
  first
  second
- **tutor:** Two lines of code: `print("first")` then `print("second")`.
- **pass_rule:** Run exits 0 and stdout is exactly those two lines in order.

### py-2.1-06 · print() Can Show Several Values

- **type:** concept
- **read:** A `print()` call isn't limited to one value — you can separate
  several with commas. Python displays them all on the same line, with one
  space between each. Those commas are just separators in your code; they never
  show up in the output. So `print("score", 100)` displays `score 100`.
- **check:** What does `print("Total:", 15)` display?
  - A. `Total:15`
  - B. `Total: 15`
  - C. `Total:, 15`
  - D. `"Total:" 15`
- **answer:** B
- **rationale:** `print` puts one space between the values and shows neither
  the commas nor the quotes.
- **if_incorrect:** In `print("Total:", 15)`, the comma separates the two
  values in the code. Python displays one space between them and does not
  display the comma.
- **tutor:** Ask what character `print` places between two comma-separated
  values.
- **pass_rule:** Learner selects B.

### py-2.1-07 · Values on One Line

- **type:** practical
- **do:** With a **single** `print()` call, display: `Total: 15` — the word
  `Total:` and the number `15`, separated by one space. **Pass the two values
  to one `print()` call separated by a comma; `15` stays a bare number.**
- **solution:**
  ```python
  print("Total:", 15)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `print\s*\([^)]*,[^)]*\)`
  - `[(,]\s*15\b`
- **expect_exact_output:** |
  Total: 15
- **tutor:** `print("Total:", 15)`.
- **pass_rule:** Run exits 0 and stdout is exactly `Total: 15`.

### py-2.1-08 · Repair the Status Card

- **type:** practical
- **practice_group:** true
- **do:** The status card should have four lines, including one blank line.
  Repair the line layout and the final `print()` call. **Split `SYSTEM` and
  `READY` into two separate `print()` calls, keep the blank `print()`, and
  separate `"Attempts:"` and `3` with a comma.**
- **starter_code:**
  ```python
  print("SYSTEM", "READY")
  print()
  print("Attempts:" 3)
  ```
- **solution:**
  ```python
  print("SYSTEM")
  print("READY")
  print()
  print("Attempts:", 3)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `print\s*\(\s*"SYSTEM"\s*\)`
  - `print\s*\(\s*"READY"\s*\)`
  - `print\s*\(\s*\)`
  - `print\s*\(\s*"Attempts:"\s*,\s*3\s*\)`
- **expect_exact_output:** |
  SYSTEM
  READY

  Attempts: 3
- **tutor:** Split `print("SYSTEM", "READY")` into two separate `print()`
  calls, keep the blank `print()` where it is, and add the missing comma
  between `"Attempts:"` and `3`.
- **pass_rule:** Run exits 0 and stdout matches exactly (four lines, the
  third blank).

### py-2.1-09 · Rebuild the Receipt Layout

- **type:** practical
- **practice_group:** true
- **do:** The receipt should show three lines — item, quantity, and total —
  but the quantity has no label and is grouped in with the item instead of
  standing on its own line. **Repair it using exactly three `print()` calls,
  adding a `"QUANTITY:"` label for the middle line. Keep `2` and `8` as bare
  numbers.**
- **starter_code:**
  ```python
  print("ITEM:", "Notebook", 2)
  print("TOTAL:", 8)
  ```
- **solution:**
  ```python
  print("ITEM:", "Notebook")
  print("QUANTITY:", 2)
  print("TOTAL:", 8)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `print\s*\(\s*"ITEM:"\s*,\s*"Notebook"\s*\)`
  - `print\s*\(\s*"QUANTITY:"\s*,\s*2\s*\)`
  - `print\s*\(\s*"TOTAL:"\s*,\s*8\s*\)`
- **expect_exact_output:** |
  ITEM: Notebook
  QUANTITY: 2
  TOTAL: 8
- **tutor:** Three separate calls: `print("ITEM:", "Notebook")`,
  `print("QUANTITY:", 2)`, `print("TOTAL:", 8)`.
- **pass_rule:** Run exits 0 and stdout matches exactly.

### py-2.1-10 · Move the Blank Line

- **type:** practical
- **practice_group:** true
- **do:** The program runs, but the blank line appears after the report
  instead of between the heading and the result. **Reorder the existing
  three `print()` calls — don't add or remove any.**
- **starter_code:**
  ```python
  print("REPORT")
  print("Complete")
  print()
  ```
- **solution:**
  ```python
  print("REPORT")
  print()
  print("Complete")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `print\s*\(\s*"REPORT"\s*\)`
  - `print\s*\(\s*\)`
  - `print\s*\(\s*"Complete"\s*\)`
- **expect_exact_output:** |
  REPORT

  Complete
- **tutor:** Move the blank `print()` so it sits between `"REPORT"` and
  `"Complete"`.
- **pass_rule:** Run exits 0 and stdout matches exactly (three lines, the
  middle one blank).

### py-2.1-11 · Keep Related Values Together

- **type:** practical
- **practice_group:** true
- **do:** Each coordinate should appear on one line, but the four values are
  currently spread across four separate `print()` calls instead of two.
  **Shrink the program down to two `print()` calls total, passing three
  values to each — don't add any new `print()` calls.**
- **starter_code:**
  ```python
  print("Point A:", 4)
  print(9)
  print("Point B:", 2)
  print(7)
  ```
- **solution:**
  ```python
  print("Point A:", 4, 9)
  print("Point B:", 2, 7)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `print\s*\(\s*"Point A:"\s*,\s*4\s*,\s*9\s*\)`
  - `print\s*\(\s*"Point B:"\s*,\s*2\s*,\s*7\s*\)`
- **expect_exact_output:** |
  Point A: 4 9
  Point B: 2 7
- **tutor:** Combine each point into one `print()` call with three
  comma-separated values: `print("Point A:", 4, 9)` then
  `print("Point B:", 2, 7)`. Passing this item completes Lesson 2.1 and
  unlocks Lesson 2.2.
- **pass_rule:** Run exits 0 and stdout matches exactly.

---

## Lesson 2.2 — Variables and Assignment  {#py-2.2}

- **objective:** Assign a value to a name with `=`, reuse it, reassign it, and choose valid, readable names.
- **estimated_time:** 20–30 min
- **item_count:** 11
- **live_coding_items:** 8

### py-2.2-01 · A Variable Names a Value

- **type:** concept
- **read:** A variable is just a name connected to a value. The instruction
  `city = "Denver"` assigns the text `Denver` to the variable `city`. From that
  point on, using `city` means using whatever value it was assigned. That
  single `=` means **assign** — the variable name goes on the left, the value
  goes on the right.
- **check:** After `n = 4`, what value is assigned to `n`?
  - A. The text `n`
  - B. `4`
  - C. The complete instruction `n = 4`
  - D. No value
- **answer:** B
- **rationale:** The value on the right side of `=` is assigned to the name on
  the left.
- **if_incorrect:** In `n = 4`, `n` is the variable name and `4` is the value
  assigned to it.
- **tutor:** Ask what Python does *first* when it reads a line containing `=`.
- **pass_rule:** Learner selects B.

### py-2.2-02 · Assign and Print

- **type:** practical
- **do:** Assign the text `Denver` to a variable named `city`, then print the
  variable. **Your solution must assign the value first and pass `city` to
  `print()` rather than printing the text directly.**
- **solution:**
  ```python
  city = "Denver"
  print(city)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `^\s*[A-Za-z_]\w*\s*=\s*["']`
  - `print\s*\(\s*[A-Za-z_]\w*\s*\)`
- **expect_exact_output:** |
  Denver
- **tutor:** `city = "Denver"` then `print(city)`. Printing `city` (no quotes)
  shows the value it names.
- **pass_rule:** Run exits 0 and stdout is exactly `Denver`.

### py-2.2-03 · Reuse a Name

- **type:** practical
- **do:** Assign the text `echo` to `word`, then print it twice on separate
  lines — using the variable both times. **Both `print()` calls must print the
  variable, not the text `echo` retyped.**
- **solution:**
  ```python
  word = "echo"
  print(word)
  print(word)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `^\s*[A-Za-z_]\w*\s*=\s*["']`
  - `(?:print\s*\(\s*[A-Za-z_]\w*\s*\)[\s\S]*?){2}`
- **expect_exact_output:** |
  echo
  echo
- **tutor:** `word = "echo"`, then `print(word)` on two lines. The point of a
  variable is using the value by name instead of retyping it.
- **pass_rule:** Run exits 0 and stdout is exactly `echo` twice.

### py-2.2-04 · Reassigning Repoints the Name

- **type:** concept
- **read:** A variable can always be assigned again. After `x = 1` and then
  `x = 9`, the name `x` now refers to `9` — the value `1` isn't gone, it's just
  no longer named by `x`. Whatever assignment happened most recently wins.
- **check:** After `x = 1` then `x = 9`, what does `print(x)` show?
  - A. `1`
  - B. `9`
  - C. `1 9`
  - D. `19`
- **answer:** B
- **rationale:** The second assignment repoints `x`; only its current value,
  `9`, is printed.
- **if_incorrect:** A variable holds one value at a time — the latest one
  assigned.
- **tutor:** Ask which line was the *last* one to change `x`.
- **pass_rule:** Learner selects B.

### py-2.2-05 · Change a Variable

- **type:** practical
- **do:** Assign `3` to `count` and print it. Then reassign `10` to `count` and
  print it again. **Both `print()` calls must print the `count` variable, and
  the `10` must come from a second assignment — don't just print `3` and `10`
  directly.**
- **solution:**
  ```python
  count = 3
  print(count)
  count = 10
  print(count)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `(?:^\s*[A-Za-z_]\w*\s*=\s*\d[\s\S]*?){2}`
  - `(?:print\s*\(\s*[A-Za-z_]\w*\s*\)[\s\S]*?){2}`
- **expect_exact_output:** |
  3
  10
- **tutor:** Four lines: assign, print, assign again, print. The second
  `print(count)` sees the new value.
- **pass_rule:** Run exits 0 and stdout is exactly `3` then `10`.

### py-2.2-06 · Naming Rules

- **type:** concept
- **read:** A variable name can contain letters, digits, and underscores, but
  it **can't start with a digit**, and it can't contain spaces or hyphens.
  Names are also case-sensitive, so `age` and `Age` are actually two different
  variables. On top of that, Python reserves certain words to build the
  language itself — words like `class`, `for`, and `if` can't be used as
  variable names.
  You don't need to know what those words actually do yet, just that they're
  off-limits as names. The usual Python convention is lowercase words joined by
  underscores, like `first_name` — and a descriptive name is almost always
  clearer than a single letter.
- **check:** Which of these is a valid variable name?
  - A. `2nd_place`
  - B. `total-price`
  - C. `first_name`
  - D. `class`
- **answer:** C
- **rationale:** `first_name` contains only letters and an underscore, begins
  with a letter, and is not a reserved word.
- **if_incorrect:** A name cannot start with a digit (A), contain a hyphen (B),
  or use a reserved word such as `class` (D).
- **tutor:** Ask the learner to read each option aloud and name the exact
  character that breaks it.
- **pass_rule:** Learner selects C.

### py-2.2-07 · Well-Named Variables

- **type:** practical
- **do:** Store the text `Ada` in a variable named `first_name` and the number
  `36` in a variable named `age`. Then print them on one line, separated by a
  space, with a single `print()` call. **Both values must come from your
  variables inside the `print()` call** — `print("Ada 36")` won't pass.
- **solution:**
  ```python
  first_name = "Ada"
  age = 36
  print(first_name, age)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `^\s*[A-Za-z_]\w*\s*=\s*["']`
  - `^\s*[A-Za-z_]\w*\s*=\s*\d`
  - `print\s*\(\s*[A-Za-z_]\w*\s*,\s*[A-Za-z_]\w*`
- **expect_exact_output:** |
  Ada 36
- **tutor:** `print(first_name, age)` — the comma gives the single space.
- **pass_rule:** Run exits 0 and stdout is exactly `Ada 36`.

### py-2.2-08 · Repair the Shipping Label

- **type:** practical
- **practice_group:** true
- **do:** The correct values are stored, but the output uses them under the
  wrong labels. **Repair only the two `print()` calls — don't change either
  assignment.**
- **starter_code:**
  ```python
  city = "Denver"
  state = "Colorado"
  print("City:", state)
  print("State:", city)
  ```
- **solution:**
  ```python
  city = "Denver"
  state = "Colorado"
  print("City:", city)
  print("State:", state)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `print\s*\(\s*"City:"\s*,\s*city\s*\)`
  - `print\s*\(\s*"State:"\s*,\s*state\s*\)`
- **expect_exact_output:** |
  City: Denver
  State: Colorado
- **tutor:** Swap which variable each `print()` references:
  `print("City:", city)` then `print("State:", state)`.
- **pass_rule:** Run exits 0 and stdout matches exactly.

### py-2.2-09 · Restore the Status Timeline

- **type:** practical
- **practice_group:** true
- **do:** The program should show all three stages in order, but the first
  value is replaced before it's ever printed, and the last value is printed
  twice. **Move and remove lines as needed while printing the `status`
  variable every time — never a quoted stage name.**
- **starter_code:**
  ```python
  status = "queued"
  status = "running"
  print(status)
  status = "finished"
  print(status)
  print(status)
  ```
- **solution:**
  ```python
  status = "queued"
  print(status)
  status = "running"
  print(status)
  status = "finished"
  print(status)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `status\s*=\s*"queued"`
  - `status\s*=\s*"running"`
  - `status\s*=\s*"finished"`
  - `(?:print\s*\(\s*status\s*\)[\s\S]*?){3}`
- **expect_exact_output:** |
  queued
  running
  finished
- **tutor:** Print `status` right after each assignment — don't skip the
  first one or repeat the last.
- **pass_rule:** Run exits 0 and stdout matches exactly.

### py-2.2-10 · Match the Assigned Names

- **type:** practical
- **practice_group:** true
- **do:** The values are assigned correctly, but both names used in
  `print()` have the wrong capitalization — Python is case-sensitive.
  **Repair the output line without changing either assignment.**
- **starter_code:**
  ```python
  first_name = "Ada"
  age = 36
  print(First_Name, Age)
  ```
- **solution:**
  ```python
  first_name = "Ada"
  age = 36
  print(first_name, age)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `print\s*\(\s*first_name\s*,\s*age\s*\)`
- **expect_exact_output:** |
  Ada 36
- **tutor:** Match the exact casing of the assignments:
  `print(first_name, age)`.
- **pass_rule:** Run exits 0 and stdout is exactly `Ada 36`.

### py-2.2-11 · Show the Value Before and After

- **type:** practical
- **practice_group:** true
- **do:** The inventory count should be shown before and after
  reassignment. The current program changes the value too early and prints
  the variable's *name* as text on the second line. **Repair both
  problems.**
- **starter_code:**
  ```python
  stock = 12
  stock = 5
  print("Before:", stock)
  print("After:", "stock")
  ```
- **solution:**
  ```python
  stock = 12
  print("Before:", stock)
  stock = 5
  print("After:", stock)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `stock\s*=\s*12`
  - `print\s*\(\s*"Before:"\s*,\s*stock\s*\)`
  - `stock\s*=\s*5`
  - `print\s*\(\s*"After:"\s*,\s*stock\s*\)`
- **expect_exact_output:** |
  Before: 12
  After: 5
- **tutor:** Print `stock` right after assigning `12`, then reassign to `5`,
  then print `stock` again — not the text `"stock"`. Passing this item
  completes Lesson 2.2 and unlocks Lesson 2.3.
- **pass_rule:** Run exits 0 and stdout matches exactly.

---

## Lesson 2.3 — Numbers: int and float  {#py-2.3}

- **objective:** Tell `int` from `float`, do basic arithmetic, and use `/`, `//`, and `%` correctly.
- **estimated_time:** 25–35 min
- **item_count:** 13
- **live_coding_items:** 8

### py-2.3-01 · Whole Numbers and Decimals

- **type:** concept
- **read:** A value written directly in your code is called a **literal**. This
  lesson covers Python's two number types. `int` represents whole numbers, like
  `5`, `-2`, and `1000`. Any number literal written with a decimal point —
  `3.14`, `0.5`, `2.0` — is a `float`. Even `2.0`, which represents a whole
  amount, still counts as a `float` because of that decimal point. Symbols that
  perform calculations are called **operators**: `+`, `-`, and `*` add,
  subtract, and multiply numbers.
- **check:** Which literal is a `float`?
  - A. `42`
  - B. `-7`
  - C. `3.0`
  - D. `1000`
- **answer:** C
- **rationale:** The decimal point makes `3.0` a `float`. The other choices are
  whole-number `int` literals.
- **if_incorrect:** Among these choices, `3.0` is the only literal written with
  a decimal point.
- **tutor:** Ask which single character tells you `3.0` is a `float` and `3` is
  not.
- **pass_rule:** Learner selects C.

### py-2.3-02 · Add and Multiply

- **type:** practical
- **do:** Assign `7` to `a` and `6` to `b`. Print their sum on one line, then
  their product on the next line. **Compute the sum and product with `+` and
  `*` inside the `print()` calls — don’t print `13` and `42` directly.**
- **solution:**
  ```python
  a = 7
  b = 6
  print(a + b)
  print(a * b)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `print\s*\([^)]*\+[^)]*\)`
  - `print\s*\([^)]*\*[^)]*\)`
- **expect_exact_output:** |
  13
  42
- **tutor:** `print(a + b)` then `print(a * b)`.
- **pass_rule:** Run exits 0 and stdout is exactly `13` then `42`.

### py-2.3-03 · Division with /

- **type:** concept
- **read:** The **division** operator `/` **always** produces a `float`, even
  when the result comes out whole — `8 / 4` is `2.0`, not `2`. In this topic,
  division works on nonnegative `int` operands with a positive, nonzero
  divisor — negative operands, zero divisors, and `float` operands are outside
  what these exercises cover.
- **check:** What does `8 / 4` produce?
  - A. `2`
  - B. `2.0`
  - C. `"2"`
  - D. `4`
- **answer:** B
- **rationale:** The division operator always returns a `float`, so the result
  is `2.0`.
- **if_incorrect:** `8 / 4` has the numeric value two, and `/` represents that
  result as the `float` `2.0`.
- **tutor:** Ask what type `10 / 2` has, even though the division comes out
  even.
- **pass_rule:** Learner selects B.

### py-2.3-04 · Floor Division with //

- **type:** concept
- **read:** **Floor division** `//` keeps just the whole-number quotient and
  drops any remainder. For nonnegative integers with a positive, nonzero
  divisor, `17 // 5` is `3` — `5` fits into `17` three whole times, with `2`
  left over.
- **check:** What does `17 // 5` produce?
  - A. `3.4`
  - B. `2`
  - C. `3`
  - D. `4`
- **answer:** C
- **rationale:** `//` keeps only the whole-number quotient, so `17 // 5` is `3`.
- **if_incorrect:** `5` fits into `17` three whole times; `//` keeps that whole
  count and throws away the leftover.
- **tutor:** Ask how many whole times `5` fits into `17`.
- **pass_rule:** Learner selects C.

### py-2.3-05 · Modulo with %

- **type:** concept
- **read:** The **modulo** operator `%` gives you the remainder left over
  after floor division. `17 % 5` is `2`, because `5` fits into `17` three whole
  times with `2` left over. Together, `//` and `%` split a division into its
  whole part and its remainder.
- **check:** What does `17 % 5` produce?
  - A. `3`
  - B. `2`
  - C. `3.4`
  - D. `0`
- **answer:** B
- **rationale:** `17 % 5` is the remainder left after floor division, which is
  `2`.
- **if_incorrect:** `17 // 5` is `3` with `2` left over — that leftover is
  exactly what `%` returns.
- **tutor:** Ask what's left over after fitting `5` into `17` three whole
  times.
- **pass_rule:** Learner selects B.

### py-2.3-06 · Three Kinds of Division

- **type:** practical
- **do:** For `17` and `5`, print `17 / 5`, then `17 // 5`, then `17 % 5`, each
  on its own line. **Use the `/`, `//`, and `%` operators — don’t print `3.4`,
  `3`, or `2` directly.**
- **solution:**
  ```python
  print(17 / 5)
  print(17 // 5)
  print(17 % 5)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `print\s*\([^)]*//[^)]*\)`
  - `print\s*\([^)]*%[^)]*\)`
  - `print\s*\([^)]*(?<!/)/(?!/)[^)]*\)`
- **expect_exact_output:** |
  3.4
  3
  2
- **tutor:** Division gives `3.4` (a float), floor division gives `3` (it drops
  the fraction), and modulo gives `2` (the leftover).
- **pass_rule:** Run exits 0 and stdout is exactly `3.4`, `3`, `2`.

### py-2.3-07 · Compute, Store, Print

- **type:** practical
- **do:** A rectangle is `4` wide and `6` tall. Store the width and height in
  variables, compute the area (width times height) into a variable named
  `area`, and print `area`. **Store the product in `area` and print that
  variable — don’t print `24` directly.**
- **solution:**
  ```python
  width = 4
  height = 6
  area = width * height
  print(area)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `^\s*[A-Za-z_]\w*\s*=\s*[^=\n]*\*`
  - `print\s*\(\s*[A-Za-z_]\w*\s*\)`
- **expect_exact_output:** |
  24
- **tutor:** `area = width * height`, then `print(area)`.
- **pass_rule:** Run exits 0 and stdout is exactly `24`.

### py-2.3-08 · Calculated Reassignment

- **type:** concept
- **read:** A variable can actually appear on the right side of its own
  reassignment. In `x = x + 1`, Python first grabs the current value of `x`,
  adds `1` to it, and then assigns that result right back to `x`. So if `x` starts
  out as `4`, this instruction changes it to `5`.
- **check:** If `score` is `10`, what value does `score = score - 3` assign to `score`?
  - A. `3`
  - B. `7`
  - C. `10`
  - D. `13`
- **answer:** B
- **rationale:** Python subtracts `3` from the current value `10`, then assigns
  the result `7` back to `score`.
- **if_incorrect:** Use the current value on the right first: `10 - 3` is `7`.
  The assignment then replaces the old value with that result.
- **tutor:** Ask the learner to work out the right side using the current value
  first, then assign that result back to the name.
- **pass_rule:** Learner selects B.

### py-2.3-09 · Going Negative

- **type:** practical
- **do:** Assign `20` to `balance`. Then use `balance = balance - 35` to
  reassign it and print the new value. **Use `balance` on the right side of the
  second assignment rather than printing `-15` directly.**
- **solution:**
  ```python
  balance = 20
  balance = balance - 35
  print(balance)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `^\s*([A-Za-z_]\w*)\s*=(?!=)\s*.*\b\1\b`
  - `print\s*\(\s*[A-Za-z_]\w*\s*\)`
- **expect_exact_output:** |
  -15
- **tutor:** The right side `balance - 35` is computed first (`20 - 35` is
  `-15`), then `balance` is repointed to that result.
- **pass_rule:** Run exits 0 and stdout is exactly `-15`.

### py-2.3-10 · Repair the Packing Report

- **type:** practical
- **practice_group:** true
- **do:** A shop has `23` items and packs `5` items in each full box. The
  program should calculate the number of full boxes and the leftover
  items. **Two operators are reversed — repair them without hardcoding
  either result.**
- **starter_code:**
  ```python
  items = 23
  box_size = 5
  full_boxes = items % box_size
  leftover = items // box_size
  print("Full boxes:", full_boxes)
  print("Left over:", leftover)
  ```
- **solution:**
  ```python
  items = 23
  box_size = 5
  full_boxes = items // box_size
  leftover = items % box_size
  print("Full boxes:", full_boxes)
  print("Left over:", leftover)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `full_boxes\s*=\s*items\s*//\s*box_size`
  - `leftover\s*=\s*items\s*%\s*box_size`
- **expect_exact_output:** |
  Full boxes: 4
  Left over: 3
- **tutor:** Floor division (`//`) gives the whole boxes; modulo (`%`)
  gives what's left over — the two were swapped.
- **pass_rule:** Run exits 0 and stdout matches exactly.

### py-2.3-11 · Repair the Division Summary

- **type:** practical
- **practice_group:** true
- **do:** The three results should show ordinary division, the
  whole-number quotient, and the remainder for `17` divided by `5`. **Each
  calculation currently uses the wrong operator — repair all three
  expressions.**
- **starter_code:**
  ```python
  total = 17
  group_size = 5
  exact_result = total // group_size
  whole_groups = total % group_size
  remainder = total / group_size
  print(exact_result)
  print(whole_groups)
  print(remainder)
  ```
- **solution:**
  ```python
  total = 17
  group_size = 5
  exact_result = total / group_size
  whole_groups = total // group_size
  remainder = total % group_size
  print(exact_result)
  print(whole_groups)
  print(remainder)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `exact_result\s*=\s*total\s*/(?!/)\s*group_size`
  - `whole_groups\s*=\s*total\s*//\s*group_size`
  - `remainder\s*=\s*total\s*%\s*group_size`
- **expect_exact_output:** |
  3.4
  3
  2
- **tutor:** `/` for the exact decimal result, `//` for the whole groups,
  `%` for the remainder — all three were mismatched.
- **pass_rule:** Run exits 0 and stdout matches exactly.

### py-2.3-12 · Correct the Balance History

- **type:** practical
- **practice_group:** true
- **do:** A balance starts at `50`. A purchase removes `20`, then a refund
  adds `5`. **The program uses the wrong operation for both changes —
  repair the calculated reassignments while continuing to use `balance` on
  their right sides.**
- **starter_code:**
  ```python
  balance = 50
  balance = balance + 20
  balance = balance - 5
  print(balance)
  ```
- **solution:**
  ```python
  balance = 50
  balance = balance - 20
  balance = balance + 5
  print(balance)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `balance\s*=\s*balance\s*-\s*20`
  - `balance\s*=\s*balance\s*\+\s*5`
- **expect_exact_output:** |
  35
- **tutor:** The purchase should subtract `20`; the refund should add `5`
  — the operators were swapped.
- **pass_rule:** Run exits 0 and stdout is exactly `35`.

### py-2.3-13 · Calculate the Order Total

- **type:** practical
- **practice_group:** true
- **do:** Three items cost `8` each. **The total is calculated with the
  wrong operator, and the output prints the unit price instead of the
  calculated total — repair both lines while keeping the result in
  `total`.**
- **starter_code:**
  ```python
  unit_price = 8
  quantity = 3
  total = unit_price + quantity
  print("Total:", unit_price)
  ```
- **solution:**
  ```python
  unit_price = 8
  quantity = 3
  total = unit_price * quantity
  print("Total:", total)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `total\s*=\s*unit_price\s*\*\s*quantity`
  - `print\s*\(\s*"Total:"\s*,\s*total\s*\)`
- **expect_exact_output:** |
  Total: 24
- **tutor:** Multiply (`*`) to get the total, then print `total`, not
  `unit_price`. Passing this item completes Lesson 2.3 and unlocks Lesson
  2.4.
- **pass_rule:** Run exits 0 and stdout is exactly `Total: 24`.

---

## Lesson 2.4 — Text: the str Type  {#py-2.4}

- **objective:** Work with `str` values: join with `+`, repeat with `*`, and measure with `len()`.
- **estimated_time:** 20–30 min
- **item_count:** 11
- **live_coding_items:** 8

### py-2.4-01 · Text Is the str Type, Joined with +

- **type:** concept
- **read:** A text value like `"hello"` has the type `str`. A string can hold
  letters, digits, spaces, and punctuation — `"Room 3B"` is one string, and
  even `"42"` in quotes is a string, not a number. The `+` operator joins, or
  **concatenates**, two strings end to end, so `"cat" + "dog"` becomes
  `"catdog"`. Notice it adds **no** space on its own — you have to include one
  yourself, like `"cat" + " " + "dog"`. And `+` only ever joins a string with
  another string.
- **check:** What is `"good" + "bye"`?
  - A. `"good bye"`
  - B. `"goodbye"`
  - C. `"good + bye"`
  - D. an error
- **answer:** B
- **rationale:** `+` concatenates with nothing added between, so the result is
  `goodbye`.
- **if_incorrect:** `+` on strings glues them directly — any space has to be
  part of one of the strings.
- **tutor:** Ask where a space would have to go to get `"good bye"`.
- **pass_rule:** Learner selects B.

### py-2.4-02 · Build a Greeting

- **type:** practical
- **do:** Assign `Grace` to `name`. Using `+`, build and print the string
  `Hello, Grace!` — note the comma-and-space after Hello and the
  exclamation point at the end. **Build the string with `+` — printing the
  finished `Hello, Grace!` literal won’t pass.**
- **solution:**
  ```python
  name = "Grace"
  print("Hello, " + name + "!")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `print\s*\([^)]*\+[^)]*\)`
  - `(?<![\w"'])name(?![\w"'])`
- **expect_exact_output:** |
  Hello, Grace!
- **tutor:** `print("Hello, " + name + "!")` — three pieces joined: the literal
  `"Hello, "`, the variable, and `"!"`.
- **pass_rule:** Run exits 0 and stdout is exactly `Hello, Grace!`.

### py-2.4-03 · Repeating a String with *

- **type:** concept
- **read:** The `*` operator repeats a string when the string comes first and
  a positive `int` comes second. So `"ab" * 3` gives you `"ababab"`, and
  `"-" * 10` gives you a line of ten dashes.
- **check:** What is `"na" * 4`?
  - A. `"nananana"`
  - B. `"na4"`
  - C. `"na na na na"`
  - D. `8`
- **answer:** A
- **rationale:** `*` with a string repeats it that many times, with nothing
  inserted between copies.
- **if_incorrect:** String `*` number = the string written out that many times,
  back to back.
- **tutor:** Ask the learner to write `"na"` four times in a row and compare.
- **pass_rule:** Learner selects A.

### py-2.4-04 · A Divider Line

- **type:** practical
- **do:** Print a line made of exactly `20` equals signs (`=`), then print the
  word `REPORT`. **Make the line with `* 20` — don’t type out twenty `=`
  characters.**
- **solution:**
  ```python
  print("=" * 20)
  print("REPORT")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `\*\s*20\b|\b20\s*\*`
  - `(?:print\s*\([\s\S]*?){2}`
- **expect_exact_output:** |
  ====================
  REPORT
- **tutor:** `print("=" * 20)` then `print("REPORT")`.
- **pass_rule:** Run exits 0 and stdout is the 20-character line then `REPORT`.

### py-2.4-05 · len() Counts Characters

- **type:** concept
- **read:** `len()` — short for "length" — gives you the number of
  characters in a string: `len("hello")` is `5`. Spaces count too, so
  `len("a b")` comes out to `3`. And whatever `len()` returns is always an
  `int`.
- **check:** What is `len("Python")`?
  - A. `5`
  - B. `6`
  - C. `7`
  - D. `"Python"`
- **answer:** B
- **rationale:** `P-y-t-h-o-n` is six characters.
- **if_incorrect:** Count every character, including any spaces or punctuation.
- **tutor:** Ask the learner to count the letters of `Python` one at a time.
- **pass_rule:** Learner selects B.

### py-2.4-06 · Measure a Word

- **type:** practical
- **do:** Assign `elephant` to `word`. Print the word, then on the next line
  print how many characters it has. **Get the length with `len()` and print the
  `word` variable — don’t print `elephant` and `8` directly.**
- **solution:**
  ```python
  word = "elephant"
  print(word)
  print(len(word))
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `len\s*\(\s*[A-Za-z_]\w*\s*\)`
  - `print\s*\(\s*[A-Za-z_]\w*\s*\)`
- **expect_exact_output:** |
  elephant
  8
- **tutor:** `print(word)` then `print(len(word))`.
- **pass_rule:** Run exits 0 and stdout is exactly `elephant` then `8`.

### py-2.4-07 · Underline a Title

- **type:** practical
- **do:** Assign `Menu` to `title`. Print the title, then print a line of
  equals signs exactly as long as the title. **Size the line with `*
  len(title)` — don’t type the equals signs out.**
- **solution:**
  ```python
  title = "Menu"
  print(title)
  print("=" * len(title))
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `"="\s*\*\s*len\s*\(\s*title\s*\)`
  - `print\s*\(\s*[A-Za-z_]\w*\s*\)`
- **expect_exact_output:** |
  Menu
  ====
- **tutor:** `print("=" * len(title))` — feed the length straight into the
  repeat.
- **pass_rule:** Run exits 0 and stdout is `Menu` then four equals signs.

### py-2.4-08 · Repair the Name Badge

- **type:** practical
- **practice_group:** true
- **do:** The full name needs a space between its parts, and the
  character count must measure the completed name rather than only the
  first name. **Build `full_name` as one expression joining `first`, a
  space, and `last` with `+`, then measure `full_name` with `len()`.**
- **starter_code:**
  ```python
  first = "Ada"
  last = "Lovelace"
  full_name = first + last
  print(full_name)
  print("Characters:", len(first))
  ```
- **solution:**
  ```python
  first = "Ada"
  last = "Lovelace"
  full_name = first + " " + last
  print(full_name)
  print("Characters:", len(full_name))
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `full_name\s*=\s*first\s*\+\s*" "\s*\+\s*last`
  - `len\s*\(\s*full_name\s*\)`
- **expect_exact_output:** |
  Ada Lovelace
  Characters: 12
- **tutor:** Join with a space in between, then measure `full_name` (12
  characters), not `first`.
- **pass_rule:** Run exits 0 and stdout matches exactly.

### py-2.4-09 · Rebuild the Report Banner

- **type:** practical
- **practice_group:** true
- **do:** The title must appear before an underline of the same length.
  The program measures the word `"title"` instead of the stored value and
  prints the two lines in the wrong order. **Repair both problems.**
- **starter_code:**
  ```python
  title = "DASHBOARD"
  underline = "-" * len("title")
  print(underline)
  print(title)
  ```
- **solution:**
  ```python
  title = "DASHBOARD"
  underline = "-" * len(title)
  print(title)
  print(underline)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `underline\s*=\s*"-"\s*\*\s*len\s*\(\s*title\s*\)`
  - `print\s*\(\s*title\s*\)[\s\S]*print\s*\(\s*underline\s*\)`
- **expect_exact_output:** |
  DASHBOARD
  ---------
- **tutor:** Measure the variable `title`, not the text `"title"`, and
  print `title` before `underline`.
- **pass_rule:** Run exits 0 and stdout matches exactly.

### py-2.4-10 · Repair the Repeated Alert

- **type:** practical
- **practice_group:** true
- **do:** `alert` is already built correctly from `sound` and an
  exclamation point — leave the first two lines alone. The bug is only in
  the last line, which tries to add a number directly to `sound` instead
  of repeating the finished `alert` string. **Repair the final line so it
  prints `beep!` repeated three times.**
- **starter_code:**
  ```python
  sound = "beep"
  alert = sound + "!"
  print(sound + 3)
  ```
- **solution:**
  ```python
  sound = "beep"
  alert = sound + "!"
  print(alert * 3)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `print\s*\(\s*alert\s*\*\s*3\s*\)`
- **expect_exact_output:** |
  beep!beep!beep!
- **tutor:** Repeat the completed `alert` string with `*`, not `sound`.
- **pass_rule:** Run exits 0 and stdout is exactly `beep!beep!beep!`.

### py-2.4-11 · Repair the Code Label

- **type:** practical
- **practice_group:** true
- **do:** The program should build one formatted label and underline the
  complete label. It currently leaves out the separating space and
  measures only the code. **Repair both expressions without hardcoding
  the underline length.**
- **starter_code:**
  ```python
  heading = "Code:"
  code = "A7"
  label = heading + code
  print(label)
  print("=" * len(code))
  ```
- **solution:**
  ```python
  heading = "Code:"
  code = "A7"
  label = heading + " " + code
  print(label)
  print("=" * len(label))
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `label\s*=\s*heading\s*\+\s*" "\s*\+\s*code`
  - `len\s*\(\s*label\s*\)`
- **expect_exact_output:** |
  Code: A7
  ========
- **tutor:** Add the missing space when joining, then underline the
  length of `label`, not `code`. Passing this item completes Lesson 2.4
  and unlocks Lesson 2.5.
- **pass_rule:** Run exits 0 and stdout matches exactly.

---

## Lesson 2.5 — Booleans, None, and type()  {#py-2.5}

- **objective:** Use the `bool` values `True`/`False`, the `None` value, and `type()` to inspect any value's type.
- **estimated_time:** 20–30 min
- **item_count:** 11
- **live_coding_items:** 8

### py-2.5-01 · True and False Are Booleans

- **type:** concept
- **read:** Python has a type called `bool` with exactly two possible values:
  `True` and `False` — capital first letter, no quotes around either. They
  represent yes/no or on/off facts. So `is_active = True` is just storing a
  boolean.
- **check:** Which is the boolean value meaning "yes"?
  - A. `"True"`
  - B. `true`
  - C. `True`
  - D. `1`
- **answer:** C
- **rationale:** `True` (capitalized, unquoted) is the `bool`. `"True"` is a
  string, `true` is an undefined name, and `1` is an `int`.
- **if_incorrect:** The boolean is `True` with a capital `T` and no quotes.
  Quotes make it a string (A), lowercase `true` is not the boolean literal (B),
  and `1` is an `int` rather than a `bool` (D).
- **tutor:** Ask what type `"True"` (with quotes) would be.
- **pass_rule:** Learner selects C.

### py-2.5-02 · Store Some Facts

- **type:** practical
- **do:** Assign `True` to `is_logged_in` and `False` to `has_premium`. Print
  each on its own line. **Assign the two booleans to variables and print each
  variable — don’t print `True` or `False` directly.**
- **solution:**
  ```python
  is_logged_in = True
  has_premium = False
  print(is_logged_in)
  print(has_premium)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `^\s*[A-Za-z_]\w*\s*=\s*True\b`
  - `^\s*[A-Za-z_]\w*\s*=\s*False\b`
  - `(?:print\s*\(\s*[A-Za-z_]\w*\s*\)[\s\S]*?){2}`
- **expect_exact_output:** |
  True
  False
- **tutor:** Assign the two booleans, then `print(is_logged_in)` and
  `print(has_premium)`.
- **pass_rule:** Run exits 0 and stdout is exactly `True` then `False`.

### py-2.5-03 · None Means "No Value"

- **type:** concept
- **read:** `None` is a special value that basically means "nothing here" or
  "not set yet." Its type is `NoneType`, and `print(None)` displays the word
  `None`. Worth noting: it's **not** the same thing as `0` or the empty string
  `""`.
- **check:** What does `None` represent?
  - A. the number zero
  - B. an empty string
  - C. the absence of a value
  - D. a syntax error
- **answer:** C
- **rationale:** `None` is Python's stand-in for "no value" — distinct from `0`
  and `""`, which are real values.
- **if_incorrect:** `None` is a value that means *nothing is here* — zero and
  empty text are still something.
- **tutor:** Ask for a situation where a variable exists but has no meaningful
  value yet.
- **pass_rule:** Learner selects C.

### py-2.5-04 · An Unset Value

- **type:** practical
- **do:** Assign `None` to `middle_name` and print it. **Use the variable in
  `print()` rather than printing `None` directly.**
- **solution:**
  ```python
  middle_name = None
  print(middle_name)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `^\s*[A-Za-z_]\w*\s*=\s*None\b`
  - `print\s*\(\s*[A-Za-z_]\w*\s*\)`
- **expect_exact_output:** |
  None
- **tutor:** `middle_name = None` then `print(middle_name)` — printing `None`
  shows the word `None`.
- **pass_rule:** Run exits 0 and stdout is exactly `None`.

### py-2.5-05 · type() Reveals a Value's Type

- **type:** concept
- **read:** `type()` tells you the type of whatever value you put inside its
  parentheses. `print(type(5))` shows `<class 'int'>`, `print(type("hi"))`
  shows `<class 'str'>`, and `print(type(True))` shows `<class 'bool'>`. That
  surrounding `<class '...'>` text is just how Python formats the answer —
  focus on the type name inside the quotation marks.
- **check:** What does `print(type(3.5))` display?
  - A. `float`
  - B. `<class 'float'>`
  - C. `3.5`
  - D. `<class 'int'>`
- **answer:** B
- **rationale:** `type(3.5)` is the `float` type, and printing it shows `<class
  'float'>`.
- **if_incorrect:** `print(type(...))` always shows the `<class '...'>` form,
  and `3.5` is a `float`.
- **tutor:** Ask the learner to predict `print(type(10))` first, then check.
- **pass_rule:** Learner selects B.

### py-2.5-06 · Inspect Three Types

- **type:** practical
- **do:** Print the type of `10`, then the type of `"10"`, then the type of
  `True`, each on its own line. **Use `type(...)` for all three — don’t type
  the class lines out yourself.**
- **solution:**
  ```python
  print(type(10))
  print(type("10"))
  print(type(True))
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `(?:type\s*\([\s\S]*?){3}`
- **expect_exact_output:** |
  <class 'int'>
  <class 'str'>
  <class 'bool'>
- **tutor:** `10` is an `int`, `"10"` in quotes is a `str`, and `True` is a
  `bool`.
- **pass_rule:** Run exits 0 and stdout matches those three lines exactly.

### py-2.5-07 · Type of a Calculation

- **type:** practical
- **do:** A calculation's result has a type too. Print the value of `8 / 2`,
  then on the next line print its type. **Compute `8 / 2` and its `type(...)` —
  don’t print `4.0` and the class line directly.**
- **solution:**
  ```python
  print(8 / 2)
  print(type(8 / 2))
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `type\s*\(`
  - `\b8\s*/\s*2\b`
- **expect_exact_output:** |
  4.0
  <class 'float'>
- **tutor:** `8 / 2` is `4.0` because the division operator always makes a
  `float` — so its type is `<class 'float'>`.
- **pass_rule:** Run exits 0 and stdout is exactly `4.0` then `<class 'float'>`.

### py-2.5-08 · Repair the Account State

- **type:** practical
- **practice_group:** true
- **do:** `is_active` and `has_premium` should both hold Boolean values.
  The first is stored as text and the second has the wrong Boolean value.
  **Repair both assignments so the values and their types match the
  required output.**
- **starter_code:**
  ```python
  is_active = "True"
  has_premium = True
  print(is_active, type(is_active))
  print(has_premium, type(has_premium))
  ```
- **solution:**
  ```python
  is_active = True
  has_premium = False
  print(is_active, type(is_active))
  print(has_premium, type(has_premium))
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `^\s*is_active\s*=\s*True\b`
  - `^\s*has_premium\s*=\s*False\b`
- **expect_exact_output:** |
  True <class 'bool'>
  False <class 'bool'>
- **tutor:** `is_active` should be the Boolean `True` (not the text
  `"True"`), and `has_premium` should be `False`.
- **pass_rule:** Run exits 0 and stdout matches exactly.

### py-2.5-09 · Inspect the Stored Values

- **type:** practical
- **practice_group:** true
- **do:** The assignments are correct, but `type()` is inspecting the
  variable names written as text. **Repair both calls without changing
  the assignments.**
- **starter_code:**
  ```python
  score = 10
  verified = False
  print(type("score"))
  print(type("verified"))
  ```
- **solution:**
  ```python
  score = 10
  verified = False
  print(type(score))
  print(type(verified))
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `type\s*\(\s*score\s*\)`
  - `type\s*\(\s*verified\s*\)`
- **expect_exact_output:** |
  <class 'int'>
  <class 'bool'>
- **tutor:** Inspect the variables `score`/`verified` themselves, not the
  text of their names.
- **pass_rule:** Run exits 0 and stdout matches exactly.

### py-2.5-10 · Restore the Missing Result

- **type:** practical
- **practice_group:** true
- **do:** The variable `result` is meant to show that no result exists yet.
  The current value is a real number, and the second line inspects
  different text instead of the variable. **Repair both lines.**
- **starter_code:**
  ```python
  result = 0
  print(result)
  print(type("None"))
  ```
- **solution:**
  ```python
  result = None
  print(result)
  print(type(result))
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `^\s*result\s*=\s*None\b`
  - `type\s*\(\s*result\s*\)`
- **expect_exact_output:** |
  None
  <class 'NoneType'>
- **tutor:** Assign the real `None` value (not the text `"None"`), then
  inspect `result` itself.
- **pass_rule:** Run exits 0 and stdout matches exactly.

### py-2.5-11 · Repair the Division Inspection

- **type:** practical
- **practice_group:** true
- **do:** The report should show the result of ordinary division and its
  type. The program currently uses whole-number division and inspects the
  original integer instead of the result. **Repair both expressions.**
- **starter_code:**
  ```python
  value = 8
  result = value // 2
  print(result)
  print(type(value))
  ```
- **solution:**
  ```python
  value = 8
  result = value / 2
  print(result)
  print(type(result))
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `result\s*=\s*value\s*/(?!/)\s*2`
  - `type\s*\(\s*result\s*\)`
- **expect_exact_output:** |
  4.0
  <class 'float'>
- **tutor:** Ordinary division (`/`) produces a `float`; inspect `result`,
  not the original `value`. Passing this item completes Lesson 2.5 and
  unlocks Lesson 2.6.
- **pass_rule:** Run exits 0 and stdout matches exactly.

---

## Lesson 2.6 — Type Conversion  {#py-2.6}

- **objective:** Convert deliberately between `str`, `int`, and `float`, and know what `int()` does to a decimal value.
- **estimated_time:** 25–35 min
- **item_count:** 13
- **live_coding_items:** 10

### py-2.6-01 · Converting Between Types

- **type:** concept
- **read:** `int()`, `float()`, and `str()` each convert a value from one type
  to another, building a **new** value rather than changing the original.
  `int("42")` gives you the whole number `42`. `float(3)` gives you `3.0`.
  And going the other way, `str(42)` gives you the text `"42"`.
- **check:** What is `int("7") + 1`?
  - A. `"71"`
  - B. `8`
  - C. `"8"`
  - D. an error
- **answer:** B
- **rationale:** `int("7")` is the number `7`, and `7 + 1` is `8`.
- **if_incorrect:** Once `int()` has converted `"7"` to `7`, ordinary
  arithmetic applies.
- **tutor:** Ask what type `int("7")` is, and then what adding `1` to it gives.
- **pass_rule:** Learner selects B.

### py-2.6-02 · Text to Number

- **type:** practical
- **do:** Assign the string `"12"` to `quantity_text`. Convert it to an
  integer, add `3`, and print the result. **Convert with `int()` and add `3`
  in code — don’t print `15` directly.**
- **solution:**
  ```python
  quantity_text = "12"
  print(int(quantity_text) + 3)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `int\s*\(`
  - `\+\s*3\b`
- **expect_exact_output:** |
  15
- **tutor:** `print(int(quantity_text) + 3)`.
- **pass_rule:** Run exits 0 and stdout is exactly `15`.

### py-2.6-03 · Convert Signed Text

- **type:** practical
- **do:** Assign the string `"-5"` to `temperature_text`. Convert it to an
  integer, add `2`, and print the result. **Use `int()` rather than writing
  `-3` directly.**
- **solution:**
  ```python
  temperature_text = "-5"
  print(int(temperature_text) + 2)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `int\s*\(`
  - `\+\s*2\b`
- **expect_exact_output:** |
  -3
- **tutor:** `int("-5")` is the number `-5`; then `+ 2` is ordinary arithmetic.
- **pass_rule:** Run exits 0 and stdout is exactly `-3`.

### py-2.6-04 · You Can't Join str and int with +

- **type:** concept
- **read:** `"Age: " + 42` actually raises an error, because `+` refuses to
  join a string and a number directly. You need to convert the number to text
  first — `"Age: " + str(42)` gives you `"Age: 42"`.
- **check:** `"Score: " + 100` raises an error. Which version fixes it?
  - A. `"Score: " + str(100)`
  - B. `"Score: " + int(100)`
  - C. `str("Score: ") + 100`
  - D. `"Score: " - 100`
- **answer:** A
- **rationale:** The number must become a string. `int(100)` is still a
  number (B); `str()` on a string changes nothing (C); `-` on text is
  meaningless (D).
- **if_incorrect:** To join with `+`, both sides must be strings — convert
  the number with `str()`.
- **tutor:** Ask which operand in `"Score: " + 100` is the wrong type, and
  what turns it into a string.
- **pass_rule:** Learner selects A.

### py-2.6-05 · Label a Number

- **type:** practical
- **do:** Assign the integer `95` to `score`. Print the string `Your score is 95`
  by converting `score` to text and joining with `+` (use `str()` and `+`, not
  commas). **Join with `str()` and `+` — printing the finished literal won’t
  pass.**
- **solution:**
  ```python
  score = 95
  print("Your score is " + str(score))
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `str\s*\(`
  - `print\s*\([^)]*\+[^)]*\)`
- **expect_exact_output:** |
  Your score is 95
- **tutor:** `print("Your score is " + str(score))`.
- **pass_rule:** Run exits 0 and stdout is exactly `Your score is 95`.

### py-2.6-06 · int() Drops the Decimal Part

- **type:** concept
- **read:** Converting a `float` to an integer with `int()` just throws away
  everything after the decimal point — it does **not** round. So `int(3.9)` is
  `3`, and `int(-2.7)` is `-2`. This is called truncating toward zero. Every
  conversion in this topic works with a valid numeric value.
- **check:** What is `int(4.8)`?
  - A. `5`
  - B. `4`
  - C. `4.8`
  - D. `"4"`
- **answer:** B
- **rationale:** `int()` truncates toward zero, discarding the `.8`.
- **if_incorrect:** `int()` does not round to the nearest whole number. It
  removes the fractional part and moves the result toward zero.
- **tutor:** Ask what `int(4.8)` and `int(4.1)` each give, and whether either
  rounds.
- **pass_rule:** Learner selects B.

### py-2.6-07 · Whole Dollars

- **type:** practical
- **do:** Assign the `float` `19.99` to `price`. Print only the whole-dollar
  part (the number before the decimal) by converting to an integer. **Convert
  `price` with `int()` — don’t print `19` directly.**
- **solution:**
  ```python
  price = 19.99
  print(int(price))
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `int\s*\(\s*[A-Za-z_]\w*\s*\)`
- **expect_exact_output:** |
  19
- **tutor:** `print(int(price))` — `int()` drops the `.99`.
- **pass_rule:** Run exits 0 and stdout is exactly `19`.

### py-2.6-08 · Round Trip

- **type:** practical
- **do:** Start with the integer `7`. Convert it to a string and print that
  string's length. Then convert it back to an integer, add `1`, and print
  the result. **Use `str()`, `len()`, and `int()` — don’t print `1` and `8`
  directly.**
- **solution:**
  ```python
  n = 7
  text = str(n)
  print(len(text))
  print(int(text) + 1)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `str\s*\(`
  - `len\s*\(`
  - `int\s*\(`
- **expect_exact_output:** |
  1
  8
- **tutor:** `str(7)` is `"7"`, one character long; `int("7") + 1` is `8`.
- **pass_rule:** Run exits 0 and stdout is exactly `1` then `8`.

### py-2.6-09 · Make Float Values

- **type:** practical
- **do:** Assign the integer `6` to `whole` and the string `"2.5"` to
  `decimal_text`. Convert each value with `float()` and print the results on
  separate lines. **Use `float()` in both `print()` calls.**
- **solution:**
  ```python
  whole = 6
  decimal_text = "2.5"
  print(float(whole))
  print(float(decimal_text))
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `(?:float\s*\([\s\S]*?){2}`
- **expect_exact_output:** |
  6.0
  2.5
- **tutor:** `float(6)` is `6.0` and `float("2.5")` is `2.5`. Print each on its
  own line.
- **pass_rule:** Run exits 0 and stdout is exactly `6.0` then `2.5`.

### py-2.6-10 · Repair the Quantity Update

- **type:** practical
- **practice_group:** true
- **do:** The quantity arrives as text. The program calls `int()` but
  throws away its return value, then tries to add a number to the
  original string. **Store the converted value in a variable named
  `quantity`, then use it.**
- **starter_code:**
  ```python
  quantity_text = "12"
  int(quantity_text)
  updated = quantity_text + 3
  print(updated)
  ```
- **solution:**
  ```python
  quantity_text = "12"
  quantity = int(quantity_text)
  updated = quantity + 3
  print(updated)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `quantity\s*=\s*int\s*\(\s*quantity_text\s*\)`
  - `updated\s*=\s*quantity\s*\+\s*3`
- **expect_exact_output:** |
  15
- **tutor:** Store the converted value in `quantity`, then add `3` to
  `quantity`, not `quantity_text`.
- **pass_rule:** Run exits 0 and stdout is exactly `15`.

### py-2.6-11 · Repair the Price Summary

- **type:** practical
- **practice_group:** true
- **do:** The stored price should become a whole-dollar integer and then
  be joined to the label as text. The program keeps it as a `float` and
  tries to concatenate that number directly. **Repair both
  conversions.**
- **starter_code:**
  ```python
  price = 19.99
  whole_dollars = float(price)
  print("Whole dollars: " + whole_dollars)
  ```
- **solution:**
  ```python
  price = 19.99
  whole_dollars = int(price)
  print("Whole dollars: " + str(whole_dollars))
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `whole_dollars\s*=\s*int\s*\(\s*price\s*\)`
  - `str\s*\(\s*whole_dollars\s*\)`
- **expect_exact_output:** |
  Whole dollars: 19
- **tutor:** Convert with `int()` (it drops the decimal), then convert
  `whole_dollars` to text with `str()` before joining with `+`.
- **pass_rule:** Run exits 0 and stdout is exactly `Whole dollars: 19`.

### py-2.6-12 · Repair the Round Trip

- **type:** practical
- **practice_group:** true
- **do:** Convert `1234` to text so its characters can be counted, then
  convert that text back to a number before adding `1`. **The current
  conversions point in the wrong directions — repair the program without
  hardcoding either result.**
- **starter_code:**
  ```python
  number = 1234
  text = int(number)
  print(len(text))
  print(text + 1)
  ```
- **solution:**
  ```python
  number = 1234
  text = str(number)
  print(len(text))
  print(int(text) + 1)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `text\s*=\s*str\s*\(\s*number\s*\)`
  - `int\s*\(\s*text\s*\)\s*\+\s*1`
- **expect_exact_output:** |
  4
  1235
- **tutor:** Convert `number` to text with `str()` so `len()` works, then
  convert `text` back with `int()` before adding `1`.
- **pass_rule:** Run exits 0 and stdout is exactly `4` then `1235`.

### py-2.6-13 · Repair the Mixed Numeric Report

- **type:** practical
- **practice_group:** true
- **do:** `whole_text` should become a whole number, and `decimal_text`
  should become a decimal. **The two conversions are swapped —
  `whole_text` is being converted with `float()` and `decimal_text` with
  `int()`. Fix each line to use the correct function.**
- **starter_code:**
  ```python
  whole_text = "6"
  decimal_text = "2.5"
  whole = float(whole_text)
  decimal = int(decimal_text)
  print(whole)
  print(decimal)
  ```
- **solution:**
  ```python
  whole_text = "6"
  decimal_text = "2.5"
  whole = int(whole_text)
  decimal = float(decimal_text)
  print(whole)
  print(decimal)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `whole\s*=\s*int\s*\(\s*whole_text\s*\)`
  - `decimal\s*=\s*float\s*\(\s*decimal_text\s*\)`
- **expect_exact_output:** |
  6
  2.5
- **tutor:** Convert `whole_text` with `int()` and `decimal_text` with
  `float()` — the two conversions were swapped. Passing this item
  completes Lesson 2.6 and unlocks Lesson 2.7.
- **pass_rule:** Run exits 0 and stdout matches exactly.

---

## Lesson 2.7 — f-strings  {#py-2.7}

- **objective:** Build output that mixes text and values using f-strings and `{...}` placeholders.
- **estimated_time:** 20–30 min
- **item_count:** 11
- **live_coding_items:** 8

### py-2.7-01 · f-strings Insert Values into Text

- **type:** concept
- **read:** Putting an `f` right before a string's opening quote lets you drop
  `{...}` placeholders inside it. Python replaces each `{name}` with that value
  and automatically converts it to text — even when the value isn't a string to
  begin with. So with `age = 25`, the f-string `f"Age: {age}"` becomes
  `"Age: 25"`. No need for `str()` or `+` to combine text with a number here;
  the conversion just happens on its own.
- **check:** With `age = 25`, what does `f"You are {age}"` produce?
  - A. `"You are {age}"`
  - B. `"You are age"`
  - C. `"You are 25"`
  - D. an error
- **answer:** C
- **rationale:** The f-string converts `age`'s value to text and drops it in —
  `25`. No `str()` or `+` was needed to mix a number into the string.
- **if_incorrect:** `{age}` inside an f-string means "insert the value of
  `age`, converted to text" — it works even though `age` is a number, not a
  string. That automatic conversion is the whole point of an f-string.
- **tutor:** Ask what type `age` is, and whether f-strings need it converted
  to a string manually first.
- **pass_rule:** Learner selects C.

### py-2.7-02 · A Single Placeholder

- **type:** practical
- **do:** Assign `42` to `score`. Use a single f-string to print exactly
  `Your score: 42`. **The number must come from a `{score}` placeholder — no
  hardcoded `42` in the text.**
- **solution:**
  ```python
  score = 42
  print(f"Your score: {score}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `f["'][^"']*\{score\}`
- **expect_exact_output:** |
  Your score: 42
- **tutor:** `print(f"Your score: {score}")` — one placeholder, one value,
  converted to text automatically.
- **pass_rule:** Run exits 0 and stdout is exactly `Your score: 42`.

### py-2.7-03 · More Than One Placeholder

- **type:** concept
- **read:** An f-string isn't limited to just one `{...}` — you can pack in as
  many placeholders as you need. With `first = "Ada"` and `last = "Lovelace"`,
  the f-string `f"{first} {last}"` becomes `"Ada Lovelace"`. Each placeholder
  gets replaced independently, in the order it shows up.
- **check:** With `x = 3` and `y = 9`, what does `f"{x} of {y}"` produce?
  - A. `"{x} of {y}"`
  - B. `"3 of 9"`
  - C. `"x of y"`
  - D. `"3 of {y}"`
- **answer:** B
- **rationale:** Each placeholder is replaced with its own variable's value —
  `x` becomes `3`, and `y` becomes `9`, independently of each other.
- **if_incorrect:** Every `{...}` in the string is replaced on its own — one
  placeholder resolving doesn't skip or block the others.
- **tutor:** Ask how many placeholders are in the string, and whether each one
  needs its own variable.
- **pass_rule:** Learner selects B.

### py-2.7-04 · An Age Range

- **type:** practical
- **do:** Assign `13` to `min_age` and `18` to `max_age`. Use a single
  f-string to print exactly `Ages 13 to 18 allowed.`. **Both numbers must come
  from `{min_age}` and `{max_age}` placeholders — neither needs `str()`.**
- **solution:**
  ```python
  min_age = 13
  max_age = 18
  print(f"Ages {min_age} to {max_age} allowed.")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `f["'][^"']*\{min_age\}`
  - `\{max_age\}`
- **expect_exact_output:** |
  Ages 13 to 18 allowed.
- **tutor:** `print(f"Ages {min_age} to {max_age} allowed.")` — two number
  placeholders in the same f-string, both converted automatically.
- **pass_rule:** Run exits 0 and stdout is exactly `Ages 13 to 18 allowed.`.

### py-2.7-05 · Placeholders Can Hold an Expression

- **type:** concept
- **read:** A `{...}` placeholder can actually hold a whole calculation, not
  just a name. With `a = 2` and `b = 3`, the f-string `f"{a} + {b} = {a + b}"`
  becomes `"2 + 3 = 5"`. Whatever number comes out gets converted to text
  automatically, right inside the braces.
- **check:** With `qty = 4` and `price = 3`, what does `f"Total: {qty * price}"` produce?
  - A. `"Total: qty * price"`
  - B. `"Total: 12"`
  - C. `"Total: 4 * 3"`
  - D. `"Total: {12}"`
- **answer:** B
- **rationale:** The braces evaluate `qty * price` to `12` and drop it in as
  text.
- **if_incorrect:** Whatever is inside `{...}` is computed first, then its
  result replaces the placeholder.
- **tutor:** Ask what `qty * price` works out to before it goes into the
  string.
- **pass_rule:** Learner selects B.

### py-2.7-06 · A Computed Line

- **type:** practical
- **do:** Assign `5` to `width` and `3` to `height`. With a single f-string,
  print `Area of 5 by 3 is 15`. **The `15` must come from a `{width * height}`
  placeholder — no hardcoded numbers in the text.**
- **solution:**
  ```python
  width = 5
  height = 3
  print(f"Area of {width} by {height} is {width * height}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `f["'][^"']*\{[^}]*\}`
  - `\{[^}]*\*[^}]*\}`
  - `(?:\{[^}]*\}[\s\S]*?){3}`
- **expect_exact_output:** |
  Area of 5 by 3 is 15
- **tutor:** `print(f"Area of {width} by {height} is {width * height}")`.
- **pass_rule:** Run exits 0 and stdout is exactly `Area of 5 by 3 is 15`.

### py-2.7-07 · A Small Report

- **type:** practical
- **do:** Assign `Coffee` to `item` and `3` to `count`. Use f-strings to print
  exactly two lines: `Item: Coffee` on the first line and `Count: 3` on the
  second. **Both lines must use placeholders for the variable values.**
- **solution:**
  ```python
  item = "Coffee"
  count = 3
  print(f"Item: {item}")
  print(f"Count: {count}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `(?:f["'][^"'{}]+\{[^}]*\}[\s\S]*?){2}`
- **expect_exact_output:** |
  Item: Coffee
  Count: 3
- **tutor:** `print(f"Item: {item}")` then `print(f"Count: {count}")`.
- **pass_rule:** Run exits 0 and stdout is exactly those two lines.

### py-2.7-08 · Repair the Product Card

- **type:** practical
- **practice_group:** true
- **do:** Three lines should each insert a stored value into a
  placeholder. The first line is missing its placeholder entirely, and
  the other two point at the wrong variables. **Repair all three
  f-strings without changing the assignments.**
- **starter_code:**
  ```python
  item = "Notebook"
  quantity = 3
  price = 4
  print(f"Item: item")
  print(f"Quantity: {price}")
  print(f"Price: {quantity}")
  ```
- **solution:**
  ```python
  item = "Notebook"
  quantity = 3
  price = 4
  print(f"Item: {item}")
  print(f"Quantity: {quantity}")
  print(f"Price: {price}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `\{item\}`
  - `\{quantity\}`
  - `\{price\}`
- **expect_exact_output:** |
  Item: Notebook
  Quantity: 3
  Price: 4
- **tutor:** Every value needs its own `{}` placeholder matching the
  right variable — `item` was missing its braces, and `quantity`/`price`
  were swapped.
- **pass_rule:** Run exits 0 and stdout matches exactly.

### py-2.7-09 · Repair the Area Sentence

- **type:** practical
- **practice_group:** true
- **do:** The sentence should place both dimensions and their product
  into one line. It currently leaves the dimensions as literal names and
  adds instead of multiplying. **Repair the one output line.**
- **starter_code:**
  ```python
  width = 5
  height = 3
  print(f"Area of width by height is {width + height}")
  ```
- **solution:**
  ```python
  width = 5
  height = 3
  print(f"Area of {width} by {height} is {width * height}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `\{width\}`
  - `\{height\}`
  - `\{width\s*\*\s*height\}`
- **expect_exact_output:** |
  Area of 5 by 3 is 15
- **tutor:** Put `width`/`height` in their own placeholders, and multiply
  (`*`) for area, not add.
- **pass_rule:** Run exits 0 and stdout is exactly `Area of 5 by 3 is 15`.

### py-2.7-10 · Repair the Score Change

- **type:** practical
- **practice_group:** true
- **do:** The score starts at `10` and gains `5`. The first line should
  show the original score and the second should calculate the updated
  score. The program changes the value too early, and the first line
  isn't even an f-string. **Repair the order and both output lines.**
- **starter_code:**
  ```python
  score = 10
  score = score + 5
  print("Before: {score}")
  print(f"After: score + 5")
  ```
- **solution:**
  ```python
  score = 10
  print(f"Before: {score}")
  score = score + 5
  print(f"After: {score}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `(?:print\s*\(\s*f["'][^"']*\{score\}[\s\S]*?){2}`
- **expect_exact_output:** |
  Before: 10
  After: 15
- **tutor:** Print `score` before reassigning it, and both times as a
  real f-string with `{score}` — the first `print` was missing the `f`
  prefix.
- **pass_rule:** Run exits 0 and stdout matches exactly.

### py-2.7-11 · Repair the Order Total

- **type:** practical
- **practice_group:** true
- **do:** The first two lines should insert the stored values. The last
  line should calculate their product inside one placeholder. **Repair
  all three lines while keeping every line as an f-string.**
- **starter_code:**
  ```python
  quantity = 4
  unit_price = 6
  print(f"Quantity: quantity")
  print(f"Unit price: {quantity}")
  print(f"Total: {quantity} * {unit_price}")
  ```
- **solution:**
  ```python
  quantity = 4
  unit_price = 6
  print(f"Quantity: {quantity}")
  print(f"Unit price: {unit_price}")
  print(f"Total: {quantity * unit_price}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `\{quantity\}`
  - `\{unit_price\}`
  - `\{quantity\s*\*\s*unit_price\}`
- **expect_exact_output:** |
  Quantity: 4
  Unit price: 6
  Total: 24
- **tutor:** Every value needs its own `{}` placeholder, and the total
  should compute `quantity * unit_price` inside one placeholder, not
  display the expression as text. Passing this item completes Lesson 2.7
  and unlocks Lesson 2.8.
- **pass_rule:** Run exits 0 and stdout matches exactly.

---

## Lesson 2.8 — Reading Input  {#py-2.8}

- **objective:** Read a line with `input()`, know it is always a `str`, and convert it to do arithmetic.
- **estimated_time:** 20–30 min
- **item_count:** 9
- **live_coding_items:** 7

### py-2.8-01 · input() Reads a Line of Text

- **type:** concept
- **read:** `input()` pauses your program, waits for the user to type a line
  and hit Enter, and hands back whatever they typed **as a `str`**. So `name =
  input()` just stores that text. A value handed back by a function call is
  called its **return value** — which is why we say `input()` returns a
  string. And that's true even when the user types digits; `input()` still
  returns a string either way. The exercises in this topic use `input()`
  without any prompt text, so the output can be graded exactly.
- **check:** What type does `input()` return?
  - A. `int`
  - B. `str`
  - C. `float`
  - D. it depends on what the user typed
- **answer:** B
- **rationale:** `input()` always hands back a `str`, even if the user typed
  digits.
- **if_incorrect:** `input()` never guesses the type — it is always text until
  you convert it.
- **tutor:** Ask what type you get if the user types `5`, and what you must do
  to add `1` to it.
- **pass_rule:** Learner selects B.

### py-2.8-02 · Echo a Name

- **type:** practical
- **do:** Read one line with `input()`, then print `Hello, ` followed by that
  name and a `!`, using an f-string.
- **solution:**
  ```python
  name = input()
  print(f"Hello, {name}!")
  ```
- **evaluator:** hidden-tests
- **hidden_tests:**
  ```yaml
  - stdin: "Ada"
    stdout: "Hello, Ada!"
  - stdin: "Grace Hopper"
    stdout: "Hello, Grace Hopper!"
  ```
- **tutor:** `name = input()` then `print(f"Hello, {name}!")`.
- **pass_rule:** Both hidden tests pass.

### py-2.8-03 · input() Text Won't Do Math

- **type:** concept
- **read:** Separate `input()` instructions run from top to bottom, just like
  anything else. In the example below, the first typed line gets assigned to
  `first` and the second to `second`. Both values are strings, though, so `+`
  joins them together instead of adding numbers. To actually do arithmetic, you
  need to convert each value with `int()` first. The compact form
  `int(input())` converts a line the moment it's read.
- **code:**
  ```python
  first = input()
  second = input()
  print(first + second)
  ```
- **check:** If the user types `5` and then `3`, what does the shown program display?
  - A. `8`
  - B. `53`
  - C. `5 + 3`
  - D. an error
- **answer:** B
- **rationale:** The variables contain the strings `"5"` and `"3"`, so `+`
  joins them into `"53"`.
- **if_incorrect:** `input()` produces strings. String `+` joins `"5"` and
  `"3"`; it does not perform numeric addition until the values are converted.
- **tutor:** Ask what type each `input()` produces here and what `+` does to
  two strings.
- **pass_rule:** Learner selects B.

### py-2.8-04 · Add Two Numbers

- **type:** practical
- **do:** Read two lines, each a whole number. Print their sum.
- **solution:**
  ```python
  a = int(input())
  b = int(input())
  print(a + b)
  ```
- **evaluator:** hidden-tests
- **hidden_tests:**
  ```yaml
  - stdin: "4\n10"
    stdout: "14"
  - stdin: "100\n-30"
    stdout: "70"
  - stdin: "0\n0"
    stdout: "0"
  ```
- **tutor:** `a = int(input())`, `b = int(input())`, `print(a + b)`. Convert
  each line before adding.
- **pass_rule:** All hidden tests pass.

### py-2.8-05 · Order Total

- **type:** practical
- **do:** Read a `quantity` (line 1) and a `unit_price` in whole dollars (line
  2). Print `Total: $<quantity * unit_price>` using an f-string.
- **solution:**
  ```python
  quantity = int(input())
  unit_price = int(input())
  print(f"Total: ${quantity * unit_price}")
  ```
- **evaluator:** hidden-tests
- **hidden_tests:**
  ```yaml
  - stdin: "3\n4"
    stdout: "Total: $12"
  - stdin: "10\n2"
    stdout: "Total: $20"
  - stdin: "1\n99"
    stdout: "Total: $99"
  ```
- **tutor:** `quantity = int(input())`, `unit_price = int(input())`, then
  `print(f"Total: ${quantity * unit_price}")`. The `$` is ordinary text before
  the placeholder.
- **pass_rule:** All hidden tests pass.

### py-2.8-06 · Repair the Birthday Report

- **type:** practical
- **practice_group:** true
- **do:** Input line 1 is a name and line 2 is a whole-number age. The
  program reads them in the wrong order and leaves the age as text
  before adding `1`. **Repair the input assignments and the conversion.
  Do not add prompts.**
- **starter_code:**
  ```python
  age = input()
  name = input()
  print(f"Name: {name}")
  print(f"Next age: {age + 1}")
  ```
- **solution:**
  ```python
  name = input()
  age = int(input())
  print(f"Name: {name}")
  print(f"Next age: {age + 1}")
  ```
- **evaluator:** hidden-tests
- **hidden_tests:**
  ```yaml
  - stdin: "Ada\n36"
    stdout: "Name: Ada\nNext age: 37"
  - stdin: "Sam Lee\n18"
    stdout: "Name: Sam Lee\nNext age: 19"
  ```
- **tutor:** Read the name first, then `age = int(input())` — the order
  and the missing conversion were both wrong.
- **pass_rule:** All hidden tests pass.

### py-2.8-07 · Repair the Rectangle Report

- **type:** practical
- **practice_group:** true
- **do:** Input lines 1 and 2 are whole-number width and height values.
  The second input stays text, and the program adds instead of
  multiplying. **Repair the program so it calculates the area. Do not
  add prompts.**
- **starter_code:**
  ```python
  width = int(input())
  height = input()
  area = width + height
  print(f"Area: {area}")
  ```
- **solution:**
  ```python
  width = int(input())
  height = int(input())
  area = width * height
  print(f"Area: {area}")
  ```
- **evaluator:** hidden-tests
- **hidden_tests:**
  ```yaml
  - stdin: "4\n6"
    stdout: "Area: 24"
  - stdin: "3\n9"
    stdout: "Area: 27"
  - stdin: "1\n12"
    stdout: "Area: 12"
  ```
- **tutor:** Convert `height` with `int()` too, then multiply (`*`) for
  the area, not add.
- **pass_rule:** All hidden tests pass.

### py-2.8-08 · Repair the Order Summary

- **type:** practical
- **practice_group:** true
- **do:** Input line 1 is an item name, line 2 is a whole-number
  quantity, and line 3 is a whole-number unit price. The program swaps
  two of the inputs, leaves one numeric value as text, and uses addition
  for the total. **Repair all three problems without adding prompts.**
- **starter_code:**
  ```python
  item = input()
  unit_price = int(input())
  quantity = input()
  total = quantity + unit_price
  print(f"{quantity} {item}: {total}")
  ```
- **solution:**
  ```python
  item = input()
  quantity = int(input())
  unit_price = int(input())
  total = quantity * unit_price
  print(f"{quantity} {item}: {total}")
  ```
- **evaluator:** hidden-tests
- **hidden_tests:**
  ```yaml
  - stdin: "Notebook\n3\n4"
    stdout: "3 Notebook: 12"
  - stdin: "Marker\n5\n2"
    stdout: "5 Marker: 10"
  - stdin: "Folder\n1\n7"
    stdout: "1 Folder: 7"
  ```
- **tutor:** Read `quantity` second and `unit_price` third, convert both
  with `int()`, then multiply (`*`) for the total.
- **pass_rule:** All hidden tests pass.

### py-2.8-09 · Repair the Three-Line Profile

- **type:** practical
- **practice_group:** true
- **do:** Input line 1 is a name, line 2 is a whole-number age, and line
  3 is a favorite whole number. The program leaves the age as text,
  doubles the age instead of the favorite number, and places the values
  under the wrong labels. **Repair the program without adding prompts.**
- **starter_code:**
  ```python
  name = input()
  age = input()
  favorite = int(input())
  print(f"Name: {age}")
  print(f"Age: {name}")
  print(f"Favorite doubled: {age * 2}")
  ```
- **solution:**
  ```python
  name = input()
  age = int(input())
  favorite = int(input())
  print(f"Name: {name}")
  print(f"Age: {age}")
  print(f"Favorite doubled: {favorite * 2}")
  ```
- **evaluator:** hidden-tests
- **hidden_tests:**
  ```yaml
  - stdin: "Ada\n36\n7"
    stdout: "Name: Ada\nAge: 36\nFavorite doubled: 14"
  - stdin: "Grace Hopper\n45\n3"
    stdout: "Name: Grace Hopper\nAge: 45\nFavorite doubled: 6"
  ```
- **tutor:** Convert `age` with `int()`, match each label to its own
  variable, and double `favorite`, not `age`. Passing this item completes
  Lesson 2.8 and unlocks the checkpoint.
- **pass_rule:** All hidden tests pass.

---

## Checkpoint — Topic 2  {#py-2.CP}

- **objective:** Read three values from input, convert them, do simple arithmetic, and print a four-line formatted result.
- **estimated_time:** 15–25 min
- **type:** checkpoint
- **brief:** Write a program that reads in a person's name, their current age,
  and a favorite number — each on its own line — then prints out a four-line
  summary.
- **requirements:**
  - Read three lines with `input()`: a name as text, a current age as a whole number, and a favorite number as a whole number.
  - Print exactly these four lines, in this order: `Name: <name>`, `Age: <age>`, `In 10 years you will be <age + 10>`, `Favorite number doubled: <favorite number * 2>`.
  - Convert the age and the favorite number to integers before doing arithmetic.
  - Use f-strings for all four output lines.
  - Do not print prompts, labels beyond those shown, or extra blank lines.
  - The program must run successfully.
- **solution:**
  ```python
  name = input()
  age = int(input())
  favorite = int(input())
  print(f"Name: {name}")
  print(f"Age: {age}")
  print(f"In 10 years you will be {age + 10}")
  print(f"Favorite number doubled: {favorite * 2}")
  ```
- **evaluator:** hidden-tests
- **hidden_tests:**
  ```yaml
  - stdin: "Ada Lovelace\n36\n7"
    stdout: "Name: Ada Lovelace\nAge: 36\nIn 10 years you will be 46\nFavorite number doubled: 14"
  - stdin: "Grace\n45\n3"
    stdout: "Name: Grace\nAge: 45\nIn 10 years you will be 55\nFavorite number doubled: 6"
  - stdin: "Sam\n8\n100"
    stdout: "Name: Sam\nAge: 8\nIn 10 years you will be 18\nFavorite number doubled: 200"
  ```
- **tutor:** Read the three lines in order: `name = input()`, `age =
  int(input())`, `favorite = int(input())`. Then four `print(f"...")` lines.
  The age and favorite must be converted with `int()` so `age + 10` and
  `favorite * 2` are arithmetic, not string joins. The learner has `input()`,
  `int()`, `+`, `*`, and f-strings — do not introduce anything else.
- **pass_rule:** All hidden tests pass, exit code 0. Passing the checkpoint completes Topic 2 and unlocks Topic 3.
