---
topic_id: py-b4
course: python_beginner
section: foundations
topic_number: 4
title: Operators and Expressions
slug: operators-expressions
lessons: [py-b4.1, py-b4.2, py-b4.3, py-b4.4, py-b4.5, py-b4.6]
checkpoint_id: py-b4.CP
live_coding_exception: false
format_version: 1
---

# Topic 4 - Operators and Expressions

Teach learners to calculate numeric results, control evaluation order,
divide whole quantities, update variables, compare values, and combine
Boolean values.

**Topic boundaries.** Numeric input is documented as valid before
conversion. Floor division and modulus use nonnegative integers and positive
divisors. Comparisons use numeric values; chained comparisons are deferred.
Boolean operators combine stored Boolean values without conditionals. No
collections, loops, string methods, f-strings, or user-defined functions.
Every lesson contains six items and ends with a contextual coding problem.
Every item contains a reading of at least four complete sentences.

## Lesson 4.1 - Arithmetic Operators  {#py-b4.1}

- **objective:** Choose and use `+`, `-`, `*`, and `/` to calculate
  numeric results, including results from converted input.
- **estimated_time:** 20-25 min
- **item_count:** 6
- **live_coding_items:** 4

### py-b4.1-01 · Choosing an Arithmetic Operator

- **type:** concept
- **read:** Arithmetic operators tell Python which calculation to perform.
  The plus sign adds, the minus sign subtracts, the asterisk multiplies, and
  the slash divides. An expression combines values with an operator to
  produce a result. Choosing the operator that matches the intended
  calculation is the first step.
- **check:** Which expression calculates the price of 4 tickets that each
  cost 6 dollars?
  - A. `4 + 6`
  - B. `4 - 6`
  - C. `4 * 6`
  - D. `4 / 6`
- **answer:** C
- **rationale:** Multiplication finds the total for equal groups.
- **if_incorrect:** The number of tickets and the price per ticket form
  equal groups, so multiply.
- **concepts_introduced:** arithmetic-operators, expression
- **pass_rule:** Learner selects C.

### py-b4.1-02 · Calculate a Total

- **type:** practical
- **do:** Python can store the result of an arithmetic expression in a
  variable. The expression on the right is evaluated before assignment
  occurs. Multiplication uses an asterisk rather than the letter x.
  Printing the variable reveals the calculated result. **Store `7 * 8` in a
  variable named `total` and display `total`.**
- **starter_code:**
  ```python
  # Store 7 * 8 in total, then display it.
  ```
- **solution:**
  ```python
  total = 7 * 8
  print(total)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `total\s*=\s*7\s*\*\s*8\b`
  - `print\s*\(\s*total\s*\)`
- **expect_exact_output:** |
  56
- **if_incorrect:** Place the multiplication expression to the right of
  `total =` and print `total`.
- **concepts_required:** arithmetic-operators, variable
- **pass_rule:** Run exits 0, `total` is calculated with multiplication,
  and stdout is exactly `56`.

### py-b4.1-03 · Word Problem: Budget Remaining

- **type:** practical
- **do:** A remaining amount is found by subtracting spending from a
  starting amount. Input arrives as text, so numeric text must be converted
  before arithmetic. The first entered number represents the budget and the
  second represents the amount spent. Storing both values makes the
  calculation easy to read. **A learner enters a budget and an amount
  already spent. Display `Remaining:` followed by the remaining amount
  after converting both entries to integers.**
- **starter_code:**
  ```python
  # Receive the budget and the amount spent, then display what remains.
  ```
- **solution:**
  ```python
  budget = int(input())
  spent = int(input())
  remaining = budget - spent
  print("Remaining:", remaining)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\bint\s*\(\s*input\s*\(\s*\)\s*\)[\s\S]*\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `[\w)]\s*-\s*[\w(]`
- **hidden_tests:**
  ```yaml
  - stdin: "50\n18"
    stdout: "Remaining: 32"
  - stdin: "100\n45"
    stdout: "Remaining: 55"
  - stdin: "20\n20"
    stdout: "Remaining: 0"
  ```
- **if_incorrect:** Convert each input first, then subtract the amount
  spent from the budget.
- **concepts_required:** arithmetic-operators, input-function, int-conversion
- **pass_rule:** Run exits 0 and stdout matches for every supplied budget.

### py-b4.1-04 · Division Produces a Float

- **type:** concept
- **read:** The slash operator performs regular division in Python. Its
  result is a float, even when the mathematical answer is a whole number.
  For example, `8 / 2` produces `4.0` rather than `4`. The decimal form
  signals the result's float type.
- **check:** What does `print(9 / 3)` display?
  - A. `3`
  - B. `3.0`
  - C. `6`
  - D. `27`
- **answer:** B
- **rationale:** Regular division with `/` produces a float result.
- **if_incorrect:** Remember that the slash operator returns a
  decimal-form float.
- **concepts_introduced:** float-division
- **concepts_required:** arithmetic-operators
- **pass_rule:** Learner selects B.

### py-b4.1-05 · Four Calculations

- **type:** practical
- **do:** The same two numbers can support several different calculations.
  Each result can be stored under a name that describes it. Python
  evaluates each expression independently when its assignment runs.
  Printing the results on separate lines makes their differences clear.
  **Set `a` to `12` and `b` to `4`. Display `a + b`, `a - b`, `a * b`, and
  `a / b` on separate lines in that order.**
- **starter_code:**
  ```python
  # Set a and b, then display the four calculations in order.
  ```
- **solution:**
  ```python
  a = 12
  b = 4
  print(a + b)
  print(a - b)
  print(a * b)
  print(a / b)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `\ba\s*=\s*12\b`
  - `\bb\s*=\s*4\b`
  - `\ba\s*\+\s*b\b`
  - `\ba\s*-\s*b\b`
  - `\ba\s*\*\s*b\b`
  - `\ba\s*/\s*b\b`
- **expect_exact_output:** |
  16
  8
  48
  3.0
- **if_incorrect:** Use one `print()` call for each expression and
  preserve the requested order.
- **concepts_required:** arithmetic-operators, float-division, variable
- **pass_rule:** Run exits 0, the four operators are used on `a` and `b`,
  and stdout matches all four lines.

### py-b4.1-06 · Word Problem: Shared Snack Cost

- **type:** practical
- **do:** A shared cost can be found with regular division. The total cost
  and number of people must be numeric before Python can divide them. Float
  conversion allows a total containing a decimal point. The slash operator
  then gives the cost per person as a float. **Receive a total snack cost as
  a float and a number of people as an integer. Display `Each:` followed by
  the cost per person.**
- **starter_code:**
  ```python
  # Receive the total cost and the number of people, then display each share.
  ```
- **solution:**
  ```python
  cost = float(input())
  people = int(input())
  each = cost / people
  print("Each:", each)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `float\s*\(\s*input\s*\(\s*\)\s*\)`
  - `\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `[\w)]\s*/\s*[\w(]`
- **forbid_code:**
  - `//`
- **hidden_tests:**
  ```yaml
  - stdin: "18.0\n4"
    stdout: "Each: 4.5"
  - stdin: "20.0\n8"
    stdout: "Each: 2.5"
  - stdin: "9.0\n3"
    stdout: "Each: 3.0"
  ```
- **if_incorrect:** Divide the converted cost by the converted number of
  people.
- **concepts_required:** float-division, input-function, int-conversion, float-conversion
- **pass_rule:** Run exits 0 and stdout matches for every supplied cost.

## Lesson 4.2 - Precedence and Parentheses  {#py-b4.2}

- **objective:** Predict the order Python evaluates operators in, and use
  parentheses to choose a different grouping.
- **estimated_time:** 20-25 min
- **item_count:** 6
- **live_coding_items:** 4

### py-b4.2-01 · Multiplication Before Addition

- **type:** concept
- **read:** An expression can contain more than one operator. Python
  follows precedence rules instead of simply calculating everything from
  left to right. Multiplication and division happen before addition and
  subtraction. Therefore `2 + 3 * 4` is evaluated as `2 + 12`.
- **check:** What is the result of `2 + 3 * 4`?
  - A. `14`
  - B. `20`
  - C. `24`
  - D. `9`
- **answer:** A
- **rationale:** Python multiplies 3 by 4 before adding 2.
- **if_incorrect:** Evaluate multiplication before addition when no
  parentheses change the order.
- **concepts_introduced:** precedence
- **concepts_required:** arithmetic-operators
- **pass_rule:** Learner selects A.

### py-b4.2-02 · Group the Addition

- **type:** practical
- **do:** Parentheses make a grouped part of an expression run first. They
  can change a result by overriding normal operator precedence. In
  `(2 + 3) * 4`, addition runs before multiplication. Parentheses also make
  the intended calculation easier for a reader to recognize. **Store the
  result of `(2 + 3) * 4` in `grouped` and display it.**
- **starter_code:**
  ```python
  # Store (2 + 3) * 4 in grouped, then display it.
  ```
- **solution:**
  ```python
  grouped = (2 + 3) * 4
  print(grouped)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `grouped\s*=\s*\(\s*2\s*\+\s*3\s*\)\s*\*\s*4\b`
  - `print\s*\(\s*grouped\s*\)`
- **expect_exact_output:** |
  20
- **if_incorrect:** Place parentheses around the addition before
  multiplying by 4.
- **concepts_introduced:** parentheses
- **concepts_required:** precedence
- **pass_rule:** Run exits 0, parentheses group `2 + 3`, and stdout is
  exactly `20`.

### py-b4.2-03 · Word Problem: Catering Total

- **type:** practical
- **do:** A catering order may include a fixed fee plus repeated item
  costs. The repeated cost is calculated with multiplication before it is
  added to the fee. Parentheses are optional for that order, but they can
  make the grouping explicit. Input values must be converted to integers
  before the calculation. **Receive a fixed fee, a meal price, and a meal
  count, in that order. Display `Total:` followed by the total cost.**
- **starter_code:**
  ```python
  # Receive the fee, meal price, and meal count, then display the total.
  ```
- **solution:**
  ```python
  fee = int(input())
  meal_price = int(input())
  meal_count = int(input())
  total = fee + meal_price * meal_count
  print("Total:", total)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\bint\s*\(\s*input\s*\(\s*\)\s*\)[\s\S]*\bint\s*\(\s*input\s*\(\s*\)\s*\)[\s\S]*\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `[\w)]\s*\*\s*[\w(]`
  - `\+`
- **hidden_tests:**
  ```yaml
  - stdin: "10\n7\n5"
    stdout: "Total: 45"
  - stdin: "0\n12\n3"
    stdout: "Total: 36"
  - stdin: "25\n9\n4"
    stdout: "Total: 61"
  ```
- **if_incorrect:** Multiply the meal price by the meal count, then add the
  fee.
- **concepts_required:** precedence, arithmetic-operators, int-conversion
- **pass_rule:** Run exits 0 and stdout matches for every supplied order.

### py-b4.2-04 · Same-Level Operators

- **type:** concept
- **read:** Addition and subtraction have the same precedence level. When
  same-level operators appear together, Python evaluates them from left to
  right. Thus `10 - 3 + 2` first becomes `7 + 2`. Parentheses can be added
  when a different grouping is intended.
- **check:** What is the result of `10 - 3 + 2`?
  - A. `5`
  - B. `9`
  - C. `11`
  - D. `15`
- **answer:** B
- **rationale:** Subtraction and addition are evaluated from left to right.
- **if_incorrect:** Calculate `10 - 3` first, then add 2.
- **concepts_introduced:** left-to-right
- **concepts_required:** precedence
- **pass_rule:** Learner selects B.

### py-b4.2-05 · Compare Two Groupings

- **type:** practical
- **do:** Moving parentheses can change which operation happens first. The
  expressions `20 - 5 * 2` and `(20 - 5) * 2` use the same numbers and
  operators. The first uses normal precedence, while the second forces
  subtraction first. Displaying both results shows why grouping matters.
  **Display `20 - 5 * 2` and `(20 - 5) * 2` on separate lines in that
  order.**
- **starter_code:**
  ```python
  # Display both expressions, one per line.
  ```
- **solution:**
  ```python
  print(20 - 5 * 2)
  print((20 - 5) * 2)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `print\s*\(\s*20\s*-\s*5\s*\*\s*2\s*\)`
  - `print\s*\(\s*\(\s*20\s*-\s*5\s*\)\s*\*\s*2\s*\)`
- **expect_exact_output:** |
  10
  30
- **if_incorrect:** Only the second expression should group `20 - 5` in
  parentheses.
- **concepts_required:** precedence, parentheses
- **pass_rule:** Run exits 0, both expressions use the required grouping,
  and stdout is `10` then `30`.

### py-b4.2-06 · Word Problem: Boxes of Pencils

- **type:** practical
- **do:** A shipment can have several boxes with pencils already inside
  each one. Extra pencils can be added after the boxed pencils are counted.
  Multiplication finds the boxed amount before addition includes the
  extras. Parentheses may be used to show the multiplication clearly
  without changing its precedence. **Receive the number of boxes, pencils
  per box, and extra pencils, in that order. Display `Pencils:` followed by
  the overall pencil count.**
- **starter_code:**
  ```python
  # Receive boxes, pencils per box, and extras, then display the count.
  ```
- **solution:**
  ```python
  boxes = int(input())
  per_box = int(input())
  extras = int(input())
  pencils = (boxes * per_box) + extras
  print("Pencils:", pencils)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\bint\s*\(\s*input\s*\(\s*\)\s*\)[\s\S]*\bint\s*\(\s*input\s*\(\s*\)\s*\)[\s\S]*\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `[\w)]\s*\*\s*[\w(]`
  - `\+`
- **hidden_tests:**
  ```yaml
  - stdin: "6\n8\n3"
    stdout: "Pencils: 51"
  - stdin: "2\n12\n0"
    stdout: "Pencils: 24"
  - stdin: "10\n5\n7"
    stdout: "Pencils: 57"
  ```
- **if_incorrect:** Multiply the boxes by the pencils per box, then add the
  extras.
- **concepts_required:** precedence, parentheses, int-conversion
- **pass_rule:** Run exits 0 and stdout matches for every supplied
  shipment.

## Lesson 4.3 - Floor Division and Modulus  {#py-b4.3}

- **objective:** Use `//` to count complete equal groups and `%` to find
  what remains.
- **estimated_time:** 20-25 min
- **item_count:** 6
- **live_coding_items:** 4

### py-b4.3-01 · Complete Groups and Remainders

- **type:** concept
- **read:** Floor division uses `//` to count complete equal groups.
  Modulus uses `%` to find what remains after those groups are formed. With
  nonnegative integers, `17 // 5` is `3` and `17 % 5` is `2`. The two
  operators answer related but different questions.
- **check:** Which expression finds the items left after making groups of 5
  from 17 items?
  - A. `17 / 5`
  - B. `17 // 5`
  - C. `17 % 5`
  - D. `17 * 5`
- **answer:** C
- **rationale:** Modulus returns the remainder after division.
- **if_incorrect:** Use `%` when the question asks what is left over.
- **concepts_introduced:** floor-division, modulus
- **concepts_required:** arithmetic-operators
- **pass_rule:** Learner selects C.

### py-b4.3-02 · Convert Minutes

- **type:** practical
- **do:** A number of minutes can be separated into whole hours and
  leftover minutes. Floor division by 60 finds the complete hours. Modulus
  by 60 finds the minutes that do not complete another hour. Both results
  are integers when the starting value is an integer. **Set
  `total_minutes` to `135`. Display the complete hours and the remaining
  minutes on separate lines.**
- **starter_code:**
  ```python
  # Set total_minutes, then display complete hours and leftover minutes.
  ```
- **solution:**
  ```python
  total_minutes = 135
  hours = total_minutes // 60
  minutes = total_minutes % 60
  print(hours)
  print(minutes)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `total_minutes\s*=\s*135\b`
  - `total_minutes\s*//\s*60\b`
  - `total_minutes\s*%\s*60\b`
- **expect_exact_output:** |
  2
  15
- **if_incorrect:** Use 60 as the divisor for both operations.
- **concepts_required:** floor-division, modulus
- **pass_rule:** Run exits 0, `//` and `%` both use 60, and stdout is `2`
  then `15`.

### py-b4.3-03 · Word Problem: Pack Art Kits

- **type:** practical
- **do:** Packing items into equal kits creates complete kits and possibly
  leftovers. Floor division finds how many full kits can be made. Modulus
  finds the supplies that remain unpacked. The divisor must be the positive
  number of supplies used by each kit. **Receive a supply count and a
  supplies-per-kit count, in that order. Display `Kits:` with the number of
  full kits, then `Left:` with the leftover supplies, on separate lines.**
- **starter_code:**
  ```python
  # Receive the supplies and the supplies per kit, then display both results.
  ```
- **solution:**
  ```python
  supplies = int(input())
  per_kit = int(input())
  kits = supplies // per_kit
  left = supplies % per_kit
  print("Kits:", kits)
  print("Left:", left)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\bint\s*\(\s*input\s*\(\s*\)\s*\)[\s\S]*\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `//\s*[\w(]`
  - `%\s*[\w(]`
- **hidden_tests:**
  ```yaml
  - stdin: "29\n6"
    stdout: "Kits: 4\nLeft: 5"
  - stdin: "30\n5"
    stdout: "Kits: 6\nLeft: 0"
  - stdin: "4\n7"
    stdout: "Kits: 0\nLeft: 4"
  ```
- **if_incorrect:** Use floor division for full kits and modulus for
  leftovers, both divided by the supplies per kit.
- **concepts_required:** floor-division, modulus, int-conversion
- **pass_rule:** Run exits 0 and stdout matches for every supplied count.

### py-b4.3-04 · Rebuilding the Original Total

- **type:** concept
- **read:** The quotient and remainder describe the original nonnegative
  total together. Multiplying the complete groups by the group size
  rebuilds the grouped portion. Adding the remainder then rebuilds the
  entire total. For 23 divided into groups of 4, the relationship is
  `5 * 4 + 3 = 23`.
- **check:** If `22 // 6` is `3` and `22 % 6` is `4`, which expression
  rebuilds 22?
  - A. `3 + 6 + 4`
  - B. `3 * 6 + 4`
  - C. `3 * 4 + 6`
  - D. `6 - 3 + 4`
- **answer:** B
- **rationale:** Complete groups times group size, plus the remainder,
  restores the total.
- **if_incorrect:** Multiply the group count by the group size before
  adding the remainder.
- **concepts_required:** floor-division, modulus, precedence
- **pass_rule:** Learner selects B.

### py-b4.3-05 · Days and Hours

- **type:** practical
- **do:** Elapsed hours can be separated into complete days and leftover
  hours. Each day contains 24 hours, so 24 is the divisor. Floor division
  counts complete days, and modulus finds hours beyond those days. Labels
  make the two results easy to distinguish. **Receive a nonnegative integer
  number of hours. Display `Days:` with the complete days, then `Hours:`
  with the remaining hours, on separate lines.**
- **starter_code:**
  ```python
  # Receive the total hours, then display complete days and leftover hours.
  ```
- **solution:**
  ```python
  total_hours = int(input())
  days = total_hours // 24
  hours = total_hours % 24
  print("Days:", days)
  print("Hours:", hours)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `//\s*24\b`
  - `%\s*24\b`
- **hidden_tests:**
  ```yaml
  - stdin: "53"
    stdout: "Days: 2\nHours: 5"
  - stdin: "24"
    stdout: "Days: 1\nHours: 0"
  - stdin: "7"
    stdout: "Days: 0\nHours: 7"
  ```
- **if_incorrect:** Use `// 24` for the days and `% 24` for the hours.
- **concepts_required:** floor-division, modulus, int-conversion
- **pass_rule:** Run exits 0 and stdout matches for every supplied number
  of hours.

### py-b4.3-06 · Word Problem: Fill Shipping Crates

- **type:** practical
- **do:** A warehouse fills crates with the same positive number of
  packages. Only a completely filled crate counts as full. Packages that
  cannot fill another crate remain loose. Floor division and modulus
  provide those two results from the same inputs. **Receive a package count
  and a crate capacity, in that order. Display `Full crates:` and `Loose
  packages:` with their values on separate lines.**
- **starter_code:**
  ```python
  # Receive the packages and the crate capacity, then display both results.
  ```
- **solution:**
  ```python
  packages = int(input())
  capacity = int(input())
  full_crates = packages // capacity
  loose_packages = packages % capacity
  print("Full crates:", full_crates)
  print("Loose packages:", loose_packages)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\bint\s*\(\s*input\s*\(\s*\)\s*\)[\s\S]*\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `//\s*[\w(]`
  - `%\s*[\w(]`
- **hidden_tests:**
  ```yaml
  - stdin: "74\n12"
    stdout: "Full crates: 6\nLoose packages: 2"
  - stdin: "60\n10"
    stdout: "Full crates: 6\nLoose packages: 0"
  - stdin: "5\n8"
    stdout: "Full crates: 0\nLoose packages: 5"
  ```
- **if_incorrect:** Divide the packages by the capacity with `//` and `%`
  for the two requested values.
- **concepts_required:** floor-division, modulus, int-conversion
- **pass_rule:** Run exits 0 and stdout matches for every supplied
  shipment.

## Lesson 4.4 - Exponents and Assignment Operators  {#py-b4.4}

- **objective:** Raise values to a power with `**` and update a variable
  with `+=`, `-=`, `*=`, and `/=`.
- **estimated_time:** 20-25 min
- **item_count:** 6
- **live_coding_items:** 4

### py-b4.4-01 · Powers Before Multiplication

- **type:** concept
- **read:** Python uses `**` to raise a value to a power. Exponentiation has
  higher precedence than multiplication, addition, and subtraction. In
  `3 * 2 ** 2`, Python calculates `2 ** 2` before multiplying by 3.
  Parentheses can make the intended grouping explicit when several
  operators appear.
- **check:** What is the result of `3 * 2 ** 2`?
  - A. `12`
  - B. `36`
  - C. `64`
  - D. `10`
- **answer:** A
- **rationale:** Python calculates the power first, then multiplies 3 by 4.
- **if_incorrect:** Evaluate `**` before `*` unless parentheses specify
  another grouping.
- **concepts_introduced:** exponent
- **concepts_required:** precedence
- **pass_rule:** Learner selects A.

### py-b4.4-02 · Update a Score

- **type:** practical
- **do:** An assignment operator can update a variable using its current
  value. The statement `score += 5` means `score = score + 5`. Similarly,
  `score *= 2` multiplies the current score and stores the result back in
  `score`. Each update uses the value produced by the preceding statement.
  **Set `score` to `10`, add 5 with `+=`, multiply it by 2 with `*=`, and
  display `score`.**
- **starter_code:**
  ```python
  # Set score, update it twice, then display it.
  ```
- **solution:**
  ```python
  score = 10
  score += 5
  score *= 2
  print(score)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `score\s*=\s*10\b`
  - `score\s*\+=\s*5\b[\s\S]*score\s*\*=\s*2\b`
  - `print\s*\(\s*score\s*\)`
- **expect_exact_output:** |
  30
- **if_incorrect:** Update `score` one statement at a time before printing
  it.
- **concepts_introduced:** assignment-operators
- **concepts_required:** variable, arithmetic-operators
- **pass_rule:** Run exits 0, the updates use `+=` then `*=`, and stdout is
  exactly `30`.

### py-b4.4-03 · Word Problem: Square Garden Area

- **type:** practical
- **do:** The area of a square is its side length raised to the second
  power. Python writes this calculation with `** 2`. Converting the entered
  side length to an integer makes it available for numeric calculation. The
  result can then be stored and displayed with a label. **Receive an
  integer side length and display `Area:` followed by the square's area.**
- **starter_code:**
  ```python
  # Receive the side length, then display the area.
  ```
- **solution:**
  ```python
  side = int(input())
  area = side ** 2
  print("Area:", area)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `\*\*\s*2\b`
- **hidden_tests:**
  ```yaml
  - stdin: "9"
    stdout: "Area: 81"
  - stdin: "12"
    stdout: "Area: 144"
  - stdin: "1"
    stdout: "Area: 1"
  ```
- **if_incorrect:** Raise the side length to the power 2 with two
  asterisks.
- **concepts_required:** exponent, int-conversion
- **pass_rule:** Run exits 0 and stdout matches for every supplied side
  length.

### py-b4.4-04 · Matching Update Operators

- **type:** concept
- **read:** Several assignment operators provide short forms for common
  updates. The `+=` operator adds, `-=` subtracts, `*=` multiplies, and `/=`
  divides before reassigning. The variable must already hold a compatible
  value before an update occurs. The chosen symbol should match the change
  described by the program.
- **check:** Which statement subtracts 3 from the current value of
  `balance`?
  - A. `balance += 3`
  - B. `balance -= 3`
  - C. `balance *= 3`
  - D. `balance /= 3`
- **answer:** B
- **rationale:** `-=` subtracts the right-hand value and stores the new
  result.
- **if_incorrect:** Match the minus sign in the requested change to the
  `-=` operator.
- **concepts_required:** assignment-operators
- **pass_rule:** Learner selects B.

### py-b4.4-05 · Apply Several Updates

- **type:** practical
- **do:** Update statements run from top to bottom. A later update receives
  the result stored by the earlier update. Subtraction with `-=` and
  division with `/=` can be used just like addition and multiplication
  updates. Regular division changes the stored result to a float. **Set
  `value` to `20`, subtract 4 with `-=`, divide by 2 with `/=`, and display
  `value`.**
- **starter_code:**
  ```python
  # Set value, update it twice, then display it.
  ```
- **solution:**
  ```python
  value = 20
  value -= 4
  value /= 2
  print(value)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `value\s*=\s*20\b`
  - `value\s*-=\s*4\b[\s\S]*value\s*/=\s*2\b`
  - `print\s*\(\s*value\s*\)`
- **expect_exact_output:** |
  8.0
- **if_incorrect:** Subtract first and then divide the updated value.
- **concepts_required:** assignment-operators, float-division
- **pass_rule:** Run exits 0, the updates use `-=` then `/=`, and stdout is
  exactly `8.0`.

### py-b4.4-06 · Word Problem: Growing Tile Pattern

- **type:** practical
- **do:** A square tile pattern has the same number of tiles along each
  side. Its total tile count is the side length raised to the second power.
  An added border count can then update that total with `+=`. Keeping the
  power calculation and update separate makes both stages visible.
  **Receive an integer side length and an integer number of border tiles,
  in that order. Calculate `side ** 2`, add the border tiles with `+=`, and
  display `Tiles:` followed by the final total.**
- **starter_code:**
  ```python
  # Receive the side length and border tiles, then display the total.
  ```
- **solution:**
  ```python
  side = int(input())
  border = int(input())
  tiles = side ** 2
  tiles += border
  print("Tiles:", tiles)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\bint\s*\(\s*input\s*\(\s*\)\s*\)[\s\S]*\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `\*\*\s*2\b`
  - `\+=`
- **hidden_tests:**
  ```yaml
  - stdin: "5\n6"
    stdout: "Tiles: 31"
  - stdin: "3\n0"
    stdout: "Tiles: 9"
  - stdin: "10\n4"
    stdout: "Tiles: 104"
  ```
- **if_incorrect:** Calculate the square first, then add the border tiles
  with `+=`.
- **concepts_required:** exponent, assignment-operators, int-conversion
- **pass_rule:** Run exits 0 and stdout matches for every supplied pattern.

## Lesson 4.5 - Comparison Operators  {#py-b4.5}

- **objective:** Compare numeric values with `==`, `!=`, `>`, `<`, `>=`,
  and `<=`, and display the Boolean results.
- **estimated_time:** 20-25 min
- **item_count:** 6
- **live_coding_items:** 4

### py-b4.5-01 · Assignment and Equality

- **type:** concept
- **read:** A single equals sign assigns a value to a variable. Two equals
  signs compare two values for equality. A comparison produces either
  `True` or `False` rather than changing a variable. Keeping `=` and `==`
  distinct prevents two different operations from being confused.
- **check:** Which expression checks whether `score` equals 10?
  - A. `score = 10`
  - B. `score == 10`
  - C. `score >= 10`
  - D. `score != 10`
- **answer:** B
- **rationale:** `==` compares for equality, while `=` performs assignment.
- **if_incorrect:** Use two equals signs when asking whether values are
  equal.
- **concepts_introduced:** comparison-operators
- **concepts_required:** variable, bool-type
- **pass_rule:** Learner selects B.

### py-b4.5-02 · Display Comparisons

- **type:** practical
- **do:** Comparison operators describe relationships between values. The
  symbols `>` and `<` test greater than and less than, while `==` and `!=`
  test equality and inequality. Python displays comparison results as
  `True` or `False`. The compared values are not changed by these
  expressions. **Set `a` to `8` and `b` to `5`. Display `a > b`, `a == b`,
  and `a != b` on separate lines.**
- **starter_code:**
  ```python
  # Set a and b, then display the three comparisons in order.
  ```
- **solution:**
  ```python
  a = 8
  b = 5
  print(a > b)
  print(a == b)
  print(a != b)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `\ba\s*=\s*8\b`
  - `\bb\s*=\s*5\b`
  - `print\s*\(\s*a\s*>\s*b\s*\)`
  - `print\s*\(\s*a\s*==\s*b\s*\)`
  - `print\s*\(\s*a\s*!=\s*b\s*\)`
- **expect_exact_output:** |
  True
  False
  True
- **if_incorrect:** Print each comparison directly and preserve the
  requested order.
- **concepts_required:** comparison-operators
- **pass_rule:** Run exits 0, the three comparisons are printed in order,
  and stdout matches all three lines.

### py-b4.5-03 · Word Problem: Check Room Capacity

- **type:** practical
- **do:** A capacity limit can be checked with a comparison. The `<=`
  operator means less than or equal to, so it includes the exact limit.
  Both entered values must be converted to numbers before comparing them.
  The resulting Boolean can be stored and displayed without using a
  conditional statement. **Receive the number of attendees and the room
  capacity, in that order. Display `Within capacity:` followed by whether
  the attendee count is within capacity.**
- **starter_code:**
  ```python
  # Receive attendees and capacity, then display the comparison result.
  ```
- **solution:**
  ```python
  attendees = int(input())
  capacity = int(input())
  within_capacity = attendees <= capacity
  print("Within capacity:", within_capacity)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\bint\s*\(\s*input\s*\(\s*\)\s*\)[\s\S]*\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `<=`
- **forbid_code:**
  - `^\s*if\b`
- **hidden_tests:**
  ```yaml
  - stdin: "24\n30"
    stdout: "Within capacity: True"
  - stdin: "30\n30"
    stdout: "Within capacity: True"
  - stdin: "35\n30"
    stdout: "Within capacity: False"
  ```
- **if_incorrect:** Compare the attendees to the capacity with `<=` and
  print the Boolean result.
- **concepts_required:** comparison-operators, int-conversion
- **pass_rule:** Run exits 0 and stdout matches for every supplied room.

### py-b4.5-04 · Inclusive Boundaries

- **type:** concept
- **read:** The operators `>=` and `<=` include equality at their
  boundaries. A value of 10 satisfies both `10 >= 10` and `10 <= 10`. By
  contrast, `>` and `<` exclude an equal value. The wording "at least"
  usually matches `>=`, while "at most" usually matches `<=`.
- **check:** Which expression checks whether `points` are at least 50?
  - A. `points > 50`
  - B. `points >= 50`
  - C. `points < 50`
  - D. `points == 50`
- **answer:** B
- **rationale:** At least includes 50 and every value above it.
- **if_incorrect:** Choose the greater-than symbol with an equals sign to
  include the boundary.
- **concepts_introduced:** inclusive-boundaries
- **concepts_required:** comparison-operators
- **pass_rule:** Learner selects B.

### py-b4.5-05 · Compare Two Entries

- **type:** practical
- **do:** Two entered numbers can be compared after conversion. A
  greater-than comparison answers whether the first number exceeds the
  second. An equality comparison answers whether both numbers have the same
  value. Each expression independently produces a Boolean result.
  **Receive two integers. Display `Greater:` with whether the first is
  greater than the second, then `Equal:` with whether they are equal, on
  separate lines.**
- **starter_code:**
  ```python
  # Receive two integers, then display both comparisons.
  ```
- **solution:**
  ```python
  first = int(input())
  second = int(input())
  print("Greater:", first > second)
  print("Equal:", first == second)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\bint\s*\(\s*input\s*\(\s*\)\s*\)[\s\S]*\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `[\w)]\s*>\s*[\w(]`
  - `[\w)]\s*==\s*[\w(]`
- **forbid_code:**
  - `^\s*if\b`
- **hidden_tests:**
  ```yaml
  - stdin: "12\n7"
    stdout: "Greater: True\nEqual: False"
  - stdin: "5\n5"
    stdout: "Greater: False\nEqual: True"
  - stdin: "3\n9"
    stdout: "Greater: False\nEqual: False"
  ```
- **if_incorrect:** Compare the first number to the second directly in each
  `print()` call.
- **concepts_required:** comparison-operators, int-conversion
- **pass_rule:** Run exits 0 and stdout matches for every supplied pair.

### py-b4.5-06 · Word Problem: Reach a Reading Target

- **type:** practical
- **do:** A reading target is reached when the completed pages equal or
  exceed the goal. The phrase "equal or exceed" maps to the `>=` operator.
  Numeric text must be converted before the comparison. Printing the stored
  Boolean reports the result without deciding between different output
  paths. **Receive completed pages and target pages as integers, in that
  order. Display `Target reached:` followed by whether the target has been
  reached.**
- **starter_code:**
  ```python
  # Receive completed and target pages, then display the result.
  ```
- **solution:**
  ```python
  completed = int(input())
  target = int(input())
  target_reached = completed >= target
  print("Target reached:", target_reached)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\bint\s*\(\s*input\s*\(\s*\)\s*\)[\s\S]*\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `>=`
- **forbid_code:**
  - `^\s*if\b`
- **hidden_tests:**
  ```yaml
  - stdin: "42\n40"
    stdout: "Target reached: True"
  - stdin: "40\n40"
    stdout: "Target reached: True"
  - stdin: "12\n40"
    stdout: "Target reached: False"
  ```
- **if_incorrect:** Compare the completed pages to the target with `>=`.
- **concepts_required:** comparison-operators, inclusive-boundaries, int-conversion
- **pass_rule:** Run exits 0 and stdout matches for every supplied target.

## Lesson 4.6 - Boolean Operators  {#py-b4.6}

- **objective:** Combine and reverse Boolean values with `and`, `or`, and
  `not`, without conditional statements.
- **estimated_time:** 20-25 min
- **item_count:** 6
- **live_coding_items:** 4

### py-b4.6-01 · Combining Boolean Values

- **type:** concept
- **read:** Boolean operators combine or reverse `True` and `False` values.
  The `and` operator produces `True` only when both sides are `True`. The
  `or` operator produces `True` when at least one side is `True`. The `not`
  operator reverses a single Boolean value.
- **check:** What is the result of `True and False`?
  - A. `True`
  - B. `False`
  - C. `1`
  - D. `0`
- **answer:** B
- **rationale:** `and` requires both Boolean values to be `True`.
- **if_incorrect:** Check both sides; one `False` value makes an `and`
  expression `False`.
- **concepts_introduced:** boolean-operators
- **concepts_required:** bool-type
- **pass_rule:** Learner selects B.

### py-b4.6-02 · Combine Stored Booleans

- **type:** practical
- **do:** Boolean values can be stored in variables like numbers and text.
  Using `and` with two Boolean variables checks whether both are `True`.
  Using `or` checks whether at least one is `True`. Applying `not` to a
  variable reverses its stored truth value for that expression without
  changing the variable itself. **Set `has_ticket` to `True` and `has_pass`
  to `False`. Display `has_ticket and has_pass`, `has_ticket or has_pass`,
  and `not has_pass` on separate lines.**
- **starter_code:**
  ```python
  # Set the two Booleans, then display the three combinations in order.
  ```
- **solution:**
  ```python
  has_ticket = True
  has_pass = False
  print(has_ticket and has_pass)
  print(has_ticket or has_pass)
  print(not has_pass)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `has_ticket\s*=\s*True\b`
  - `has_pass\s*=\s*False\b`
  - `print\s*\(\s*has_ticket\s+and\s+has_pass\s*\)`
  - `print\s*\(\s*has_ticket\s+or\s+has_pass\s*\)`
  - `print\s*\(\s*not\s+has_pass\s*\)`
- **expect_exact_output:** |
  False
  True
  True
- **if_incorrect:** Evaluate `and`, `or`, and `not` in the requested order.
- **concepts_required:** boolean-operators, variable
- **pass_rule:** Run exits 0, the stored Booleans are combined with the
  three operators, and stdout matches all three lines.

### py-b4.6-03 · Word Problem: Equipment Checkout

- **type:** practical
- **do:** Two comparisons can produce Boolean values for a larger check. A
  checkout may require enough available items and an active account at the
  same time. The `and` operator combines these requirements because both
  must be `True`. Parentheses around each comparison make the two parts
  easy to see. **Receive the available items and the requested items as
  integers, then an account-active entry that is either `True` or an empty
  line; convert it with `bool()`. Display `Checkout allowed:` followed by
  whether enough items are available and the account is active.**
- **starter_code:**
  ```python
  # Receive available, requested, and account-active, then display the result.
  ```
- **solution:**
  ```python
  available = int(input())
  requested = int(input())
  account_active = bool(input())
  allowed = (available >= requested) and account_active
  print("Checkout allowed:", allowed)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\bint\s*\(\s*input\s*\(\s*\)\s*\)[\s\S]*\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `bool\s*\(\s*input\s*\(\s*\)\s*\)`
  - `>=`
  - `\band\b`
- **forbid_code:**
  - `^\s*if\b`
- **hidden_tests:**
  ```yaml
  - stdin: "7\n5\nTrue"
    stdout: "Checkout allowed: True"
  - stdin: "3\n5\nTrue"
    stdout: "Checkout allowed: False"
  - stdin: "9\n2\n\n"
    stdout: "Checkout allowed: False"
  ```
- **if_incorrect:** Compare the availability first, then combine that
  Boolean with the account-active value using `and`.
- **concepts_required:** boolean-operators, comparison-operators, bool-conversion
- **pass_rule:** Run exits 0 and stdout matches for every supplied request.

### py-b4.6-04 · Boolean Operator Order

- **type:** concept
- **read:** Python evaluates `not` before `and`, and it evaluates `and`
  before `or`. Parentheses can state a different grouping or simply make
  the intended grouping obvious. In `(True or False) and False`, the
  parentheses make the `or` expression run first. Its `True` result is then
  combined with `False` by `and`.
- **check:** What is the result of `(True or False) and False`?
  - A. `True`
  - B. `False`
  - C. `1`
  - D. An error
- **answer:** B
- **rationale:** The grouped `or` expression is `True`, and `True and
  False` is `False`.
- **if_incorrect:** Evaluate the parenthesized expression before applying
  `and`.
- **concepts_introduced:** boolean-order
- **concepts_required:** boolean-operators, parentheses
- **pass_rule:** Learner selects B.

### py-b4.6-05 · Check a Numeric Range

- **type:** practical
- **do:** A number is inside an inclusive range when it meets a lower
  boundary and an upper boundary. Each boundary check produces a Boolean.
  Combining the checks with `and` requires both boundaries to be satisfied.
  Writing two comparisons avoids chained comparison syntax, which is
  deferred. **Receive an integer in `number`. Store whether `number` is at
  least 10 and at most 20 by combining two comparisons with `and`. Display
  `In range:` followed by the result.**
- **starter_code:**
  ```python
  # Receive number, then display whether it is from 10 to 20.
  ```
- **solution:**
  ```python
  number = int(input())
  in_range = (number >= 10) and (number <= 20)
  print("In range:", in_range)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `number\s*=\s*\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `number\s*>=\s*10\b`
  - `number\s*<=\s*20\b`
  - `\band\b`
- **forbid_code:**
  - `^\s*if\b`
  - `\d+\s*<=?\s*number\s*<=?`
- **hidden_tests:**
  ```yaml
  - stdin: "16"
    stdout: "In range: True"
  - stdin: "10"
    stdout: "In range: True"
  - stdin: "21"
    stdout: "In range: False"
  - stdin: "9"
    stdout: "In range: False"
  ```
- **if_incorrect:** Check each boundary separately inside parentheses and
  join them with `and`.
- **concepts_required:** boolean-operators, inclusive-boundaries, int-conversion
- **pass_rule:** Run exits 0, two comparisons are joined with `and` (no
  chained comparison), and stdout matches for every supplied number.

### py-b4.6-06 · Word Problem: Workshop Eligibility

- **type:** practical
- **do:** A workshop can require a minimum age and either a ticket or a
  pass. The age comparison produces one Boolean requirement. Parentheses
  group the ticket-or-pass choice into a second requirement. Combining
  those requirements with `and` means the learner must satisfy both parts.
  **Receive an age as an integer, then a ticket entry and a pass entry,
  each either `True` or an empty line, converted with `bool()`. Display
  `Eligible:` followed by whether the person is at least 12 and has either
  a ticket or a pass.**
- **starter_code:**
  ```python
  # Receive age, ticket, and pass, then display eligibility.
  ```
- **solution:**
  ```python
  age = int(input())
  has_ticket = bool(input())
  has_pass = bool(input())
  eligible = (age >= 12) and (has_ticket or has_pass)
  print("Eligible:", eligible)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `bool\s*\(\s*input\s*\(\s*\)\s*\)[\s\S]*bool\s*\(\s*input\s*\(\s*\)\s*\)`
  - `>=\s*12\b`
  - `\(\s*[A-Za-z_]\w*\s+or\s+[A-Za-z_]\w*\s*\)`
  - `\band\b`
- **forbid_code:**
  - `^\s*if\b`
- **hidden_tests:**
  ```yaml
  - stdin: "14\n\nTrue"
    stdout: "Eligible: True"
  - stdin: "11\nTrue\nTrue"
    stdout: "Eligible: False"
  - stdin: "15\n\n\n"
    stdout: "Eligible: False"
  - stdin: "12\nTrue\n\n"
    stdout: "Eligible: True"
  ```
- **if_incorrect:** Group the ticket-or-pass check in parentheses, then
  combine it with the age comparison using `and`.
- **concepts_required:** boolean-operators, boolean-order, comparison-operators, bool-conversion
- **pass_rule:** Run exits 0 and stdout matches for every supplied person.

## Checkpoint - Topic 4  {#py-b4.CP}

- **objective:** Combine floor division, modulus, comparison, and equality
  to build a time and target summary.
- **estimated_time:** 15-20 min
- **type:** checkpoint
- **brief:** This checkpoint combines only skills already practiced in
  Topic 4. Floor division and modulus separate minutes into hours and
  leftover minutes. A comparison checks whether a target has been reached,
  and equality checks whether no minutes remain. Boolean values are
  displayed directly without conditionals. Receive `total_minutes` and
  `target_minutes` as nonnegative integers. Display the complete hours, the
  leftover minutes, whether the target is reached, and whether the time is
  an exact number of hours.
- **requirements:**
  - Receive `total_minutes` then `target_minutes`, each converted with
    `int()`.
  - Calculate the hours with `//` and the leftover minutes with `%`.
  - Use `>=` for the target check and `==` to check for zero leftover
    minutes.
  - Display four lines labeled `Hours:`, `Minutes:`, `Target reached:`,
    and `Exact hours:`, in that order.
  - Do not use conditionals, loops, collections, f-strings, string methods,
    or user-defined functions.
- **solution:**
  ```python
  total_minutes = int(input())
  target_minutes = int(input())
  hours = total_minutes // 60
  minutes = total_minutes % 60
  target_reached = total_minutes >= target_minutes
  exact_hours = minutes == 0
  print("Hours:", hours)
  print("Minutes:", minutes)
  print("Target reached:", target_reached)
  print("Exact hours:", exact_hours)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `total_minutes\s*=\s*\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `target_minutes\s*=\s*\bint\s*\(\s*input\s*\(\s*\)\s*\)`
  - `//\s*60\b`
  - `%\s*60\b`
  - `>=`
  - `==\s*0\b`
- **forbid_code:**
  - `^\s*if\b`
- **hidden_tests:**
  ```yaml
  - stdin: "150\n120"
    stdout: "Hours: 2\nMinutes: 30\nTarget reached: True\nExact hours: False"
  - stdin: "120\n180"
    stdout: "Hours: 2\nMinutes: 0\nTarget reached: False\nExact hours: True"
  - stdin: "45\n45"
    stdout: "Hours: 0\nMinutes: 45\nTarget reached: True\nExact hours: False"
  ```
- **tutor:** Calculate the two time parts first, then the two comparisons,
  and print all four stored results in the requested order.
- **pass_rule:** Run exits 0 and stdout matches all four lines for every
  supplied pair.
