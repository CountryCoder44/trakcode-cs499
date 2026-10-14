---
topic_id: py-b5
course: python_beginner
section: foundations
topic_number: 5
title: Decisions and Conditional Logic
slug: decisions-conditional-logic
lessons: [py-b5.1, py-b5.2, py-b5.3, py-b5.4, py-b5.5]
checkpoint_id: py-b5.CP
live_coding_exception: false
format_version: 1
---

# Topic 5 - Decisions and Conditional Logic

Teach learners to choose which instructions run by using Boolean
conditions, ordered branches, compound rules, small nested decisions, and
truthiness.

**Topic boundaries.** Conditions use values, comparisons, and Boolean
operators from Topics 2-4. Text comparisons use exact input; string methods
begin in Topic 6. No loops, collections, functions, exceptions, or chained
comparisons. Every lesson has six items and ends with a contextual coding
problem. Every item has a reading of at least four complete sentences.

## Lesson 5.1 - Making a Decision with if  {#py-b5.1}

- **objective:** Use an `if` statement so an indented block runs only when
  its condition is `True`.
- **estimated_time:** 20-25 min
- **item_count:** 6
- **live_coding_items:** 4

### py-b5.1-01 · When an if Block Runs

- **type:** concept
- **read:** An `if` statement runs instructions only when a condition is
  `True`. The condition follows `if` and ends with a colon. Controlled
  instructions are indented beneath the header. A `False` condition makes
  Python skip that block.
- **check:** What controls whether an `if` block runs?
  - A. A Boolean condition
  - B. A comment
  - C. A variable name only
  - D. A print label
- **answer:** A
- **rationale:** The block runs only when its condition evaluates to
  `True`.
- **if_incorrect:** Revisit the reading and trace the condition from top to
  bottom.
- **concepts_introduced:** if-statement
- **concepts_required:** comparison-operators, bool-type
- **pass_rule:** Learner selects A.

### py-b5.1-02 · Print a Stock Warning

- **type:** practical
- **do:** A comparison can serve as an `if` condition. Python evaluates it
  before deciding whether to enter the block. The indented `print()` call
  runs only for `True`. Code after the block continues normally. **Set
  `stock` to `3`. If `stock` is less than 5, display `Low stock`.**
- **starter_code:**
  ```python
  # Set stock, then warn when it is low.
  ```
- **solution:**
  ```python
  stock = 3
  if stock < 5:
      print("Low stock")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `stock\s*=\s*3\b`
  - `^\s*if\s+\(?\s*stock\s*<\s*5\b`
  - `^[ \t]+print\s*\(\s*["']Low stock["']\s*\)`
- **expect_exact_output:** |
  Low stock
- **if_incorrect:** Trace the values and selected branch in execution
  order.
- **concepts_required:** if-statement, comparison-operators
- **pass_rule:** Run exits 0, the message is printed inside an `if stock <
  5` block, and stdout is exactly `Low stock`.

### py-b5.1-03 · Check a Temperature

- **type:** practical
- **do:** Input must be converted before a numeric comparison. An `if`
  statement can react when the number crosses a boundary. A colon ends the
  header, and indentation marks its block. No message is produced when the
  condition is `False`. **Receive an integer temperature. Display
  `Freezing` when it is at most 32.**
- **starter_code:**
  ```python
  # Receive the temperature, then report freezing.
  ```
- **solution:**
  ```python
  temperature = int(input())
  if temperature <= 32:
      print("Freezing")
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `^\s*if\b`
- **hidden_tests:**
  ```yaml
  - stdin: "28"
    stdout: "Freezing"
  - stdin: "32"
    stdout: "Freezing"
  - stdin: "45"
    stdout: ""
  ```
- **if_incorrect:** Trace the values and selected branch in execution
  order.
- **concepts_required:** if-statement, comparison-operators, int-conversion
- **pass_rule:** Run exits 0 and stdout matches for every supplied
  temperature, including no output above 32.

### py-b5.1-04 · Indentation Defines the Block

- **type:** concept
- **read:** Python uses indentation to mark the instructions controlled by
  `if`. Every instruction in one block begins at the same level. An
  unindented instruction is outside the block. Consistent indentation makes
  the decision structure visible.
- **check:** Which line belongs inside an `if` block?
  - A. A line indented beneath its header
  - B. Every later line
  - C. Only the condition
  - D. A line before the header
- **answer:** A
- **rationale:** Indentation identifies the instructions controlled by the
  condition.
- **if_incorrect:** Revisit the reading and trace the condition from top to
  bottom.
- **concepts_introduced:** indentation
- **concepts_required:** if-statement
- **pass_rule:** Learner selects A.

### py-b5.1-05 · Use a Stored Condition

- **type:** practical
- **do:** A comparison result can be stored in a Boolean variable. That
  variable can be used directly as an `if` condition. This separates
  calculating a fact from acting on it. A descriptive name explains the
  fact being stored. **Set `score` to `82`. Store `score >= 70` in
  `passed`. If `passed` is `True`, display `Passed`.**
- **starter_code:**
  ```python
  # Set score, store the comparison in passed, then use it.
  ```
- **solution:**
  ```python
  score = 82
  passed = score >= 70
  if passed:
      print("Passed")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `score\s*=\s*82\b`
  - `passed\s*=\s*score\s*>=\s*70\b`
  - `^\s*if\s+\(?\s*passed\b`
- **expect_exact_output:** |
  Passed
- **if_incorrect:** Trace the values and selected branch in execution
  order.
- **concepts_required:** if-statement, comparison-operators, bool-type
- **pass_rule:** Run exits 0, `passed` controls the `if`, and stdout is
  exactly `Passed`.

### py-b5.1-06 · Word Problem: Library Late Notice

- **type:** practical
- **do:** A library can compare returned days with allowed days. The
  comparison becomes the condition used by `if`. Only a late return should
  display a notice. An on-time return simply reaches the end without that
  output. **Receive `returned_days` and `allowed_days` as integers, in that
  order. Display `Late return` when `returned_days` is greater.**
- **starter_code:**
  ```python
  # Receive the two day counts, then report a late return.
  ```
- **solution:**
  ```python
  returned_days = int(input())
  allowed_days = int(input())
  if returned_days > allowed_days:
      print("Late return")
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\bint\s*\(\s*input\s*\(\s*\)\s*\)[\s\S]*\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `^\s*if\b`
- **hidden_tests:**
  ```yaml
  - stdin: "18\n14"
    stdout: "Late return"
  - stdin: "14\n14"
    stdout: ""
  - stdin: "3\n14"
    stdout: ""
  ```
- **if_incorrect:** Trace the values and selected branch in execution
  order.
- **concepts_required:** if-statement, comparison-operators, int-conversion
- **pass_rule:** Run exits 0 and stdout matches for every supplied return,
  including no output when it isn't late.

## Lesson 5.2 - Choosing Between Two Paths  {#py-b5.2}

- **objective:** Use `if` and `else` so exactly one of two blocks runs.
- **estimated_time:** 20-25 min
- **item_count:** 6
- **live_coding_items:** 4

### py-b5.2-01 · else Handles the Other Outcome

- **type:** concept
- **read:** An `else` block provides an alternative when an `if` condition
  is `False`. Its header uses a colon but has no condition. Exactly one
  block runs in a connected `if` and `else`. Execution continues after the
  selected block finishes.
- **check:** When does `else` run?
  - A. When the connected `if` is `False`
  - B. Before `if`
  - C. After every `if`
  - D. Only for empty input
- **answer:** A
- **rationale:** `else` represents the remaining outcome.
- **if_incorrect:** Revisit the reading and trace the condition from top to
  bottom.
- **concepts_introduced:** else-branch
- **concepts_required:** if-statement
- **pass_rule:** Learner selects A.

### py-b5.2-02 · Report Even or Odd

- **type:** practical
- **do:** Modulus can reveal whether division by 2 leaves a remainder. A
  zero remainder means the integer is even. An `if` and `else` can display
  exactly one label. Both branches use their own indented blocks.
  **Receive an integer. Display `Even` when `number % 2` equals 0;
  otherwise display `Odd`.**
- **starter_code:**
  ```python
  # Receive a number, then report Even or Odd.
  ```
- **solution:**
  ```python
  number = int(input())
  if number % 2 == 0:
      print("Even")
  else:
      print("Odd")
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `%\s*2\b`
  - `^\s*else\s*:`
- **hidden_tests:**
  ```yaml
  - stdin: "17"
    stdout: "Odd"
  - stdin: "8"
    stdout: "Even"
  - stdin: "0"
    stdout: "Even"
  ```
- **if_incorrect:** Trace the values and selected branch in execution
  order.
- **concepts_required:** else-branch, modulus, int-conversion
- **pass_rule:** Run exits 0 and stdout matches for every supplied number.

### py-b5.2-03 · Word Problem: Compare a Score and Target

- **type:** practical
- **do:** Two entered numbers can be compared after conversion. The `if`
  block handles a met target. The `else` block handles every score below
  it. Only one result is displayed because the branches are connected.
  **Receive `score` and `target`, in that order. Display `Target met` when
  `score` is at least `target`; otherwise display `Keep going`.**
- **starter_code:**
  ```python
  # Receive the score and the target, then report the result.
  ```
- **solution:**
  ```python
  score = int(input())
  target = int(input())
  if score >= target:
      print("Target met")
  else:
      print("Keep going")
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\bint\s*\(\s*input\s*\(\s*\)\s*\)[\s\S]*\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `^\s*if\b`
  - `^\s*else\s*:`
- **hidden_tests:**
  ```yaml
  - stdin: "74\n80"
    stdout: "Keep going"
  - stdin: "80\n80"
    stdout: "Target met"
  - stdin: "95\n80"
    stdout: "Target met"
  ```
- **if_incorrect:** Trace the values and selected branch in execution
  order.
- **concepts_required:** else-branch, comparison-operators, int-conversion
- **pass_rule:** Run exits 0 and stdout matches for every supplied score.

### py-b5.2-04 · else Has No Condition

- **type:** concept
- **read:** An `else` header represents every case not selected by `if`. It
  therefore has no comparison of its own. Adding a condition after `else`
  is invalid syntax. A later lesson introduces another branch for extra
  conditions.
- **check:** Which header is valid?
  - A. `else:`
  - B. `else score < 70:`
  - C. `else(False):`
  - D. `else = True:`
- **answer:** A
- **rationale:** `else` uses only its keyword and a colon.
- **if_incorrect:** Revisit the reading and trace the condition from top to
  bottom.
- **concepts_required:** else-branch
- **pass_rule:** Learner selects A.

### py-b5.2-05 · Choose an Access Message

- **type:** practical
- **do:** Text can be compared with `==` just like numbers. The result is
  `True` only when both strings match exactly. An `else` gives a response
  for every other value. The password remains text and needs no
  conversion. **Receive a password. Display `Access granted` only when it
  equals `open-sesame`; otherwise display `Access denied`.**
- **starter_code:**
  ```python
  # Receive the password, then grant or deny access.
  ```
- **solution:**
  ```python
  password = input()
  if password == "open-sesame":
      print("Access granted")
  else:
      print("Access denied")
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `==\s*["']open-sesame["']|["']open-sesame["']\s*==`
  - `^\s*else\s*:`
- **hidden_tests:**
  ```yaml
  - stdin: "open-sesame"
    stdout: "Access granted"
  - stdin: "Open-Sesame"
    stdout: "Access denied"
  - stdin: "letmein"
    stdout: "Access denied"
  ```
- **if_incorrect:** Trace the values and selected branch in execution
  order.
- **concepts_introduced:** string-equality
- **concepts_required:** else-branch, input-function
- **pass_rule:** Run exits 0 and stdout matches for every supplied
  password.

### py-b5.2-06 · Word Problem: Choose a Shipping Fee

- **type:** practical
- **do:** A store can use one fee at or above a threshold and another
  below it. Float conversion allows a decimal order total. The comparison
  selects exactly one fee. The chosen value is displayed after a label.
  **Receive an order total. Store `fee` as `0` when the total is 50 or more,
  or `6` otherwise. Display `Shipping:` followed by `fee`.**
- **starter_code:**
  ```python
  # Receive the order total, choose the fee, then display it.
  ```
- **solution:**
  ```python
  total = float(input())
  if total >= 50:
      fee = 0
  else:
      fee = 6
  print("Shipping:", fee)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `float\s*\(\s*input\s*\(\s*\)\s*\)`
  - `\bfee\s*=\s*0\b`
  - `\bfee\s*=\s*6\b`
  - `^\s*if\b`
- **hidden_tests:**
  ```yaml
  - stdin: "42.5"
    stdout: "Shipping: 6"
  - stdin: "50.0"
    stdout: "Shipping: 0"
  - stdin: "120.75"
    stdout: "Shipping: 0"
  ```
- **if_incorrect:** Trace the values and selected branch in execution
  order.
- **concepts_required:** else-branch, comparison-operators, float-conversion
- **pass_rule:** Run exits 0 and stdout matches for every supplied total.

## Lesson 5.3 - Testing Several Possibilities  {#py-b5.3}

- **objective:** Build `if`/`elif`/`else` chains and order overlapping
  thresholds so the right branch runs first.
- **estimated_time:** 20-25 min
- **item_count:** 6
- **live_coding_items:** 4

### py-b5.3-01 · elif Adds Another Check

- **type:** concept
- **read:** An `elif` adds another condition to one decision chain. Python
  checks the chain from top to bottom. It runs the first `True` branch and
  skips the rest. A final `else` can handle values that matched nothing
  earlier.
- **check:** What follows the first `True` branch?
  - A. Later branches are skipped
  - B. All later branches run
  - C. The chain restarts
  - D. An error
- **answer:** A
- **rationale:** A connected chain selects only its first match.
- **if_incorrect:** Revisit the reading and trace the condition from top to
  bottom.
- **concepts_introduced:** elif-branch
- **concepts_required:** if-statement, else-branch
- **pass_rule:** Learner selects A.

### py-b5.3-02 · Classify a Number

- **type:** practical
- **do:** A three-way decision can separate positive, negative, and zero
  values. The first comparison checks above zero. The `elif` checks below
  zero only if the first failed. The remaining `else` case is zero.
  **Receive an integer. Display `Positive`, `Negative`, or `Zero`.**
- **starter_code:**
  ```python
  # Receive a number, then classify it.
  ```
- **solution:**
  ```python
  number = int(input())
  if number > 0:
      print("Positive")
  elif number < 0:
      print("Negative")
  else:
      print("Zero")
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `^\s*elif\b`
- **hidden_tests:**
  ```yaml
  - stdin: "0"
    stdout: "Zero"
  - stdin: "14"
    stdout: "Positive"
  - stdin: "-3"
    stdout: "Negative"
  ```
- **if_incorrect:** Trace the values and selected branch in execution
  order.
- **concepts_required:** elif-branch, comparison-operators, int-conversion
- **pass_rule:** Run exits 0 and stdout matches for every supplied number.

### py-b5.3-03 · Read a Traffic Signal

- **type:** practical
- **do:** A chain can compare one text value with several choices. Each
  `elif` is checked only after earlier comparisons fail. A final `else`
  handles undocumented text. These comparisons are case-sensitive, so input
  is lowercase. **Receive a lowercase signal. Display `Stop` for `red`,
  `Wait` for `yellow`, `Go` for `green`, or `Unknown` for anything else.**
- **starter_code:**
  ```python
  # Receive the signal, then display what it means.
  ```
- **solution:**
  ```python
  signal = input()
  if signal == "red":
      print("Stop")
  elif signal == "yellow":
      print("Wait")
  elif signal == "green":
      print("Go")
  else:
      print("Unknown")
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `^\s*elif\b`
  - `^\s*else\s*:`
- **hidden_tests:**
  ```yaml
  - stdin: "green"
    stdout: "Go"
  - stdin: "red"
    stdout: "Stop"
  - stdin: "yellow"
    stdout: "Wait"
  - stdin: "blue"
    stdout: "Unknown"
  ```
- **if_incorrect:** Trace the values and selected branch in execution
  order.
- **concepts_required:** elif-branch, string-equality
- **pass_rule:** Run exits 0 and stdout matches for every supplied signal.

### py-b5.3-04 · Order Overlapping Thresholds

- **type:** concept
- **read:** Numeric thresholds can overlap. A score of 95 satisfies both
  `score >= 90` and `score >= 70`. A chain stops at its first match.
  Highest thresholds therefore belong first when categories descend.
- **check:** Why place `score >= 90` before `score >= 70`?
  - A. A high score also meets the lower threshold
  - B. Python sorts numbers
  - C. `elif` cannot use 70
  - D. `else` requires it
- **answer:** A
- **rationale:** The highest matching category must be tested first.
- **if_incorrect:** Revisit the reading and trace the condition from top to
  bottom.
- **concepts_introduced:** threshold-order
- **concepts_required:** elif-branch
- **pass_rule:** Learner selects A.

### py-b5.3-05 · Assign a Performance Band

- **type:** practical
- **do:** Ordered thresholds divide a numeric scale into bands. Checking
  the highest cutoff first protects the highest category. Each later branch
  receives values below earlier cutoffs. The final `else` catches
  everything below the last threshold. **Receive a score. Display
  `Excellent` at 90 or more, `Good` at 75 or more, `Developing` at 60 or
  more, or `Needs work` below 60.**
- **starter_code:**
  ```python
  # Receive the score, then display its band.
  ```
- **solution:**
  ```python
  score = int(input())
  if score >= 90:
      print("Excellent")
  elif score >= 75:
      print("Good")
  elif score >= 60:
      print("Developing")
  else:
      print("Needs work")
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `^\s*elif\b`
- **hidden_tests:**
  ```yaml
  - stdin: "82"
    stdout: "Good"
  - stdin: "90"
    stdout: "Excellent"
  - stdin: "75"
    stdout: "Good"
  - stdin: "60"
    stdout: "Developing"
  - stdin: "59"
    stdout: "Needs work"
  ```
- **if_incorrect:** Trace the values and selected branch in execution
  order.
- **concepts_required:** elif-branch, threshold-order, int-conversion
- **pass_rule:** Run exits 0 and stdout matches for every supplied score.

### py-b5.3-06 · Word Problem: Select a Ticket Price

- **type:** practical
- **do:** A venue can charge different age groups different prices. The
  senior threshold must precede the adult threshold. A final `else` handles
  younger ages. Every documented age is nonnegative. **Receive an age.
  Store `price` as `8` at 65 or older, `12` at 18 or older, or `6`
  otherwise. Display `Price:` followed by the price.**
- **starter_code:**
  ```python
  # Receive the age, choose the price, then display it.
  ```
- **solution:**
  ```python
  age = int(input())
  if age >= 65:
      price = 8
  elif age >= 18:
      price = 12
  else:
      price = 6
  print("Price:", price)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `^\s*elif\b`
- **hidden_tests:**
  ```yaml
  - stdin: "70"
    stdout: "Price: 8"
  - stdin: "65"
    stdout: "Price: 8"
  - stdin: "30"
    stdout: "Price: 12"
  - stdin: "18"
    stdout: "Price: 12"
  - stdin: "10"
    stdout: "Price: 6"
  ```
- **if_incorrect:** Trace the values and selected branch in execution
  order.
- **concepts_required:** elif-branch, threshold-order, int-conversion
- **pass_rule:** Run exits 0 and stdout matches for every supplied age.

## Lesson 5.4 - Compound and Nested Decisions  {#py-b5.4}

- **objective:** Combine requirements with `and`/`or` in a condition, and
  nest a decision that only matters after another succeeds.
- **estimated_time:** 20-25 min
- **item_count:** 6
- **live_coding_items:** 4

### py-b5.4-01 · Combine Requirements

- **type:** concept
- **read:** Boolean operators combine comparisons inside conditions. Use
  `and` when every requirement must be `True`. Use `or` when at least one
  requirement is enough. Parentheses make grouped rules easier to read.
- **check:** Which operator requires both conditions?
  - A. `and`
  - B. `or`
  - C. `not`
  - D. `==`
- **answer:** A
- **rationale:** `and` is `True` only when both sides are `True`.
- **if_incorrect:** Revisit the reading and trace the condition from top to
  bottom.
- **concepts_introduced:** compound-condition
- **concepts_required:** boolean-operators, if-statement
- **pass_rule:** Learner selects A.

### py-b5.4-02 · Check Two Requirements

- **type:** practical
- **do:** A compound condition can express two requirements in one header.
  Each comparison produces a Boolean result. `and` combines those results.
  The `if` block runs only when both are `True`. **Set `age` to `22` and
  `has_id` to `True`. Display `Verified` only when `age` is at least 18 and
  `has_id` is `True`; otherwise display `Not verified`.**
- **starter_code:**
  ```python
  # Set age and has_id, then check both requirements.
  ```
- **solution:**
  ```python
  age = 22
  has_id = True
  if (age >= 18) and has_id:
      print("Verified")
  else:
      print("Not verified")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `age\s*=\s*22\b`
  - `has_id\s*=\s*True\b`
  - `^\s*if\b.*\band\b`
  - `^\s*else\s*:`
- **expect_exact_output:** |
  Verified
- **if_incorrect:** Trace the values and selected branch in execution
  order.
- **concepts_required:** compound-condition, else-branch
- **pass_rule:** Run exits 0, one `if` combines both requirements with
  `and`, and stdout is exactly `Verified`.

### py-b5.4-03 · Check an Inclusive Range

- **type:** practical
- **do:** A value is inside a range only when it meets both boundaries. One
  comparison checks the lower limit. Another checks the upper limit. `and`
  requires both checks to be `True`. **Receive an integer. Display `In
  range` when it is from 1 through 10; otherwise display `Out of range`.**
- **starter_code:**
  ```python
  # Receive a number, then check the range 1 through 10.
  ```
- **solution:**
  ```python
  number = int(input())
  if (number >= 1) and (number <= 10):
      print("In range")
  else:
      print("Out of range")
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `^\s*if\b.*\band\b`
- **forbid_code:**
  - `\d+\s*<=?\s*[A-Za-z_]\w*\s*<=?`
- **hidden_tests:**
  ```yaml
  - stdin: "10"
    stdout: "In range"
  - stdin: "1"
    stdout: "In range"
  - stdin: "5"
    stdout: "In range"
  - stdin: "0"
    stdout: "Out of range"
  - stdin: "11"
    stdout: "Out of range"
  ```
- **if_incorrect:** Trace the values and selected branch in execution
  order.
- **concepts_required:** compound-condition, inclusive-boundaries, int-conversion
- **pass_rule:** Run exits 0, two comparisons are joined with `and` (no
  chained comparison), and stdout matches for every supplied number.

### py-b5.4-04 · Nest a Dependent Decision

- **type:** concept
- **read:** A nested conditional places one decision inside another
  branch. The inner condition runs only after the outer block is entered.
  Nesting fits a second question that matters only after the first
  succeeds. A compound condition is often clearer for independent
  requirements.
- **check:** When is an inner `if` checked?
  - A. After entering its outer block
  - B. Before the outer condition
  - C. After every `else`
  - D. Only for strings
- **answer:** A
- **rationale:** The outer branch controls whether Python reaches the inner
  decision.
- **if_incorrect:** Revisit the reading and trace the condition from top to
  bottom.
- **concepts_introduced:** nested-if
- **concepts_required:** if-statement, indentation
- **pass_rule:** Learner selects A.

### py-b5.4-05 · Check Account Access

- **type:** practical
- **do:** Access can require an active account before a role matters. The
  outer `if` tests activity. A nested `if` then tests the role. Each level
  has an `else` so every case receives a message. **Set `active` to `True`
  and `role` to `"admin"`. Use a nested `if` to display `Admin access` for
  an active admin, `Standard access` for any other active role, or `Account
  inactive` when the account isn't active.**
- **starter_code:**
  ```python
  # Set active and role, then decide with a nested if.
  ```
- **solution:**
  ```python
  active = True
  role = "admin"
  if active:
      if role == "admin":
          print("Admin access")
      else:
          print("Standard access")
  else:
      print("Account inactive")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `active\s*=\s*True\b`
  - `role\s*=\s*["']admin["']`
  - `^[ \t]+if\b`
  - `^[ \t]+else\s*:`
  - `^else\s*:`
- **expect_exact_output:** |
  Admin access
- **if_incorrect:** Trace the values and selected branch in execution
  order.
- **concepts_required:** nested-if, else-branch, string-equality
- **pass_rule:** Run exits 0, an inner `if`/`else` sits inside the outer
  `if`, the outer `if` has its own `else`, and stdout is exactly `Admin
  access`.

### py-b5.4-06 · Word Problem: Approve a Delivery

- **type:** practical
- **do:** A delivery can require a nearby address plus one of two benefits.
  Distance belongs on one side of `and`. Membership or a large order
  belongs inside parentheses. The complete rule needs the distance and one
  benefit. **Receive a distance as an integer, a membership answer of
  `yes` or `no`, and an order total as a float, in that order. Display
  `Delivery available` when the distance is 10 or less and either the
  membership answer is `yes` or the total is at least 50; otherwise display
  `Pickup only`.**
- **starter_code:**
  ```python
  # Receive distance, membership, and order total, then decide.
  ```
- **solution:**
  ```python
  distance = int(input())
  membership = input()
  order_total = float(input())
  if (distance <= 10) and ((membership == "yes") or (order_total >= 50)):
      print("Delivery available")
  else:
      print("Pickup only")
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `float\s*\(\s*input\s*\(\s*\)\s*\)`
  - `\band\b`
  - `\bor\b`
- **hidden_tests:**
  ```yaml
  - stdin: "8\nyes\n35.0"
    stdout: "Delivery available"
  - stdin: "8\nno\n60.0"
    stdout: "Delivery available"
  - stdin: "8\nno\n20.0"
    stdout: "Pickup only"
  - stdin: "12\nyes\n80.0"
    stdout: "Pickup only"
  - stdin: "10\nno\n50.0"
    stdout: "Delivery available"
  ```
- **if_incorrect:** Trace the values and selected branch in execution
  order.
- **concepts_required:** compound-condition, boolean-order, string-equality, float-conversion
- **pass_rule:** Run exits 0 and stdout matches for every supplied order.

## Lesson 5.5 - Truthy and Falsy Values  {#py-b5.5}

- **objective:** Use a value directly as a condition, and know when an
  explicit comparison states the rule more clearly.
- **estimated_time:** 20-25 min
- **item_count:** 6
- **live_coding_items:** 4

### py-b5.5-01 · Values Can Act as Conditions

- **type:** concept
- **read:** Python treats some existing values as Boolean conditions. Empty
  strings and numeric zero are falsy. Non-empty strings and nonzero numbers
  are truthy. Explicit comparisons remain useful when they state a rule
  more clearly.
- **check:** Which value is falsy?
  - A. `""`
  - B. `"False"`
  - C. `"0"`
  - D. `"hello"`
- **answer:** A
- **rationale:** An empty string is falsy, while every non-empty string is
  truthy.
- **if_incorrect:** Revisit the reading and trace the condition from top to
  bottom.
- **concepts_introduced:** truthiness
- **concepts_required:** if-statement, bool-conversion
- **pass_rule:** Learner selects A.

### py-b5.5-02 · Check Entered Text

- **type:** practical
- **do:** `input()` text can be used directly as a condition. A non-empty
  response enters the `if` block. An empty response enters `else`. This
  asks whether text exists, not what it means. **Receive one line, then use
  it directly as the condition: display `Response received` when it is
  non-empty; otherwise display `No response`.**
- **starter_code:**
  ```python
  # Receive one line, then check whether anything was entered.
  ```
- **solution:**
  ```python
  response = input()
  if response:
      print("Response received")
  else:
      print("No response")
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `^\s*if\s+\(?\s*[A-Za-z_]\w*\s*\)?\s*:`
  - `^\s*else\s*:`
- **hidden_tests:**
  ```yaml
  - stdin: "ready"
    stdout: "Response received"
  - stdin: "\n"
    stdout: "No response"
  - stdin: "0"
    stdout: "Response received"
  ```
- **if_incorrect:** Trace the values and selected branch in execution
  order.
- **concepts_required:** truthiness, else-branch, input-function
- **pass_rule:** Run exits 0, the entered text itself is the condition, and
  stdout matches for every supplied line.

### py-b5.5-03 · Check a Numeric Count

- **type:** practical
- **do:** Numeric zero is falsy and a nonzero number is truthy. A stored
  integer can directly control `if`. This distinguishes an empty count from
  a count with items. The count is documented as nonnegative. **Receive a
  count as an integer, then use it directly as the condition: display
  `Items available` when it is truthy; otherwise display `Empty`.**
- **starter_code:**
  ```python
  # Receive the count, then check it directly.
  ```
- **solution:**
  ```python
  count = int(input())
  if count:
      print("Items available")
  else:
      print("Empty")
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `^\s*if\s+\(?\s*[A-Za-z_]\w*\s*\)?\s*:`
- **hidden_tests:**
  ```yaml
  - stdin: "0"
    stdout: "Empty"
  - stdin: "5"
    stdout: "Items available"
  - stdin: "1"
    stdout: "Items available"
  ```
- **if_incorrect:** Trace the values and selected branch in execution
  order.
- **concepts_required:** truthiness, int-conversion
- **pass_rule:** Run exits 0, the count itself is the condition, and stdout
  matches for every supplied count.

### py-b5.5-04 · False Text Is Still Truthy

- **type:** concept
- **read:** Truthiness depends on whether a string is empty, not on its
  word. The string `"False"` contains characters and is truthy. The string
  `"0"` is also non-empty and truthy. Compare text explicitly when its
  meaning matters.
- **check:** What is `bool("False")`?
  - A. `True`
  - B. `False`
  - C. `0`
  - D. An error
- **answer:** A
- **rationale:** Every non-empty string is truthy.
- **if_incorrect:** Revisit the reading and trace the condition from top to
  bottom.
- **concepts_required:** truthiness, bool-conversion
- **pass_rule:** Learner selects A.

### py-b5.5-05 · Use an Explicit Text Rule

- **type:** practical
- **do:** Sometimes text meaning matters more than its presence. A
  yes-or-no entry should be compared with the expected word. Using the
  string directly would make both words truthy. Equality expresses the
  intended rule. **Receive `yes` or `no`. Display `Enabled` only for `yes`;
  otherwise display `Disabled`.**
- **starter_code:**
  ```python
  # Receive the answer, then compare it to the expected word.
  ```
- **solution:**
  ```python
  answer = input()
  if answer == "yes":
      print("Enabled")
  else:
      print("Disabled")
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `==\s*["']yes["']|["']yes["']\s*==`
  - `^\s*else\s*:`
- **hidden_tests:**
  ```yaml
  - stdin: "no"
    stdout: "Disabled"
  - stdin: "yes"
    stdout: "Enabled"
  - stdin: "Yes"
    stdout: "Disabled"
  ```
- **if_incorrect:** Trace the values and selected branch in execution
  order.
- **concepts_required:** truthiness, string-equality, else-branch
- **pass_rule:** Run exits 0 and stdout matches for every supplied answer.

### py-b5.5-06 · Word Problem: Validate a Display Name

- **type:** practical
- **do:** A profile needs a name containing at least one character. An
  empty line is falsy, while a non-empty name is truthy. A decision selects
  the appropriate message. Space cleaning is deferred to Topic 6.
  **Receive a display name. Display `Name saved` when it is non-empty;
  otherwise display `Name required`.**
- **starter_code:**
  ```python
  # Receive the display name, then save or ask for one.
  ```
- **solution:**
  ```python
  display_name = input()
  if display_name:
      print("Name saved")
  else:
      print("Name required")
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `^\s*if\b`
  - `^\s*else\s*:`
- **hidden_tests:**
  ```yaml
  - stdin: "Mina"
    stdout: "Name saved"
  - stdin: "\n"
    stdout: "Name required"
  - stdin: "Jo"
    stdout: "Name saved"
  ```
- **if_incorrect:** Trace the values and selected branch in execution
  order.
- **concepts_required:** truthiness, else-branch
- **pass_rule:** Run exits 0 and stdout matches for every supplied name.

## Checkpoint - Topic 5  {#py-b5.CP}

- **objective:** Combine an ordered decision chain with a separate compound
  condition to classify a study session.
- **estimated_time:** 15-20 min
- **type:** checkpoint
- **brief:** This checkpoint combines only decision skills from Topic 5.
  Numeric text is converted before comparisons. Ordered branches select a
  duration label. A separate compound condition checks whether a positive
  target was met. Receive `session_minutes` and `target_minutes` as
  integers. Display `Short` below 30, `Standard` from 30 through 59, or
  `Extended` at 60 or more. Then display `Goal met` only when the session
  reaches a target greater than 0; otherwise display `Goal not met`.
- **requirements:**
  - Receive `session_minutes` then `target_minutes`, each converted with
    `int()`.
  - Choose the duration label with one `if`/`elif`/`else` chain.
  - Use a second, separate decision with `and` for the goal.
  - Display the duration label on the first line and the goal result on
    the second.
  - Do not use loops, collections, functions, or chained comparisons.
- **solution:**
  ```python
  session_minutes = int(input())
  target_minutes = int(input())
  if session_minutes >= 60:
      print("Extended")
  elif session_minutes >= 30:
      print("Standard")
  else:
      print("Short")
  if (session_minutes >= target_minutes) and (target_minutes > 0):
      print("Goal met")
  else:
      print("Goal not met")
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `session_minutes\s*=\s*\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `target_minutes\s*=\s*\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `^\s*elif\b`
  - `\band\b`
- **forbid_code:**
  - `\d+\s*<=?\s*[A-Za-z_]\w*\s*<=?`
- **hidden_tests:**
  ```yaml
  - stdin: "45\n40"
    stdout: "Standard\nGoal met"
  - stdin: "20\n30"
    stdout: "Short\nGoal not met"
  - stdin: "75\n0"
    stdout: "Extended\nGoal not met"
  - stdin: "60\n60"
    stdout: "Extended\nGoal met"
  - stdin: "30\n29"
    stdout: "Standard\nGoal met"
  ```
- **tutor:** Trace the values and selected branch in execution order. The
  duration chain and the goal check are two separate decisions, so both
  lines always print.
- **pass_rule:** Run exits 0 and stdout matches both lines for every
  supplied session.
