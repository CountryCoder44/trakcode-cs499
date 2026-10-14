---
topic_id: py-topic-04
course: python
section: foundations
topic_number: 4
title: Working With Strings
slug: strings-text
lessons: [py-4.1, py-4.2, py-4.3, py-4.4, py-4.5, py-4.6, py-4.7, py-4.8]
checkpoint_id: py-4.CP
live_coding_exception: false
format_version: 1
---

# Topic 4 — Working With Strings

This topic moves past printing whole strings and into working with the text
inside them: retrieving individual characters, pulling out sections, reversing
text, cleaning up input, searching for smaller pieces, and building new strings
without changing the originals. Along the way it also covers the escape
sequences and string methods that make everyday text work far easier.

**Prerequisites from Topics 2–3.** The learner may use `print()`, string and
numeric literals, variables, assignment and reassignment, `len()`, string
concatenation and repetition, f-strings, `input()`, arithmetic expressions,
integer comparisons, and Boolean operators.

**Scope boundaries.** Every indexing task uses a valid index, and every task
that indexes user input states the required minimum length. General handling
of invalid indexes and other runtime errors is deferred. Slicing uses
nonnegative start and stop indexes. Slice steps use positive whole numbers;
`[::-1]` is introduced as the one supported negative-step pattern. This topic
teaches `\n`, `\t`, escaped quotes, and `\\` — no other escape form is
assessable here. Methods are limited to `upper()`, `lower()`, `strip()`,
`startswith()`, `endswith()`, `count()`, `find()`, and `replace()`, using only
the exact call forms taught in the lessons. String ordering with `<`, `>`,
`<=`, or `>=` is excluded. No item repeats instructions or chooses which
instruction or value is used.

**Live coding.** Exactly half of each lesson's required items are practical
coding tasks, and at least half of expected learner time is spent coding. The
checkpoint is also live coding. When a task requires indexing, slicing, a
specific method, or another named technique, grading verifies that structure
rather than accepting matching output produced with hardcoded text.

---

## Lesson 4.1 — Escape Sequences  {#py-4.1}

- **objective:** Put line breaks, tabs, quotation marks, and backslashes inside
  string literals using supported escape sequences.
- **estimated_time:** 20–30 min
- **item_count:** 8
- **live_coding_items:** 4

### py-4.1-01 · Escape Sequences Represent Special Characters

- **type:** concept
- **read:** Some characters are trickier to type directly into a string than
  they are to just describe. Python handles these with an **escape
  sequence** — a backslash followed by another character. One of the most
  common is `\n`, which basically means "start a new line." So
  `print("red\nblue")` displays `red` and `blue` on separate lines. You won't
  actually see the backslash or the `n` anywhere in the output.
- **check:** What does `print("up\ndown")` display?
  - A. `up\ndown`, including the backslash and `n`
  - B. `up` and `down` on separate lines
  - C. `up down` on one line with a space
  - D. an error
- **answer:** B
- **rationale:** Python reads `\n` as one new-line character, so the second
  word starts on the next line.
- **if_incorrect:** Treat `\n` as one instruction inside the text: move to a
  new line. It isn't displayed as `\n`, and it doesn't turn into a space.
- **tutor:** Ask the learner what they'd expect to see if Python printed the
  backslash and the letter n literally, then contrast that with what actually
  happens.
- **pass_rule:** Learner selects B.

### py-4.1-02 · Print Two Lines with One String

- **type:** practical
- **do:** With a **single** `print()` call and one string literal, display
  `red` on one line and `blue` on the next. **Put `\n` between the two words
  inside the string; do not use two `print()` calls.**
- **solution:**
  ```python
  print("red\nblue")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `print\s*\([^)]*\\n[^)]*\)`
- **forbid_code:**
  - `(?:print\s*\([\s\S]*?){2}`
- **expect_exact_output:** |
  red
  blue
- **tutor:** `print("red\nblue")` — one string, one embedded newline.
- **pass_rule:** Run exits 0 and stdout is exactly `red` then `blue`.

### py-4.1-03 · \t Represents a Tab

- **type:** concept
- **read:** Tabs work a lot like new lines. The escape sequence `\t` adds one
  tab character to a string. A tab moves whatever comes next to a tab
  position, so the visible gap can look wider or narrower depending on where
  it's displayed. In `"A\tB"`, there's just one tab between `A` and `B` — not
  a visible backslash and the letter `t`.
- **check:** What character appears between `left` and `right` in the string
  `"left\tright"`?
  - A. a new line
  - B. a single ordinary space
  - C. a tab
  - D. the letter `t`
- **answer:** C
- **rationale:** Python reads `\t` as one tab character.
- **if_incorrect:** Read the backslash and `t` as a pair. That pair means
  "insert a tab," not a space, a new line, or the visible letter `t`.
- **tutor:** Ask the learner to compare how `\n` and `\t` are built — both are
  a backslash plus one letter, each with its own special meaning.
- **pass_rule:** Learner selects C.

### py-4.1-04 · Put a Tab in Output

- **type:** practical
- **do:** With one `print()` call, display `Name`, one tab character, and
  `Score`. **Use `\t` inside one string literal; do not replace it with
  spaces.**
- **solution:**
  ```python
  print("Name\tScore")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `print\s*\([^)]*\\t[^)]*\)`
- **expect_exact_output:** |
  Name	Score
- **tutor:** `print("Name\tScore")` — the tab is one character, not several
  spaces.
- **pass_rule:** Run exits 0 and stdout is exactly `Name`, one tab character,
  then `Score`.

### py-4.1-05 · A Backslash Can Escape a Matching Quote

- **type:** concept
- **read:** Quotes can get awkward when the quote you want to display matches
  the one wrapped around the string — normally, that matching quote would end
  the string right there. Put a backslash before it, and Python keeps it as
  part of the text instead. `"She said \"Go!\""` includes the double quotes
  around `Go!`. You could also just wrap the whole thing in single quotes
  instead, but here we're practicing the escape sequence `\"`.
- **check:** Which double-quoted literal contains the text `Say "yes"`?
  - A. `"Say \"yes\""`
  - B. `"Say "yes""`
  - C. `"Say \\yes\\"`
  - D. `"Say yes"`
- **answer:** A
- **rationale:** Each `\"` tells Python to keep that double quote as part of
  the text.
- **if_incorrect:** The first and last quotes still mark the string's
  boundaries. The two quotes around `yes` need backslashes so Python knows
  they belong in the text.
- **tutor:** Ask the learner to point out which quotes in the literal open and
  close the string, versus which ones are just data being displayed.
- **pass_rule:** Learner selects A.

### py-4.1-06 · Include Quotation Marks

- **type:** practical
- **do:** With one double-quoted string literal, print exactly `She said, "Go!"`.
  **Use `\"` for both quotation marks around `Go!`; do not switch the outer
  string to single quotes.**
- **solution:**
  ```python
  print("She said, \"Go!\"")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `\\"[\s\S]*\\"`
- **forbid_code:**
  - `'She said`
- **expect_exact_output:** |
  She said, "Go!"
- **tutor:** `print("She said, \"Go!\"")` — a backslash in front of each
  double quote that needs to be part of the text.
- **pass_rule:** Run exits 0 and stdout is exactly `She said, "Go!"`.

### py-4.1-07 · \\ Represents One Backslash

- **type:** concept
- **read:** A backslash already has a special job: it kicks off an escape
  sequence. So when you actually want a backslash to show up in the text, you
  write two of them — `\\`. Python reads that pair as one backslash character.
  For example, `"a\\b"` contains just three displayed characters: `a`, `\`,
  and `b`.
- **check:** What does `print("one\\two")` display?
  - A. `one\\\\two`
  - B. `onetwo`
  - C. `one\\two`
  - D. `one\two`
- **answer:** D
- **rationale:** The two source backslashes work as a pair and become one
  backslash in the displayed text.
- **if_incorrect:** Pair the backslashes from left to right. Each `\\` in the
  string literal gives you one visible backslash.
- **tutor:** Ask the learner to pair up the backslashes two at a time and count
  how many pairs are left over.
- **pass_rule:** Learner selects D.

### py-4.1-08 · Include a Backslash

- **type:** practical
- **do:** With one ordinary string literal, print exactly `C:\data`. **Write
  the backslash as `\\`; a single `\t` would create a tab instead.**
- **solution:**
  ```python
  print("C:\\data")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `print\s*\([^)]*\\{2}[^)]*\)`
- **expect_exact_output:** |
  C:\data
- **tutor:** `print("C:\\data")`. Passing this item completes Lesson 4.1 and
  unlocks Lesson 4.2.
- **pass_rule:** Run exits 0 and stdout is exactly `C:\data`.

---

## Lesson 4.2 — String Indexing  {#py-4.2}

- **objective:** Retrieve individual characters with zero-based positive
  indexes, negative indexes, and an index calculated from `len()`.
- **estimated_time:** 20–30 min
- **item_count:** 8
- **live_coding_items:** 4

### py-4.2-01 · Indexes Identify Character Positions

- **type:** concept
- **read:** You can think of a string as a row of **characters**. A character
  might be a letter, digit, space, punctuation mark, or any other single piece
  of text. An **index** is just the numbered position of one character in
  that row. Python starts counting at `0`, so `word[0]` gets you the first
  character. If `word = "code"`, then `word[0]` is `"c"` and `word[1]` is
  `"o"`. Each result you get back is still a string — just a one-character
  one.
- **check:** With `word = "python"`, what does `word[0]` produce?
  - A. `"p"`
  - B. `"y"`
  - C. `"python"`
  - D. `0`
- **answer:** A
- **rationale:** Python numbers the first character with index `0`, so
  `word[0]` is `"p"`.
- **if_incorrect:** Start counting at `0`, not `1`. Indexing gives you the
  character at that position, not the whole word or the number itself.
- **tutor:** Ask the learner to write a `0` under the first letter of a short
  word and count forward from there.
- **pass_rule:** Learner selects A.

### py-4.2-02 · Print the First Character

- **type:** practical
- **do:** Assign `"rocket"` to `word`. Print its first character by indexing
  `word`. **Pass `word[0]` to `print()`; do not print `"r"` directly.**
- **solution:**
  ```python
  word = "rocket"
  print(word[0])
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `print\s*\(\s*[A-Za-z_]\w*\s*\[\s*0\s*\]\s*\)`
- **expect_exact_output:** |
  r
- **tutor:** `print(word[0])` — indexing retrieves the character, no
  hardcoding needed.
- **pass_rule:** Run exits 0 and stdout is exactly `r`.

### py-4.2-03 · Positive Indexes Count from the Start

- **type:** concept
- **read:** Once the first character is index `0`, the numbers just keep going
  from left to right — the second character is `1`, the third is `2`, and so
  on. Spaces and punctuation count too. In `"a b"`, the space has index `1`
  because it sits right between the `a` at `0` and the `b` at `2`.
- **check:** With `text = "planet"`, which expression retrieves `"n"`?
  - A. `text[1]`
  - B. `text[2]`
  - C. `text[4]`
  - D. `text[3]`
- **answer:** D
- **rationale:** Counting from zero gives `p:0`, `l:1`, `a:2`, and `n:3`.
- **if_incorrect:** Try writing a `0` under the first letter, then keep
  counting to the right. The `n` lines up with `3`.
- **tutor:** Ask the learner to count out loud from `0` through each letter of
  `planet` until they reach `n`.
- **pass_rule:** Learner selects D.

### py-4.2-04 · Retrieve a Character by Position

- **type:** practical
- **do:** Assign `"planet"` to `text`. Assign the character at index `3` to
  `character`, then print `Character: n` with an f-string. **Retrieve the
  value with `text[3]` and insert `{character}` in the output.**
- **solution:**
  ```python
  text = "planet"
  character = text[3]
  print(f"Character: {character}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `[A-Za-z_]\w*\s*\[\s*3\s*\]`
  - `f["'][^"']*\{character\}`
- **expect_exact_output:** |
  Character: n
- **tutor:** `character = text[3]` then `print(f"Character: {character}")`.
- **pass_rule:** Run exits 0 and stdout is exactly `Character: n`.

### py-4.2-05 · Negative Indexes Count from the End

- **type:** concept
- **read:** You can also count from the other end of a string. Negative
  indexes start at `-1`, which gets you the last character. `-2` gets you the
  one just before that, and the pattern keeps moving left from there. With
  `word = "code"`, `word[-1]` is `"e"` and `word[-2]` is `"d"`.
- **check:** With `word = "train"`, what does `word[-2]` produce?
  - A. `"n"`
  - B. `"i"`
  - C. `"a"`
  - D. `"t"`
- **answer:** B
- **rationale:** Start at the right: `-1` is `n`, so `-2` is the `i` just
  before it.
- **if_incorrect:** Put `-1` under the last character, then move one place
  left. That character has index `-2`.
- **tutor:** Ask the learner to label the last three letters of `train` with
  `-1`, `-2`, and `-3` from right to left.
- **pass_rule:** Learner selects B.

### py-4.2-06 · Print the Last Character

- **type:** practical
- **do:** Assign `"compass"` to `word`. Print its last character using a
  negative index. **Use `word[-1]`; do not use a positive index or print
  `"s"` directly.**
- **solution:**
  ```python
  word = "compass"
  print(word[-1])
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `[A-Za-z_]\w*\s*\[\s*-1\s*\]`
- **expect_exact_output:** |
  s
- **tutor:** `print(word[-1])` works no matter how long the word is.
- **pass_rule:** Run exits 0 and stdout is exactly `s`.

### py-4.2-07 · len() Determines the Last Positive Index

- **type:** concept
- **read:** `len(text)` tells you how many characters a string has. There's
  one small catch worth knowing: length counts how many characters there are,
  while indexes start at `0` — which means the last positive index is always
  `len(text) - 1`. A five-character string, for instance, has indexes `0`
  through `4`. Ask for a position outside that valid range and Python stops
  with an error, so it's worth checking before you index.
- **check:** A string has `8` characters. What is its last valid positive
  index?
  - A. `8`
  - B. `9`
  - C. `7`
  - D. `-8`
- **answer:** C
- **rationale:** Eight characters have indexes `0` through `7`, so the last
  one is `8 - 1`.
- **if_incorrect:** Length answers "how many?" while an index answers "which
  position?" Because positions begin at `0`, the last one is always one below
  the length.
- **tutor:** Ask the learner to list the indexes of a short, concrete example
  string one at a time, then compare the count to the last index.
- **pass_rule:** Learner selects C.

### py-4.2-08 · Calculate the Last Index

- **type:** practical
- **do:** Assign `"notebook"` to `word`. Calculate `len(word) - 1` and assign
  it to `last_index`. Use `last_index` to print the final character. **Do not
  use `-1`, the literal index `7`, or the literal character `"k"`.**
- **solution:**
  ```python
  word = "notebook"
  last_index = len(word) - 1
  print(word[last_index])
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `len\s*\(\s*[A-Za-z_]\w*\s*\)\s*-\s*1`
  - `[A-Za-z_]\w*\s*\[\s*[A-Za-z_]\w*\s*\]`
- **forbid_code:**
  - `\[\s*-?7\s*\]`
  - `\[\s*-1\s*\]`
- **expect_exact_output:** |
  k
- **tutor:** `last_index = len(word) - 1`, then `print(word[last_index])`.
  Passing this item completes Lesson 4.2 and unlocks Lesson 4.3.
- **pass_rule:** Run exits 0 and stdout is exactly `k`.

---

## Lesson 4.3 — String Slicing  {#py-4.3}

- **objective:** Extract a range of characters with start and stop indexes,
  including slices with an omitted start or stop.
- **estimated_time:** 15–25 min
- **item_count:** 6
- **live_coding_items:** 3

### py-4.3-01 · A Slice Extracts a Range

- **type:** concept
- **read:** Indexing gets you one character. A **slice** gets you a whole
  section of a string. Write it as `text[start:stop]`. Python includes the
  `start` position but stops **before** the `stop` position. So if
  `text = "python"`, the slice `text[1:4]` uses indexes `1`, `2`, and `3` and
  gives you `"yth"`.
- **check:** With `word = "planet"`, what does `word[1:4]` produce?
  - A. `"lan"`
  - B. `"lane"`
  - C. `"pla"`
  - D. `"anet"`
- **answer:** A
- **rationale:** The slice starts at index `1`, includes `1`, `2`, and `3`,
  then stops before index `4`.
- **if_incorrect:** Keep this rule handy: include the start, leave out the
  stop. For `[1:4]`, take positions `1` through `3`.
- **tutor:** Have the learner list out indexes `1` through `3` of `planet` one
  at a time before combining them.
- **pass_rule:** Learner selects A.

### py-4.3-02 · Extract a Middle Slice

- **type:** practical
- **do:** Assign `"notebook"` to `word`. Assign `word[1:5]` to `middle`, then
  print `middle`. **Use the slice exactly as shown; do not assign or print
  `"oteb"` directly.**
- **solution:**
  ```python
  word = "notebook"
  middle = word[1:5]
  print(middle)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `[A-Za-z_]\w*\s*\[\s*1\s*:\s*5\s*\]`
- **expect_exact_output:** |
  oteb
- **tutor:** `middle = word[1:5]` then `print(middle)`.
- **pass_rule:** Run exits 0 and stdout is exactly `oteb`.

### py-4.3-03 · Slice Bounds Can Be Omitted

- **type:** concept
- **read:** You don't always have to write both slice boundaries. Leave out
  the start, and Python just begins at the start of the string —
  `text[:3]` takes indexes `0`, `1`, and `2`. Leave out the stop, and Python
  continues all the way to the end — `text[3:]` starts at index `3` and takes
  everything after it. Leave both out, and `text[:]` just gives you the whole
  string back.
- **check:** With `word = "sunshine"`, what does `word[:3]` produce?
  - A. `"un"`
  - B. `"suns"`
  - C. `"shine"`
  - D. `"sun"`
- **answer:** D
- **rationale:** With no start written, Python begins at index `0` and stops
  before index `3`.
- **if_incorrect:** Read `[:3]` as "everything before position 3." That gives
  you positions `0`, `1`, and `2`.
- **tutor:** Ask the learner what index `[:3]` would start at if the missing
  start were filled in.
- **pass_rule:** Learner selects D.

### py-4.3-04 · Extract Two String Parts

- **type:** practical
- **do:** Assign `"unhappy"` to `word`. Assign `word[:2]` to `prefix` and
  `word[2:]` to `rest`. Print `prefix` and `rest` on separate lines. **Use the
  two required slices rather than writing either result directly.**
- **solution:**
  ```python
  word = "unhappy"
  prefix = word[:2]
  rest = word[2:]
  print(prefix)
  print(rest)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `[A-Za-z_]\w*\s*\[\s*:\s*2\s*\]`
  - `[A-Za-z_]\w*\s*\[\s*2\s*:\s*\]`
- **expect_exact_output:** |
  un
  happy
- **tutor:** `prefix = word[:2]`, `rest = word[2:]`, then print each.
- **pass_rule:** Run exits 0 and stdout is exactly `un` then `happy`.

### py-4.3-05 · A Slice Produces a New String

- **type:** concept
- **read:** A slice is a brand-new string, not a cut made into the original.
  If `word = "garden"` and `part = word[1:4]`, `part` becomes `"ard"`, but
  `word` is still `"garden"`, untouched. You can assign the slice, print it,
  or combine it with other strings using `+`.
- **check:** After `text = "window"` and `part = text[:3]`, what is the value
  of `text`?
  - A. `"win"`
  - B. `"window"`
  - C. `"dow"`
  - D. an empty string
- **answer:** B
- **rationale:** `part` gets a new string containing `"win"`. The original
  `text` variable still contains `"window"`.
- **if_incorrect:** Track the two variables separately: `part` receives the
  slice, while `text` keeps the full original string.
- **tutor:** Ask the learner which variable the slice was assigned to, and
  whether that assignment could reach back and change `text`.
- **pass_rule:** Learner selects B.

### py-4.3-06 · Extract Two Parts of a Code

- **type:** practical
- **do:** Assign `"ZX-2048"` to `code`. Assign `code[:2]` to `letters` and
  `code[3:]` to `digits`. Use one f-string to print `ZX 2048`. **Both
  displayed parts must come from the slice variables.**
- **solution:**
  ```python
  code = "ZX-2048"
  letters = code[:2]
  digits = code[3:]
  print(f"{letters} {digits}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `[A-Za-z_]\w*\s*\[\s*:\s*2\s*\]`
  - `[A-Za-z_]\w*\s*\[\s*3\s*:\s*\]`
  - `f["'][^"']*\{letters\}[^"']*\{digits\}`
- **expect_exact_output:** |
  ZX 2048
- **tutor:** `letters = code[:2]`, `digits = code[3:]`, then
  `print(f"{letters} {digits}")`. Passing this item completes Lesson 4.3 and
  unlocks Lesson 4.4.
- **pass_rule:** Run exits 0 and stdout is exactly `ZX 2048`.

---

## Lesson 4.4 — Slice Steps and Reversal  {#py-4.4}

- **objective:** Select characters at regular intervals with a positive slice
  step and reverse a string with the specific `[::-1]` pattern.
- **estimated_time:** 15–25 min
- **item_count:** 6
- **live_coding_items:** 3

### py-4.4-01 · A Slice Step Skips Between Characters

- **type:** concept
- **read:** A slice can actually take a third number: `text[start:stop:step]`.
  The **step** tells Python how far to jump before grabbing the next
  character. With a positive step of `2`, it takes a character, skips one,
  takes the next, and keeps going like that. When both boundaries are left
  out, `text[::2]` starts at index `0`. Applied to `"abcdef"`, it takes
  indexes `0`, `2`, and `4`, giving you `"ace"`.
- **check:** What does `"1234567"[::2]` produce?
  - A. `"234567"`
  - B. `"246"`
  - C. `"1357"`
  - D. `"7654321"`
- **answer:** C
- **rationale:** Starting at index `0` and jumping two positions at a time
  selects `1`, `3`, `5`, and `7`.
- **if_incorrect:** Follow positions, not the digits themselves. Start with the
  first character, then skip one character before taking the next.
- **tutor:** Ask the learner to write the index number under each digit of
  `1234567`, then circle every other index starting at `0`.
- **pass_rule:** Learner selects C.

### py-4.4-02 · Select Every Other Character

- **type:** practical
- **do:** Assign `"abcdefgh"` to `letters`. Assign `letters[::2]` to
  `alternating`, then print it. **Use the step slice; do not write `"aceg"`
  directly.**
- **solution:**
  ```python
  letters = "abcdefgh"
  alternating = letters[::2]
  print(alternating)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `[A-Za-z_]\w*\s*\[\s*:\s*:\s*2\s*\]`
- **expect_exact_output:** |
  aceg
- **tutor:** `alternating = letters[::2]` then `print(alternating)`.
- **pass_rule:** Run exits 0 and stdout is exactly `aceg`.

### py-4.4-03 · Start, Stop, and Step Work Together

- **type:** concept
- **read:** All three parts of a slice actually work together. Python starts
  at `start`, moves by the `step`, and stops before `stop`. For example,
  `"0123456789"[1:8:2]` starts at index `1`, then takes `3`, `5`, and `7`. The
  result is `"1357"`. We'll use only positive steps in this three-number form.
- **check:** What does `"abcdefghij"[2:9:3]` produce?
  - A. `"cfi"`
  - B. `"beh"`
  - C. `"cfij"`
  - D. `"defghi"`
- **answer:** A
- **rationale:** Starting at `2` and adding `3` each time gives indexes `2`,
  `5`, and `8`. Python stops before `9`.
- **if_incorrect:** Walk through the three numbers in order: start at `2`,
  jump by `3`, and stop before `9`.
- **tutor:** Ask the learner to walk the string index by index, marking every
  third position starting at `2`, and stop before reaching `9`.
- **pass_rule:** Learner selects A.

### py-4.4-04 · Use All Three Slice Parts

- **type:** practical
- **do:** Assign `"0123456789"` to `digits`. Assign `digits[1:8:2]` to
  `selected`, then print it. **Use the exact start, stop, and step values
  shown.**
- **solution:**
  ```python
  digits = "0123456789"
  selected = digits[1:8:2]
  print(selected)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `[A-Za-z_]\w*\s*\[\s*1\s*:\s*8\s*:\s*2\s*\]`
- **expect_exact_output:** |
  1357
- **tutor:** `selected = digits[1:8:2]` then `print(selected)`.
- **pass_rule:** Run exits 0 and stdout is exactly `1357`.

### py-4.4-05 · [::-1] Reverses a String

- **type:** concept
- **read:** There's one especially handy slice pattern worth remembering:
  `text[::-1]` reverses a string. The missing boundaries mean "use the whole
  string," and the `-1` step means "move backward one character at a time."
  If `word = "code"`, then `word[::-1]` gives you `"edoc"`. We won't use any
  other negative-step patterns in this topic.
- **check:** What does `"drawer"[::-1]` produce?
  - A. `"drawer"`
  - B. `"dae"`
  - C. `"rwe"`
  - D. `"reward"`
- **answer:** D
- **rationale:** `[::-1]` takes every character, starting at the end and
  moving backward.
- **if_incorrect:** Start with the final character and move left one character
  at a time. Keep every character along the way.
- **tutor:** Ask the learner to read `drawer` backward out loud, one letter at
  a time.
- **pass_rule:** Learner selects D.

### py-4.4-06 · Reverse Input Text

- **type:** practical
- **do:** Read one line containing at least one character. Assign
  `text[::-1]` to `reversed_text`, then print it. Do not print a prompt.
  **Use the exact reversal slice `[::-1]`; do not hardcode any test result.**
- **solution:**
  ```python
  text = input()
  reversed_text = text[::-1]
  print(reversed_text)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `[A-Za-z_]\w*\s*\[\s*:\s*:\s*-1\s*\]`
- **hidden_tests:**
  ```yaml
  - stdin: "stressed"
    stdout: "desserts"
  - stdin: "Python 3"
    stdout: "3 nohtyP"
  - stdin: "level"
    stdout: "level"
  ```
- **tutor:** `text = input()` then `print(text[::-1])`. Passing this item
  completes Lesson 4.4 and unlocks Lesson 4.5.
- **pass_rule:** All hidden tests pass.

---

## Lesson 4.5 — String Immutability  {#py-4.5}

- **objective:** Explain that a string cannot be changed character by
  character and construct changed text as a new string value.
- **estimated_time:** 15–25 min
- **item_count:** 6
- **live_coding_items:** 3

### py-4.5-01 · Strings Cannot Be Changed in Place

- **type:** concept
- **read:** Python strings are **immutable**. That just means you can't reach
  into an existing string and swap out one character. An instruction like
  `word[0] = "B"` simply won't work. Instead, build a brand-new string out of
  the pieces you want — something like `"B" + word[1:]` — and assign that new
  string to a variable.
- **check:** With `word = "cat"`, which instruction validly creates `"bat"`
  and assigns it back to `word`?
  - A. `word[0] = "b"`
  - B. `word = "b" + word[1:]`
  - C. `word[0] == "b"`
  - D. `word[0] += "b"`
- **answer:** B
- **rationale:** `"b" + word[1:]` builds the new string `"bat"`, and the
  assignment stores it in `word`.
- **if_incorrect:** You can't assign to one position inside a string, and `==`
  only compares. The working choice builds a complete new string and assigns
  it.
- **tutor:** Ask the learner which choices try to reach *into* the string
  versus which one builds a whole new one from scratch.
- **pass_rule:** Learner selects B.

### py-4.5-02 · Replace the First Character by Rebuilding

- **type:** practical
- **do:** Assign `"lake"` to `word`. Build `"cake"` as `"c" + word[1:]`,
  assign the result to `changed`, and print `changed`. **Do not assign to
  `word[0]` and do not write the complete string `"cake"` directly.**
- **solution:**
  ```python
  word = "lake"
  changed = "c" + word[1:]
  print(changed)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `["']c["']\s*\+\s*[A-Za-z_]\w*\s*\[\s*1\s*:\s*\]`
- **forbid_code:**
  - `\[\s*0\s*\]\s*=(?!=)`
- **expect_exact_output:** |
  cake
- **tutor:** `changed = "c" + word[1:]` then `print(changed)`. `word` itself
  is never edited.
- **pass_rule:** Run exits 0 and stdout is exactly `cake`.

### py-4.5-03 · String Operations Return New Values

- **type:** concept
- **read:** The same idea applies to the string operations you already know.
  Concatenation, repetition, and slicing all build new strings — they don't
  rewrite the ones they started with. After `original = "go"` and
  `changed = original + "al"`, `changed` is `"goal"`, but `original` is still
  just `"go"`.
- **check:** After `original = "sun"` and `longer = original + "set"`, what is
  the value of `original`?
  - A. `"sunset"`
  - B. an empty string
  - C. `"sun"`
  - D. `"set"`
- **answer:** C
- **rationale:** Concatenation gives `longer` the new value `"sunset"` without
  changing `original`.
- **if_incorrect:** Follow the assignment: the result of `+` goes into
  `longer`. Nothing assigns a new value to `original`.
- **tutor:** Ask the learner which variable is on the left of the `=` in the
  second line — that's the only one that changes.
- **pass_rule:** Learner selects C.

### py-4.5-04 · Keep the Original and the New String

- **type:** practical
- **do:** Assign `"play"` to `original`. Assign `original + "ful"` to
  `expanded`. Print `original` and then `expanded` on separate lines. **Build
  `expanded` with concatenation and print both variables.**
- **solution:**
  ```python
  original = "play"
  expanded = original + "ful"
  print(original)
  print(expanded)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `[A-Za-z_]\w*\s*\+\s*["']ful["']`
  - `(?:print\s*\(\s*[A-Za-z_]\w*\s*\)[\s\S]*?){2}`
- **expect_exact_output:** |
  play
  playful
- **tutor:** `expanded = original + "ful"`, then print each variable in turn.
- **pass_rule:** Run exits 0 and stdout is exactly `play` then `playful`.

### py-4.5-05 · A Variable Can Be Reassigned to New Text

- **type:** concept
- **read:** Immutable strings don't stop you from reassigning a variable,
  though. In `word = word + "s"`, Python first builds a brand-new string,
  then assigns that new value back to `word`. The old string was never
  edited — the variable just got handed a new value. It's the exact same
  "latest assignment wins" rule you already used with numbers.
- **check:** What does this code print?

  ```python
  word = "sun"
  word = word + "set"
  print(word)
  ```

  - A. `"sunset"`
  - B. `"sun"`
  - C. `"set"`
  - D. an error because strings are immutable
- **answer:** A
- **rationale:** The `+` builds `"sunset"`, and the second assignment stores
  that new string in `word`.
- **if_incorrect:** Immutability only stops you from editing the old string
  character by character. It doesn't stop the variable from receiving a
  newly built string.
- **tutor:** Ask the learner what `word` refers to right after the second line
  runs — a completely new value, or an edited version of the old one?
- **pass_rule:** Learner selects A.

### py-4.5-06 · Remove a Character by Rebuilding

- **type:** practical
- **do:** Assign `"pyXthon"` to `text`. Build `"python"` by joining
  `text[:2]` and `text[3:]`, assign the result to `corrected`, and print it.
  **Remove the character at index `2` with the two required slices; do not
  use a method or write `"python"` directly.**
- **solution:**
  ```python
  text = "pyXthon"
  corrected = text[:2] + text[3:]
  print(corrected)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `[A-Za-z_]\w*\s*\[\s*:\s*2\s*\]\s*\+\s*[A-Za-z_]\w*\s*\[\s*3\s*:\s*\]`
- **forbid_code:**
  - `\.replace\s*\(`
- **expect_exact_output:** |
  python
- **tutor:** `corrected = text[:2] + text[3:]` — skip index `2` by slicing
  around it. Passing this item completes Lesson 4.5 and unlocks Lesson 4.6.
- **pass_rule:** Run exits 0 and stdout is exactly `python`.

---

## Lesson 4.6 — Case and Whitespace Methods  {#py-4.6}

- **objective:** Call string methods that change letter case or remove
  surrounding whitespace, and chain those methods to normalize input.
- **estimated_time:** 20–30 min
- **item_count:** 8
- **live_coding_items:** 4

### py-4.6-01 · A Method Is Called on a Value

- **type:** concept
- **read:** Python gives strings their own useful built-in functions, called
  **methods**. To use one, you write the string, a dot, the method name, and
  parentheses. For example, `word.upper()` calls the `upper` method on `word`
  and hands you back a new string with uppercase letters. It doesn't rewrite
  `word` itself — strings are immutable, so `word` only changes if you assign
  it a new value.
- **check:** With `word = "quiet"`, what does `word.upper()` produce?
  - A. `"Quiet"`
  - B. `"quiet"`
  - C. `"QUIET()"`
  - D. `"QUIET"`
- **answer:** D
- **rationale:** `upper()` gives you a new string with every letter converted
  to uppercase.
- **if_incorrect:** Apply the method to every letter. The parentheses are part
  of the method call, not part of the returned text.
- **tutor:** Ask the learner whether the parentheses in `word.upper()` are
  something Python displays or just the syntax for calling the method.
- **pass_rule:** Learner selects D.

### py-4.6-02 · Convert Text to Uppercase

- **type:** practical
- **do:** Assign `"launch ready"` to `message`. Assign `message.upper()` to
  `loud`, then print `loud`. **Call `upper()` on `message`; do not write the
  uppercase result directly.**
- **solution:**
  ```python
  message = "launch ready"
  loud = message.upper()
  print(loud)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `\.upper\s*\(\s*\)`
- **expect_exact_output:** |
  LAUNCH READY
- **tutor:** `loud = message.upper()` then `print(loud)`.
- **pass_rule:** Run exits 0 and stdout is exactly `LAUNCH READY`.

### py-4.6-03 · lower() Converts Letters to Lowercase

- **type:** concept
- **read:** `lower()` goes the other direction — it gives you a new string
  with lowercase letters. Digits, spaces, and punctuation don't have upper or
  lower forms, so they just stay put. `"Code 3!".lower()`, for instance, gives
  you `"code 3!"`.
- **check:** What does `"PyThOn 3".lower()` produce?
  - A. `"PYTHON 3"`
  - B. `"python 3"`
  - C. `"Python 3"`
  - D. `"python"`
- **answer:** B
- **rationale:** `lower()` changes every letter to lowercase and leaves the
  space and digit alone.
- **if_incorrect:** Lowercase every letter, but don't remove anything. The
  space and `3` remain in the result.
- **tutor:** Ask the learner to pick out which characters in `"PyThOn 3"`
  actually have a lowercase form at all.
- **pass_rule:** Learner selects B.

### py-4.6-04 · Normalize Letter Case

- **type:** practical
- **do:** Read one line of text. Assign `text.lower()` to `normalized`, then
  print it. Do not print a prompt. **Use `lower()` on the input variable
  rather than hardcoding any result.**
- **solution:**
  ```python
  text = input()
  normalized = text.lower()
  print(normalized)
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\.lower\s*\(\s*\)`
- **hidden_tests:**
  ```yaml
  - stdin: "TrAkCoDe"
    stdout: "trakcode"
  - stdin: "READY 2 GO!"
    stdout: "ready 2 go!"
  - stdin: "already lowercase"
    stdout: "already lowercase"
  ```
- **tutor:** `normalized = text.lower()` then `print(normalized)`.
- **pass_rule:** All hidden tests pass.

### py-4.6-05 · strip() Removes Surrounding Whitespace

- **type:** concept
- **read:** Text from a person or a file often shows up with extra spacing
  around it. Spaces, tabs, and line breaks are all kinds of **whitespace**.
  The `strip()` method removes whitespace from both ends of a string and
  hands you back the cleaned result. It leaves spacing inside the text
  alone, so `"  red fox  ".strip()` becomes `"red fox"` — the middle space
  stays right where it is.
- **check:** What does `"  blue sky  ".strip()` produce?
  - A. `"bluesky"`
  - B. `"  blue sky"`
  - C. `"blue sky"`
  - D. `"blue sky  "`
- **answer:** C
- **rationale:** `strip()` removes the extra spaces at both ends but keeps the
  space between `blue` and `sky`.
- **if_incorrect:** Clean both outer edges and leave the middle alone. The two
  words should still have one space between them.
- **tutor:** Ask the learner to point out exactly which spaces `strip()`
  removes and which one it has to leave behind.
- **pass_rule:** Learner selects C.

### py-4.6-06 · Strip Surrounding Spaces

- **type:** practical
- **do:** Assign `"  ready  "` to `raw`. Assign `raw.strip()` to `clean`, then
  print `<ready>` by placing `clean` between `<` and `>` in an f-string.
  **Use `strip()` and the `{clean}` placeholder; the angle brackets make
  removed spaces visible.**
- **solution:**
  ```python
  raw = "  ready  "
  clean = raw.strip()
  print(f"<{clean}>")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `\.strip\s*\(\s*\)`
  - `f["'][^"']*\{clean\}`
- **expect_exact_output:** |
  <ready>
- **tutor:** `clean = raw.strip()` then `print(f"<{clean}>")`.
- **pass_rule:** Run exits 0 and stdout is exactly `<ready>`.

### py-4.6-07 · Method Calls Can Be Chained

- **type:** concept
- **read:** You can actually run one string method right after another. This
  is called a **method chain**, and Python works through it left to right. In
  `text.strip().lower()`, `strip()` cleans the ends first, then `lower()`
  lowercases that already-cleaned string. You end up with one final new
  string, while the original stays untouched.
- **check:** What does `"  HeLLo  ".strip().lower()` produce?
  - A. `"hello"`
  - B. `"  hello  "`
  - C. `"HELLO"`
  - D. `"  HeLLo  "`
- **answer:** A
- **rationale:** `strip()` removes the outer spaces first, and `lower()` then
  changes the remaining letters to lowercase.
- **if_incorrect:** Follow the dots from left to right. Clean the ends, then
  lowercase the text; both steps affect the final result.
- **tutor:** Ask the learner to run the two methods one at a time on paper,
  writing down the result after each dot.
- **pass_rule:** Learner selects A.

### py-4.6-08 · Normalize a Name

- **type:** practical
- **do:** Read one line containing at least one English letter after
  surrounding whitespace is removed. Assign `raw.strip()` to `clean`. Build
  `display` from `clean[0].upper()` plus `clean[1:].lower()`, then print
  `Name: <display>` with an f-string. Do not print a prompt. **Use all three
  required method calls and build the displayed name from the indexed and
  sliced parts.**
- **solution:**
  ```python
  raw = input()
  clean = raw.strip()
  display = clean[0].upper() + clean[1:].lower()
  print(f"Name: {display}")
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\.strip\s*\(\s*\)`
  - `\[\s*0\s*\]\s*\.upper\s*\(\s*\)`
  - `\[\s*1\s*:\s*\]\s*\.lower\s*\(\s*\)`
- **hidden_tests:**
  ```yaml
  - stdin: "  aDA  "
    stdout: "Name: Ada"
  - stdin: "GRACE"
    stdout: "Name: Grace"
  - stdin: "  sam"
    stdout: "Name: Sam"
  ```
- **tutor:** `clean = raw.strip()`, then
  `display = clean[0].upper() + clean[1:].lower()`. Passing this item
  completes Lesson 4.6 and unlocks Lesson 4.7.
- **pass_rule:** All hidden tests pass.

---

## Lesson 4.7 — Membership, Prefixes, and Suffixes  {#py-4.7}

- **objective:** Test whether a string contains, begins with, or ends with
  specific text and store the resulting Boolean value.
- **estimated_time:** 20–30 min
- **item_count:** 8
- **live_coding_items:** 4

### py-4.7-01 · in Tests String Membership

- **type:** concept
- **read:** Use `in` when you want to ask, "Does this text show up inside
  that string?" The matching characters have to be together and in the same
  order. The answer comes back as `True` or `False`. For example,
  `"cat" in "concatenate"` is `True`. Capitalization still matters, though,
  so `"Cat" in "concatenate"` is `False`.
- **check:** What does `"sun" in "sunflower"` produce?
  - A. `"sun"`
  - B. `True`
  - C. `False`
  - D. the index `0`
- **answer:** B
- **rationale:** The exact text `"sun"` appears together at the start of
  `"sunflower"`.
- **if_incorrect:** Look for the exact characters `s`, `u`, and `n` together.
  `in` answers with a Boolean; it doesn't return the text or its position.
- **tutor:** Ask the learner what type of value `in` always hands back,
  regardless of what it's searching for.
- **pass_rule:** Learner selects B.

### py-4.7-02 · Check Whether Input Contains Text

- **type:** practical
- **do:** Read one line of text. Assign the result of `"code" in text` to
  `contains_code`, then print `Contains code: <contains_code>` with an
  f-string. Do not print a prompt. **Use the case-sensitive `in` expression
  exactly as shown.**
- **solution:**
  ```python
  text = input()
  contains_code = "code" in text
  print(f"Contains code: {contains_code}")
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `["']code["']\s+in\s+[A-Za-z_]\w*`
- **forbid_code:**
  - `\bnot\s+in\b`
- **hidden_tests:**
  ```yaml
  - stdin: "I write code"
    stdout: "Contains code: True"
  - stdin: "decode this"
    stdout: "Contains code: True"
  - stdin: "CODE"
    stdout: "Contains code: False"
  ```
- **tutor:** `contains_code = "code" in text` then the f-string.
- **pass_rule:** All hidden tests pass.

### py-4.7-03 · not in Tests Absence

- **type:** concept
- **read:** `not in` asks the opposite question: "Is this text missing?" It
  gives you `True` when the text isn't there and `False` when it is. So
  `"x" not in "team"` is `True`, while `"e" not in "team"` is `False`.
- **check:** What does `"z" not in "puzzle"` produce?
  - A. `True`
  - B. `"z"`
  - C. the index `2`
  - D. `False`
- **answer:** D
- **rationale:** There is a `z` in `"puzzle"`, so saying that `z` is not in
  the word is `False`.
- **if_incorrect:** Find the `z` first. Because it is present, the question
  "is `z` not in this word?" must be answered with `False`.
- **tutor:** Ask the learner to find the `z` in `puzzle` before deciding how
  `not in` should answer.
- **pass_rule:** Learner selects D.

### py-4.7-04 · Check That Text Is Absent

- **type:** practical
- **do:** Assign `"team report"` to `text`. Assign `"x" not in text` to
  `no_x`, then print `No x: True` with an f-string. **Calculate `no_x` with
  `not in`; do not assign the Boolean directly.**
- **solution:**
  ```python
  text = "team report"
  no_x = "x" not in text
  print(f"No x: {no_x}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `["']x["']\s+not\s+in\s+[A-Za-z_]\w*`
- **expect_exact_output:** |
  No x: True
- **tutor:** `no_x = "x" not in text` then the f-string.
- **pass_rule:** Run exits 0 and stdout is exactly `No x: True`.

### py-4.7-05 · startswith() Checks the Beginning

- **type:** concept
- **read:** `startswith(text)` checks only the beginning of a string. It
  gives you `True` when the opening characters match and `False` when they
  don't — and the match is case-sensitive. For example,
  `"python.py".startswith("py")` is `True`; the text `"py"` only has to match
  the beginning, not the whole string.
- **check:** What does `"notebook".startswith("note")` produce?
  - A. `True`
  - B. `False`
  - C. `"note"`
  - D. `4`
- **answer:** A
- **rationale:** `"notebook"` begins with the exact four characters `"note"`.
- **if_incorrect:** Compare only the beginning. The method answers `True` or
  `False`; it doesn't return the matching text or count its characters.
- **tutor:** Ask the learner to underline just the opening characters of
  `notebook` and compare them to `note`.
- **pass_rule:** Learner selects A.

### py-4.7-06 · Check a Prefix

- **type:** practical
- **do:** Assign `"INV-2048"` to `code`. Assign `code.startswith("INV-")` to
  `is_invoice`, then print `Invoice: True` with an f-string. **Call
  `startswith()` on `code` with the exact prefix `"INV-"`.**
- **solution:**
  ```python
  code = "INV-2048"
  is_invoice = code.startswith("INV-")
  print(f"Invoice: {is_invoice}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `\.startswith\s*\(\s*["']INV-["']\s*\)`
- **expect_exact_output:** |
  Invoice: True
- **tutor:** `is_invoice = code.startswith("INV-")` then the f-string.
- **pass_rule:** Run exits 0 and stdout is exactly `Invoice: True`.

### py-4.7-07 · endswith() Checks the Ending

- **type:** concept
- **read:** `endswith(text)` does the same kind of check at the other end. It
  gives you `True` when the final characters match and `False` when they
  don't. It's also case-sensitive: `"report.pdf".endswith(".pdf")` is `True`,
  but `"report.PDF".endswith(".pdf")` is `False`.
- **check:** What does `"photo.png".endswith(".jpg")` produce?
  - A. `".png"`
  - B. `True`
  - C. `False`
  - D. the index `5`
- **answer:** C
- **rationale:** The filename ends with `".png"`, so it does not match
  `".jpg"`.
- **if_incorrect:** Look only at the final characters and compare them
  exactly. The method gives you a Boolean, not the ending text or its
  position.
- **tutor:** Ask the learner to compare only the last four characters of
  `photo.png` against `.jpg`.
- **pass_rule:** Learner selects C.

### py-4.7-08 · Check a Filename Suffix

- **type:** practical
- **do:** Read one filename. Assign `filename.endswith(".py")` to
  `is_python`, then print `Python file: <is_python>` with an f-string. Do not
  print a prompt. **Use the case-sensitive `endswith()` call exactly as
  shown.**
- **solution:**
  ```python
  filename = input()
  is_python = filename.endswith(".py")
  print(f"Python file: {is_python}")
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\.endswith\s*\(\s*["']\.py["']\s*\)`
- **hidden_tests:**
  ```yaml
  - stdin: "main.py"
    stdout: "Python file: True"
  - stdin: "notes.txt"
    stdout: "Python file: False"
  - stdin: "SCRIPT.PY"
    stdout: "Python file: False"
  ```
- **tutor:** `is_python = filename.endswith(".py")` then the f-string.
  Passing this item completes Lesson 4.7 and unlocks Lesson 4.8.
- **pass_rule:** All hidden tests pass.

---

## Lesson 4.8 — Finding, Counting, Replacing, and Comparing Text  {#py-4.8}

- **objective:** Find or count occurrences, replace text, and compare strings
  after normalizing their case and surrounding whitespace.
- **estimated_time:** 20–30 min
- **item_count:** 8
- **live_coding_items:** 4

### py-4.8-01 · count() Counts Occurrences

- **type:** concept
- **read:** `count(text)` tells you how many times a piece of text shows up
  inside a string. It hands back that number as an `int`, and capitalization
  matters here too. For example, `"banana".count("a")` returns `3`, while
  `"banana".count("A")` returns `0`. Our examples stick to single characters
  or matches that are clearly separate.
- **check:** What does `"mississippi".count("i")` produce?
  - A. `1`
  - B. `2`
  - C. `3`
  - D. `4`
- **answer:** D
- **rationale:** There are four lowercase `i` characters in `"mississippi"`.
- **if_incorrect:** Count every lowercase `i`, not just the first one.
  `count()` gives you the total, not a position or a piece of text.
- **tutor:** Ask the learner to underline every `i` in `mississippi` before
  counting them up.
- **pass_rule:** Learner selects D.

### py-4.8-02 · Count a Character in Input

- **type:** practical
- **do:** Read one line of text. Assign `text.count("a")` to `a_count`, then
  print `Lowercase a: <a_count>` with an f-string. Do not print a prompt.
  **Use the case-sensitive `count()` call; uppercase `A` must not be
  counted.**
- **solution:**
  ```python
  text = input()
  a_count = text.count("a")
  print(f"Lowercase a: {a_count}")
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `\.count\s*\(\s*["']a["']\s*\)`
- **hidden_tests:**
  ```yaml
  - stdin: "banana"
    stdout: "Lowercase a: 3"
  - stdin: "Alabama"
    stdout: "Lowercase a: 3"
  - stdin: "SKY"
    stdout: "Lowercase a: 0"
  ```
- **tutor:** `a_count = text.count("a")` then the f-string.
- **pass_rule:** All hidden tests pass.

### py-4.8-03 · find() Returns the First Matching Index

- **type:** concept
- **read:** `find(text)` tells you where a piece of text first shows up. It
  returns the starting index of the first match. If there's no match at all,
  it returns `-1` to mean "not found." That `-1` here is a result from
  `find()`, not a negative index you're using to grab a character. The search
  is case-sensitive.
- **check:** What does `"planet".find("z")` produce?
  - A. `-1`
  - B. `0`
  - C. `True`
  - D. `"z"`
- **answer:** A
- **rationale:** There is no `z` in `"planet"`, so `find()` reports "not
  found" with `-1`.
- **if_incorrect:** Check the word first: there is no match. In that case,
  `find()` gives you `-1`, not `0`, a Boolean, or the missing text.
- **tutor:** Ask the learner to search `planet` letter by letter for a `z`
  before deciding what `find()` should return.
- **pass_rule:** Learner selects A.

### py-4.8-04 · Find a Substring

- **type:** practical
- **do:** Assign `"banana"` to `word`. Assign `word.find("an")` to
  `position`, then print `First an: 1` with an f-string. **Use `find()` with
  the substring `"an"` and insert `{position}` in the output.**
- **solution:**
  ```python
  word = "banana"
  position = word.find("an")
  print(f"First an: {position}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `\.find\s*\(\s*["']an["']\s*\)`
- **expect_exact_output:** |
  First an: 1
- **tutor:** `position = word.find("an")` then the f-string.
- **pass_rule:** Run exits 0 and stdout is exactly `First an: 1`.

### py-4.8-05 · replace() Produces Changed Text

- **type:** concept
- **read:** `replace(old, new)` hands you back a new string with every copy
  of `old` swapped for `new`. For example, `"one one".replace("one", "two")`
  gives you `"two two"`. The original string stays unchanged unless you
  assign the new result back to its variable. We'll stick to the simple
  two-value form shown here.
- **check:** What does `"red-red".replace("red", "blue")` produce?
  - A. `"blue-red"`
  - B. `"blue-blue"`
  - C. `"red-red"`
  - D. `2`
- **answer:** B
- **rationale:** Both copies of `"red"` are replaced, giving you
  `"blue-blue"`.
- **if_incorrect:** Don't stop after the first match. `replace()` swaps both
  copies and returns the changed text, not the number of replacements.
- **tutor:** Ask the learner how many copies of `red` appear in `red-red`
  before deciding how many get swapped.
- **pass_rule:** Learner selects B.

### py-4.8-06 · Replace a Separator

- **type:** practical
- **do:** Assign `"2026/09/04"` to `date`. Assign `date.replace("/", "-")` to
  `formatted`, then print it. **Use `replace()` to change every slash; do not
  write the completed date directly.**
- **solution:**
  ```python
  date = "2026/09/04"
  formatted = date.replace("/", "-")
  print(formatted)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `\.replace\s*\(\s*["']/["']\s*,\s*["']-["']\s*\)`
- **expect_exact_output:** |
  2026-09-04
- **tutor:** `formatted = date.replace("/", "-")` then `print(formatted)`.
- **pass_rule:** Run exits 0 and stdout is exactly `2026-09-04`.

### py-4.8-07 · String Equality Is Case-Sensitive

- **type:** concept
- **read:** You can compare strings with `==` and `!=`, just like you
  compared numbers. String comparisons are case-sensitive, so
  `"Python" == "python"` is `False`. If capitalization and extra spacing
  shouldn't matter, clean both strings before comparing them — for example,
  `first.strip().lower() == second.strip().lower()` compares two trimmed,
  lowercase results. We won't use ordering operators with strings here.
- **check:** What does `"  Py  ".strip().lower() == "py"` produce?
  - A. `"py"`
  - B. `False`
  - C. `True`
  - D. an error
- **answer:** C
- **rationale:** The left side becomes `"py"` after both methods, so it
  matches the right side exactly.
- **if_incorrect:** Work from left to right: remove the outer spaces,
  lowercase the letters, then compare `"py"` with `"py"`.
- **tutor:** Ask the learner to apply `strip()` and `lower()` one at a time
  on paper before comparing the result to `"py"`.
- **pass_rule:** Learner selects C.

### py-4.8-08 · Compare Normalized Input

- **type:** practical
- **do:** Read two lines of text. Normalize each with `strip().lower()`,
  assign the results to `first_clean` and `second_clean`, then assign their
  equality comparison to `same`. Print `Same: <same>` with an f-string. Do
  not print prompts. **Normalize both inputs before comparing the two
  variables with `==`.**
- **solution:**
  ```python
  first = input()
  second = input()
  first_clean = first.strip().lower()
  second_clean = second.strip().lower()
  same = first_clean == second_clean
  print(f"Same: {same}")
  ```
- **evaluator:** hidden-tests
- **require_code:**
  - `(?:\.strip\s*\(\s*\)\s*\.lower\s*\(\s*\)[\s\S]*?){2}`
- **hidden_tests:**
  ```yaml
  - stdin: "  Python\nPYTHON  "
    stdout: "Same: True"
  - stdin: "code\n coder"
    stdout: "Same: False"
  - stdin: " SAME \nsame"
    stdout: "Same: True"
  ```
- **tutor:** Normalize both lines with `.strip().lower()`, then compare with
  `==`. Passing this item completes Lesson 4.8 and unlocks the checkpoint.
- **pass_rule:** All hidden tests pass.

---

## Checkpoint — Topic 4  {#py-4.CP}

- **objective:** Clean and normalize three pieces of input text, build new
  strings from them with indexing and slicing, and report information found
  by searching the normalized text.
- **estimated_time:** 20–30 min
- **type:** checkpoint
- **brief:** Write a program that cleans up a first name, a last name, and a
  message, builds new strings out of them with indexing and slicing, and
  reports back what it finds in the normalized message.
- **requirements:**
  - Read three lines with `input()`: a first name, a last name, and a message.
    Do not print input prompts.
  - The first name contains at least one letter after surrounding whitespace
    is removed. The last name contains at least three letters after
    surrounding whitespace is removed. Test inputs use English letters.
  - Assign `first.strip()` and `last.strip()` to `first_clean` and
    `last_clean`.
  - Build `first_display` from `first_clean[0].upper()` plus
    `first_clean[1:].lower()`.
  - Build `last_display` from `last_clean[0].upper()` plus
    `last_clean[1:].lower()`.
  - Build `code` from the first character of `first_clean` plus the first
    three characters of `last_clean`. Then reassign `code` to `code.lower()`.
  - Assign `code[::-1]` to `reversed_code`.
  - Normalize the message with `message.strip().lower()` and assign the
    result to `message_clean`.
  - Assign the result of `"python" in message_clean` to `contains_python`.
  - Assign `message_clean.count("python")` to `python_count`.
  - Assign `message_clean.replace("python", "PYTHON")` to `highlighted`.
  - Use f-strings to print exactly these six lines, in this order:
    `Name: <first_display> <last_display>`, `Code: <code>`,
    `Reversed code: <reversed_code>`, `Contains python: <contains_python>`,
    `Python count: <python_count>`, `Highlighted: <highlighted>`.
  - Use only operations explicitly taught in this topic and its
    prerequisites; do not select between paths, repeat a block, or group
    several values in one container.
  - Do not print extra text or blank lines. The program must run
    successfully.
- **solution:**
  ```python
  first = input()
  last = input()
  message = input()
  first_clean = first.strip()
  last_clean = last.strip()
  first_display = first_clean[0].upper() + first_clean[1:].lower()
  last_display = last_clean[0].upper() + last_clean[1:].lower()
  code = first_clean[0] + last_clean[:3]
  code = code.lower()
  reversed_code = code[::-1]
  message_clean = message.strip().lower()
  contains_python = "python" in message_clean
  python_count = message_clean.count("python")
  highlighted = message_clean.replace("python", "PYTHON")
  print(f"Name: {first_display} {last_display}")
  print(f"Code: {code}")
  print(f"Reversed code: {reversed_code}")
  print(f"Contains python: {contains_python}")
  print(f"Python count: {python_count}")
  print(f"Highlighted: {highlighted}")
  ```
- **evaluator:** hidden-tests
- **hidden_tests:**
  ```yaml
  - stdin: "  aDA  \n  lOVELACE  \n  I like Python and PYTHON  "
    stdout: "Name: Ada Lovelace\nCode: alov\nReversed code: vola\nContains python: True\nPython count: 2\nHighlighted: i like PYTHON and PYTHON"
  - stdin: "GRACE\nHOPPER\ncoding is fun"
    stdout: "Name: Grace Hopper\nCode: ghop\nReversed code: pohg\nContains python: False\nPython count: 0\nHighlighted: coding is fun"
  - stdin: "  sam\n  lee  \npython starts here"
    stdout: "Name: Sam Lee\nCode: slee\nReversed code: eels\nContains python: True\nPython count: 1\nHighlighted: PYTHON starts here"
  ```
- **tutor:** Build each piece in order: clean, display-case the name halves,
  build and lowercase `code`, reverse it, then normalize the message and run
  `in`/`count`/`replace` against it. The learner has everything needed from
  this topic and Topics 1–3 — do not introduce `if`, a loop, or a container
  type.
- **pass_rule:** All hidden tests pass, exit code 0. Passing the checkpoint
  completes Topic 4 and unlocks Topic 5.
