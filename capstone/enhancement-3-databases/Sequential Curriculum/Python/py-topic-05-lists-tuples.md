---
topic_id: py-topic-05
course: python
section: foundations
topic_number: 5
title: Lists and Tuples
slug: lists-tuples
lessons: [py-5.1, py-5.2, py-5.3, py-5.4, py-5.5, py-5.6, py-5.7, py-5.8, py-5.9]
checkpoint_id: py-5.CP
live_coding_exception: false
format_version: 1
---

# Topic 5 — Lists and Tuples

This topic moves from working with one value at a time to keeping related
values together. You'll build lists, retrieve and replace items, make slices
and copies, add and remove values, search and sort, work with tuples, and
reach into simple nested lists. Loops aren't introduced until Topic 8, so
every example here stays small enough to trace by hand.

## Lesson 5.1 — Creating and Reading Lists  {#py-5.1}

- **objective:** Create list values, store them in variables, print them, and
  measure their length.
- **estimated_time:** 15–25 min
- **item_count:** 7
- **live_coding_items:** 4

### py-5.1-01 · A List Keeps Values in Order

- **type:** concept
- **read:** A **list** keeps several values together in a specific order.
  Write a list between square brackets, with commas separating its items:
  `["red", "green", "blue"]`. The opening order is preserved, so `"red"` is
  first and `"blue"` is last. Lists are useful when the values belong
  together, such as names on a roster or scores from one game.
- **check:** Which expression creates a list containing the numbers `2`, `4`,
  and `6`?
  - A. `[2 + 4 + 6]`
  - B. `[2, 4, 6]`
  - C. `"2, 4, 6"`
  - D. `2 + 4 + 6`
- **answer:** B
- **rationale:** Square brackets create a list, and commas separate its three
  items.
- **if_incorrect:** Look for square brackets with three comma-separated
  values. Quoted text is one string, while addition produces one number
  rather than a three-item list.
- **tutor:** Ask the learner to count the comma-separated values between the
  brackets in each option, and to say what type quoted text and a plain sum
  are instead.
- **pass_rule:** Learner selects B.

### py-5.1-02 · Build a Color List

- **type:** practical
- **do:** Assign a list containing `"red"`, `"green"`, and `"blue"` in that
  order to `colors`. Print the complete `colors` list. **Create one list with
  square brackets and print the variable.**
- **solution:**
  ```python
  colors = ["red", "green", "blue"]
  print(colors)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `colors\s*=\s*\[`
  - `print\s*\(\s*colors\s*\)`
- **expect_exact_output:** |
  ['red', 'green', 'blue']
- **tutor:** `colors = ["red", "green", "blue"]` then `print(colors)`.
- **pass_rule:** Run exits 0 and stdout is exactly `['red', 'green', 'blue']`.

### py-5.1-03 · A List Can Be Empty

- **type:** concept
- **read:** An empty list is written as `[]`. It contains no items yet, so
  its length is `0`. An empty list is still a real list value and can be
  stored in a variable. Later in this topic, you'll add items to one.
- **check:** What does `len([])` produce?
  - A. `0`
  - B. `1`
  - C. `None`
  - D. an error
- **answer:** A
- **rationale:** There are no items between the brackets, so the list has
  length zero.
- **if_incorrect:** The brackets mark the list; they aren't items inside it.
  Count only the comma-separated values between them.
- **tutor:** Ask the learner to compare `[]` with `["x"]` and say how many
  items each one holds.
- **pass_rule:** Learner selects A.

### py-5.1-04 · Measure a Roster

- **type:** practical
- **do:** Assign `"Ada"`, `"Grace"`, `"Linus"`, and `"Guido"` to a list named
  `roster`. Print the list, then print `People: 4` using `len(roster)` inside
  an f-string. **Do not hardcode the number `4` in the output.**
- **solution:**
  ```python
  roster = ["Ada", "Grace", "Linus", "Guido"]
  print(roster)
  print(f"People: {len(roster)}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `len\s*\(\s*roster\s*\)`
- **forbid_code:**
  - `People:\s*4`
- **expect_exact_output:** |
  ['Ada', 'Grace', 'Linus', 'Guido']
  People: 4
- **tutor:** `print(roster)` then `print(f"People: {len(roster)}")`.
- **pass_rule:** Run exits 0 and stdout is exactly `['Ada', 'Grace', 'Linus', 'Guido']` then `People: 4`.

### py-5.1-05 · list Is Its Own Type

- **type:** concept
- **read:** A list has the type `list`, just as `"hello"` has type `str` and
  `7` has type `int`. Printing `type([1, 2])` shows `<class 'list'>`.
  Printing the list itself shows its brackets, commas, and the displayed
  forms of its items.
- **check:** What does `print(type([10, 20]))` display?
  - A. `<class 'int'>`
  - B. `<class 'str'>`
  - C. `<class 'list'>`
  - D. `[10, 20]`
- **answer:** C
- **rationale:** The square-bracketed value is a list, so `type()` reports
  `list`.
- **if_incorrect:** `type()` reports the container's type, not the type of
  one item inside it.
- **tutor:** Ask the learner what `type()` already reported for a plain
  number or string, then ask what the container itself is called here.
- **pass_rule:** Learner selects C.

### py-5.1-06 · Find the Last Item Without Guessing the Index

- **type:** practical
- **do:** Assign `[68, 72, 75, 71, 69]` to `temps`. Print the first reading
  using index `0`, then print the last reading using `len(temps) - 1` as the
  index — don't use the literal last index number.
- **starter_code:**
  ```python
  temps = [68, 72, 75, 71, 69]
  ```
- **solution:**
  ```python
  temps = [68, 72, 75, 71, 69]
  print(temps[0])
  print(temps[len(temps) - 1])
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `temps\[\s*len\s*\(\s*temps\s*\)\s*-\s*1\s*\]`
- **forbid_code:**
  - `temps\[\s*4\s*\]`
  - `temps\[\s*-1\s*\]`
- **expect_exact_output:** |
  68
  69
- **tutor:** `temps[0]` is the first item; `temps[len(temps) - 1]` avoids
  hardcoding the last index — that's the general pattern for "the last item"
  when the length might change.
- **pass_rule:** Run exits 0 and stdout is exactly `68` then `69`.


### py-5.1-07 · Debug the Inventory Summary

- **type:** practical
- **practice_group:** true
- **do:** The list is correct, but the program prints its variable name as
  text and measures the word `items` instead of the stored list. **Repair
  both output lines without changing the assignment.**
- **starter_code:**
  ```python
  items = ["pen", "notebook", "eraser"]
  print("items")
  print(f"Count: {len('items')}")
  ```
- **solution:**
  ```python
  items = ["pen", "notebook", "eraser"]
  print(items)
  print(f"Count: {len(items)}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `print\s*\(\s*items\s*\)`
  - `len\s*\(\s*items\s*\)`
- **expect_exact_output:** |
  ['pen', 'notebook', 'eraser']
  Count: 3
- **tutor:** `print(items)` and `len(items)` — drop the quotes so both refer
  to the list variable, not the word "items". Passing this item completes
  Lesson 5.1 and unlocks Lesson 5.2.
- **pass_rule:** Run exits 0 and stdout is exactly `['pen', 'notebook', 'eraser']` then `Count: 3`.

## Lesson 5.2 — Indexing and Updating Lists  {#py-5.2}

- **objective:** Retrieve list items with positive and negative indexes and
  replace an item at a valid position.
- **estimated_time:** 15–25 min
- **item_count:** 7
- **live_coding_items:** 4

### py-5.2-01 · List Indexes Start at Zero

- **type:** concept
- **read:** List indexing works like string indexing. The first item is at
  index `0`, the second is at `1`, and so on. If
  `cities = ["Rome", "Lima", "Tokyo"]`, then `cities[0]` is `"Rome"` and
  `cities[1]` is `"Lima"`. Indexing returns the item itself, not a smaller
  list.
- **check:** With `sizes = ["small", "medium", "large"]`, what does
  `sizes[1]` produce?
  - A. `"small"`
  - B. `"medium"`
  - C. `["medium"]`
  - D. `1`
- **answer:** B
- **rationale:** Index `1` refers to the second item, which is the string
  `"medium"`.
- **if_incorrect:** Start with index `0` under the first item. Indexing
  returns that position's value directly, without list brackets around it.
- **tutor:** Ask the learner to write the index number under each item in
  `sizes` before picking an answer.
- **pass_rule:** Learner selects B.

### py-5.2-02 · Retrieve Two Scores

- **type:** practical
- **do:** Assign `[72, 88, 91, 65]` to `scores`. Print the first score and
  then the third score on separate lines by indexing the list. **Use
  `scores[0]` and `scores[2]`; do not print the numbers directly.**
- **solution:**
  ```python
  scores = [72, 88, 91, 65]
  print(scores[0])
  print(scores[2])
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `scores\s*\[\s*0\s*\]`
  - `scores\s*\[\s*2\s*\]`
- **expect_exact_output:** |
  72
  91
- **tutor:** `print(scores[0])` then `print(scores[2])`.
- **pass_rule:** Run exits 0 and stdout is exactly `72` then `91`.

### py-5.2-03 · Negative Indexes Count from the End

- **type:** concept
- **read:** Negative indexes also work the same way they do with strings.
  Index `-1` retrieves the last item, `-2` retrieves the item before it, and
  so on. With `days = ["Mon", "Tue", "Wed"]`, `days[-1]` is `"Wed"`.
- **check:** With `values = [5, 10, 15, 20]`, what does `values[-2]`
  produce?
  - A. `10`
  - B. `15`
  - C. `20`
  - D. `-2`
- **answer:** B
- **rationale:** `-1` is the final item `20`, so `-2` is the `15` just
  before it.
- **if_incorrect:** Count from the right, beginning with `-1` on the last
  item.
- **tutor:** Ask the learner to label the list's items `-1`, `-2`, `-3`, `-4`
  from the right before answering.
- **pass_rule:** Learner selects B.

### py-5.2-04 · Replace a List Item

- **type:** practical
- **do:** Assign `["draft", "wrong", "ready"]` to `statuses`. Replace the
  item at index `1` with `"review"`, then print the complete list. **Update
  that list position directly; do not rebuild or print a finished list.**
- **solution:**
  ```python
  statuses = ["draft", "wrong", "ready"]
  statuses[1] = "review"
  print(statuses)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `statuses\s*\[\s*1\s*\]\s*=\s*["']review["']`
- **expect_exact_output:** |
  ['draft', 'review', 'ready']
- **tutor:** `statuses[1] = "review"` then `print(statuses)`.
- **pass_rule:** Run exits 0 and stdout is exactly `['draft', 'review', 'ready']`.

### py-5.2-05 · Lists Are Mutable

- **type:** concept
- **read:** Lists are **mutable**, which means their items can be changed
  after the list is created. `numbers[0] = 9` replaces the first item inside
  `numbers`. The variable still refers to the same list, now with a
  different value at that position. This is different from strings, which
  must be rebuilt instead of changed character by character.
- **check:** What is `numbers` after this code?

  ```python
  numbers = [1, 2, 3]
  numbers[-1] = 8
  ```

  - A. `[8, 2, 3]`
  - B. `[1, 8, 3]`
  - C. `[1, 2, 8]`
  - D. `[1, 2, 3, 8]`
- **answer:** C
- **rationale:** Index `-1` refers to the final item, so the `3` is replaced
  by `8`.
- **if_incorrect:** This is replacement, not insertion. Find the item at
  `-1` and swap only that value.
- **tutor:** Ask the learner which index `-1` points to in `[1, 2, 3]`
  before the assignment runs.
- **pass_rule:** Learner selects C.

### py-5.2-06 · Update the Last Item with a Negative Index

- **type:** practical
- **do:** Assign `[10, 20, 30, 40]` to `scores`. Replace the last item with
  `99` using a negative index — not a positive one. Print `scores`.
- **starter_code:**
  ```python
  scores = [10, 20, 30, 40]
  ```
- **solution:**
  ```python
  scores = [10, 20, 30, 40]
  scores[-1] = 99
  print(scores)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `scores\[\s*-1\s*\]\s*=`
- **forbid_code:**
  - `scores\[\s*3\s*\]\s*=`
- **expect_exact_output:** |
  [10, 20, 30, 99]
- **tutor:** `scores[-1]` refers to the last item regardless of length —
  assigning to it works exactly like a positive index.
- **pass_rule:** Run exits 0 and stdout is exactly `[10, 20, 30, 99]`.


### py-5.2-07 · Debug the Task Update

- **type:** practical
- **practice_group:** true
- **do:** The second task should become `"review"`, and the program should
  report the final task after that update. It currently replaces the wrong
  item and then prints the first task. **Repair both indexes.**
- **starter_code:**
  ```python
  tasks = ["plan", "draft", "publish"]
  tasks[0] = "review"
  print(tasks)
  print(f"Final task: {tasks[0]}")
  ```
- **solution:**
  ```python
  tasks = ["plan", "draft", "publish"]
  tasks[1] = "review"
  print(tasks)
  print(f"Final task: {tasks[-1]}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `tasks\s*\[\s*1\s*\]\s*=\s*["']review["']`
  - `tasks\s*\[\s*-1\s*\]`
- **expect_exact_output:** |
  ['plan', 'review', 'publish']
  Final task: publish
- **tutor:** `tasks[1] = "review"`, then read the final task back with
  `tasks[-1]`. Passing this item completes Lesson 5.2 and unlocks Lesson 5.3.
- **pass_rule:** Run exits 0 and stdout is exactly `['plan', 'review', 'publish']` then `Final task: publish`.

## Lesson 5.3 — List Slicing and Independent Copies  {#py-5.3}

- **objective:** Extract list sections with slices and create an independent
  outer list with `[:]`.
- **estimated_time:** 15–25 min
- **item_count:** 7
- **live_coding_items:** 4

### py-5.3-01 · A List Slice Produces a New List

- **type:** concept
- **read:** List slices use the same `start:stop` rule as string slices:
  include the starting position and stop before the ending position. With
  `letters = ["a", "b", "c", "d"]`, `letters[1:3]` produces `["b", "c"]`.
  The result is a new list, while `letters` stays unchanged.
- **check:** What does `[10, 20, 30, 40][1:3]` produce?
  - A. `[10, 20, 30]`
  - B. `[20, 30]`
  - C. `[20, 30, 40]`
  - D. `[30, 40]`
- **answer:** B
- **rationale:** The slice includes indexes `1` and `2`, then stops before
  index `3`.
- **if_incorrect:** Include the starting position and leave out the stopping
  position, just as you did with strings.
- **tutor:** Ask the learner to list the index number of every item, then
  circle the ones a `[1:3]` slice keeps.
- **pass_rule:** Learner selects B.

### py-5.3-02 · Extract the Middle Values

- **type:** practical
- **do:** Assign `[5, 10, 15, 20, 25]` to `numbers`. Assign `numbers[1:4]` to
  `middle`, then print `middle` and `numbers` on separate lines. **Use the
  required slice and keep the original list unchanged.**
- **solution:**
  ```python
  numbers = [5, 10, 15, 20, 25]
  middle = numbers[1:4]
  print(middle)
  print(numbers)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `numbers\s*\[\s*1\s*:\s*4\s*\]`
- **expect_exact_output:** |
  [10, 15, 20]
  [5, 10, 15, 20, 25]
- **tutor:** `middle = numbers[1:4]`, then print `middle` before `numbers`.
- **pass_rule:** Run exits 0 and stdout is exactly `[10, 15, 20]` then `[5, 10, 15, 20, 25]`.

### py-5.3-03 · Slice Bounds and Steps May Be Omitted

- **type:** concept
- **read:** The familiar slice shortcuts work on lists too. `items[:2]`
  takes the first two items, `items[2:]` takes everything from index `2`
  onward, and `items[::2]` takes every other item beginning at index `0`.
  The supported reversal pattern `items[::-1]` produces a new list in
  reverse order.
- **check:** What does `[1, 2, 3, 4, 5][::2]` produce?
  - A. `[1, 3, 5]`
  - B. `[2, 4]`
  - C. `[1, 2]`
  - D. `[5, 4, 3, 2, 1]`
- **answer:** A
- **rationale:** Starting at index `0` and stepping by `2` selects indexes
  `0`, `2`, and `4`.
- **if_incorrect:** Follow the positions: take one item, skip one, and
  repeat from the start.
- **tutor:** Ask the learner to walk the indexes `0` through `4`, marking
  every one a step of `2` lands on.
- **pass_rule:** Learner selects A.

### py-5.3-04 · Split and Reverse a List

- **type:** practical
- **do:** Assign `["a", "b", "c", "d"]` to `letters`. Assign the first two
  items to `first_half` with `letters[:2]`. Assign the reversed list to
  `reversed_letters` with `letters[::-1]`. Print both new lists on separate
  lines. **Use the exact slices named above.**
- **solution:**
  ```python
  letters = ["a", "b", "c", "d"]
  first_half = letters[:2]
  reversed_letters = letters[::-1]
  print(first_half)
  print(reversed_letters)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `letters\s*\[\s*:\s*2\s*\]`
  - `letters\s*\[\s*:\s*:\s*-1\s*\]`
- **expect_exact_output:** |
  ['a', 'b']
  ['d', 'c', 'b', 'a']
- **tutor:** `first_half = letters[:2]` then `reversed_letters = letters[::-1]`.
- **pass_rule:** Run exits 0 and stdout is exactly `['a', 'b']` then `['d', 'c', 'b', 'a']`.

### py-5.3-05 · Assignment and Copying Are Different

- **type:** concept
- **read:** `copy = original` gives two variable names to the same list.
  Changing the list through either name is visible through both. Use
  `copy = original[:]` when you need a separate outer list. Then replacing
  an item in `copy` does not replace the matching item in `original`. Nested
  copying has additional rules that are outside this topic.
- **check:** What is `original` after this code?

  ```python
  original = [1, 2, 3]
  copy = original[:]
  copy[0] = 9
  ```

  - A. `[9, 2, 3]`
  - B. `[1, 2, 3]`
  - C. `[9]`
  - D. an empty list
- **answer:** B
- **rationale:** The full slice created a separate outer list, so changing
  `copy` leaves `original` alone.
- **if_incorrect:** Track two lists after `[:]`. Only the first position in
  `copy` is replaced.
- **tutor:** Ask the learner whether `original[:]` gives `copy` the same
  list object as `original`, or a brand-new one.
- **pass_rule:** Learner selects B.

### py-5.3-06 · Prove a Sliced Copy Is Independent

- **type:** practical
- **do:** Assign `[1, 2, 3]` to `original`. Create `copy_list` as an
  independent copy of `original` using slicing — not `=`. Append `4` to
  `copy_list`. Print `original` then `copy_list`.
- **starter_code:**
  ```python
  original = [1, 2, 3]
  ```
- **solution:**
  ```python
  original = [1, 2, 3]
  copy_list = original[:]
  copy_list.append(4)
  print(original)
  print(copy_list)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `copy_list\s*=\s*original\[\s*:\s*\]`
- **forbid_code:**
  - `copy_list\s*=\s*list\s*\(\s*original\s*\)`
- **expect_exact_output:** |
  [1, 2, 3]
  [1, 2, 3, 4]
- **tutor:** `original[:]` copies all elements into a new list; changing
  `copy_list` afterward leaves `original` untouched.
- **pass_rule:** Run exits 0 and stdout is exactly `[1, 2, 3]` then
  `[1, 2, 3, 4]`.


### py-5.3-07 · Debug the Saved Copy

- **type:** practical
- **practice_group:** true
- **do:** The program should keep an unchanged saved list, then modify only
  `current`. It currently gives both variables the same list and slices the
  wrong range for `middle`. **Repair both assignments.**
- **starter_code:**
  ```python
  current = [10, 20, 30, 40]
  saved = current
  middle = current[1:2]
  current[0] = 99
  print(f"Saved: {saved}")
  print(f"Current: {current}")
  print(f"Middle: {middle}")
  ```
- **solution:**
  ```python
  current = [10, 20, 30, 40]
  saved = current[:]
  middle = current[1:3]
  current[0] = 99
  print(f"Saved: {saved}")
  print(f"Current: {current}")
  print(f"Middle: {middle}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `saved\s*=\s*current\s*\[\s*:\s*\]`
  - `current\s*\[\s*1\s*:\s*3\s*\]`
- **expect_exact_output:** |
  Saved: [10, 20, 30, 40]
  Current: [99, 20, 30, 40]
  Middle: [20, 30]
- **tutor:** `saved = current[:]` makes an independent copy before
  `current[0]` changes; `middle = current[1:3]`. Passing this item completes
  Lesson 5.3 and unlocks Lesson 5.4.
- **pass_rule:** Run exits 0 and stdout is exactly `Saved: [10, 20, 30, 40]` then `Current: [99, 20, 30, 40]` then `Middle: [20, 30]`.

## Lesson 5.4 — Adding Items to Lists  {#py-5.4}

- **objective:** Add one item with `append()` or `insert()` and add several
  items with `extend()`.
- **estimated_time:** 15–25 min
- **item_count:** 7
- **live_coding_items:** 4

### py-5.4-01 · append() Adds One Item at the End

- **type:** concept
- **read:** `append(value)` adds one item to the end of a list. If
  `tasks = ["plan", "code"]`, then `tasks.append("test")` changes the list
  to `["plan", "code", "test"]`. The method changes the existing list, so you
  call it on its own instead of assigning its result to another variable.
- **check:** What is `values` after `values = [1, 2]` and
  `values.append(3)`?
  - A. `[3, 1, 2]`
  - B. `[1, 2, 3]`
  - C. `[1, 2]`
  - D. `[1, 2, [3]]`
- **answer:** B
- **rationale:** `append()` places one new item after the existing items.
- **if_incorrect:** Append means add to the end. The number `3` is one item,
  not another list.
- **tutor:** Ask the learner where "the end" of `[1, 2]` is before deciding
  where `3` lands.
- **pass_rule:** Learner selects B.

### py-5.4-02 · Build a Growing Queue

- **type:** practical
- **do:** Assign an empty list to `queue`. Append `"Ada"`, then append
  `"Grace"`. Print `queue`. **Use two `append()` calls rather than assigning
  a finished two-item list.**
- **solution:**
  ```python
  queue = []
  queue.append("Ada")
  queue.append("Grace")
  print(queue)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `\.append\s*\(\s*["']Ada["']\s*\)`
  - `\.append\s*\(\s*["']Grace["']\s*\)`
- **forbid_code:**
  - `queue\s*=\s*\[\s*["']Ada["']`
- **expect_exact_output:** |
  ['Ada', 'Grace']
- **tutor:** `queue = []`, then `queue.append("Ada")` and
  `queue.append("Grace")`.
- **pass_rule:** Run exits 0 and stdout is exactly `['Ada', 'Grace']`.

### py-5.4-03 · insert() Adds at a Chosen Index

- **type:** concept
- **read:** `insert(index, value)` adds an item at a chosen position.
  Existing items at that position and after it shift to the right. With
  `letters = ["a", "c"]`, `letters.insert(1, "b")` produces
  `["a", "b", "c"]`. Nothing is replaced.
- **check:** What is `names` after `names = ["Ada", "Linus"]` and
  `names.insert(1, "Grace")`?
  - A. `["Grace", "Ada", "Linus"]`
  - B. `["Ada", "Grace"]`
  - C. `["Ada", "Grace", "Linus"]`
  - D. `["Ada", "Linus", "Grace"]`
- **answer:** C
- **rationale:** The new value takes index `1`, and `"Linus"` shifts one
  position right.
- **if_incorrect:** Insert creates room at the requested index. It does not
  replace the item already there or automatically add at the end.
- **tutor:** Ask the learner what currently sits at index `1` in
  `["Ada", "Linus"]`, and where that item goes once `"Grace"` is inserted
  there.
- **pass_rule:** Learner selects C.

### py-5.4-04 · Insert a Missing Step

- **type:** practical
- **do:** Assign `["plan", "test"]` to `steps`. Insert `"code"` at index
  `1`, then append `"ship"`. Print the final list. **Use `insert()` for the
  middle item and `append()` for the final item.**
- **solution:**
  ```python
  steps = ["plan", "test"]
  steps.insert(1, "code")
  steps.append("ship")
  print(steps)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `\.insert\s*\(\s*1\s*,\s*["']code["']\s*\)`
  - `\.append\s*\(\s*["']ship["']\s*\)`
- **expect_exact_output:** |
  ['plan', 'code', 'test', 'ship']
- **tutor:** `steps.insert(1, "code")` then `steps.append("ship")`.
- **pass_rule:** Run exits 0 and stdout is exactly `['plan', 'code', 'test', 'ship']`.

### py-5.4-05 · extend() Adds Several Items

- **type:** concept
- **read:** `extend(other_list)` adds each item from another list to the
  end. If `first = [1, 2]`, then `first.extend([3, 4])` changes `first` to
  `[1, 2, 3, 4]`. In this topic, the argument to `extend()` is always a
  list. Use `append()` for one item and `extend()` for several items from a
  list.
- **check:** What is `values` after `values = [1]` and
  `values.extend([2, 3])`?
  - A. `[1, 2, 3]`
  - B. `[1, [2, 3]]`
  - C. `[2, 3, 1]`
  - D. `[1]`
- **answer:** A
- **rationale:** `extend()` adds the two items from the provided list in
  their existing order.
- **if_incorrect:** Think of the added list opening up: its items are added
  individually to the end of `values`.
- **tutor:** Ask the learner to compare what `append([2, 3])` would do
  versus what `extend([2, 3])` does.
- **pass_rule:** Learner selects A.

### py-5.4-06 · Combine extend() and insert()

- **type:** practical
- **do:** Assign `['a', 'b']` to `letters`. Use `extend()` to add
  `['c', 'd']`. Then use `insert()` to add `'x'` at index `1`. Print
  `letters`.
- **starter_code:**
  ```python
  letters = ['a', 'b']
  ```
- **solution:**
  ```python
  letters = ['a', 'b']
  letters.extend(['c', 'd'])
  letters.insert(1, 'x')
  print(letters)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `\.extend\s*\(\s*\[\s*['"]c['"]\s*,\s*['"]d['"]\s*\]\s*\)`
  - `\.insert\s*\(\s*1\s*,\s*['"]x['"]\s*\)`
- **expect_exact_output:** |
  ['a', 'x', 'b', 'c', 'd']
- **tutor:** `extend()` unpacks each item from the given list onto the end;
  `insert(1, 'x')` then shifts everything from index 1 onward to make room.
- **pass_rule:** Run exits 0 and stdout is exactly `['a', 'x', 'b', 'c', 'd']`.


### py-5.4-07 · Debug the Release Plan

- **type:** practical
- **practice_group:** true
- **do:** `"plan"` must be first, `"ship"` must follow `"test"`, and the two
  review steps must be added from one list. The current program uses the
  wrong positions and methods. **Repair the three calls.**
- **starter_code:**
  ```python
  steps = ["code", "test"]
  steps.append("plan")
  steps.insert(0, "ship")
  steps.append("review")
  print(steps)
  ```
- **solution:**
  ```python
  steps = ["code", "test"]
  steps.insert(0, "plan")
  steps.append("ship")
  steps.extend(["review", "approve"])
  print(steps)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `\.insert\s*\(\s*0\s*,\s*["']plan["']\s*\)`
  - `\.append\s*\(\s*["']ship["']\s*\)`
  - `\.extend\s*\(\s*\[\s*["']review["']\s*,\s*["']approve["']\s*\]\s*\)`
- **expect_exact_output:** |
  ['plan', 'code', 'test', 'ship', 'review', 'approve']
- **tutor:** `steps.insert(0, "plan")`, `steps.append("ship")`, then
  `steps.extend(["review", "approve"])`. Passing this item completes
  Lesson 5.4 and unlocks Lesson 5.5.
- **pass_rule:** Run exits 0 and stdout is exactly `['plan', 'code', 'test', 'ship', 'review', 'approve']`.

## Lesson 5.5 — Removing Items from Lists  {#py-5.5}

- **objective:** Remove a known value with `remove()` and remove and
  retrieve an item with `pop()`.
- **estimated_time:** 15–25 min
- **item_count:** 7
- **live_coding_items:** 4

### py-5.5-01 · remove() Deletes the First Matching Value

- **type:** concept
- **read:** `remove(value)` searches from the start of a list and deletes
  the first item equal to that value. If `colors = ["red", "blue", "red"]`,
  then `colors.remove("red")` leaves `["blue", "red"]`. Every `remove()`
  task in this topic uses a value that is present.
- **check:** What is `items` after `items = [2, 4, 2, 6]` and
  `items.remove(2)`?
  - A. `[4, 2, 6]`
  - B. `[4, 6]`
  - C. `[2, 4, 6]`
  - D. `[2, 4, 2]`
- **answer:** A
- **rationale:** Only the first matching `2` is removed; the later `2`
  remains.
- **if_incorrect:** Begin at the left and stop after the first match. One
  method call removes one matching item.
- **tutor:** Ask the learner to point to the FIRST `2` in `[2, 4, 2, 6]`
  before removing anything.
- **pass_rule:** Learner selects A.

### py-5.5-02 · Remove a Completed Task

- **type:** practical
- **do:** Assign `["email", "report", "meeting", "report"]` to `tasks`.
  Remove the first `"report"`, then print the list. **Use
  `remove("report")`; do not rebuild the remaining list.**
- **solution:**
  ```python
  tasks = ["email", "report", "meeting", "report"]
  tasks.remove("report")
  print(tasks)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `\.remove\s*\(\s*["']report["']\s*\)`
- **expect_exact_output:** |
  ['email', 'meeting', 'report']
- **tutor:** `tasks.remove("report")` then `print(tasks)`.
- **pass_rule:** Run exits 0 and stdout is exactly `['email', 'meeting', 'report']`.

### py-5.5-03 · pop() Removes and Returns an Item

- **type:** concept
- **read:** `pop(index)` removes the item at a valid index and gives that
  item back as a value. This lets you save what was removed:
  `chosen = items.pop(1)`. Calling `pop()` without an index removes and
  returns the final item. The remaining items close the gap.
- **check:** What are `removed` and `values` after this code?

  ```python
  values = [10, 20, 30]
  removed = values.pop(1)
  ```

  - A. `removed` is `20`; `values` is `[10, 30]`
  - B. `removed` is `1`; `values` is `[10, 20, 30]`
  - C. `removed` is `30`; `values` is `[10, 20]`
  - D. `removed` is `20`; `values` is `[10, 20, 30]`
- **answer:** A
- **rationale:** Index `1` identifies `20`; `pop()` returns it and removes
  it from the list.
- **if_incorrect:** Separate the two results: the removed item goes into
  `removed`, while the list keeps the other items.
- **tutor:** Ask the learner to name the item at index `1` first, then say
  what happens to it and to the list around it.
- **pass_rule:** Learner selects A.

### py-5.5-04 · Remove and Report an Item

- **type:** practical
- **do:** Assign `["low", "medium", "high"]` to `levels`. Pop the item at
  index `1` into `removed`. Print `Removed: medium`, then print the
  remaining list. **Use `pop(1)` and the returned value.**
- **solution:**
  ```python
  levels = ["low", "medium", "high"]
  removed = levels.pop(1)
  print(f"Removed: {removed}")
  print(levels)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `\.pop\s*\(\s*1\s*\)`
  - `\{removed\}`
- **expect_exact_output:** |
  Removed: medium
  ['low', 'high']
- **tutor:** `removed = levels.pop(1)`, then `print(f"Removed: {removed}")`
  before printing `levels`.
- **pass_rule:** Run exits 0 and stdout is exactly `Removed: medium` then `['low', 'high']`.

### py-5.5-05 · Removing an Item Changes Later Indexes

- **type:** concept
- **read:** When an item is removed, everything after it shifts one
  position left. If `["a", "b", "c"]` loses the item at index `0`, then
  `"b"` becomes the new item at index `0`. Always reason about indexes using
  the list's current contents, not its earlier state.
- **check:** What does the final `print()` display?

  ```python
  letters = ["a", "b", "c"]
  letters.pop(0)
  print(letters[0])
  ```

  - A. `a`
  - B. `b`
  - C. `c`
  - D. `0`
- **answer:** B
- **rationale:** Removing `"a"` shifts `"b"` into index `0`.
- **if_incorrect:** Rewrite the list after the removal: it becomes
  `["b", "c"]`. Then read its first item.
- **tutor:** Ask the learner to write out the list right after `pop(0)`
  runs, before reading `letters[0]`.
- **pass_rule:** Learner selects B.

### py-5.5-06 · Combine pop() by Index and remove() by Value

- **type:** practical
- **do:** Assign `['pen', 'eraser', 'ruler', 'tape']` to `supplies`. Use
  `pop(1)` to remove and store the item at index 1 in a variable named
  `removed`. Then use `remove()` to delete `'tape'`. Print `removed` then
  `supplies`.
- **starter_code:**
  ```python
  supplies = ['pen', 'eraser', 'ruler', 'tape']
  ```
- **solution:**
  ```python
  supplies = ['pen', 'eraser', 'ruler', 'tape']
  removed = supplies.pop(1)
  supplies.remove('tape')
  print(removed)
  print(supplies)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `\.pop\s*\(\s*1\s*\)`
  - `\.remove\s*\(\s*['"]tape['"]\s*\)`
- **expect_exact_output:** |
  eraser
  ['pen', 'ruler']
- **tutor:** `pop(1)` removes AND returns the item at index 1; `remove('tape')`
  deletes by value instead of position.
- **pass_rule:** Run exits 0 and stdout is exactly `eraser` then
  `['pen', 'ruler']`.


### py-5.5-07 · Debug the Cleanup Report

- **type:** practical
- **practice_group:** true
- **do:** Remove only the first `"draft"`, then pop and report the final
  item. The current code removes the wrong value and pops the wrong
  position. **Repair both method calls.**
- **starter_code:**
  ```python
  files = ["draft", "notes", "draft", "final"]
  files.remove("notes")
  removed = files.pop(0)
  print(f"Popped: {removed}")
  print(files)
  ```
- **solution:**
  ```python
  files = ["draft", "notes", "draft", "final"]
  files.remove("draft")
  removed = files.pop()
  print(f"Popped: {removed}")
  print(files)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `\.remove\s*\(\s*["']draft["']\s*\)`
  - `\.pop\s*\(\s*\)`
- **expect_exact_output:** |
  Popped: final
  ['notes', 'draft']
- **tutor:** `files.remove("draft")` deletes the first `"draft"`;
  `files.pop()` with no index removes and returns the last item. Passing
  this item completes Lesson 5.5 and unlocks Lesson 5.6.
- **pass_rule:** Run exits 0 and stdout is exactly `Popped: final` then `['notes', 'draft']`.

## Lesson 5.6 — Membership, Counting, and Finding Positions  {#py-5.6}

- **objective:** Check whether a list contains a value, count matches, and
  find the first matching index.
- **estimated_time:** 15–25 min
- **item_count:** 7
- **live_coding_items:** 4

### py-5.6-01 · in and not in Work with Lists

- **type:** concept
- **read:** `in` checks whether a value appears as an item in a list, and
  `not in` checks whether it is absent. Both produce a Boolean. With
  `roles = ["admin", "editor"]`, `"editor" in roles` is `True`, while
  `"viewer" not in roles` is also `True`.
- **check:** What does `3 in [1, 2, 3]` produce?
  - A. `3`
  - B. `True`
  - C. `False`
  - D. index `2`
- **answer:** B
- **rationale:** The number `3` appears as an item in the list, so
  membership is true.
- **if_incorrect:** `in` answers a yes-or-no question. It does not return
  the matching value or its position.
- **tutor:** Ask the learner what type of value `in` always produces,
  regardless of what it's checking.
- **pass_rule:** Learner selects B.

### py-5.6-02 · Check an Allowed Value

- **type:** practical
- **do:** Assign `["red", "green", "blue"]` to `allowed`. Assign the result
  of `"green" in allowed` to `is_allowed` and `"orange" not in allowed` to
  `orange_missing`. Print both labeled Boolean results with f-strings.
- **solution:**
  ```python
  allowed = ["red", "green", "blue"]
  is_allowed = "green" in allowed
  orange_missing = "orange" not in allowed
  print(f"Green allowed: {is_allowed}")
  print(f"Orange missing: {orange_missing}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `["']green["']\s+in\s+allowed`
  - `["']orange["']\s+not\s+in\s+allowed`
- **expect_exact_output:** |
  Green allowed: True
  Orange missing: True
- **tutor:** `is_allowed = "green" in allowed` then
  `orange_missing = "orange" not in allowed`.
- **pass_rule:** Run exits 0 and stdout is exactly `Green allowed: True` then `Orange missing: True`.

### py-5.6-03 · count() Counts Matching Items

- **type:** concept
- **read:** A list's `count(value)` method returns how many items equal
  that value. With `votes = ["yes", "no", "yes"]`, `votes.count("yes")`
  returns `2`. It does not change the list.
- **check:** What does `[2, 1, 2, 2].count(2)` produce?
  - A. `1`
  - B. `2`
  - C. `3`
  - D. `[2, 2, 2]`
- **answer:** C
- **rationale:** The number `2` appears three times in the list.
- **if_incorrect:** Count every item equal to the requested value. The
  method returns the count, not a list of the matches.
- **tutor:** Ask the learner to mark every `2` in the list, then count the
  marks.
- **pass_rule:** Learner selects C.

### py-5.6-04 · Count and Locate a Value

- **type:** practical
- **do:** Assign `["red", "blue", "red", "green"]` to `colors`. Assign
  `colors.count("red")` to `red_count` and `colors.index("red")` to
  `first_red`. Print `Red count: 2` and `First red: 0` with f-strings.
- **solution:**
  ```python
  colors = ["red", "blue", "red", "green"]
  red_count = colors.count("red")
  first_red = colors.index("red")
  print(f"Red count: {red_count}")
  print(f"First red: {first_red}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `\.count\s*\(\s*["']red["']\s*\)`
  - `\.index\s*\(\s*["']red["']\s*\)`
- **expect_exact_output:** |
  Red count: 2
  First red: 0
- **tutor:** `red_count = colors.count("red")` then
  `first_red = colors.index("red")`.
- **pass_rule:** Run exits 0 and stdout is exactly `Red count: 2` then `First red: 0`.

### py-5.6-05 · index() Finds the First Match

- **type:** concept
- **read:** `index(value)` returns the position of the first matching item.
  With `letters = ["a", "b", "a"]`, `letters.index("a")` returns `0`, not
  `2`. Every `index()` task here searches for a value that is present;
  handling a missing value comes after exception handling is introduced.
- **check:** What does `[5, 8, 5, 9].index(5)` produce?
  - A. `0`
  - B. `2`
  - C. `5`
  - D. `2` matches
- **answer:** A
- **rationale:** The first `5` appears at index `0`.
- **if_incorrect:** `index()` stops at the first match and returns its
  zero-based position.
- **tutor:** Ask the learner to find the FIRST `5` in the list before
  reading off its position.
- **pass_rule:** Learner selects A.

### py-5.6-06 · Combine count() and index() in One Report

- **type:** practical
- **do:** Assign `['red', 'blue', 'red', 'green', 'red']` to `colors`. Print
  `f"'red' appears {colors.count('red')} times, first at index
  {colors.index('red')}"`.
- **starter_code:**
  ```python
  colors = ['red', 'blue', 'red', 'green', 'red']
  ```
- **solution:**
  ```python
  colors = ['red', 'blue', 'red', 'green', 'red']
  print(f"'red' appears {colors.count('red')} times, first at index {colors.index('red')}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `colors\.count\s*\(\s*['"]red['"]\s*\)`
  - `colors\.index\s*\(\s*['"]red['"]\s*\)`
- **expect_exact_output:** |
  'red' appears 3 times, first at index 0
- **tutor:** `count()` tells you how many matches exist; `index()` tells you
  where the FIRST one is — both read the list without changing it.
- **pass_rule:** Run exits 0 and stdout is exactly `'red' appears 3 times,
  first at index 0`.


### py-5.6-07 · Debug the Search Summary

- **type:** practical
- **practice_group:** true
- **do:** The program should report whether `"cat"` is present, how many
  times it appears, and its first index. All three expressions currently
  ask about the wrong condition or value. **Repair them.**
- **starter_code:**
  ```python
  animals = ["cat", "dog", "cat", "bird"]
  has_cat = "cat" not in animals
  cat_count = animals.count("dog")
  first_cat = animals.index("bird")
  print(f"Has cat: {has_cat}")
  print(f"Cat count: {cat_count}")
  print(f"First cat: {first_cat}")
  ```
- **solution:**
  ```python
  animals = ["cat", "dog", "cat", "bird"]
  has_cat = "cat" in animals
  cat_count = animals.count("cat")
  first_cat = animals.index("cat")
  print(f"Has cat: {has_cat}")
  print(f"Cat count: {cat_count}")
  print(f"First cat: {first_cat}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `["']cat["']\s+in\s+animals`
  - `\.count\s*\(\s*["']cat["']\s*\)`
  - `\.index\s*\(\s*["']cat["']\s*\)`
- **expect_exact_output:** |
  Has cat: True
  Cat count: 2
  First cat: 0
- **tutor:** `"cat" in animals`, `animals.count("cat")`, and
  `animals.index("cat")` — all three should ask about `"cat"`. Passing this
  item completes Lesson 5.6 and unlocks Lesson 5.7.
- **pass_rule:** Run exits 0 and stdout is exactly `Has cat: True` then `Cat count: 2` then `First cat: 0`.

## Lesson 5.7 — Sorting and Reversing Lists  {#py-5.7}

- **objective:** Sort or reverse an existing list and use `sorted()` when
  the original order must be preserved.
- **estimated_time:** 15–25 min
- **item_count:** 7
- **live_coding_items:** 4

### py-5.7-01 · sort() Changes a List in Place

- **type:** concept
- **read:** `sort()` rearranges the items in an existing list from lowest to
  highest. Numbers use numeric order, and the lowercase strings in this
  topic use alphabetical order. The method changes the list itself. Call
  `values.sort()` on its own, then use `values`; do not assign the method
  call as though it produced a new list.
- **check:** What is `numbers` after `numbers = [4, 1, 3]` and
  `numbers.sort()`?
  - A. `[4, 1, 3]`
  - B. `[4, 3, 1]`
  - C. `[1, 3, 4]`
  - D. `None`
- **answer:** C
- **rationale:** `sort()` rearranges the existing list into ascending
  numeric order.
- **if_incorrect:** Follow the list after the method call. The variable
  still holds the list, now ordered from lowest to highest.
- **tutor:** Ask the learner what `numbers` refers to right after
  `sort()` runs — the same list, reordered, or something new.
- **pass_rule:** Learner selects C.

### py-5.7-02 · Sort Numeric Scores

- **type:** practical
- **do:** Assign `[72, 91, 65, 88]` to `scores`. Call `scores.sort()`, then
  print the sorted list. **Sort the existing list with the method; do not
  assign or print a finished list.**
- **solution:**
  ```python
  scores = [72, 91, 65, 88]
  scores.sort()
  print(scores)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `scores\.sort\s*\(\s*\)`
  - `print\s*\(\s*scores\s*\)`
- **expect_exact_output:** |
  [65, 72, 88, 91]
- **tutor:** `scores.sort()` on its own line, then `print(scores)`.
- **pass_rule:** Run exits 0 and stdout is exactly `[65, 72, 88, 91]`.

### py-5.7-03 · reverse() Reverses the Current Order

- **type:** concept
- **read:** `reverse()` flips the current list from end to start. It does
  not sort by value first. `[3, 1, 2]` becomes `[2, 1, 3]`. If you want
  descending sorted order using the tools taught here, call `sort()` first
  and `reverse()` second.
- **check:** What is `values` after this code?

  ```python
  values = [3, 1, 2]
  values.reverse()
  ```

  - A. `[1, 2, 3]`
  - B. `[2, 1, 3]`
  - C. `[3, 2, 1]`
  - D. `[3, 1, 2]`
- **answer:** B
- **rationale:** Reversal reads the existing order backward; it does not
  sort the values.
- **if_incorrect:** Start at the right edge of the original list and move
  left one item at a time.
- **tutor:** Ask the learner to read `[3, 1, 2]` back to front, one item at
  a time, before answering.
- **pass_rule:** Learner selects B.

### py-5.7-04 · Make Descending Order

- **type:** practical
- **do:** Assign `[5, 2, 9, 1]` to `numbers`. Sort the list, reverse it, and
  print the final descending order. **Use `sort()` followed by `reverse()`
  on the same list.**
- **solution:**
  ```python
  numbers = [5, 2, 9, 1]
  numbers.sort()
  numbers.reverse()
  print(numbers)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `numbers\.sort\s*\(\s*\)`
  - `numbers\.reverse\s*\(\s*\)`
- **expect_exact_output:** |
  [9, 5, 2, 1]
- **tutor:** `numbers.sort()` then `numbers.reverse()`, in that order.
- **pass_rule:** Run exits 0 and stdout is exactly `[9, 5, 2, 1]`.

### py-5.7-05 · sorted() Preserves the Original List

- **type:** concept
- **read:** The built-in `sorted(list_value)` returns a new sorted list and
  leaves the original alone. After `original = [3, 1, 2]` and
  `ordered = sorted(original)`, `original` is still `[3, 1, 2]` while
  `ordered` is `[1, 2, 3]`. Use `sort()` to change a list and `sorted()`
  when you need both orders.
- **check:** What is `original` after `ordered = sorted(original)` when
  `original` began as `[2, 1, 3]`?
  - A. `[1, 2, 3]`
  - B. `[3, 2, 1]`
  - C. `[2, 1, 3]`
  - D. `None`
- **answer:** C
- **rationale:** `sorted()` creates the ordered list separately and does not
  rearrange `original`.
- **if_incorrect:** Track the two variables. The new order goes into
  `ordered`; no method is called on `original` itself.
- **tutor:** Ask the learner whether `sorted(original)` is a method call ON
  `original`, or a function call that just reads it.
- **pass_rule:** Learner selects C.

### py-5.7-06 · Rank Descending Without Disturbing the Original

- **type:** practical
- **do:** Assign `[4, 1, 3, 2]` to `nums`. Create `ranked` as a new list
  containing `nums` sorted in descending order, using `sorted()` with
  `reverse=True` — don't modify `nums`. Print `nums` then `ranked`.
- **starter_code:**
  ```python
  nums = [4, 1, 3, 2]
  ```
- **solution:**
  ```python
  nums = [4, 1, 3, 2]
  ranked = sorted(nums, reverse=True)
  print(nums)
  print(ranked)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `sorted\s*\(\s*nums\s*,\s*reverse\s*=\s*True\s*\)`
- **forbid_code:**
  - `nums\.sort\s*\(`
- **expect_exact_output:** |
  [4, 1, 3, 2]
  [4, 3, 2, 1]
- **tutor:** `sorted(nums, reverse=True)` builds a brand-new descending list
  and leaves `nums` exactly as it was — that's the difference from
  `nums.sort()`.
- **pass_rule:** Run exits 0 and stdout is exactly `[4, 1, 3, 2]` then
  `[4, 3, 2, 1]`.


### py-5.7-07 · Debug the Two-Order Report

- **type:** practical
- **practice_group:** true
- **do:** The program should preserve the original order, create a separate
  ascending list, and then reverse only that new list into descending
  order. It currently stores the result of `sort()` and reverses the wrong
  list. **Repair both lines.**
- **starter_code:**
  ```python
  original = [4, 1, 3, 2]
  ascending = original.sort()
  original.reverse()
  print(f"Original: {original}")
  print(f"Descending: {ascending}")
  ```
- **solution:**
  ```python
  original = [4, 1, 3, 2]
  ascending = sorted(original)
  ascending.reverse()
  print(f"Original: {original}")
  print(f"Descending: {ascending}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `sorted\s*\(\s*original\s*\)`
  - `ascending\.reverse\s*\(\s*\)`
- **expect_exact_output:** |
  Original: [4, 1, 3, 2]
  Descending: [4, 3, 2, 1]
- **tutor:** `ascending = sorted(original)` leaves `original` untouched;
  `ascending.reverse()` then reverses only the new list. Passing this item
  completes Lesson 5.7 and unlocks Lesson 5.8.
- **pass_rule:** Run exits 0 and stdout is exactly `Original: [4, 1, 3, 2]` then `Descending: [4, 3, 2, 1]`.

## Lesson 5.8 — Tuples and Unpacking  {#py-5.8}

- **objective:** Create immutable tuples, retrieve their values, and unpack
  them into the same number of variables.
- **estimated_time:** 15–25 min
- **item_count:** 7
- **live_coding_items:** 4

### py-5.8-01 · A Tuple Is an Ordered, Immutable Collection

- **type:** concept
- **read:** A **tuple** is an ordered collection that cannot be changed
  after it is created. Tuples are commonly written with parentheses and
  commas, such as `(10, 20)`. Indexing and slicing work as they do with
  lists, but assigning a new value to `point[0]` does not work. A tuple fits
  values that belong together and are not meant to change.
- **check:** Which value is a tuple?
  - A. `[10, 20]`
  - B. `"10, 20"`
  - C. `(10, 20)`
  - D. `10 + 20`
- **answer:** C
- **rationale:** The comma-separated values inside parentheses form a
  tuple.
- **if_incorrect:** Square brackets mark a list. Here, look for the
  parenthesized collection with commas.
- **tutor:** Ask the learner to name which punctuation marks a list versus a
  tuple before choosing.
- **pass_rule:** Learner selects C.

### py-5.8-02 · Read Values from a Tuple

- **type:** practical
- **do:** Assign `(12, 8)` to `dimensions`. Print `Width: 12` using index
  `0` and `Height: 8` using index `1`, both with f-strings. **Retrieve both
  values from the tuple.**
- **solution:**
  ```python
  dimensions = (12, 8)
  print(f"Width: {dimensions[0]}")
  print(f"Height: {dimensions[1]}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `dimensions\s*\[\s*0\s*\]`
  - `dimensions\s*\[\s*1\s*\]`
- **expect_exact_output:** |
  Width: 12
  Height: 8
- **tutor:** `dimensions[0]` for width, `dimensions[1]` for height.
- **pass_rule:** Run exits 0 and stdout is exactly `Width: 12` then `Height: 8`.

### py-5.8-03 · Tuples Can Be Unpacked

- **type:** concept
- **read:** **Unpacking** assigns a tuple's values to separate variables in
  one step. With `point = (3, 7)`, the instruction `x, y = point` assigns
  `3` to `x` and `7` to `y`. The number of variables must exactly match the
  number of tuple values, and the positions stay in order.
- **check:** After `name, score = ("Ada", 95)`, what value does `score`
  hold?
  - A. `"Ada"`
  - B. `95`
  - C. `("Ada", 95)`
  - D. `2`
- **answer:** B
- **rationale:** The second tuple value is assigned to the second variable,
  `score`.
- **if_incorrect:** Pair variables and values from left to right: `name`
  gets the first, and `score` gets the second.
- **tutor:** Ask the learner to draw an arrow from each tuple value to the
  variable in the same position.
- **pass_rule:** Learner selects B.

### py-5.8-04 · Unpack a Record

- **type:** practical
- **do:** Assign `("Python", 1991, "Guido")` to `record`. Unpack it into
  `language`, `year`, and `creator`. Print all three as labeled f-string
  lines. **Use one unpacking assignment rather than indexing each output.**
- **solution:**
  ```python
  record = ("Python", 1991, "Guido")
  language, year, creator = record
  print(f"Language: {language}")
  print(f"Year: {year}")
  print(f"Creator: {creator}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `language\s*,\s*year\s*,\s*creator\s*=\s*record`
- **forbid_code:**
  - `record\s*\[`
- **expect_exact_output:** |
  Language: Python
  Year: 1991
  Creator: Guido
- **tutor:** `language, year, creator = record` in one line, then print each
  variable.
- **pass_rule:** Run exits 0 and stdout is exactly `Language: Python` then `Year: 1991` then `Creator: Guido`.

### py-5.8-05 · A One-Item Tuple Needs a Comma

- **type:** concept
- **read:** Parentheses alone do not make a one-item tuple. `("ready")` is
  simply the string `"ready"` in parentheses. The comma creates the tuple:
  `("ready",)`. Printing its type shows `<class 'tuple'>`, and its length is
  `1`.
- **check:** Which expression creates a tuple containing only `5`?
  - A. `(5)`
  - B. `[5]`
  - C. `(5,)`
  - D. `5, 5`
- **answer:** C
- **rationale:** The trailing comma marks this as a one-item tuple.
- **if_incorrect:** Parentheses can group an ordinary value. The comma is
  the important part when there is only one tuple item.
- **tutor:** Ask the learner what type `(5)` has without the comma, then
  what changes once the comma is added.
- **pass_rule:** Learner selects C.

### py-5.8-06 · Swap Two Variables with Tuple Unpacking

- **type:** practical
- **do:** Assign `5` to `a` and `10` to `b`. Swap their values using a
  single tuple-unpacking assignment — no temporary variable. Print `a` then
  `b`.
- **starter_code:**
  ```python
  a = 5
  b = 10
  ```
- **solution:**
  ```python
  a = 5
  b = 10
  a, b = b, a
  print(a)
  print(b)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `a\s*,\s*b\s*=\s*b\s*,\s*a`
- **expect_exact_output:** |
  10
  5
- **tutor:** `a, b = b, a` builds the tuple `(b, a)` first, then unpacks it
  into `a` and `b` — that's what makes the swap work without a temporary
  variable.
- **pass_rule:** Run exits 0 and stdout is exactly `10` then `5`.


### py-5.8-07 · Debug the Coordinate Report

- **type:** practical
- **practice_group:** true
- **do:** The point is stored as `(x, y)`, but the unpacking order is
  reversed. The status should also be a one-item tuple, not a string in
  parentheses. **Repair both lines.**
- **starter_code:**
  ```python
  point = (3, 7)
  y, x = point
  status = ("ready")
  print(f"x={x}, y={y}")
  print(type(status))
  ```
- **solution:**
  ```python
  point = (3, 7)
  x, y = point
  status = ("ready",)
  print(f"x={x}, y={y}")
  print(type(status))
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `x\s*,\s*y\s*=\s*point`
  - `\(\s*["']ready["']\s*,\s*\)`
- **expect_exact_output:** |
  x=3, y=7
  <class 'tuple'>
- **tutor:** `x, y = point` matches the stored order; `status = ("ready",)`
  adds the comma that makes it a tuple. Passing this item completes
  Lesson 5.8 and unlocks Lesson 5.9.
- **pass_rule:** Run exits 0 and stdout is exactly `x=3, y=7` then `<class 'tuple'>`.

## Lesson 5.9 — Nested Lists  {#py-5.9}

- **objective:** Read and update values inside a list whose items are
  themselves lists.
- **estimated_time:** 15–25 min
- **item_count:** 7
- **live_coding_items:** 4

### py-5.9-01 · A List Can Contain Other Lists

- **type:** concept
- **read:** A list item can itself be a list. This creates a **nested
  list**. For example, `grid = [[1, 2], [3, 4]]` contains two inner lists.
  The outer list has length `2`, and each inner list also has length `2`.
  In this topic, all nested structures are small and written directly in
  the program.
- **check:** How many items are in the outer list
  `[[1, 2], [3, 4], [5, 6]]`?
  - A. `2`
  - B. `3`
  - C. `6`
  - D. `12`
- **answer:** B
- **rationale:** The outer list contains three inner lists, so its length
  is three.
- **if_incorrect:** Count the comma-separated items at the outermost
  bracket level. Each inner list counts as one outer item.
- **tutor:** Ask the learner to count only the top-level commas, ignoring
  the ones inside each inner list.
- **pass_rule:** Learner selects B.

### py-5.9-02 · Print an Inner List

- **type:** practical
- **do:** Assign `[["Ada", 90], ["Grace", 95]]` to `records`. Print the
  first inner list using `records[0]`, then print the second using
  `records[1]`.
- **solution:**
  ```python
  records = [["Ada", 90], ["Grace", 95]]
  print(records[0])
  print(records[1])
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `records\s*\[\s*0\s*\]`
  - `records\s*\[\s*1\s*\]`
- **expect_exact_output:** |
  ['Ada', 90]
  ['Grace', 95]
- **tutor:** `print(records[0])` then `print(records[1])`.
- **pass_rule:** Run exits 0 and stdout is exactly `['Ada', 90]` then `['Grace', 95]`.

### py-5.9-03 · Use One Index for Each Level

- **type:** concept
- **read:** To reach one value inside a nested list, index one level at a
  time. `grid[1]` retrieves the second inner list, and `grid[1][0]`
  retrieves the first item from that inner list. With
  `grid = [[1, 2], [3, 4]]`, `grid[1][0]` is `3`.
- **check:** With `data = [["a", "b"], ["c", "d"]]`, what does
  `data[0][1]` produce?
  - A. `"a"`
  - B. `"b"`
  - C. `"c"`
  - D. `["a", "b"]`
- **answer:** B
- **rationale:** `data[0]` selects the first inner list, then `[1]` selects
  its second item.
- **if_incorrect:** Resolve the first pair of brackets before the second.
  Each index moves one level deeper.
- **tutor:** Ask the learner to resolve `data[0]` first, on its own, before
  applying the second `[1]`.
- **pass_rule:** Learner selects B.

### py-5.9-04 · Read a Grid Position

- **type:** practical
- **do:** Assign `[[10, 20, 30], [40, 50, 60]]` to `grid`. Assign
  `grid[1][2]` to `value`, then print `Value: 60` with an f-string. **Use
  both indexes to retrieve the value.**
- **solution:**
  ```python
  grid = [[10, 20, 30], [40, 50, 60]]
  value = grid[1][2]
  print(f"Value: {value}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `grid\s*\[\s*1\s*\]\s*\[\s*2\s*\]`
- **expect_exact_output:** |
  Value: 60
- **tutor:** `value = grid[1][2]` then `print(f"Value: {value}")`.
- **pass_rule:** Run exits 0 and stdout is exactly `Value: 60`.

### py-5.9-05 · A Nested Item Can Be Updated

- **type:** concept
- **read:** Because the inner values here are lists, their items can be
  replaced. With `grid = [[1, 2], [3, 4]]`, the instruction `grid[1][0] = 9`
  changes the nested list to `[[1, 2], [9, 4]]`. The first index selects the
  inner list; the second selects the item to replace.
- **check:** What is `grid` after this code?

  ```python
  grid = [[1, 2], [3, 4]]
  grid[0][1] = 8
  ```

  - A. `[[8, 2], [3, 4]]`
  - B. `[[1, 8], [3, 4]]`
  - C. `[[1, 2], [8, 4]]`
  - D. `[[1, 2], [3, 8]]`
- **answer:** B
- **rationale:** The outer index `0` chooses the first inner list, and
  inner index `1` chooses its second item.
- **if_incorrect:** Work from the outside in: choose the row first, then
  choose the position inside that row.
- **tutor:** Ask the learner to name the inner list `grid[0]` points to
  first, then find position `1` inside just that inner list.
- **pass_rule:** Learner selects B.

### py-5.9-06 · Combine Nested Indexing with len()

- **type:** practical
- **do:** Assign `[[1, 2, 3], [4, 5, 6]]` to `grid`. Print the last item of
  the first row using `len()` for the index — don't hardcode `2`.
- **starter_code:**
  ```python
  grid = [[1, 2, 3], [4, 5, 6]]
  ```
- **solution:**
  ```python
  grid = [[1, 2, 3], [4, 5, 6]]
  print(grid[0][len(grid[0]) - 1])
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `grid\[\s*0\s*\]\[\s*len\s*\(\s*grid\[\s*0\s*\]\s*\)\s*-\s*1\s*\]`
- **forbid_code:**
  - `grid\[\s*0\s*\]\[\s*2\s*\]`
  - `grid\[\s*0\s*\]\[\s*-1\s*\]`
- **expect_exact_output:** |
  3
- **tutor:** `grid[0]` gets the first row; `len(grid[0]) - 1` is that row's
  last valid index — combining nested indexing with the len()-1 pattern from
  Lesson 5.1.
- **pass_rule:** Run exits 0 and stdout is exactly `3`.


### py-5.9-07 · Debug the Grid Update

- **type:** practical
- **practice_group:** true
- **do:** The program should replace the first value in the second row with
  `9`, then report the final value in that row. It currently updates the
  second value in the first row and reads from the wrong row. **Repair both
  nested indexes.**
- **starter_code:**
  ```python
  grid = [[1, 2], [3, 4]]
  grid[0][1] = 9
  print(grid)
  print(f"Final value: {grid[0][-1]}")
  ```
- **solution:**
  ```python
  grid = [[1, 2], [3, 4]]
  grid[1][0] = 9
  print(grid)
  print(f"Final value: {grid[1][-1]}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `grid\s*\[\s*1\s*\]\s*\[\s*0\s*\]\s*=\s*9`
  - `grid\s*\[\s*1\s*\]\s*\[\s*-1\s*\]`
- **expect_exact_output:** |
  [[1, 2], [9, 4]]
  Final value: 4
- **tutor:** `grid[1][0] = 9` targets the second row's first item;
  `grid[1][-1]` reads the last value from that same row. Passing this item
  completes Lesson 5.9 and unlocks the checkpoint.
- **pass_rule:** Run exits 0 and stdout is exactly `[[1, 2], [9, 4]]` then `Final value: 4`.

## Checkpoint — Topic 5  {#py-5.CP}

- **objective:** Read four numbers, transform a working list while keeping
  an independent original, summarize the result with a tuple, and store both
  list versions in a nested history.
- **estimated_time:** 20–30 min
- **type:** checkpoint
- **brief:** Read four whole numbers, preserve their original order,
  transform a working list, summarize the result with a tuple, and store
  both list versions in a nested history.
- **requirements:**
  - Read four lines with `input()` and convert each to `int`. Do not print
    prompts.
  - Create `values` as a four-item list containing the inputs in their
    entered order.
  - Create an independent outer copy named `original` with `values[:]`.
  - Remove the item at index `1` with `pop(1)` and assign it to `removed`.
  - Append `removed * 2` to `values`.
  - Sort `values` into ascending order by calling `values.sort()`.
  - Create the tuple `summary` from `values[0]` and `values[-1]`, then
    unpack it into `lowest` and `highest`.
  - Create `history` as the nested list `[original, values]`.
  - Use f-strings to print exactly these six lines:
    `Original: <history[0]>`, `Updated: <history[1]>`,
    `Removed: <removed>`, `Lowest: <lowest>`, `Highest: <highest>`,
    `Summary: <summary>`.
  - Do not use loops, comprehensions, dictionaries, sets, branching, or
    hardcoded finished results.
- **solution:**
  ```python
  first = int(input())
  second = int(input())
  third = int(input())
  fourth = int(input())
  values = [first, second, third, fourth]
  original = values[:]
  removed = values.pop(1)
  values.append(removed * 2)
  values.sort()
  summary = (values[0], values[-1])
  lowest, highest = summary
  history = [original, values]
  print(f"Original: {history[0]}")
  print(f"Updated: {history[1]}")
  print(f"Removed: {removed}")
  print(f"Lowest: {lowest}")
  print(f"Highest: {highest}")
  print(f"Summary: {summary}")
  ```
- **evaluator:** hidden-tests
- **hidden_tests:**
  ```yaml
  - stdin: "12\n5\n9\n7"
    stdout: "Original: [12, 5, 9, 7]\nUpdated: [7, 9, 10, 12]\nRemoved: 5\nLowest: 7\nHighest: 12\nSummary: (7, 12)"
  - stdin: "4\n10\n1\n6"
    stdout: "Original: [4, 10, 1, 6]\nUpdated: [1, 4, 6, 20]\nRemoved: 10\nLowest: 1\nHighest: 20\nSummary: (1, 20)"
  - stdin: "8\n3\n8\n2"
    stdout: "Original: [8, 3, 8, 2]\nUpdated: [2, 6, 8, 8]\nRemoved: 3\nLowest: 2\nHighest: 8\nSummary: (2, 8)"
  ```
- **tutor:** Build `values`, copy it into `original` before any mutation,
  then walk the pop/append/sort/unpack chain in order. Passing this
  checkpoint completes Topic 5.
- **pass_rule:** All hidden tests pass. Passing the checkpoint completes the
  topic.
