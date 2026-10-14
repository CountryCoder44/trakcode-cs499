---
topic_id: py-b3
course: python_beginner
section: foundations
topic_number: 3
title: User Input and Type Conversion
slug: input-type-conversion
lessons: [py-b3.1, py-b3.2, py-b3.3, py-b3.4, py-b3.5]
checkpoint_id: py-b3.CP
live_coding_exception: false
format_version: 1
---

# Topic 3 - User Input and Type Conversion

Teach learners to receive text, preserve it when appropriate, and convert
compatible values deliberately into the types a program needs.

**Topic boundaries.** `input()` receives one line and always returns a
string. Covered conversions are `int()`, `float()`, `str()`, and
introductory `bool()`. Numeric conversion tasks use documented compatible
input. Invalid conversion is explained but not deliberately executed or
handled. No arithmetic, comparisons, conditions, loops, string methods, or
f-strings. Every lesson has six items and ends with a contextual coding
problem. Every item has a reading of at least four complete sentences.

## Lesson 3.1 - Reading User Input  {#py-b3.1}

- **objective:** Receive one line with `input()`, store it, and display it,
  with a prompt or label when helpful.
- **estimated_time:** 15-20 min
- **item_count:** 6
- **live_coding_items:** 4

### py-b3.1-01 · input() Receives One Line

- **type:** concept
- **read:** A program becomes interactive when it receives information while
  running. `input()` pauses and waits for one entered line. Pressing Enter
  finishes that response. The characters entered become the result of the
  call.
- **check:** What does `input()` receive?
  - A. One entered line
  - B. A whole file
  - C. A Python name
  - D. A printed greeting
- **answer:** A
- **rationale:** The call finishes when the user presses Enter.
- **if_incorrect:** Follow the value from `input()`, through any conversion,
  and into the output.
- **concepts_introduced:** input-function
- **concepts_required:** variable, print-function
- **pass_rule:** Learner selects A.

### py-b3.1-02 · Receive and Repeat Text

- **type:** practical
- **do:** The result of `input()` can be assigned to a variable. That name
  preserves the response for later instructions. Printing the unquoted name
  displays the entered text. The test value must not be hardcoded.
  **Receive one line in `response` and display it.**
- **starter_code:**
  ```python
  # Receive one line, then display it.
  ```
- **solution:**
  ```python
  response = input()
  print(response)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `response\s*=\s*input\s*\(\s*\)`
  - `print\s*\(\s*response\s*\)`
- **hidden_tests:**
  ```yaml
  - stdin: "Ready"
    stdout: "Ready"
  - stdin: "hello world"
    stdout: "hello world"
  - stdin: "42"
    stdout: "42"
  ```
- **if_incorrect:** Check the prompt, input call, conversion, assignment, and
  output in order.
- **concepts_required:** input-function, variable
- **pass_rule:** Run exits 0 and stdout matches for every supplied line.

### py-b3.1-03 · Prompt Before Input

- **type:** practical
- **do:** A prompt tells the user what information to enter. A separate
  `print()` displays the prompt before `input()` runs. Python executes the
  statements from top to bottom. The request therefore appears before the
  program waits. **Display `Enter your name:`, receive the name in
  `learner_name`, and display it.**
- **starter_code:**
  ```python
  # Prompt, receive the name, then display it.
  ```
- **solution:**
  ```python
  print("Enter your name:")
  learner_name = input()
  print(learner_name)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `print\s*\(\s*["']Enter your name:["']\s*\)[\s\S]*learner_name\s*=\s*input\s*\(\s*\)`
  - `print\s*\(\s*learner_name\s*\)`
- **hidden_tests:**
  ```yaml
  - stdin: "Mina"
    stdout: "Enter your name:\nMina"
  - stdin: "Jordan"
    stdout: "Enter your name:\nJordan"
  - stdin: "Li"
    stdout: "Enter your name:\nLi"
  ```
- **if_incorrect:** Check the prompt, input call, conversion, assignment, and
  output in order.
- **concepts_introduced:** input-prompt
- **concepts_required:** input-function, statement-order
- **pass_rule:** Run exits 0 and stdout matches for every supplied name.

### py-b3.1-04 · A Response Can Be Reused

- **type:** concept
- **read:** A variable keeps a response after `input()` finishes. Later
  `print()` calls may use the same variable repeatedly. Reusing it does not
  request another line. Another `input()` call is needed for another
  response.
- **check:** How many lines does one `input()` call receive?
  - A. One
  - B. Two
  - C. All remaining lines
  - D. None
- **answer:** A
- **rationale:** Each call receives one completed line.
- **if_incorrect:** Follow the value from `input()`, through any conversion,
  and into the output.
- **concepts_introduced:** reuse-response
- **concepts_required:** input-function, variable
- **pass_rule:** Learner selects A.

### py-b3.1-05 · Use a Label

- **type:** practical
- **do:** `print()` can display a fixed label beside a response. The label
  remains quoted. The variable name remains unquoted. Python inserts a space
  between comma-separated values. **Receive a favorite color and display
  `Color:` followed by it.**
- **starter_code:**
  ```python
  # Receive the color, then display it with a label.
  ```
- **solution:**
  ```python
  favorite_color = input()
  print("Color:", favorite_color)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\w+\s*=\s*input\s*\(\s*\)`
  - `print\s*\(\s*["']Color:["']\s*,\s*\w+\s*\)`
- **hidden_tests:**
  ```yaml
  - stdin: "teal"
    stdout: "Color: teal"
  - stdin: "dark blue"
    stdout: "Color: dark blue"
  - stdin: "red"
    stdout: "Color: red"
  ```
- **if_incorrect:** Check the prompt, input call, conversion, assignment, and
  output in order.
- **concepts_required:** input-function, labeled-print
- **pass_rule:** Run exits 0 and stdout matches for every supplied color.

### py-b3.1-06 · Word Problem: Create a Name Badge

- **type:** practical
- **do:** A badge needs a name that is unknown until the program runs.
  `input()` collects that information. A variable preserves the response. A
  label turns it into a useful result. **Display `Name for badge:`, receive
  a name, and display a line in the form `Badge: Ada`.**
- **starter_code:**
  ```python
  # Prompt, receive the name, then display the badge line.
  ```
- **solution:**
  ```python
  print("Name for badge:")
  name = input()
  print("Badge:", name)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `print\s*\(\s*["']Name for badge:["']\s*\)[\s\S]*\w+\s*=\s*input\s*\(\s*\)`
  - `print\s*\(\s*["']Badge:["']\s*,\s*\w+\s*\)`
- **hidden_tests:**
  ```yaml
  - stdin: "Ada"
    stdout: "Name for badge:\nBadge: Ada"
  - stdin: "Grace"
    stdout: "Name for badge:\nBadge: Grace"
  - stdin: "Lin"
    stdout: "Name for badge:\nBadge: Lin"
  ```
- **if_incorrect:** Check the prompt, input call, conversion, assignment, and
  output in order.
- **concepts_required:** input-prompt, labeled-print
- **pass_rule:** Run exits 0 and stdout matches for every supplied name.

## Lesson 3.2 - input() Produces a String  {#py-b3.2}

- **objective:** Recognize that `input()` always returns a string, and keep
  codes and identifiers as text.
- **estimated_time:** 15-20 min
- **item_count:** 6
- **live_coding_items:** 4

### py-b3.2-01 · Entered Characters Begin as Text

- **type:** concept
- **read:** `input()` always returns a string in these programs. This
  remains true when the characters look numeric. Entering 25 produces the
  text `"25"`, not the integer 25. Conversion is needed only when another
  type is required.
- **check:** What type results when the user enters 25?
  - A. `str`
  - B. `int`
  - C. `float`
  - D. `bool`
- **answer:** A
- **rationale:** Keyboard input starts as text.
- **if_incorrect:** Follow the value from `input()`, through any conversion,
  and into the output.
- **concepts_introduced:** input-is-string
- **concepts_required:** input-function, basic-types
- **pass_rule:** Learner selects A.

### py-b3.2-02 · Inspect Numeric-Looking Input

- **type:** practical
- **do:** `type()` can confirm how Python stored an entered response.
  Numeric-looking input still has the type `str`. The characters can be
  displayed normally. Inspection does not convert the value. **Receive a
  line in `entry`. Display `entry`, then `type(entry)`.**
- **starter_code:**
  ```python
  # Receive the entry, then display it and its type.
  ```
- **solution:**
  ```python
  entry = input()
  print(entry)
  print(type(entry))
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `entry\s*=\s*input\s*\(\s*\)`
  - `print\s*\(\s*type\s*\(\s*entry\s*\)\s*\)`
- **forbid_code:**
  - `\b(int|float)\s*\(`
- **hidden_tests:**
  ```yaml
  - stdin: "42"
    stdout: "42\n<class 'str'>"
  - stdin: "3.5"
    stdout: "3.5\n<class 'str'>"
  - stdin: "hello"
    stdout: "hello\n<class 'str'>"
  ```
- **if_incorrect:** Check the prompt, input call, conversion, assignment, and
  output in order.
- **concepts_required:** input-is-string, type-function
- **pass_rule:** Run exits 0 and stdout matches for every supplied entry.

### py-b3.2-03 · Preserve Leading Zeros

- **type:** practical
- **do:** Text preserves characters that may not belong in a number. A code
  such as 007 keeps both leading zeros as a string. This is useful for
  identifiers rather than quantities. No conversion should occur when every
  character matters. **Receive a three-character code and display `Code:`
  followed by it, exactly as entered.**
- **starter_code:**
  ```python
  # Receive the code, then display it unchanged.
  ```
- **solution:**
  ```python
  code = input()
  print("Code:", code)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\w+\s*=\s*input\s*\(\s*\)`
  - `print\s*\(\s*["']Code:["']\s*,\s*\w+\s*\)`
- **forbid_code:**
  - `\b(int|float)\s*\(`
- **hidden_tests:**
  ```yaml
  - stdin: "007"
    stdout: "Code: 007"
  - stdin: "042"
    stdout: "Code: 042"
  - stdin: "ABC"
    stdout: "Code: ABC"
  ```
- **if_incorrect:** Check the prompt, input call, conversion, assignment, and
  output in order.
- **concepts_introduced:** preserve-text
- **concepts_required:** input-is-string, labeled-print
- **pass_rule:** Run exits 0 and stdout matches for every supplied code.

### py-b3.2-04 · Text and Numbers Differ

- **type:** concept
- **read:** The string `"8"` and integer `8` have different types.
  Quotation marks show the string form in code. `input()` produces that
  string form. The needed use determines whether conversion should follow.
- **check:** Which value matches entering 8 through `input()`?
  - A. `"8"`
  - B. `8`
  - C. `8.0`
  - D. `True`
- **answer:** A
- **rationale:** `input()` returns entered characters as a string.
- **if_incorrect:** Follow the value from `input()`, through any conversion,
  and into the output.
- **concepts_required:** input-is-string, numeric-text
- **pass_rule:** Learner selects A.

### py-b3.2-05 · Store Two Responses

- **type:** practical
- **do:** Each `input()` call receives its own line. The first response
  remains stored before the second call runs. Both responses are strings.
  Clear names identify the two fields. **Receive a city and then a state.
  Display them as `City:` and `State:` lines.**
- **starter_code:**
  ```python
  # Receive the city and state, then display both with labels.
  ```
- **solution:**
  ```python
  city = input()
  state = input()
  print("City:", city)
  print("State:", state)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `input\s*\(\s*\)[\s\S]*input\s*\(\s*\)`
  - `print\s*\(\s*["']City:["']\s*,\s*\w+\s*\)`
  - `print\s*\(\s*["']State:["']\s*,\s*\w+\s*\)`
- **hidden_tests:**
  ```yaml
  - stdin: "Newark\nNew Jersey"
    stdout: "City: Newark\nState: New Jersey"
  - stdin: "Austin\nTexas"
    stdout: "City: Austin\nState: Texas"
  - stdin: "Reno\nNevada"
    stdout: "City: Reno\nState: Nevada"
  ```
- **if_incorrect:** Check the prompt, input call, conversion, assignment, and
  output in order.
- **concepts_introduced:** multiple-inputs
- **concepts_required:** input-function, labeled-print
- **pass_rule:** Run exits 0 and stdout matches for every supplied pair.

### py-b3.2-06 · Word Problem: Preserve an Account ID

- **type:** practical
- **do:** An account identifier may contain only digits while still being
  text. Its leading zeros can be important. Leaving the response as a string
  preserves them. Labeled output repeats the identifier exactly. **Receive
  an account identifier and display `Account:` followed by it, exactly as
  entered.**
- **starter_code:**
  ```python
  # Receive the account ID, then display it unchanged.
  ```
- **solution:**
  ```python
  account_id = input()
  print("Account:", account_id)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\w+\s*=\s*input\s*\(\s*\)`
  - `print\s*\(\s*["']Account:["']\s*,\s*\w+\s*\)`
- **forbid_code:**
  - `\b(int|float)\s*\(`
- **hidden_tests:**
  ```yaml
  - stdin: "00421"
    stdout: "Account: 00421"
  - stdin: "98765"
    stdout: "Account: 98765"
  - stdin: "00001"
    stdout: "Account: 00001"
  ```
- **if_incorrect:** Check the prompt, input call, conversion, assignment, and
  output in order.
- **concepts_required:** preserve-text, labeled-print
- **pass_rule:** Run exits 0 and stdout matches for every supplied ID.

## Lesson 3.3 - Converting to int and float  {#py-b3.3}

- **objective:** Convert compatible text to whole numbers with `int()` and
  to decimals with `float()`.
- **estimated_time:** 15-20 min
- **item_count:** 6
- **live_coding_items:** 4

### py-b3.3-01 · int() Creates a Whole Number

- **type:** concept
- **read:** `int()` converts compatible text into a whole-number value.
  `int("25")` produces the integer 25. The result may be assigned to a
  variable. Incompatible text causes an error that is handled later in the
  course.
- **check:** Which call converts `"12"` to a whole number?
  - A. `int("12")`
  - B. `float("12")`
  - C. `str("12")`
  - D. `type("12")`
- **answer:** A
- **rationale:** `int()` performs compatible whole-number conversion.
- **if_incorrect:** Follow the value from `input()`, through any conversion,
  and into the output.
- **concepts_introduced:** int-conversion
- **concepts_required:** input-is-string
- **pass_rule:** Learner selects A.

### py-b3.3-02 · Convert Entered Age

- **type:** practical
- **do:** `int(input())` first receives text and then converts it. The
  assigned variable stores an integer. The entered characters must represent
  a whole number. `type()` can confirm the result. **Receive `age` with
  `int(input())`. Display a line in the form `Age: 21`, then the type of
  `age`.**
- **starter_code:**
  ```python
  # Receive and convert the age, then display it and its type.
  ```
- **solution:**
  ```python
  age = int(input())
  print("Age:", age)
  print(type(age))
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `age\s*=\s*int\s*\(\s*input\s*\(\s*\)\s*\)`
  - `print\s*\(\s*type\s*\(\s*age\s*\)\s*\)`
- **hidden_tests:**
  ```yaml
  - stdin: "21"
    stdout: "Age: 21\n<class 'int'>"
  - stdin: "65"
    stdout: "Age: 65\n<class 'int'>"
  - stdin: "0"
    stdout: "Age: 0\n<class 'int'>"
  ```
- **if_incorrect:** Check the prompt, input call, conversion, assignment, and
  output in order.
- **concepts_required:** int-conversion, type-function
- **pass_rule:** Run exits 0 and stdout matches for every supplied age.

### py-b3.3-03 · Convert in a Separate Step

- **type:** practical
- **do:** Receiving and conversion may use separate statements. The first
  variable stores the original text. `int()` creates an integer from that
  variable. Both values remain available under their own names. **Receive a
  line in `entered_days`, convert it into `days` with `int()`, and display
  the type of `entered_days` and then the type of `days`.**
- **starter_code:**
  ```python
  # Receive the text, convert it in a second step, then show both types.
  ```
- **solution:**
  ```python
  entered_days = input()
  days = int(entered_days)
  print(type(entered_days))
  print(type(days))
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `entered_days\s*=\s*input\s*\(\s*\)`
  - `days\s*=\s*int\s*\(\s*entered_days\s*\)`
  - `print\s*\(\s*type\s*\(\s*entered_days\s*\)\s*\)[\s\S]*print\s*\(\s*type\s*\(\s*days\s*\)\s*\)`
- **hidden_tests:**
  ```yaml
  - stdin: "14"
    stdout: "<class 'str'>\n<class 'int'>"
  - stdin: "0"
    stdout: "<class 'str'>\n<class 'int'>"
  - stdin: "365"
    stdout: "<class 'str'>\n<class 'int'>"
  ```
- **if_incorrect:** Check the prompt, input call, conversion, assignment, and
  output in order.
- **concepts_required:** int-conversion, type-function
- **pass_rule:** Run exits 0 and stdout matches for every supplied number.

### py-b3.3-04 · float() Creates a Decimal Number

- **type:** concept
- **read:** `float()` converts compatible text into a decimal-number value.
  It accepts text such as `"3.5"` and `"4"`. The result has the type
  `float`. Use it when documented input may contain a decimal point.
- **check:** Which call converts `"6.25"` to a decimal number?
  - A. `float("6.25")`
  - B. `int("6.25")`
  - C. `str("6.25")`
  - D. `bool("6.25")`
- **answer:** A
- **rationale:** `float()` produces the needed decimal value.
- **if_incorrect:** Follow the value from `input()`, through any conversion,
  and into the output.
- **concepts_introduced:** float-conversion
- **concepts_required:** int-conversion
- **pass_rule:** Learner selects A.

### py-b3.3-05 · Convert an Entered Price

- **type:** practical
- **do:** A price may include a decimal point. `float(input())` receives and
  converts it. The variable then stores a numeric `float`. `type()` confirms
  the conversion. **Receive a price as a float. Display a line in the form
  `Price: 12.5`, then the type of the price.**
- **starter_code:**
  ```python
  # Receive and convert the price, then display it and its type.
  ```
- **solution:**
  ```python
  price = float(input())
  print("Price:", price)
  print(type(price))
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `float\s*\(`
  - `print\s*\(\s*type\s*\(\s*\w+\s*\)\s*\)`
- **hidden_tests:**
  ```yaml
  - stdin: "12.5"
    stdout: "Price: 12.5\n<class 'float'>"
  - stdin: "3"
    stdout: "Price: 3.0\n<class 'float'>"
  - stdin: "0.99"
    stdout: "Price: 0.99\n<class 'float'>"
  ```
- **if_incorrect:** Check the prompt, input call, conversion, assignment, and
  output in order.
- **concepts_required:** float-conversion, type-function
- **pass_rule:** Run exits 0 and stdout matches for every supplied price.

### py-b3.3-06 · Word Problem: Prepare Measurements

- **type:** practical
- **do:** A form may collect a whole-number count and decimal weight. Both
  entries first arrive as text. `int()` fits the count, while `float()` fits
  the weight. The output confirms that both conversions succeeded.
  **Receive a package count and then a weight. Convert the count with
  `int()` and the weight with `float()`, and display them as `Packages:` and
  `Weight:` lines.**
- **starter_code:**
  ```python
  # Receive and convert both values, then display them.
  ```
- **solution:**
  ```python
  packages = int(input())
  weight = float(input())
  print("Packages:", packages)
  print("Weight:", weight)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\bint\s*\(`
  - `float\s*\(`
- **hidden_tests:**
  ```yaml
  - stdin: "3\n7.5"
    stdout: "Packages: 3\nWeight: 7.5"
  - stdin: "10\n2.25"
    stdout: "Packages: 10\nWeight: 2.25"
  - stdin: "1\n4"
    stdout: "Packages: 1\nWeight: 4.0"
  ```
- **if_incorrect:** Check the prompt, input call, conversion, assignment, and
  output in order.
- **concepts_required:** int-conversion, float-conversion, labeled-print
- **pass_rule:** Run exits 0 and stdout matches for every supplied pair.

## Lesson 3.4 - Converting to str and bool  {#py-b3.4}

- **objective:** Create text with `str()` and see how `bool()` treats empty
  and non-empty text.
- **estimated_time:** 15-20 min
- **item_count:** 6
- **live_coding_items:** 4

### py-b3.4-01 · str() Creates Text

- **type:** concept
- **read:** `str()` creates a string representation of a value. `str(25)`
  produces the text `"25"`. The original value remains unchanged. Store the
  result when later code specifically needs text.
- **check:** What does `str(8)` produce?
  - A. The text `"8"`
  - B. The integer `8`
  - C. The float `8.0`
  - D. `True`
- **answer:** A
- **rationale:** `str()` returns a string representation.
- **if_incorrect:** Follow the value from `input()`, through any conversion,
  and into the output.
- **concepts_introduced:** str-conversion
- **concepts_required:** basic-types
- **pass_rule:** Learner selects A.

### py-b3.4-02 · Convert a Number to Text

- **type:** practical
- **do:** A numeric value can be converted after assignment. `str()` returns
  a new string. The original variable remains an integer. `type()` can show
  both types. **Set `number` to `24` and `text_number` to `str(number)`.
  Display the type of `number`, then the type of `text_number`.**
- **starter_code:**
  ```python
  # Set number, convert it to text, then display both types.
  ```
- **solution:**
  ```python
  number = 24
  text_number = str(number)
  print(type(number))
  print(type(text_number))
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `number\s*=\s*24\b`
  - `text_number\s*=\s*str\s*\(\s*number\s*\)`
  - `print\s*\(\s*type\s*\(\s*number\s*\)\s*\)`
  - `print\s*\(\s*type\s*\(\s*text_number\s*\)\s*\)`
- **expect_exact_output:** |
  <class 'int'>
  <class 'str'>
- **if_incorrect:** Check the prompt, input call, conversion, assignment, and
  output in order.
- **concepts_required:** str-conversion, type-function
- **pass_rule:** Run exits 0, `str()` creates the text, and stdout shows
  `int` then `str`.

### py-b3.4-03 · Store Converted Text

- **type:** practical
- **do:** Converted text prints much like the original number. Its type is
  the important difference. The result can be stored under a descriptive
  name. `type()` confirms that it is now a string. **Set `level` to `3` and
  convert it into `level_text` with `str()`. Display `Level text:` followed
  by `level_text`, then the type of `level_text`.**
- **starter_code:**
  ```python
  # Set level, convert it, then display the text and its type.
  ```
- **solution:**
  ```python
  level = 3
  level_text = str(level)
  print("Level text:", level_text)
  print(type(level_text))
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `level\s*=\s*3\b`
  - `level_text\s*=\s*str\s*\(\s*level\s*\)`
  - `print\s*\(\s*["']Level text:["']\s*,\s*level_text\s*\)`
  - `print\s*\(\s*type\s*\(\s*level_text\s*\)\s*\)`
- **expect_exact_output:** |
  Level text: 3
  <class 'str'>
- **if_incorrect:** Check the prompt, input call, conversion, assignment, and
  output in order.
- **concepts_required:** str-conversion, labeled-print
- **pass_rule:** Run exits 0, `level_text` holds the converted text, and
  stdout matches both lines.

### py-b3.4-04 · bool() Checks Truthiness

- **type:** concept
- **read:** `bool()` converts a value to `True` or `False`. Empty text
  becomes `False`, while non-empty text becomes `True`. The string `"False"`
  is non-empty and therefore converts to `True`. Numeric zero becomes
  `False`, while nonzero numbers become `True`.
- **check:** What does `bool("False")` produce?
  - A. `True`
  - B. `False`
  - C. The text False
  - D. An error
- **answer:** A
- **rationale:** The string contains characters and is truthy.
- **if_incorrect:** Follow the value from `input()`, through any conversion,
  and into the output.
- **concepts_introduced:** bool-conversion
- **concepts_required:** bool-literal
- **pass_rule:** Learner selects A.

### py-b3.4-05 · Convert Empty and Filled Text

- **type:** practical
- **do:** The empty string has nothing between its quotation marks.
  `bool()` converts it to `False`. A string containing characters converts
  to `True`. Printing both results shows the contrast. **Display
  `bool("")` and then `bool("ready")` on separate lines.**
- **starter_code:**
  ```python
  # Display bool() of an empty string, then of "ready".
  ```
- **solution:**
  ```python
  print(bool(""))
  print(bool("ready"))
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `bool\s*\(\s*(""|'')\s*\)`
  - `bool\s*\(\s*["']ready["']\s*\)`
- **expect_exact_output:** |
  False
  True
- **if_incorrect:** Check the prompt, input call, conversion, assignment, and
  output in order.
- **concepts_required:** bool-conversion
- **pass_rule:** Run exits 0, both `bool()` calls are displayed, and stdout
  is `False` then `True`.

### py-b3.4-06 · Word Problem: Check Whether a Note Exists

- **type:** practical
- **do:** `input()` returns a string for the note. `bool()` reports whether
  that string contains at least one character. It does not interpret the
  words. A blank line gives an empty string. **Receive a note, convert it
  with `bool()`, and display a line in the form `Note provided: True`.**
- **starter_code:**
  ```python
  # Receive the note, convert it with bool(), then display the result.
  ```
- **solution:**
  ```python
  note = input()
  note_provided = bool(note)
  print("Note provided:", note_provided)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\w+\s*=\s*input\s*\(\s*\)`
  - `bool\s*\(\s*\w+\s*\)`
- **hidden_tests:**
  ```yaml
  - stdin: "Bring charger"
    stdout: "Note provided: True"
  - stdin: "\n"
    stdout: "Note provided: False"
  - stdin: "False"
    stdout: "Note provided: True"
  ```
- **if_incorrect:** Check the prompt, input call, conversion, assignment, and
  output in order.
- **concepts_required:** bool-conversion, input-is-string
- **pass_rule:** Run exits 0 and stdout matches for every supplied note.

## Lesson 3.5 - A Safe Conversion Workflow  {#py-b3.5}

- **objective:** Follow prompt, receive, convert (only when needed), store,
  and use, choosing the right type for each field.
- **estimated_time:** 15-20 min
- **item_count:** 6
- **live_coding_items:** 4

### py-b3.5-01 · Receive, Convert, Store, and Use

- **type:** concept
- **read:** A reliable workflow follows a clear order. First the program
  requests and receives text. A conversion is applied only when another type
  is required. The converted value is stored before later instructions use
  it.
- **check:** What happens before conversion?
  - A. Receive the response
  - B. Print the final result twice
  - C. Store `None`
  - D. Inspect an unknown name
- **answer:** A
- **rationale:** The program needs text before it can convert that text.
- **if_incorrect:** Follow the value from `input()`, through any conversion,
  and into the output.
- **concepts_introduced:** conversion-workflow
- **concepts_required:** input-prompt, int-conversion
- **pass_rule:** Learner selects A.

### py-b3.5-02 · Whole-Number Workflow

- **type:** practical
- **do:** A prompt explains the requested data. `input()` receives the
  response. `int()` converts documented compatible text. The stored integer
  can then be displayed. **Display `Enter lesson count:`, receive and
  convert the count with `int()`, and display a line in the form
  `Lessons: 5`.**
- **starter_code:**
  ```python
  # Prompt, receive and convert the count, then display it.
  ```
- **solution:**
  ```python
  print("Enter lesson count:")
  lesson_count = int(input())
  print("Lessons:", lesson_count)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `print\s*\(\s*["']Enter lesson count:["']\s*\)`
  - `\bint\s*\(`
- **hidden_tests:**
  ```yaml
  - stdin: "5"
    stdout: "Enter lesson count:\nLessons: 5"
  - stdin: "12"
    stdout: "Enter lesson count:\nLessons: 12"
  - stdin: "0"
    stdout: "Enter lesson count:\nLessons: 0"
  ```
- **if_incorrect:** Check the prompt, input call, conversion, assignment, and
  output in order.
- **concepts_required:** conversion-workflow, int-conversion
- **pass_rule:** Run exits 0 and stdout matches for every supplied count.

### py-b3.5-03 · Decimal Workflow

- **type:** practical
- **do:** A decimal workflow uses `float()`. The prompt describes the
  measurement. The documented text is compatible with conversion. The stored
  float is ready for later calculations. **Display `Enter distance:`,
  receive the distance and convert it with `float()`, and display a line in
  the form `Distance: 4.75`.**
- **starter_code:**
  ```python
  # Prompt, receive and convert the distance, then display it.
  ```
- **solution:**
  ```python
  print("Enter distance:")
  distance = float(input())
  print("Distance:", distance)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `print\s*\(\s*["']Enter distance:["']\s*\)`
  - `float\s*\(`
- **hidden_tests:**
  ```yaml
  - stdin: "4.75"
    stdout: "Enter distance:\nDistance: 4.75"
  - stdin: "10"
    stdout: "Enter distance:\nDistance: 10.0"
  - stdin: "0.5"
    stdout: "Enter distance:\nDistance: 0.5"
  ```
- **if_incorrect:** Check the prompt, input call, conversion, assignment, and
  output in order.
- **concepts_required:** conversion-workflow, float-conversion
- **pass_rule:** Run exits 0 and stdout matches for every supplied distance.

### py-b3.5-04 · Invalid Text Causes an Error

- **type:** concept
- **read:** Conversion succeeds only for compatible text. `int("blue")`
  cannot create a whole number. Python therefore reports an error. This
  topic documents valid input, while exception handling appears later.
- **check:** What happens when `int()` receives `"blue"`?
  - A. Python reports an error
  - B. It returns zero
  - C. It returns `None`
  - D. It guesses
- **answer:** A
- **rationale:** The text is incompatible with whole-number conversion.
- **if_incorrect:** Follow the value from `input()`, through any conversion,
  and into the output.
- **concepts_introduced:** invalid-conversion
- **concepts_required:** int-conversion
- **pass_rule:** Learner selects A.

### py-b3.5-05 · Do Not Convert Unnecessarily

- **type:** practical
- **do:** Not every response should become numeric. Names, colors, and
  identifiers normally remain strings. Unnecessary conversion can fail or
  remove meaningful form. Convert only when the next work requires another
  type. **Display `Enter username:`, receive the username as text, and
  display `Username:` followed by it.**
- **starter_code:**
  ```python
  # Prompt, receive the username as text, then display it.
  ```
- **solution:**
  ```python
  print("Enter username:")
  username = input()
  print("Username:", username)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `print\s*\(\s*["']Enter username:["']\s*\)`
  - `print\s*\(\s*["']Username:["']\s*,\s*\w+\s*\)`
- **forbid_code:**
  - `\b(int|float)\s*\(`
- **hidden_tests:**
  ```yaml
  - stdin: "ada_7"
    stdout: "Enter username:\nUsername: ada_7"
  - stdin: "Mina"
    stdout: "Enter username:\nUsername: Mina"
  - stdin: "user 99"
    stdout: "Enter username:\nUsername: user 99"
  ```
- **if_incorrect:** Check the prompt, input call, conversion, assignment, and
  output in order.
- **concepts_required:** conversion-workflow, preserve-text
- **pass_rule:** Run exits 0 and stdout matches for every supplied username.

### py-b3.5-06 · Word Problem: Collect Registration Data

- **type:** practical
- **do:** A registration can contain text, a whole number, and a decimal
  value. Each field should use the type matching its meaning. The name
  remains text, lesson count becomes `int`, and weekly hours becomes
  `float`. A summary confirms the stored results. **Receive a name, a
  completed lesson count, and weekly hours, in that order. Convert only the
  numeric fields, and display them as `Name:`, `Completed lessons:`, and
  `Weekly hours:` lines.**
- **starter_code:**
  ```python
  # Receive the three fields, convert the numeric ones, then display them.
  ```
- **solution:**
  ```python
  name = input()
  completed_lessons = int(input())
  weekly_hours = float(input())
  print("Name:", name)
  print("Completed lessons:", completed_lessons)
  print("Weekly hours:", weekly_hours)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\bint\s*\(`
  - `float\s*\(`
- **hidden_tests:**
  ```yaml
  - stdin: "Mina\n4\n6.5"
    stdout: "Name: Mina\nCompleted lessons: 4\nWeekly hours: 6.5"
  - stdin: "Leo\n0\n2"
    stdout: "Name: Leo\nCompleted lessons: 0\nWeekly hours: 2.0"
  - stdin: "Ana Lima\n12\n10.25"
    stdout: "Name: Ana Lima\nCompleted lessons: 12\nWeekly hours: 10.25"
  ```
- **if_incorrect:** Check the prompt, input call, conversion, assignment, and
  output in order.
- **concepts_required:** conversion-workflow, int-conversion, float-conversion
- **pass_rule:** Run exits 0 and stdout matches for every supplied
  registration.

## Checkpoint - Topic 3  {#py-b3.CP}

- **objective:** Receive text, a whole number, and a decimal, convert the
  numeric fields, and confirm each type.
- **estimated_time:** 15-20 min
- **type:** checkpoint
- **brief:** This checkpoint combines only Topic 3 skills. The learner name
  remains a string. The completed count becomes `int`, and the weekly target
  becomes `float`. `type()` confirms each result without performing
  calculations. Receive a name, a completed count, and a weekly target, in
  that order. Display them as `Learner:`, `Completed:`, and `Weekly target:`
  lines, then display the type of each of the three values.
- **requirements:**
  - Keep the name as text; convert the count with `int()` and the target
    with `float()`.
  - Display the three labeled lines, then the three types in the same order.
  - Do not use arithmetic, comparisons, conditions, string methods, or
    f-strings.
- **solution:**
  ```python
  learner = input()
  completed = int(input())
  weekly_target = float(input())
  print("Learner:", learner)
  print("Completed:", completed)
  print("Weekly target:", weekly_target)
  print(type(learner))
  print(type(completed))
  print(type(weekly_target))
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\bint\s*\(`
  - `float\s*\(`
  - `type\s*\([\s\S]*type\s*\([\s\S]*type\s*\(`
- **hidden_tests:**
  ```yaml
  - stdin: "Ada\n6\n7.5"
    stdout: "Learner: Ada\nCompleted: 6\nWeekly target: 7.5\n<class 'str'>\n<class 'int'>\n<class 'float'>"
  - stdin: "Grace\n0\n3"
    stdout: "Learner: Grace\nCompleted: 0\nWeekly target: 3.0\n<class 'str'>\n<class 'int'>\n<class 'float'>"
  - stdin: "Lin\n15\n12.25"
    stdout: "Learner: Lin\nCompleted: 15\nWeekly target: 12.25\n<class 'str'>\n<class 'int'>\n<class 'float'>"
  ```
- **tutor:** Check the prompt, input call, conversion, assignment, and
  output in order. Only the two numeric fields are converted.
- **pass_rule:** Run exits 0 and stdout matches all six lines for every
  supplied learner.
