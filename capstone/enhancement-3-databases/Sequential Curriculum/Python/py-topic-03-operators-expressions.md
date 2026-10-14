---
topic_id: py-topic-03
course: python
section: foundations
topic_number: 3
title: Operators and Expressions
slug: operators-expressions
lessons: [py-3.1, py-3.2, py-3.3, py-3.4, py-3.5, py-3.6]
checkpoint_id: py-3.CP
live_coding_exception: false
format_version: 1
---

# Topic 3 — Operators and Expressions

The learner combines values and operators into expressions, predicts and controls arithmetic evaluation order, compares numbers, builds Boolean expressions with `and`, `or`, and `not`, and updates variables with augmented assignment. These skills prepare the learner to write conditions later without introducing branching here.

**Prerequisites from Topic 2.** The learner may use `print()`, variables, assignment and reassignment, `int`, `float`, `str`, `bool`, numeric literals, simple one-operator arithmetic, f-strings, `input()`, and valid `int()` conversion.

**Scope boundaries.** Exponentiation uses nonnegative whole-number bases and positive whole-number exponents; chained exponentiation, negative-base syntax, fractional exponents, and unary-minus precedence are excluded. Mixed arithmetic expressions use whole numbers and, when division appears, a positive nonzero divisor. Comparisons are limited to `int` values and are not chained. Boolean operators receive only `bool` values or comparison results; using other kinds of values with them, and skipping part of an expression, are deferred. Operators not explicitly introduced in this topic are out of scope. No item asks the learner to choose which instruction runs — that is Topic 7.

---

## Lesson 3.1 — Expressions and Exponentiation  {#py-3.1}

- **objective:** Recognize an expression, identify its operators and operands, and use `**` to calculate a whole-number power.
- **estimated_time:** 20–30 min
- **item_count:** 10
- **live_coding_items:** 7

### py-3.1-01 · Expressions Produce Values

- **type:** concept
- **read:** An **expression** is just a piece of code that Python works out into a value. `4 + 3`
  is an expression — it works out to `7`. So is `price * quantity`, using whatever
  `price` and `quantity` currently hold. Once you have that value, you can assign it to a
  variable, hand it to `print()`, or drop it straight into an f-string placeholder.
- **check:** Which part of `total = 4 + 3` is the expression that produces `7`?
  - A. `total`
  - B. `=`
  - C. `4 + 3`
  - D. the entire line only
- **answer:** C
- **rationale:** Python evaluates `4 + 3` to produce a value, then assigns that value to `total`.
- **if_incorrect:** `total` is the variable name and `=` performs assignment. The code on the right,
  `4 + 3`, is the expression that produces the value.
- **tutor:** Ask which part of the line is doing computation versus which part is doing storage.
- **pass_rule:** Learner selects C.

### py-3.1-02 · Store an Expression's Result

- **type:** practical
- **do:** Assign the result of `14 - 6` to a variable named `difference`, then print `difference`.
  **The subtraction must occur in the assignment; do not assign or print the finished value `8` directly.**
- **solution:**
  ```python
  difference = 14 - 6
  print(difference)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `14\s*-\s*6`
- **expect_exact_output:** |
  8
- **tutor:** Point out the difference between writing the subtraction and writing its finished
  answer.
- **pass_rule:** Run exits 0 and stdout is exactly `8`.

### py-3.1-03 · Operators Act on Operands

- **type:** concept
- **read:** An **operator** is the symbol that tells Python what to do — the values it works on
  are its **operands**. In `10 * 4`, `*` is the operator and `10` and `4` are the operands.
  Operands don't have to be plain numbers, either: in `price * 4`, `price` and `4` are
  the operands.
- **check:** In the expression `12 / 3`, which symbol is the operator?
  - A. `/`
  - B. `12`
  - C. `3`
  - D. `=`
- **answer:** A
- **rationale:** `/` tells Python to divide; `12` and `3` are the values it acts on.
- **if_incorrect:** The operator is the operation symbol `/`. The numbers are operands, and there is no
  assignment symbol in the expression.
- **tutor:** Ask the learner to name the operator, then name the operands, separately.
- **pass_rule:** Learner selects A.

### py-3.1-04 · Build and Print an Expression

- **type:** practical
- **do:** Assign `9` to `price` and `4` to `quantity`. Assign `price * quantity` to `total`, then
  print `Total: 36` with an f-string.
  **Calculate the total from the two variables and use `{total}` in the f-string.**
- **solution:**
  ```python
  price = 9
  quantity = 4
  total = price * quantity
  print(f"Total: {total}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `price\s*\*\s*quantity`
  - `\{total\}`
- **expect_exact_output:** |
  Total: 36
- **tutor:** Ask which two variables need to be multiplied — not what the final number is.
- **pass_rule:** Run exits 0 and stdout is exactly `Total: 36`.

### py-3.1-05 · ** Means Exponentiation

- **type:** concept
- **read:** `**` raises a number to a power. In `3 ** 2`, `3` is the **base** and `2` is the
  **exponent** — it means `3` multiplied by itself twice, so you get `9`. Don't mix it up
  with `3 * 2`, which is a different operator entirely and gives you `6`. For now, stick
  to positive whole numbers on both sides.
- **check:** What value does `2 ** 4` produce?
  - A. `6`
  - B. `8`
  - C. `16`
  - D. `24`
- **answer:** C
- **rationale:** `2 ** 4` means `2 * 2 * 2 * 2`, which is `16`.
- **if_incorrect:** The exponent tells how many copies of the base are multiplied. It does not tell Python
  to add or multiply the base by the exponent once.
- **tutor:** Ask the learner to expand `3 ** 2` into repeated multiplication by hand.
- **pass_rule:** Learner selects C.

### py-3.1-06 · Calculate a Power

- **type:** practical
- **do:** Assign `5` to `side`. Use `**` to assign the square of `side` to `square`, then print
  `5 squared is 25` with an f-string. **The value `25` must be calculated with `side ** 2`
  and inserted through `{square}`.**
- **solution:**
  ```python
  side = 5
  square = side ** 2
  print(f"{side} squared is {square}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `side\s*\*\*\s*2`
  - `\{square\}`
- **expect_exact_output:** |
  5 squared is 25
- **tutor:** Ask what `side ** 2` computes before it's placed in the f-string.
- **pass_rule:** Run exits 0 and stdout is exactly `5 squared is 25`.

### py-3.1-07 · Repair the Power Report

- **type:** practical
- **practice_group:** true
- **do:** The program should raise `base` to `exponent`, but it reverses
  the operands and prints the wrong variable as the result. **Repair
  both lines without hardcoding `81`.**
- **starter_code:**
  ```python
  base = 3
  exponent = 4
  power = exponent ** base
  print(f"{base} to the power of {exponent} is {base}")
  ```
- **solution:**
  ```python
  base = 3
  exponent = 4
  power = base ** exponent
  print(f"{base} to the power of {exponent} is {power}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `power\s*=\s*base\s*\*\*\s*exponent`
  - `\{power\}`
- **forbid_code:**
  - `81`
- **expect_exact_output:** |
  3 to the power of 4 is 81
- **tutor:** `base ** exponent`, not `exponent ** base`, and print `power`.
- **pass_rule:** Run exits 0 and stdout is exactly `3 to the power of 4 is 81`.

### py-3.1-08 · Repair the Square and Cube

- **type:** practical
- **practice_group:** true
- **do:** `square` and `cube` should be calculated as powers of `side`.
  The current expressions multiply by the desired exponent instead.
  **Repair both stored expressions and continue printing the result
  variables.**
- **starter_code:**
  ```python
  side = 4
  square = side * 2
  cube = side * 3
  print(f"Square: {square}")
  print(f"Cube: {cube}")
  ```
- **solution:**
  ```python
  side = 4
  square = side ** 2
  cube = side ** 3
  print(f"Square: {square}")
  print(f"Cube: {cube}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `square\s*=\s*side\s*\*\*\s*2`
  - `cube\s*=\s*side\s*\*\*\s*3`
- **forbid_code:**
  - `16`
  - `64`
- **expect_exact_output:** |
  Square: 16
  Cube: 64
- **tutor:** `side ** 2` for `square`, `side ** 3` for `cube` — `**`, not `*`.
- **pass_rule:** Run exits 0 and stdout matches exactly.

### py-3.1-09 · Use the Intended Operands

- **type:** practical
- **practice_group:** true
- **do:** The price and quantity are correct. The program calculates the
  total using `quantity` twice, then prints `price` instead of the
  stored result. **Repair both uses while keeping the calculation in
  `total`.**
- **starter_code:**
  ```python
  price = 9
  quantity = 4
  total = quantity * quantity
  print(f"Total: {price}")
  ```
- **solution:**
  ```python
  price = 9
  quantity = 4
  total = price * quantity
  print(f"Total: {total}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `total\s*=\s*price\s*\*\s*quantity`
  - `\{total\}`
- **forbid_code:**
  - `36`
- **expect_exact_output:** |
  Total: 36
- **tutor:** Multiply `price * quantity` into `total`, then print `total`.
- **pass_rule:** Run exits 0 and stdout is exactly `Total: 36`.

### py-3.1-10 · Repair the Input Power Calculator

- **type:** practical
- **practice_group:** true
- **do:** Input line 1 is a nonnegative whole-number base and line 2 is
  a positive whole-number exponent. The program leaves the exponent as
  text and uses multiplication instead of exponentiation. **Repair both
  problems. Do not add prompts.**
- **starter_code:**
  ```python
  base = int(input())
  exponent = input()
  result = base * exponent
  print(f"Result: {result}")
  ```
- **solution:**
  ```python
  base = int(input())
  exponent = int(input())
  result = base ** exponent
  print(f"Result: {result}")
  ```
- **evaluator:** hidden-tests
- **hidden_tests:**
  ```yaml
  - stdin: "2\n5"
    stdout: "Result: 32"
  - stdin: "3\n3"
    stdout: "Result: 27"
  - stdin: "5\n2"
    stdout: "Result: 25"
  ```
- **tutor:** Convert `exponent` with `int()`, then use `base ** exponent`.
- **pass_rule:** All hidden tests pass.

---

## Lesson 3.2 — Arithmetic Precedence and Parentheses  {#py-3.2}

- **objective:** Evaluate mixed arithmetic expressions using Python's precedence rules, left-to-right evaluation within a level, and parentheses.
- **estimated_time:** 20–30 min
- **item_count:** 10
- **live_coding_items:** 7

### py-3.2-01 · Multiplication-Level Operations Come First

- **type:** concept
- **read:** Mix operators in one expression and Python needs a rule for what to do first — that
  rule is **precedence**. `**` goes before `*`, `/`, `//`, and `%`, and all of those go
  before `+` and `-`. So `2 + 3 * 4` works out the multiplication first — `2 + 12` — then
  adds, giving `14`. (We won't chain multiple `**` together in this lesson.)
- **check:** What value does `5 + 2 * 3` produce?
  - A. `21`
  - B. `7`
  - C. `30`
  - D. `11`
- **answer:** D
- **rationale:** Multiplication has higher precedence, so Python evaluates `2 * 3` before adding `5`.
- **if_incorrect:** Do not read the expression strictly from left to right. Complete `2 * 3` first, then add
  `5`.
- **tutor:** Ask which operator the learner would circle first if grading the expression by hand.
- **pass_rule:** Learner selects D.

### py-3.2-02 · Use Arithmetic Precedence

- **type:** practical
- **do:** Assign the expression `4 + 3 ** 2` to `result`, then print `result`.
  **Write the expression exactly as shown, without parentheses and without replacing it with its finished value. Python must evaluate the exponentiation before the addition.**
- **solution:**
  ```python
  result = 4 + 3 ** 2
  print(result)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `4\s*\+\s*3\s*\*\*\s*2`
- **expect_exact_output:** |
  13
- **tutor:** Ask what value `3 ** 2` produces before `4` is added to it.
- **pass_rule:** Run exits 0 and stdout is exactly `13`.

### py-3.2-03 · Parentheses Control Grouping

- **type:** concept
- **read:** Parentheses tell Python "do this part first" — and they can genuinely change the
  answer: `2 + 3 * 4` is `14`, but `(2 + 3) * 4` is `20`. Even when they don't change the
  result, they're often worth adding just to make your intent obvious.
- **check:** What value does `(5 + 2) * 3` produce?
  - A. `11`
  - B. `13`
  - C. `21`
  - D. `30`
- **answer:** C
- **rationale:** The parentheses make `5 + 2` happen first; `7 * 3` is `21`.
- **if_incorrect:** Evaluate the expression inside `(5 + 2)` before performing the multiplication outside
  it.
- **tutor:** Ask what changes about the expression once parentheses are added around part of it.
- **pass_rule:** Learner selects C.

### py-3.2-04 · Change the Grouping

- **type:** practical
- **do:** Assign `6 + 2 * 5` to `usual`. Assign `(6 + 2) * 5` to `grouped`. Print `usual` and then
  `grouped` on separate lines.
  **Keep the expressions in the assignments so the second result is changed by parentheses.**
- **solution:**
  ```python
  usual = 6 + 2 * 5
  grouped = (6 + 2) * 5
  print(usual)
  print(grouped)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `6\s*\+\s*2\s*\*\s*5`
  - `\(\s*6\s*\+\s*2\s*\)\s*\*\s*5`
- **expect_exact_output:** |
  16
  40
- **tutor:** Ask the learner to compute both expressions by hand and compare the two results.
- **pass_rule:** Run exits 0 and stdout is exactly those two lines.

### py-3.2-05 · Equal-Precedence Operators Go Left to Right

- **type:** concept
- **read:** `*`, `/`, `//`, and `%` all sit at the same precedence level, so when a few of them show
  up together, Python just works left to right. Addition and subtraction do the same
  thing at their own, lower level. That's why `20 // 5 * 2` becomes `4 * 2` first, then
  `8`.
- **check:** What value does `18 - 5 + 2` produce?
  - A. `11`
  - B. `15`
  - C. `21`
  - D. `25`
- **answer:** B
- **rationale:** Subtraction and addition share a precedence level, so Python evaluates `(18 - 5) + 2`
  from left to right.
- **if_incorrect:** Neither `+` nor `-` wins over the other here. Start at the left: `18 - 5` is `13`, then
  add `2`.
- **tutor:** Ask the learner to evaluate the expression one operator at a time, left to right.
- **pass_rule:** Learner selects B.

### py-3.2-06 · Combine Grouping and Precedence

- **type:** practical
- **do:** Assign `3` to `width`, `4` to `height`, and `2` to `border`. Calculate
  `(width + border) * (height + border)` and assign it to `outer_area`. Print
  `Outer area: 30` with an f-string.
  **Use both parenthesized additions in the calculation and insert `{outer_area}` in the output.**
- **solution:**
  ```python
  width = 3
  height = 4
  border = 2
  outer_area = (width + border) * (height + border)
  print(f"Outer area: {outer_area}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `\(\s*width\s*\+\s*border\s*\)\s*\*\s*\(\s*height\s*\+\s*border\s*\)`
  - `\{outer_area\}`
- **expect_exact_output:** |
  Outer area: 30
- **tutor:** Ask what each parenthesized sum computes before the multiplication between them runs.
- **pass_rule:** Run exits 0 and stdout is exactly `Outer area: 30`.

### py-3.2-07 · Restore the Intended Precedence

- **type:** practical
- **practice_group:** true
- **do:** The intended expression is `base_cost + fee * quantity`.
  Parentheses in the current code change the result by adding before
  multiplying. **Remove the incorrect grouping and continue calculating
  `total` from the variables.**
- **starter_code:**
  ```python
  base_cost = 10
  fee = 2
  quantity = 3
  total = (base_cost + fee) * quantity
  print(f"Total: {total}")
  ```
- **solution:**
  ```python
  base_cost = 10
  fee = 2
  quantity = 3
  total = base_cost + fee * quantity
  print(f"Total: {total}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `total\s*=\s*base_cost\s*\+\s*fee\s*\*\s*quantity`
- **forbid_code:**
  - `\(\s*base_cost\s*\+\s*fee\s*\)`
  - `16`
- **expect_exact_output:** |
  Total: 16
- **tutor:** Remove the parentheses — multiplication should happen before the addition.
- **pass_rule:** Run exits 0 and stdout is exactly `Total: 16`.

### py-3.2-08 · Repair the Outer Area

- **type:** practical
- **practice_group:** true
- **do:** A border adds `2` to both the width and height before those
  new dimensions are multiplied. The current grouping applies the
  border to only one part of the calculation. **Repair the expression
  with two parenthesized additions.**
- **starter_code:**
  ```python
  width = 3
  height = 4
  border = 2
  outer_area = width + border * height + border
  print(f"Outer area: {outer_area}")
  ```
- **solution:**
  ```python
  width = 3
  height = 4
  border = 2
  outer_area = (width + border) * (height + border)
  print(f"Outer area: {outer_area}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `outer_area\s*=\s*\(\s*width\s*\+\s*border\s*\)\s*\*\s*\(\s*height\s*\+\s*border\s*\)`
- **forbid_code:**
  - `30`
- **expect_exact_output:** |
  Outer area: 30
- **tutor:** Group `(width + border)` and `(height + border)` separately, then multiply them.
- **pass_rule:** Run exits 0 and stdout is exactly `Outer area: 30`.

### py-3.2-09 · Restore Left-to-Right Evaluation

- **type:** practical
- **practice_group:** true
- **do:** Addition and subtraction at the same precedence level should
  be evaluated from left to right. The current parentheses force a
  different grouping. **Repair both expressions without replacing them
  with finished values.**
- **starter_code:**
  ```python
  first = 18 - (5 + 2)
  second = 20 - (6 + 4)
  print(first)
  print(second)
  ```
- **solution:**
  ```python
  first = 18 - 5 + 2
  second = 20 - 6 + 4
  print(first)
  print(second)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `first\s*=\s*18\s*-\s*5\s*\+\s*2`
  - `second\s*=\s*20\s*-\s*6\s*\+\s*4`
- **forbid_code:**
  - `15`
- **expect_exact_output:** |
  15
  18
- **tutor:** Drop the parentheses so Python works left to right: `18 - 5 + 2`, `20 - 6 + 4`.
- **pass_rule:** Run exits 0 and stdout matches exactly.

### py-3.2-10 · Repair Both Power Calculations

- **type:** practical
- **practice_group:** true
- **do:** `usual` should let exponentiation happen before addition.
  `grouped` should add first and then square the result. Their
  parentheses are currently reversed. **Repair both expressions.**
- **starter_code:**
  ```python
  usual = (4 + 3) ** 2
  grouped = 4 + 3 ** 2
  print(f"Usual: {usual}")
  print(f"Grouped: {grouped}")
  ```
- **solution:**
  ```python
  usual = 4 + 3 ** 2
  grouped = (4 + 3) ** 2
  print(f"Usual: {usual}")
  print(f"Grouped: {grouped}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `usual\s*=\s*4\s*\+\s*3\s*\*\*\s*2`
  - `grouped\s*=\s*\(\s*4\s*\+\s*3\s*\)\s*\*\*\s*2`
- **forbid_code:**
  - `13`
  - `49`
- **expect_exact_output:** |
  Usual: 13
  Grouped: 49
- **tutor:** `usual` stays unparenthesized (`4 + 3 ** 2`); `grouped` needs `(4 + 3) ** 2`.
- **pass_rule:** Run exits 0 and stdout matches exactly.

---

## Lesson 3.3 — Comparison Operators  {#py-3.3}

- **objective:** Compare numeric values with equality, inequality, and ordering operators and recognize that each comparison produces a Boolean value.
- **estimated_time:** 20–30 min
- **item_count:** 10
- **live_coding_items:** 7

### py-3.3-01 · Comparisons Produce Booleans

- **type:** concept
- **read:** A **comparison expression** asks a yes-or-no question about two values and answers with
  `True` or `False`. Equality uses `==` — two equals signs. `4 == 4` is `True`, `4 == 7`
  is `False`. A single `=` is doing something completely different — it's assigning a
  value, not comparing one.
- **check:** What does `6 == 6` produce?
  - A. `True`
  - B. `6`
  - C. `False`
  - D. the text `6 == 6`
- **answer:** A
- **rationale:** Both numeric values are equal, so the comparison produces `True`.
- **if_incorrect:** `==` asks whether the two operands are equal. Its result is a Boolean, not one of the
  operands or a copy of the source code.
- **tutor:** Ask what kind of value `==` produces — not what the two operands are.
- **pass_rule:** Learner selects A.

### py-3.3-02 · Test Equality

- **type:** practical
- **do:** Assign `12` to both `number1` and `number2`. Assign the result of `number1 ==
  number2` to `result`, then print `Equal: True` with an f-string.
  **Calculate `result` with `==` and insert `{result}` in the output.**
- **solution:**
  ```python
  number1 = 12
  number2 = 12
  result = number1 == number2
  print(f"Equal: {result}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `number1\s*==\s*number2`
  - `\{result\}`
- **expect_exact_output:** |
  Equal: True
- **tutor:** Ask what `number1 == number2` evaluates to before it gets assigned to `result`.
- **pass_rule:** Run exits 0 and stdout is exactly `Equal: True`.

### py-3.3-03 · != Means Not Equal

- **type:** concept
- **read:** `!=` is the not-equal operator — it's `True` when the two values are different, `False`
  when they match. So `5 != 8` is `True`, and `5 != 5` is `False`. Here, we're only
  comparing numbers.
- **check:** What does `9 != 9` produce?
  - A. `True`
  - B. `False`
  - C. `9`
  - D. `18`
- **answer:** B
- **rationale:** The two values are equal, so the claim that they are not equal is false.
- **if_incorrect:** Read `!=` as “is not equal to.” Since `9` is equal to `9`, that comparison produces
  `False`.
- **tutor:** Ask the learner to restate `!=` in plain English before evaluating it.
- **pass_rule:** Learner selects B.

### py-3.3-04 · Test Inequality

- **type:** practical
- **do:** Assign `7` to `current` and `10` to `target`. Assign the result of `current != target`
  to `different`, then print `Different: True` with an f-string.
  **Use `!=` to calculate the Boolean value.**
- **solution:**
  ```python
  current = 7
  target = 10
  different = current != target
  print(f"Different: {different}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `current\s*!=\s*target`
  - `\{different\}`
- **expect_exact_output:** |
  Different: True
- **tutor:** Ask whether `7` and `10` are different values, before checking what the code does.
- **pass_rule:** Run exits 0 and stdout is exactly `Different: True`.

### py-3.3-05 · Ordering Comparisons

- **type:** concept
- **read:** For ordering numbers, you've got `<`, `>`, `<=`, and `>=` — notice the equals sign
  always comes second, never first. Both boundaries count as true: `5 <= 5` and `5 >= 5`
  are both `True`. We're only comparing one pair of numbers at a time here — no chaining
  comparisons together yet.
- **check:** Which comparison produces `True` when `score` is exactly `80`?
  - A. `score > 80`
  - B. `score < 80`
  - C. `score >= 80`
  - D. `score != 80`
- **answer:** C
- **rationale:** `>=` includes equality, so a score equal to `80` satisfies the comparison.
- **if_incorrect:** At the boundary, `>` and `<` are false, and `!=` is false. The `=` in `>=` makes
  equality count.
- **tutor:** Ask what happens at the exact boundary value for each ordering operator.
- **pass_rule:** Learner selects C.

### py-3.3-06 · Compare Numeric Input

- **type:** practical
- **do:** Read an `age` as a whole number from one line. Assign the result of `age >= 18` to
  `at_least_18`, then print `At least 18: <at_least_18>` with an f-string. Do not print a
  prompt.
  **Convert the input to `int`, perform the `>=` comparison, and insert the `at_least_18` variable in the output.**
- **solution:**
  ```python
  age = int(input())
  at_least_18 = age >= 18
  print(f"At least 18: {at_least_18}")
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `int\s*\(\s*input\s*\(\s*\)\s*\)`
  - `age\s*>=\s*18`
  - `\{at_least_18\}`
- **hidden_tests:**
  ```yaml
  - stdin: "18"
    stdout: "At least 18: True"
  - stdin: "17"
    stdout: "At least 18: False"
  - stdin: "42"
    stdout: "At least 18: True"
  ```
- **tutor:** Ask whether the input needs converting before it can be compared with `>=`.
- **pass_rule:** All hidden tests pass, exit code 0.

### py-3.3-07 · Repair the Boundary Checks

- **type:** practical
- **practice_group:** true
- **do:** A passing score includes `80`, and the maximum allowed score
  includes `100`. The current operators reject both boundary values.
  **Repair the two comparisons without hardcoding either Boolean
  result.**
- **starter_code:**
  ```python
  score = 80
  maximum = 100
  passed = score > 80
  within_maximum = maximum < 100
  print(f"Passed: {passed}")
  print(f"Within maximum: {within_maximum}")
  ```
- **solution:**
  ```python
  score = 80
  maximum = 100
  passed = score >= 80
  within_maximum = maximum <= 100
  print(f"Passed: {passed}")
  print(f"Within maximum: {within_maximum}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `passed\s*=\s*score\s*>=\s*80`
  - `within_maximum\s*=\s*maximum\s*<=\s*100`
- **expect_exact_output:** |
  Passed: True
  Within maximum: True
- **tutor:** Both boundaries count — use `>=` and `<=`, not `>` and `<`.
- **pass_rule:** Run exits 0 and stdout matches exactly.

### py-3.3-08 · Restore Equality and Difference

- **type:** practical
- **practice_group:** true
- **do:** `same` should ask whether the two values are equal, while
  `different` should ask whether they are unequal. Both stored
  comparisons use the opposite operator. **Repair them without changing
  the output lines.**
- **starter_code:**
  ```python
  first = 12
  second = 12
  same = first != second
  different = first == second
  print(f"Same: {same}")
  print(f"Different: {different}")
  ```
- **solution:**
  ```python
  first = 12
  second = 12
  same = first == second
  different = first != second
  print(f"Same: {same}")
  print(f"Different: {different}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `same\s*=\s*first\s*==\s*second`
  - `different\s*=\s*first\s*!=\s*second`
- **expect_exact_output:** |
  Same: True
  Different: False
- **tutor:** `==` asks "are these equal?"; `!=` asks "are these different?" — they're swapped in the starter.
- **pass_rule:** Run exits 0 and stdout matches exactly.

### py-3.3-09 · Compare the Intended Values

- **type:** practical
- **practice_group:** true
- **do:** The program should report whether `current` is below `target`
  and whether `target` is above `current`. The comparisons use the
  wrong direction, and the output lines print the wrong result
  variables. **Repair the program.**
- **starter_code:**
  ```python
  current = 7
  target = 10
  below_target = current > target
  target_is_higher = target < current
  print(f"Below target: {target_is_higher}")
  print(f"Target is higher: {below_target}")
  ```
- **solution:**
  ```python
  current = 7
  target = 10
  below_target = current < target
  target_is_higher = target > current
  print(f"Below target: {below_target}")
  print(f"Target is higher: {target_is_higher}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `below_target\s*=\s*current\s*<\s*target`
  - `target_is_higher\s*=\s*target\s*>\s*current`
  - `Below target:\s*\{below_target\}`
  - `Target is higher:\s*\{target_is_higher\}`
- **expect_exact_output:** |
  Below target: True
  Target is higher: True
- **tutor:** Fix the comparison direction for each variable, then print each one in its matching line.
- **pass_rule:** Run exits 0 and stdout matches exactly.

### py-3.3-10 · Repair the Numeric Input Check

- **type:** practical
- **practice_group:** true
- **do:** Read a whole-number age and report whether it is at least
  `18`. The current program keeps the input as text and excludes the
  boundary value. **Repair the conversion and comparison. Do not add
  prompts.**
- **starter_code:**
  ```python
  age = input()
  at_least_18 = age > 18
  print(f"At least 18: {at_least_18}")
  ```
- **solution:**
  ```python
  age = int(input())
  at_least_18 = age >= 18
  print(f"At least 18: {at_least_18}")
  ```
- **evaluator:** hidden-tests
- **hidden_tests:**
  ```yaml
  - stdin: "18"
    stdout: "At least 18: True"
  - stdin: "17"
    stdout: "At least 18: False"
  - stdin: "42"
    stdout: "At least 18: True"
  ```
- **tutor:** Convert with `int()` first, then use `>=` so `18` itself counts.
- **pass_rule:** All hidden tests pass.

---

## Lesson 3.4 — Boolean Operators  {#py-3.4}

- **objective:** Combine or reverse Boolean values with `and`, `or`, and `not`.
- **estimated_time:** 20–30 min
- **item_count:** 10
- **live_coding_items:** 7

### py-3.4-01 · and Requires Both Sides to Be True

- **type:** concept
- **read:** `and` combines two Boolean expressions, and it's picky — both sides have to be `True`
  for the whole thing to be `True`. If either side is `False`, the whole expression is
  `False`. We'll only use `and` with actual Boolean values or comparison results for now.
- **check:** What does `True and False` produce?
  - A. `True`
  - B. `False`
  - C. `None`
  - D. the text `True and False`
- **answer:** B
- **rationale:** `and` produces `True` only when both operands are `True`; one operand here is `False`.
- **if_incorrect:** Think “both conditions must hold.” Having only one `True` is not enough for `and`.
- **tutor:** Ask the learner to check each side of `and` on its own before combining them.
- **pass_rule:** Learner selects B.

### py-3.4-02 · Require Both Conditions

- **type:** practical
- **do:** Assign `22` to `age` and `True` to `has_ticket`. Assign `(age >= 18) and has_ticket` to
  `can_enter`, then print `Can enter: True` with an f-string.
  **Calculate `can_enter` with the parenthesized comparison and one `and` operator, then insert `{can_enter}` in the output.**
- **solution:**
  ```python
  age = 22
  has_ticket = True
  can_enter = (age >= 18) and has_ticket
  print(f"Can enter: {can_enter}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `\(\s*age\s*>=\s*18\s*\)\s*and\s*has_ticket`
  - `\{can_enter\}`
- **expect_exact_output:** |
  Can enter: True
- **tutor:** Ask what `age >= 18` evaluates to before it's combined with `has_ticket`.
- **pass_rule:** Run exits 0 and stdout is exactly `Can enter: True`.

### py-3.4-03 · or Requires at Least One True Side

- **type:** concept
- **read:** `or` is more relaxed than `and` — it's `True` as soon as at least one side is `True`.
  The only way you get `False` is when both sides are. (And yes, "at least one" covers
  the case where both sides happen to be `True` too.)
- **check:** What does `False or True` produce?
  - A. `True`
  - B. `False`
  - C. `None`
  - D. an error
- **answer:** A
- **rationale:** One operand is `True`, and `or` needs at least one true operand.
- **if_incorrect:** `or` is false only in the `False or False` case. Either one or two true operands make it
  true.
- **tutor:** Ask the learner which single case is the only one where `or` produces `False`.
- **pass_rule:** Learner selects A.

### py-3.4-04 · Accept Either Condition

- **type:** practical
- **do:** Assign `8` to `temperature` and `False` to `is_raining`. Assign
  `(temperature < 10) or is_raining` to `take_coat`, then print `Take coat: True` with an
  f-string.
  **Use the parenthesized comparison and one `or` operator to calculate `take_coat`.**
- **solution:**
  ```python
  temperature = 8
  is_raining = False
  take_coat = (temperature < 10) or is_raining
  print(f"Take coat: {take_coat}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `\(\s*temperature\s*<\s*10\s*\)\s*or\s*is_raining`
  - `\{take_coat\}`
- **expect_exact_output:** |
  Take coat: True
- **tutor:** Ask which of the two conditions is `True` here, and whether `or` needs both to be.
- **pass_rule:** Run exits 0 and stdout is exactly `Take coat: True`.

### py-3.4-05 · not Reverses a Boolean

- **type:** concept
- **read:** `not` flips a single Boolean value: `not True` is `False`, and `not False` is `True`.
  So if `finished` is currently `False`, `not finished` gives you `True`.
- **check:** If `available` is `False`, what does `not available` produce?
  - A. `False`
  - B. `None`
  - C. `True`
  - D. `available`
- **answer:** C
- **rationale:** `not` reverses the Boolean value from `False` to `True`.
- **if_incorrect:** `not` does not preserve, erase, or rename the value. It produces the opposite Boolean
  value.
- **tutor:** Ask what `not` does to a value, not what it does to a variable name.
- **pass_rule:** Learner selects C.

### py-3.4-06 · Reverse a Comparison Result

- **type:** practical
- **do:** Assign `3` to `items_left`. Assign `items_left == 0` to `sold_out`, then assign
  `not sold_out` to `in_stock`. Print `In stock: True` with an f-string.
  **Calculate `in_stock` by applying `not` to `sold_out`.**
- **solution:**
  ```python
  items_left = 3
  sold_out = items_left == 0
  in_stock = not sold_out
  print(f"In stock: {in_stock}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `items_left\s*==\s*0`
  - `not\s+sold_out`
  - `\{in_stock\}`
- **expect_exact_output:** |
  In stock: True
- **tutor:** Ask what `sold_out` evaluates to before `not` is applied to it.
- **pass_rule:** Run exits 0 and stdout is exactly `In stock: True`.

### py-3.4-07 · Repair the Entry Check

- **type:** practical
- **practice_group:** true
- **do:** A visitor may enter only when they are at least `18` and have
  a ticket. The program uses `or`, so one successful check is enough,
  and then it prints the ticket value instead of the combined result.
  **Repair both mistakes. Keep the comparison parenthesized.**
- **starter_code:**
  ```python
  age = 17
  has_ticket = True
  can_enter = (age >= 18) or has_ticket
  print(f"Can enter: {has_ticket}")
  ```
- **solution:**
  ```python
  age = 17
  has_ticket = True
  can_enter = (age >= 18) and has_ticket
  print(f"Can enter: {can_enter}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `can_enter\s*=\s*\(\s*age\s*>=\s*18\s*\)\s*and\s*has_ticket`
  - `Can enter:\s*\{can_enter\}`
- **expect_exact_output:** |
  Can enter: False
- **tutor:** Both conditions must hold, so use `and`, and print `can_enter`, not `has_ticket`.
- **pass_rule:** Run exits 0 and stdout is exactly `Can enter: False`.

### py-3.4-08 · Repair the Coat Reminder

- **type:** practical
- **practice_group:** true
- **do:** A coat is recommended when it is cold or raining. The current
  program requires both conditions and prints `is_raining` rather than
  the combined result. **Repair both lines. Keep the comparison
  parenthesized.**
- **starter_code:**
  ```python
  temperature = 8
  is_raining = False
  take_coat = (temperature < 10) and is_raining
  print(f"Take coat: {is_raining}")
  ```
- **solution:**
  ```python
  temperature = 8
  is_raining = False
  take_coat = (temperature < 10) or is_raining
  print(f"Take coat: {take_coat}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `take_coat\s*=\s*\(\s*temperature\s*<\s*10\s*\)\s*or\s*is_raining`
  - `Take coat:\s*\{take_coat\}`
- **expect_exact_output:** |
  Take coat: True
- **tutor:** Either condition is enough, so use `or`, and print `take_coat`, not `is_raining`.
- **pass_rule:** Run exits 0 and stdout is exactly `Take coat: True`.

### py-3.4-09 · Repair the Inventory States

- **type:** practical
- **practice_group:** true
- **do:** `sold_out` should be true when the item count is zero.
  `in_stock` should be the reverse of `sold_out`. The current comparison
  is reversed, and `in_stock` copies that result instead of reversing
  it. **Repair both stored expressions.**
- **starter_code:**
  ```python
  items_left = 3
  sold_out = items_left != 0
  in_stock = sold_out
  print(f"Sold out: {sold_out}")
  print(f"In stock: {in_stock}")
  ```
- **solution:**
  ```python
  items_left = 3
  sold_out = items_left == 0
  in_stock = not sold_out
  print(f"Sold out: {sold_out}")
  print(f"In stock: {in_stock}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `sold_out\s*=\s*items_left\s*==\s*0`
  - `in_stock\s*=\s*not\s+sold_out`
- **expect_exact_output:** |
  Sold out: False
  In stock: True
- **tutor:** `== 0` checks "is it zero?"; `in_stock` needs `not sold_out`, not a copy of it.
- **pass_rule:** Run exits 0 and stdout matches exactly.

### py-3.4-10 · Repair the Input Eligibility Check

- **type:** practical
- **practice_group:** true
- **do:** Input line 1 is a whole-number age. Input line 2 is a
  whole-number ticket flag: `1` means the person has a ticket and `0`
  means they do not. A person qualifies only when they are at least
  `18` and the flag equals `1`. The current program omits the age
  conversion and uses `or`. **Repair both problems. Do not add
  prompts.**
- **starter_code:**
  ```python
  age = input()
  ticket_flag = int(input())
  has_ticket = ticket_flag == 1
  qualifies = (age >= 18) or has_ticket
  print(f"Qualifies: {qualifies}")
  ```
- **solution:**
  ```python
  age = int(input())
  ticket_flag = int(input())
  has_ticket = ticket_flag == 1
  qualifies = (age >= 18) and has_ticket
  print(f"Qualifies: {qualifies}")
  ```
- **evaluator:** hidden-tests
- **hidden_tests:**
  ```yaml
  - stdin: "18\n1"
    stdout: "Qualifies: True"
  - stdin: "17\n1"
    stdout: "Qualifies: False"
  - stdin: "25\n0"
    stdout: "Qualifies: False"
  ```
- **tutor:** Convert `age` with `int()`, and both conditions must hold — use `and`.
- **pass_rule:** All hidden tests pass.

---

## Lesson 3.5 — Logical Precedence and Grouping  {#py-3.5}

- **objective:** Evaluate expressions that combine comparisons and Boolean operators, and use parentheses to make the intended logic explicit.
- **estimated_time:** 20–30 min
- **item_count:** 12
- **live_coding_items:** 8

### py-3.5-01 · Comparisons Come Before Boolean Operators

- **type:** concept
- **read:** When arithmetic, comparisons, and Boolean operators are all mixed together, Python
  works through them in that order — arithmetic first, then comparisons, then Boolean
  logic. Among the Boolean operators themselves, `not` goes before `and`, and `and` goes
  before `or`. So `4 < 7 and 9 == 9` first turns into `True and True`, then just `True`.
- **check:** What does `3 < 5 and 8 != 8` produce?
  - A. `True`
  - B. `False`
  - C. `3`
  - D. `8`
- **answer:** B
- **rationale:** The comparisons produce `True` and `False`; `True and False` produces `False`.
- **if_incorrect:** Evaluate each comparison first: `3 < 5` is `True`, while `8 != 8` is `False`. Then apply
  `and`.
- **tutor:** Ask the learner to evaluate both comparisons fully before applying `and`.
- **pass_rule:** Learner selects B.

### py-3.5-02 · Evaluate Comparisons Before and

- **type:** practical
- **do:** Assign `15` to `score` and `4` to `mistakes`. Assign `score >= 10 and mistakes < 5` to
  `passed`, then print `Passed: True` with an f-string.
  **Use the complete comparison-and-comparison expression shown to calculate `passed`.**
- **solution:**
  ```python
  score = 15
  mistakes = 4
  passed = score >= 10 and mistakes < 5
  print(f"Passed: {passed}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `score\s*>=\s*10\s*and\s*mistakes\s*<\s*5`
  - `\{passed\}`
- **expect_exact_output:** |
  Passed: True
- **tutor:** Ask what each comparison evaluates to before they're combined with `and`.
- **pass_rule:** Run exits 0 and stdout is exactly `Passed: True`.

### py-3.5-03 · and Comes Before or

- **type:** concept
- **read:** Left to its own devices, Python does `and` before `or`. So `True or False and False`
  is really `True or (False and False)`, which comes out `True`. If that grouping isn't
  obvious at a glance, adding parentheses to spell it out is always a good idea.
- **check:** Using Python's default precedence, what does `False or True and False` produce?
  - A. `True`
  - B. `False`
  - C. `None`
  - D. an error
- **answer:** B
- **rationale:** Python evaluates `True and False` first, producing `False`; then `False or False` also
  produces `False`.
- **if_incorrect:** Do the `and` operation before the `or` operation. Do not group the first two values
  merely because they appear first.
- **tutor:** Ask which operator the learner would apply first if there were no parentheses.
- **pass_rule:** Learner selects B.

### py-3.5-04 · Use Default Logical Precedence

- **type:** practical
- **do:** Assign the expression `True or False and False` to `result`, then print `result`.
  **Write the expression without parentheses so Python's default `and`-before-`or` precedence determines the result.**
- **solution:**
  ```python
  result = True or False and False
  print(result)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `True\s+or\s+False\s+and\s+False`
- **expect_exact_output:** |
  True
- **tutor:** Ask which part of the expression `and` binds to first, without parentheses.
- **pass_rule:** Run exits 0 and stdout is exactly `True`.

### py-3.5-05 · Parentheses Control Logical Grouping

- **type:** concept
- **read:** Just like with arithmetic, parentheses can override the default logical order.
  `(True or False) and False` forces the `or` to happen first, then applies `and` —
  landing on `False`. Sometimes parentheses don't change anything at all; they're just
  there to make the grouping obvious, like `(age >= 18) and has_ticket`.
- **check:** What does `(False or True) and True` produce?
  - A. `True`
  - B. `False`
  - C. `None`
  - D. the number `1`
- **answer:** A
- **rationale:** The parentheses produce `True`, and `True and True` produces `True`.
- **if_incorrect:** Evaluate `(False or True)` first. Its Boolean result then becomes the left operand of
  `and`.
- **tutor:** Ask what the parenthesized part evaluates to before the outer operator runs.
- **pass_rule:** Learner selects A.

### py-3.5-06 · Group a Logical Expression

- **type:** practical
- **do:** Assign `False` to `is_member`, `True` to `has_coupon`, and `True` to `item_available`.
  Assign `(is_member or has_coupon) and item_available` to `can_buy`, then print
  `Can buy: True` with an f-string.
  **Keep the parentheses around the `or` expression and calculate `can_buy` from all three Boolean variables.**
- **solution:**
  ```python
  is_member = False
  has_coupon = True
  item_available = True
  can_buy = (is_member or has_coupon) and item_available
  print(f"Can buy: {can_buy}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `\(\s*is_member\s+or\s+has_coupon\s*\)\s+and\s+item_available`
  - `\{can_buy\}`
- **expect_exact_output:** |
  Can buy: True
- **tutor:** Ask what the parenthesized `or` evaluates to before `and` is applied to it.
- **pass_rule:** Run exits 0 and stdout is exactly `Can buy: True`.

### py-3.5-07 · `not` Is Applied Before `and` and `or`

- **type:** concept
- **read:** `not` binds tighter than `and` or `or` when there are no parentheses. `not True or True`
  is really `(not True) or True`, which is `True`. Add parentheses and you change what
  `not` is even flipping: `not (True or True)` reverses the whole `or` result, giving
  `False` instead.
- **check:** Using Python's default precedence, what does `not False or False` produce?
  - A. `False`
  - B. `None`
  - C. an error
  - D. `True`
- **answer:** D
- **rationale:** Python applies `not` first, producing `True or False`, which produces `True`.
- **if_incorrect:** Reverse the first `False` with `not` before applying `or`. Parentheses would be required
  to make `not` reverse the complete `or` expression.
- **tutor:** Ask what `not` applies to when there are no parentheses to say otherwise.
- **pass_rule:** Learner selects D.

### py-3.5-08 · Apply not Before or

- **type:** practical
- **do:** Assign `True` to `is_closed` and `False` to `staff_override`. Assign
  `not is_closed or staff_override` to `may_enter`, then print `May enter: False` with an
  f-string.
  **Do not add parentheses; calculate `may_enter` with the complete expression shown.**
- **solution:**
  ```python
  is_closed = True
  staff_override = False
  may_enter = not is_closed or staff_override
  print(f"May enter: {may_enter}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `not\s+is_closed\s+or\s+staff_override`
  - `\{may_enter\}`
- **expect_exact_output:** |
  May enter: False
- **tutor:** Ask what `not is_closed` evaluates to before it's combined with `or`.
- **pass_rule:** Run exits 0 and stdout is exactly `May enter: False`.

### py-3.5-09 · Restore the Purchase Rule

- **type:** practical
- **practice_group:** true
- **do:** The intended rule is: the customer must be a member or have a
  coupon, and the item must also be available. The current expression
  lets a member buy an unavailable item because `and` is evaluated
  first. **Add the grouping that matches the stated rule.**
- **starter_code:**
  ```python
  is_member = True
  has_coupon = False
  item_available = False
  can_buy = is_member or has_coupon and item_available
  print(f"Can buy: {can_buy}")
  ```
- **solution:**
  ```python
  is_member = True
  has_coupon = False
  item_available = False
  can_buy = (is_member or has_coupon) and item_available
  print(f"Can buy: {can_buy}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `can_buy\s*=\s*\(\s*is_member\s*or\s*has_coupon\s*\)\s*and\s*item_available`
- **expect_exact_output:** |
  Can buy: False
- **tutor:** Group `(is_member or has_coupon)` first, so the item's availability always applies.
- **pass_rule:** Run exits 0 and stdout is exactly `Can buy: False`.

### py-3.5-10 · Reverse the Complete Closure Rule

- **type:** practical
- **practice_group:** true
- **do:** Entry is allowed only when the location is neither closed nor
  under maintenance. `not` currently reverses only `is_closed`, so
  maintenance can incorrectly make the result true. **Group the
  complete `or` expression that must be reversed.**
- **starter_code:**
  ```python
  is_closed = False
  maintenance = True
  may_enter = not is_closed or maintenance
  print(f"May enter: {may_enter}")
  ```
- **solution:**
  ```python
  is_closed = False
  maintenance = True
  may_enter = not (is_closed or maintenance)
  print(f"May enter: {may_enter}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `may_enter\s*=\s*not\s*\(\s*is_closed\s*or\s*maintenance\s*\)`
- **expect_exact_output:** |
  May enter: False
- **tutor:** `not` needs to apply to the whole `(is_closed or maintenance)`, not just `is_closed`.
- **pass_rule:** Run exits 0 and stdout is exactly `May enter: False`.

### py-3.5-11 · Restore Default Logical Precedence

- **type:** practical
- **practice_group:** true
- **do:** The intended expression is `priority or active and paid`,
  using Python's default `and`-before-`or` precedence. The current
  parentheses change the rule and reject a priority user. **Remove the
  incorrect grouping.**
- **starter_code:**
  ```python
  priority = True
  active = False
  paid = False
  approved = (priority or active) and paid
  print(f"Approved: {approved}")
  ```
- **solution:**
  ```python
  priority = True
  active = False
  paid = False
  approved = priority or active and paid
  print(f"Approved: {approved}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `approved\s*=\s*priority\s*or\s*active\s*and\s*paid`
- **forbid_code:**
  - `\(\s*priority\s*or\s*active\s*\)`
- **expect_exact_output:** |
  Approved: True
- **tutor:** Drop the parentheses — `and` already binds tighter than `or`, so a priority user is approved either way.
- **pass_rule:** Run exits 0 and stdout is exactly `Approved: True`.

### py-3.5-12 · Repair the Review Override

- **type:** practical
- **practice_group:** true
- **do:** A submission passes when both the score and mistake
  requirements are met, or when an override is active. The current
  grouping makes the override depend on the score requirement. **Repair
  the parentheses so `override` applies to the complete normal rule.**
- **starter_code:**
  ```python
  score = 70
  mistakes = 1
  override = True
  passed = (score >= 80) and ((mistakes < 3) or override)
  print(f"Passed: {passed}")
  ```
- **solution:**
  ```python
  score = 70
  mistakes = 1
  override = True
  passed = ((score >= 80) and (mistakes < 3)) or override
  print(f"Passed: {passed}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `passed\s*=\s*\(\s*\(\s*score\s*>=\s*80\s*\)\s*and\s*\(\s*mistakes\s*<\s*3\s*\)\s*\)\s*or\s*override`
- **expect_exact_output:** |
  Passed: True
- **tutor:** Group the normal rule `((score >= 80) and (mistakes < 3))` first, then `or override` around the whole thing.
- **pass_rule:** Run exits 0 and stdout is exactly `Passed: True`.

---

## Lesson 3.6 — Augmented Assignment  {#py-3.6}

- **objective:** Update a variable from its current value with arithmetic augmented assignment operators.
- **estimated_time:** 20–30 min
- **item_count:** 10
- **live_coding_items:** 7

### py-3.6-01 · += Updates a Variable

- **type:** concept
- **read:** An **augmented assignment** takes a variable's current value, does something to it, and
  saves the result right back into that same variable. `count += 3` is just shorthand for
  `count = count + 3`. Starting at `5`, `count` becomes `8`. Of course, `count` needs a
  value already before you can update it this way.
- **check:** If `points` is `10`, what is its value after `points += 4`?
  - A. `4`
  - B. `6`
  - C. `10`
  - D. `14`
- **answer:** D
- **rationale:** `points += 4` adds `4` to the current value `10` and stores the result back in `points`.
- **if_incorrect:** Keep the current value in the calculation: `points += 4` means `points = points + 4`,
  not a fresh assignment of `4`.
- **tutor:** Ask the learner to expand `+=` into its two-step `name = name + value` equivalent.
- **pass_rule:** Learner selects D.

### py-3.6-02 · Increase a Running Value

- **type:** practical
- **do:** Assign `12` to `score`, increase it by `5` with `+=`, then print `Score: 17` with an
  f-string. **The update must use `score += 5`.**
- **solution:**
  ```python
  score = 12
  score += 5
  print(f"Score: {score}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `score\s*\+=\s*5`
  - `\{score\}`
- **expect_exact_output:** |
  Score: 17
- **tutor:** Ask what value `score` holds right before the `+=` line runs.
- **pass_rule:** Run exits 0 and stdout is exactly `Score: 17`.

### py-3.6-03 · -= and *= Follow the Same Pattern

- **type:** concept
- **read:** The rest of the augmented assignments work exactly the same way. `balance -= 6` means
  `balance = balance - 6`, and `size *= 3` means `size = size * 3` — take the current
  value, do the operation, save it back.
- **check:** If `size` is `7`, what is its value after `size *= 3`?
  - A. `3`
  - B. `4`
  - C. `10`
  - D. `21`
- **answer:** D
- **rationale:** `size *= 3` multiplies the current value `7` by `3` and assigns `21` back to `size`.
- **if_incorrect:** Read `*=` as “multiply the current value and store the result.” It is not subtraction,
  addition, or replacement with the right operand.
- **tutor:** Ask the learner to expand `*=` the same way they just expanded `+=`.
- **pass_rule:** Learner selects D.

### py-3.6-04 · Decrease and Multiply

- **type:** practical
- **do:** Assign `20` to `amount`. Decrease it by `4` with `-=`, then multiply the result by `3`
  with `*=`. Print `amount`. **Use the two augmented assignments in that order.**
- **solution:**
  ```python
  amount = 20
  amount -= 4
  amount *= 3
  print(amount)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `amount\s*-=\s*4`
  - `amount\s*\*=\s*3`
- **expect_exact_output:** |
  48
- **tutor:** Ask what `amount` becomes after the first update, before the second one runs.
- **pass_rule:** Run exits 0 and stdout is exactly `48`.

### py-3.6-05 · Division Has Augmented Forms Too

- **type:** concept
- **read:** Division gets the same augmented treatment: `/=`, `//=`, and `%=`, each behaving just
  like its plain counterpart. `/=` always leaves you with a `float`, even if the division
  comes out even. With nonnegative whole numbers and a positive divisor, `//=` gives you
  the whole-number quotient and `%=` gives you the remainder.
- **check:** If `value` is `17`, what is its value after `value %= 5`?
  - A. `2`
  - B. `3`
  - C. `3.4`
  - D. `15`
- **answer:** A
- **rationale:** Dividing `17` by `5` leaves a remainder of `2`, and `%=` stores that remainder back in
  `value`.
- **if_incorrect:** `%=` uses the remainder operation. `17` contains three complete groups of `5`, with `2`
  left over.
- **tutor:** Ask which plain division operator each augmented form is built from.
- **pass_rule:** Learner selects A.

### py-3.6-06 · Update with Division Operators

- **type:** practical
- **do:** Assign `17` to each of three variables: `regular`, `whole`, and `remainder`. Update
  `regular` with `/= 5`, `whole` with `//= 5`, and `remainder` with `%= 5`. Print the
  three variables on separate lines in that order.
  **Use each required augmented operator exactly once.**
- **solution:**
  ```python
  regular = 17
  whole = 17
  remainder = 17
  regular /= 5
  whole //= 5
  remainder %= 5
  print(regular)
  print(whole)
  print(remainder)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `regular\s*/=\s*5`
  - `whole\s*//=\s*5`
  - `remainder\s*%=\s*5`
- **expect_exact_output:** |
  3.4
  3
  2
- **tutor:** Ask which augmented operator belongs with which variable, and why the three outputs
  differ.
- **pass_rule:** Run exits 0 and stdout is exactly those three lines.

### py-3.6-07 · Repair the Account Updates

- **type:** practical
- **practice_group:** true
- **do:** The account starts with `50`. A charge removes `20`, a refund
  adds `5`, and a matching bonus doubles the result. Each augmented
  assignment uses the wrong operator. **Repair all three while
  preserving their order.**
- **starter_code:**
  ```python
  balance = 50
  balance += 20
  balance -= 5
  balance /= 2
  print(f"Balance: {balance}")
  ```
- **solution:**
  ```python
  balance = 50
  balance -= 20
  balance += 5
  balance *= 2
  print(f"Balance: {balance}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `balance\s*-=\s*20`
  - `balance\s*\+=\s*5`
  - `balance\s*\*=\s*2`
- **expect_exact_output:** |
  Balance: 70
- **tutor:** A charge is `-=`, a refund is `+=`, and doubling is `*=` — match each to its description.
- **pass_rule:** Run exits 0 and stdout is exactly `Balance: 70`.

### py-3.6-08 · Restore the Three Division Updates

- **type:** practical
- **practice_group:** true
- **do:** `regular`, `whole`, and `remainder` should store the three
  different results of dividing `17` by `5`. Their augmented operators
  are assigned to the wrong variables. **Repair all three updates.**
- **starter_code:**
  ```python
  regular = 17
  whole = 17
  remainder = 17
  regular %= 5
  whole /= 5
  remainder //= 5
  print(regular)
  print(whole)
  print(remainder)
  ```
- **solution:**
  ```python
  regular = 17
  whole = 17
  remainder = 17
  regular /= 5
  whole //= 5
  remainder %= 5
  print(regular)
  print(whole)
  print(remainder)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `regular\s*/=\s*5`
  - `whole\s*//=\s*5`
  - `remainder\s*%=\s*5`
- **expect_exact_output:** |
  3.4
  3
  2
- **tutor:** `/=` is true division, `//=` is floor division, `%=` is the remainder — match each name to its operator.
- **pass_rule:** Run exits 0 and stdout matches exactly.

### py-3.6-09 · Initialize Before Updating

- **type:** practical
- **practice_group:** true
- **do:** An augmented assignment needs an existing value. The program
  tries to update `score` before its starting value is assigned, then
  applies the penalty as an increase. **Repair the order and the
  penalty operator.**
- **starter_code:**
  ```python
  score += 5
  score = 10
  score += 3
  print(f"Score: {score}")
  ```
- **solution:**
  ```python
  score = 10
  score += 5
  score -= 3
  print(f"Score: {score}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `score\s*=\s*10[\s\S]*score\s*\+=\s*5[\s\S]*score\s*-=\s*3`
- **expect_exact_output:** |
  Score: 12
- **tutor:** `score` must exist before any `+=`/`-=` touches it; a penalty should subtract.
- **pass_rule:** Run exits 0 and stdout is exactly `Score: 12`.

### py-3.6-10 · Repair the Input Score Tracker

- **type:** practical
- **practice_group:** true
- **do:** Input lines contain a starting score, bonus, penalty, and
  target as whole numbers. Update the score by adding the bonus and
  subtracting the penalty, then compare the final value with the
  target. The current code replaces the score with the bonus, adds the
  penalty, and compares the starting input instead of the updated
  score. **Repair all three problems using augmented assignment. Do not
  add prompts.**
- **starter_code:**
  ```python
  score = int(input())
  bonus = int(input())
  penalty = int(input())
  target = int(input())
  original = score
  score = bonus
  score += penalty
  reached_target = original >= target
  print(f"Final score: {score}")
  print(f"Reached target: {reached_target}")
  ```
- **solution:**
  ```python
  score = int(input())
  bonus = int(input())
  penalty = int(input())
  target = int(input())
  score += bonus
  score -= penalty
  reached_target = score >= target
  print(f"Final score: {score}")
  print(f"Reached target: {reached_target}")
  ```
- **evaluator:** hidden-tests
- **hidden_tests:**
  ```yaml
  - stdin: "10\n5\n3\n12"
    stdout: "Final score: 12\nReached target: True"
  - stdin: "20\n4\n9\n16"
    stdout: "Final score: 15\nReached target: False"
  - stdin: "0\n10\n2\n8"
    stdout: "Final score: 8\nReached target: True"
  ```
- **tutor:** `score += bonus` then `score -= penalty`, and compare the updated `score` against `target`.
- **pass_rule:** All hidden tests pass.

---

## Checkpoint — Topic 3  {#py-3.CP}

- **objective:** Translate a written specification into arithmetic, comparison, Boolean, and augmented-assignment
  expressions, without branching.
- **estimated_time:** 20–30 min
- **type:** checkpoint
- **brief:** Write a program that reads three whole numbers, works out a score using precedence
  and an augmented assignment, then reports three Boolean facts about that score — all
  without ever choosing which instruction runs.
- **requirements:**
  - Read three lines with `input()`: `base`, `bonus`, and `limit`, each as a nonnegative
    whole number.
  - Convert every input to `int` as it is read. Do not print input prompts.
  - Calculate `score` as `base ** 2 + bonus * 3`. Keep that mixed expression exactly; do
    not replace it with hardcoded intermediate results.
  - Increase `score` by `5` using `score += 5`.
  - Assign `score <= limit` to a variable named `within_limit`.
  - Assign `base > 0 and bonus > 0` to a variable named `both_positive`.
  - Assign `not within_limit or not both_positive` to a variable named `needs_review`.
  - Use f-strings to print exactly these four lines, in this order: `Score: <score>`,
    `Within limit: <within_limit>`, `Both positive: <both_positive>`,
    `Needs review: <needs_review>`.
  - Do not choose which instruction runs, use a conditional expression, or
    introduce any other branching.
  - Do not print extra text or blank lines. The program must run successfully.
- **solution:**
  ```python
  base = int(input())
  bonus = int(input())
  limit = int(input())
  score = base ** 2 + bonus * 3
  score += 5
  within_limit = score <= limit
  both_positive = base > 0 and bonus > 0
  needs_review = not within_limit or not both_positive
  print(f"Score: {score}")
  print(f"Within limit: {within_limit}")
  print(f"Both positive: {both_positive}")
  print(f"Needs review: {needs_review}")
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `base\s*\*\*\s*2\s*\+\s*bonus\s*\*\s*3`
  - `score\s*\+=\s*5`
  - `score\s*<=\s*limit`
  - `base\s*>\s*0\s+and\s+bonus\s*>\s*0`
  - `not\s+within_limit\s+or\s+not\s+both_positive`
- **forbid_code:**
  - `\bif\b`
  - `\belse\b`
- **hidden_tests:**
  ```yaml
  - stdin: "2\n3\n20"
    stdout: "Score: 18\nWithin limit: True\nBoth positive: True\nNeeds review: False"
  - stdin: "4\n0\n15"
    stdout: "Score: 21\nWithin limit: False\nBoth positive: False\nNeeds review: True"
  - stdin: "0\n0\n5"
    stdout: "Score: 5\nWithin limit: True\nBoth positive: False\nNeeds review: True"
  ```
- **tutor:** Walk the learner through each requirement bullet against their code, one at a time — do
  not reveal the exact expressions or operators.
- **pass_rule:** All hidden tests pass, exit code 0. Passing the checkpoint completes Topic 3 and unlocks Topic 4.
