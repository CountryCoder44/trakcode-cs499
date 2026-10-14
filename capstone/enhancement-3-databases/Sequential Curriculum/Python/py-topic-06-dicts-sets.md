---
topic_id: py-topic-06
course: python
section: foundations
topic_number: 6
title: Dictionaries and Sets
slug: dicts-sets
lessons: [py-6.1, py-6.2, py-6.3, py-6.4, py-6.5, py-6.6, py-6.7, py-6.8, py-6.9]
checkpoint_id: py-6.CP
live_coding_exception: false
format_version: 1
---

# Topic 6 — Dictionaries and Sets

Lists are useful when position matters. This topic introduces two more ways
to organize related data. Dictionaries connect keys to values, while sets
keep one copy of each distinct value. You'll build, read, update, search,
and combine both collections without needing loops or conditionals yet.

**Prerequisites from Topics 2–5.** You may use `print()`, variables,
assignment and reassignment, scalar values, Boolean expressions, f-strings,
`input()`, `len()`, list operations, `sorted()`, tuples, unpacking, and
simple nested lists.

**Scope boundaries.** Dictionary keys are strings in all required work.
Known-key access with square brackets always uses an existing key. Set
values are limited to strings and integers. Set output is passed through
`sorted()` whenever exact order matters. Dictionary and set comprehensions,
loops, branching, exceptions, custom sorting keys, dictionary copying, set
mutation during iteration, and hashability rules are deferred. Nested
structures stay at two collection levels.

**Live coding.** Lesson length follows the amount of explanation and
practice the material needs rather than a fixed item template. More than
half of the lesson items are practical, and the checkpoint is also live
coding. When a task requires a particular method, key access, nested
access, or set operation, grading verifies that structure rather than
accepting hardcoded output.

## Lesson 6.1 — Creating and Reading Dictionaries  {#py-6.1}

- **objective:** Create dictionaries, retrieve known values by key, and
  measure the number of key-value pairs.
- **estimated_time:** 15–20 min
- **item_count:** 7
- **live_coding_items:** 3

### py-6.1-00 · Why Dictionaries, Not Just Lists

- **type:** reading
- **read:** Every real program you'll ever write is drowning in data that doesn't
  fit neatly into a numbered list. A user has a name, an email, and a signup
  date, not a "first thing," "second thing," and "third thing" you have to
  remember the order of. Lists gave you order, but order was never really the
  point for most of the data you'll actually work with; what you need instead
  is *meaning*, a way to say exactly what each piece of data actually is, by
  name, so the code reads back the way you'd describe it out loud. That's the
  shift this lesson makes: from "the third item in the list" to "the thing
  labeled `email`," and it changes more about how you think than it might
  seem to at first. Any time you're modeling something with named properties,
  a user profile with a name and an age, a product listing with a price and a
  description, a single row pulled from a spreadsheet with a dozen labeled
  columns, a dictionary is how you hold it in a way that reads back naturally.
  Come back to that code six months later, or hand it to a teammate who's
  never seen it, and `profile["email"]` still tells its own story, while
  `profile[2]` tells you nothing without a comment explaining what position
  two was supposed to mean. That difference sounds small in a short program,
  but it compounds fast: real applications juggle dozens of these labeled
  records at once, and the ability to reach for a value by its actual name,
  instead of memorizing an arbitrary position, is what keeps that complexity
  from becoming unmanageable.
- **pass_rule:** Learner reads and continues.

### py-6.1-01 · Dictionaries Connect Keys to Values

- **type:** concept
- **read:** A **dictionary** connects each key to a value. Write it with
  curly braces, placing a colon between each key and value:
  `{"name": "Ada", "score": 95}`. Instead of asking for an item by its
  numbered position, you ask for it by key. Here, `"name"` leads to `"Ada"`.
- **check:** Which expression creates a dictionary connecting `"color"` to
  `"blue"`?
  - A. `["color", "blue"]`
  - B. `{"color": "blue"}`
  - C. `("color", "blue")`
  - D. `"color: blue"`
- **answer:** B
- **rationale:** Curly braces create the dictionary, and the colon connects
  the key to its value.
- **if_incorrect:** Look for one key-value pair inside curly braces. A comma
  can separate pairs, but the colon is what connects each key to its value.
- **tutor:** Ask the learner to point to the colon and say which side is the
  key and which side is the value.
- **pass_rule:** Learner selects B.

### py-6.1-02 · Build a Small Profile

- **type:** practical
- **do:** Assign `{"name": "Ada", "city": "London"}` to `profile`. Print
  the complete dictionary, then print the value connected to `"name"` by
  using `profile["name"]`.
- **starter_code:**
  ```python
  profile = {"name": "Ada", "city": "London"}
  ```
- **solution:**
  ```python
  profile = {"name": "Ada", "city": "London"}
  print(profile)
  print(profile["name"])
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `print\s*\(\s*profile\s*\)`
  - `profile\[['"]name['"]\]`
- **expect_exact_output:** |
  {'name': 'Ada', 'city': 'London'}
  Ada
- **tutor:** `print(profile)` shows the whole dictionary; `profile["name"]`
  reaches in for just one value.
- **pass_rule:** Run exits 0 and stdout is exactly
  `{'name': 'Ada', 'city': 'London'}` then `Ada`.

### py-6.1-03 · Each Key Is Unique

- **type:** concept
- **read:** Each key appears only once in a dictionary. Different keys may
  point to the same value, but one key cannot keep two separate values at
  the same time. The values may also have different types, so a profile can
  hold a name, age, and Boolean status together.
- **check:** Which dictionary has three different keys?
  - A. `{"x": 1, "x": 2, "x": 3}`
  - B. `{"name": "Ada", "age": 30, "active": True}`
  - C. `["name", "age", "active"]`
  - D. `{"name": "Ada"}`
- **answer:** B
- **rationale:** It contains the three distinct keys `"name"`, `"age"`, and
  `"active"`.
- **if_incorrect:** Count the labels before the colons. Repeating the same
  label does not create three separate dictionary keys.
- **tutor:** If they pick A, ask what happens when the same key is written
  twice in one dictionary literal.
- **pass_rule:** Learner selects B.

### py-6.1-04 · Read Different Value Types

- **type:** practical
- **do:** Create `account` with the pairs `"owner": "Grace"`,
  `"points": 120`, and `"active": True`. Print the values for those three
  keys on separate labeled f-string lines. **Retrieve every value from the
  dictionary.**
- **starter_code:**
  ```python
  account = {"owner": "Grace", "points": 120, "active": True}
  ```
- **solution:**
  ```python
  account = {"owner": "Grace", "points": 120, "active": True}
  print(f"Owner: {account['owner']}")
  print(f"Points: {account['points']}")
  print(f"Active: {account['active']}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `account\[['"]owner['"]\]`
  - `account\[['"]points['"]\]`
  - `account\[['"]active['"]\]`
- **expect_exact_output:** |
  Owner: Grace
  Points: 120
  Active: True
- **tutor:** Each labeled line comes from reading one key out of `account` —
  none of the three values should be typed in literally.
- **pass_rule:** Run exits 0 and stdout is exactly `Owner: Grace` then
  `Points: 120` then `Active: True`.

### py-6.1-05 · len() Counts Key-Value Pairs

- **type:** concept
- **read:** `len(dictionary)` counts the dictionary's key-value pairs. An
  empty dictionary is written as `{}` and has length `0`. A dictionary with
  three keys has length `3`, even if two keys happen to share the same
  value.
- **check:** What does `len({"a": 5, "b": 5, "c": 8})` produce?
  - A. `2`
  - B. `3`
  - C. `5`
  - D. `8`
- **answer:** B
- **rationale:** The dictionary has three keys, so it contains three
  key-value pairs.
- **if_incorrect:** Count the keys rather than the distinct values. Matching
  values do not merge their pairs.
- **tutor:** Point out that two keys sharing the value `5` are still two
  separate pairs.
- **pass_rule:** Learner selects B.

### py-6.1-06 · Create a Book Summary

- **type:** practical
- **do:** Create `book` with `"title": "Dune"`, `"pages": 412`, and
  `"available": True`. Print the title, page count, availability, and
  number of fields on four labeled f-string lines. **Retrieve every
  displayed value from the dictionary and use `len(book)` for the field
  count.**
- **starter_code:**
  ```python
  book = {"title": "Dune", "pages": 412, "available": True}
  ```
- **solution:**
  ```python
  book = {"title": "Dune", "pages": 412, "available": True}
  print(f"Title: {book['title']}")
  print(f"Pages: {book['pages']}")
  print(f"Available: {book['available']}")
  print(f"Fields: {len(book)}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `book\[['"]title['"]\]`
  - `book\[['"]pages['"]\]`
  - `book\[['"]available['"]\]`
  - `len\s*\(\s*book\s*\)`
- **expect_exact_output:** |
  Title: Dune
  Pages: 412
  Available: True
  Fields: 3
- **tutor:** This combines direct key access with `len()` in one report —
  the field count should come from `len(book)`, never a typed-in `3`.
- **pass_rule:** Run exits 0 and stdout is exactly `Title: Dune` then
  `Pages: 412` then `Available: True` then `Fields: 3`.

## Lesson 6.2 — Adding and Updating Dictionary Entries  {#py-6.2}

- **objective:** Add new key-value pairs and replace values connected to
  existing keys.
- **estimated_time:** 15–20 min
- **item_count:** 6
- **live_coding_items:** 3

### py-6.2-00 · Records That Change Over Time

- **type:** reading
- **read:** Real records are almost never complete on the day they're created. A
  signup form fills in fields one at a time as a user types: first a name,
  then an email, then a password, each one added to the same growing record.
  A shopping cart starts empty and grows one item at a time as someone
  browses. A settings panel lets you flip a single option, like turning on
  dark mode, without touching anything else you've already configured. None
  of that works if building a record means writing the whole thing out fresh
  every time something changes. Being able to add a brand-new field, or reach
  in and update one value while leaving everything else exactly as it was, is
  what makes a dictionary genuinely useful for anything that evolves over
  time, and almost everything worth modeling does evolve over time, whether
  it's over the course of a single form submission or the entire lifetime of
  a user's account.
- **pass_rule:** Learner reads and continues.

### py-6.2-01 · Assignment Can Add a New Pair

- **type:** concept
- **read:** Use square-bracket assignment to add a new key-value pair.
  Starting with `profile = {"name": "Ada"}`, the instruction
  `profile["city"] = "London"` adds a second pair. The dictionary changes in
  place, just as a list changes when one of its items is replaced.
- **check:** What is `settings` after this code?

  ```python
  settings = {"theme": "dark"}
  settings["volume"] = 8
  ```
  - A. `{"theme": "dark"}`
  - B. `{"volume": 8}`
  - C. `{"theme": "dark", "volume": 8}`
  - D. `["theme", "volume"]`
- **answer:** C
- **rationale:** `"volume"` was not already a key, so the assignment adds a
  new pair.
- **if_incorrect:** Keep the existing pair and add the new key with its
  value. Nothing is removed by this instruction.
- **tutor:** Ask what happens to the existing `"theme"` pair when a
  different key is assigned.
- **pass_rule:** Learner selects C.

### py-6.2-02 · Add Contact Details

- **type:** practical
- **do:** Start with `contact = {"name": "Linus"}`. Add
  `"email": "linus@example.com"` and `"verified": True` with two
  square-bracket assignments. Print the final dictionary. **Do not rewrite
  the original dictionary literal.**
- **starter_code:**
  ```python
  contact = {"name": "Linus"}
  ```
- **solution:**
  ```python
  contact = {"name": "Linus"}
  contact["email"] = "linus@example.com"
  contact["verified"] = True
  print(contact)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `contact\[['"]email['"]\]\s*=\s*['"]linus@example\.com['"]`
  - `contact\[['"]verified['"]\]\s*=\s*True`
- **forbid_code:**
  - `contact\s*=\s*\{[^}]*email`
- **expect_exact_output:** |
  {'name': 'Linus', 'email': 'linus@example.com', 'verified': True}
- **tutor:** Two separate assignments, not a rewritten literal — each one
  should add exactly one new pair.
- **pass_rule:** Run exits 0 and stdout is exactly
  `{'name': 'Linus', 'email': 'linus@example.com', 'verified': True}`.

### py-6.2-03 · Assignment Replaces an Existing Value

- **type:** concept
- **read:** The same syntax updates an existing key. If `score` already
  contains the key `"points"`, then `score["points"] = 90` replaces the old
  value connected to that key. It does not create a second `"points"` entry
  because dictionary keys are unique.
- **check:** What is `score` after this code?

  ```python
  score = {"points": 70, "level": 2}
  score["points"] = 90
  ```
  - A. `{"points": 70, "level": 2}`
  - B. `{"points": 90, "level": 2}`
  - C. `{"points": 70, "points": 90, "level": 2}`
  - D. `{"level": 90}`
- **answer:** B
- **rationale:** The existing `"points"` value is replaced while `"level"`
  stays unchanged.
- **if_incorrect:** Find the matching key and replace only its value. A
  dictionary keeps one value for each key.
- **tutor:** Ask whether a dictionary can hold two entries for the exact
  same key.
- **pass_rule:** Learner selects B.

### py-6.2-04 · Update a Product Record

- **type:** practical
- **do:** Assign `{"name": "Keyboard", "price": 45}` to `product`. Change
  the price to `40`, add `"stock": 12`, and print the complete dictionary.
  **Use two key assignments after creating the original dictionary.**
- **starter_code:**
  ```python
  product = {"name": "Keyboard", "price": 45}
  ```
- **solution:**
  ```python
  product = {"name": "Keyboard", "price": 45}
  product["price"] = 40
  product["stock"] = 12
  print(product)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `product\[['"]price['"]\]\s*=\s*40`
  - `product\[['"]stock['"]\]\s*=\s*12`
- **expect_exact_output:** |
  {'name': 'Keyboard', 'price': 40, 'stock': 12}
- **tutor:** One assignment replaces an existing key, the other adds a new
  one — same syntax, different effect.
- **pass_rule:** Run exits 0 and stdout is exactly
  `{'name': 'Keyboard', 'price': 40, 'stock': 12}`.

### py-6.2-05 · Complete a Player Record

- **type:** practical
- **do:** Start with `player = {"name": "Mina", "score": 10}`. Update the
  score to `25`, add a new level of `2`, and add `"active": True`. Print the
  finished dictionary and `Fields: 4`. **Use three square-bracket
  assignments after the original dictionary is created.**
- **starter_code:**
  ```python
  player = {"name": "Mina", "score": 10}
  ```
- **solution:**
  ```python
  player = {"name": "Mina", "score": 10}
  player["score"] = 25
  player["level"] = 2
  player["active"] = True
  print(player)
  print(f"Fields: {len(player)}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `player\[['"]score['"]\]\s*=\s*25`
  - `player\[['"]level['"]\]\s*=\s*2`
  - `player\[['"]active['"]\]\s*=\s*True`
  - `len\s*\(\s*player\s*\)`
- **expect_exact_output:** |
  {'name': 'Mina', 'score': 25, 'level': 2, 'active': True}
  Fields: 4
- **tutor:** One update, two additions — walk through each assignment in
  order and confirm the field count comes from `len(player)`.
- **pass_rule:** Run exits 0 and stdout is exactly
  `{'name': 'Mina', 'score': 25, 'level': 2, 'active': True}` then
  `Fields: 4`.

## Lesson 6.3 — Membership and Safe Dictionary Lookup  {#py-6.3}

- **objective:** Check for keys and retrieve optional values with `get()`.
- **estimated_time:** 15–20 min
- **item_count:** 7
- **live_coding_items:** 3

### py-6.3-00 · Handling Data That Might Be Missing

- **type:** reading
- **read:** Not every record has every field, and pretending otherwise is one of
  the fastest ways to crash a real program. A user might never have entered a
  phone number. An API response might quietly omit an optional value when
  there's nothing to report. A config file might leave a setting unset,
  expecting the program to fall back to some sensible default instead of
  demanding it be there. Checking whether a key exists before you rely on it,
  and safely substituting a fallback value when it doesn't, is the difference
  between software that shrugs off messy, incomplete, real-world data and
  software that falls over the very first time someone's information doesn't
  perfectly match what you imagined when you wrote it. This is a small habit
  with an outsized payoff: almost every bug report that starts with "it
  crashed when I left a field blank" traces back to skipping exactly this
  check.
- **pass_rule:** Learner reads and continues.

### py-6.3-01 · Dictionary Membership Checks Keys

- **type:** concept
- **read:** With a dictionary, `in` and `not in` check the keys. For
  `profile = {"name": "Ada", "city": "London"}`, `"city" in profile` is
  `True`, but `"London" in profile` is `False` because `"London"` is a
  value, not a key.
- **check:** What does `"score" in {"name": "Kai", "score": 88}` produce?
  - A. `True`
  - B. `False`
  - C. `88`
  - D. `"score"`
- **answer:** A
- **rationale:** `"score"` appears as a dictionary key, so the membership
  check is true.
- **if_incorrect:** Membership asks whether the requested value is one of
  the dictionary's keys. It returns a Boolean, not the connected value.
- **tutor:** Ask the learner to name the keys of the dictionary before
  answering.
- **pass_rule:** Learner selects A.

### py-6.3-02 · Check Available Fields

- **type:** practical
- **do:** Assign `{"title": "Engineer", "remote": True}` to `job`. Store
  `"remote" in job` in `has_remote` and `"salary" not in job` in
  `salary_missing`. Print both labeled Boolean results with f-strings.
- **starter_code:**
  ```python
  job = {"title": "Engineer", "remote": True}
  ```
- **solution:**
  ```python
  job = {"title": "Engineer", "remote": True}
  has_remote = "remote" in job
  salary_missing = "salary" not in job
  print(f"Has remote: {has_remote}")
  print(f"Salary missing: {salary_missing}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `['"]remote['"]\s*in\s*job`
  - `['"]salary['"]\s*not\s*in\s*job`
- **expect_exact_output:** |
  Has remote: True
  Salary missing: True
- **tutor:** Both lines check for a KEY's presence, not a value.
- **pass_rule:** Run exits 0 and stdout is exactly `Has remote: True` then
  `Salary missing: True`.

### py-6.3-03 · get() Handles an Optional Key

- **type:** concept
- **read:** Square brackets are best when a key is known to exist. For an
  optional key, `get(key)` is safer: it returns the connected value when
  the key exists and returns `None` when it does not. With
  `user = {"name": "Ada"}`, `user.get("name")` is `"Ada"`, while
  `user.get("phone")` is `None`.
- **check:** What does `{"theme": "dark"}.get("language")` produce?
  - A. `"language"`
  - B. `"dark"`
  - C. `False`
  - D. `None`
- **answer:** D
- **rationale:** The requested key is absent, so `get()` returns `None`.
- **if_incorrect:** `get()` does not borrow another key's value. Without the
  requested key or a custom fallback, the result is `None`.
- **tutor:** Contrast with square brackets, which would raise an error
  instead of returning `None`.
- **pass_rule:** Learner selects D.

### py-6.3-04 · Read an Optional Setting

- **type:** practical
- **do:** Assign `{"theme": "light"}` to `settings`. Use `get()` to assign
  the existing theme to `theme` and the missing language to `language`.
  Print `Theme: light` and `Language: None` with f-strings.
- **starter_code:**
  ```python
  settings = {"theme": "light"}
  ```
- **solution:**
  ```python
  settings = {"theme": "light"}
  theme = settings.get("theme")
  language = settings.get("language")
  print(f"Theme: {theme}")
  print(f"Language: {language}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `settings\.get\s*\(\s*['"]theme['"]\s*\)`
  - `settings\.get\s*\(\s*['"]language['"]\s*\)`
- **expect_exact_output:** |
  Theme: light
  Language: None
- **tutor:** `language` should come from `get()` returning `None`, not from
  typing the word `None` directly.
- **pass_rule:** Run exits 0 and stdout is exactly `Theme: light` then
  `Language: None`.

### py-6.3-05 · get() Can Supply a Fallback

- **type:** concept
- **read:** A second argument gives `get()` a fallback value for a missing
  key. With `counts = {"apples": 4}`, `counts.get("oranges", 0)` returns
  `0`. The fallback is returned, but it is not added to the dictionary.
- **check:** What does `{"mode": "fast"}.get("retries", 3)` produce?
  - A. `None`
  - B. `3`
  - C. `"retries"`
  - D. `{"retries": 3}`
- **answer:** B
- **rationale:** `"retries"` is absent, so `get()` returns the provided
  fallback value `3`.
- **if_incorrect:** The second argument is the value to use when the key is
  missing. It is returned directly and does not create a new pair.
- **tutor:** Ask whether the dictionary itself changes after this call.
- **pass_rule:** Learner selects B.

### py-6.3-06 · Build a Preferences Report

- **type:** practical
- **do:** Assign `{"theme": "dark", "notifications": True}` to
  `preferences`. Store whether the `"theme"` key exists in `has_theme`.
  Retrieve `"theme"` with `get()`, and retrieve the missing `"language"`
  with the fallback `"English"`. Print all three results on labeled
  f-string lines.
- **starter_code:**
  ```python
  preferences = {"theme": "dark", "notifications": True}
  ```
- **solution:**
  ```python
  preferences = {"theme": "dark", "notifications": True}
  has_theme = "theme" in preferences
  theme = preferences.get("theme")
  language = preferences.get("language", "English")
  print(f"Has theme: {has_theme}")
  print(f"Theme: {theme}")
  print(f"Language: {language}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `['"]theme['"]\s*in\s*preferences`
  - `preferences\.get\s*\(\s*['"]theme['"]\s*\)`
  - `preferences\.get\s*\(\s*['"]language['"]\s*,\s*['"]English['"]\s*\)`
- **expect_exact_output:** |
  Has theme: True
  Theme: dark
  Language: English
- **tutor:** Three different lookups in one report — membership, a direct
  `get()`, and a `get()` with a fallback.
- **pass_rule:** Run exits 0 and stdout is exactly `Has theme: True` then
  `Theme: dark` then `Language: English`.

## Lesson 6.4 — Removing Dictionary Entries  {#py-6.4}

- **objective:** Remove pairs with `pop()` or `del` and empty a dictionary
  with `clear()`.
- **estimated_time:** 15–20 min
- **item_count:** 6
- **live_coding_items:** 3

### py-6.4-00 · Cleaning Up Safely

- **type:** reading
- **read:** Data needs to come back out of a dictionary just as often as it goes
  in, and different situations call for different ways of taking it out.
  Sometimes you need to remove something *and* keep what you removed:
  clearing a completed task off a to-do list while logging what just got
  finished, or pulling a coupon out of an order while still needing its
  discount value a moment later. Sometimes you just need it gone, with no
  further use for it: deleting an account field a user explicitly asked to
  remove, or evicting a single stale entry from a cache without caring what
  it used to hold. And sometimes you need to wipe the slate completely:
  logging someone out and clearing their entire session in one motion, rather
  than one field at a time. Knowing which tool fits which situation keeps
  that cleanup deliberate and readable, instead of a pile of ad hoc
  workarounds that each do almost, but not quite, the same thing.
- **pass_rule:** Learner reads and continues.

### py-6.4-01 · pop() Removes a Pair and Returns Its Value

- **type:** concept
- **read:** `pop(key)` removes an existing key-value pair and returns its
  value. This is useful when you still need the removed information. If
  `item = {"name": "Pen", "price": 2}` and
  `old_price = item.pop("price")`, then `old_price` is `2` and `item` keeps
  only the `"name"` pair.
- **check:** What are `removed` and `data` after this code?

  ```python
  data = {"a": 1, "b": 2}
  removed = data.pop("a")
  ```
  - A. `removed` is `"a"`; `data` is `{"b": 2}`
  - B. `removed` is `1`; `data` is `{"b": 2}`
  - C. `removed` is `1`; `data` is `{"a": 1}`
  - D. `removed` is `2`; `data` is `{"a": 1}`
- **answer:** B
- **rationale:** `pop("a")` returns the value `1` and removes the pair whose
  key is `"a"`.
- **if_incorrect:** Keep the returned value separate from the dictionary
  left behind. The key chooses the pair, and its value is what `pop()`
  returns.
- **tutor:** Ask what a `pop()` call gives back versus what it leaves in
  the dictionary.
- **pass_rule:** Learner selects B.

### py-6.4-02 · Remove and Report a Field

- **type:** practical
- **do:** Assign `{"name": "Ada", "password": "secret", "active": True}`
  to `user`. Pop `"password"` into `removed`, then print `Removed: secret`
  and the remaining dictionary. **Use the value returned by `pop()`.**
- **starter_code:**
  ```python
  user = {"name": "Ada", "password": "secret", "active": True}
  ```
- **solution:**
  ```python
  user = {"name": "Ada", "password": "secret", "active": True}
  removed = user.pop("password")
  print(f"Removed: {removed}")
  print(user)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `user\.pop\s*\(\s*['"]password['"]\s*\)`
- **expect_exact_output:** |
  Removed: secret
  {'name': 'Ada', 'active': True}
- **tutor:** `removed` should come from what `pop()` returns, not a typed
  `"secret"`.
- **pass_rule:** Run exits 0 and stdout is exactly `Removed: secret` then
  `{'name': 'Ada', 'active': True}`.

### py-6.4-03 · del and clear() Remove Without Returning Values

- **type:** concept
- **read:** `del dictionary[key]` removes an existing pair without
  returning its value. After `del profile["temporary"]`, that key and its
  value are gone. The `clear()` method removes every pair and leaves the
  existing dictionary empty. Use `pop()` when one removed value is needed,
  `del` when it is not, and `clear()` when the whole dictionary should be
  emptied.
- **check:** What is `settings` after this code?

  ```python
  settings = {"theme": "dark", "temporary": True}
  del settings["temporary"]
  ```
  - A. `{"theme": "dark"}`
  - B. `{"temporary": True}`
  - C. `{"theme": "dark", "temporary": False}`
  - D. `{}`
- **answer:** A
- **rationale:** `del` removes only the pair whose key is `"temporary"`.
- **if_incorrect:** Remove the selected key-value pair and leave every
  other pair unchanged.
- **tutor:** Ask which single key `del` targets here.
- **pass_rule:** Learner selects A.

### py-6.4-04 · Delete a Temporary Setting

- **type:** practical
- **do:** Assign `{"mode": "safe", "temporary": 99, "retries": 3}` to
  `settings`. Delete the `"temporary"` pair with `del`, then print the
  dictionary and its new length.
- **starter_code:**
  ```python
  settings = {"mode": "safe", "temporary": 99, "retries": 3}
  ```
- **solution:**
  ```python
  settings = {"mode": "safe", "temporary": 99, "retries": 3}
  del settings["temporary"]
  print(settings)
  print(f"Fields: {len(settings)}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `del\s+settings\[['"]temporary['"]\]`
  - `len\s*\(\s*settings\s*\)`
- **expect_exact_output:** |
  {'mode': 'safe', 'retries': 3}
  Fields: 2
- **tutor:** `del` removes the pair outright — nothing is returned to
  print.
- **pass_rule:** Run exits 0 and stdout is exactly
  `{'mode': 'safe', 'retries': 3}` then `Fields: 2`.

### py-6.4-05 · Clean Two Records

- **type:** practical
- **do:** Assign `{"title": "Guide", "draft": True, "temporary": 4}` to
  `record` and `{"old": 1, "unused": 2}` to `backup`. Pop `"draft"` into
  `removed`, delete `"temporary"` with `del`, and empty `backup` with
  `clear()`. Print the removed value and both finished dictionaries.
- **starter_code:**
  ```python
  record = {"title": "Guide", "draft": True, "temporary": 4}
  backup = {"old": 1, "unused": 2}
  ```
- **solution:**
  ```python
  record = {"title": "Guide", "draft": True, "temporary": 4}
  backup = {"old": 1, "unused": 2}
  removed = record.pop("draft")
  del record["temporary"]
  backup.clear()
  print(f"Removed: {removed}")
  print(f"Record: {record}")
  print(f"Backup: {backup}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `record\.pop\s*\(\s*['"]draft['"]\s*\)`
  - `del\s+record\[['"]temporary['"]\]`
  - `backup\.clear\s*\(\s*\)`
- **expect_exact_output:** |
  Removed: True
  Record: {'title': 'Guide'}
  Backup: {}
- **tutor:** Three different removal tools in one item — `pop()` for a
  needed value, `del` for a known key, `clear()` for everything.
- **pass_rule:** Run exits 0 and stdout is exactly `Removed: True` then
  `Record: {'title': 'Guide'}` then `Backup: {}`.

## Lesson 6.5 — Working with Keys, Values, and Pairs  {#py-6.5}

- **objective:** Retrieve dictionary keys, values, and key-value pairs in a
  simple list form.
- **estimated_time:** 20–25 min
- **item_count:** 8
- **live_coding_items:** 4

### py-6.5-00 · Turning Data Into Reports

- **type:** reading
- **read:** Sooner or later, you stop caring about one value in a dictionary and
  need to look at the whole thing at once. You want every field name on a
  form so you can validate that nothing's missing. You want every price in a
  catalog so you can compute a total. You want every setting a user has
  configured so you can display it back to them, or every name-value pair in
  a record so you can export it to a spreadsheet, write it to a log file, or
  hand it off to some other part of the system that expects data in that
  shape. Pulling out just the keys, just the values, or both together as
  matched pairs is how a dictionary stops being a private little lookup table
  and becomes something you can summarize, transform, and pass along, which
  is most of what real programs spend their time actually doing with the
  data they collect.
- **pass_rule:** Learner reads and continues.

### py-6.5-01 · keys() Provides the Keys

- **type:** concept
- **read:** `dictionary.keys()` provides the dictionary's keys. For
  straightforward output in this topic, wrap that result in `list()`:
  `list(profile.keys())`. The keys appear in the order they were added.
  With `profile = {"name": "Ada", "city": "London"}`, the result is
  `["name", "city"]`.
- **check:** What does `list({"a": 1, "b": 2}.keys())` produce?
  - A. `[1, 2]`
  - B. `["a", "b"]`
  - C. `[("a", 1), ("b", 2)]`
  - D. `["a", 1, "b", 2]`
- **answer:** B
- **rationale:** `keys()` selects the keys, and `list()` places them in a
  list.
- **if_incorrect:** Read only the labels before the colons. Values and
  complete pairs are available through different methods.
- **tutor:** Ask them to name just the keys before checking the options.
- **pass_rule:** Learner selects B.

### py-6.5-02 · List the Available Fields

- **type:** practical
- **do:** Assign `{"title": "Python", "level": "beginner", "active": True}`
  to `course`. Assign `list(course.keys())` to `fields`, then print
  `fields` and `Field count: 3` on separate lines.
- **starter_code:**
  ```python
  course = {"title": "Python", "level": "beginner", "active": True}
  ```
- **solution:**
  ```python
  course = {"title": "Python", "level": "beginner", "active": True}
  fields = list(course.keys())
  print(fields)
  print(f"Field count: {len(fields)}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `list\s*\(\s*course\.keys\s*\(\s*\)\s*\)`
- **expect_exact_output:** |
  ['title', 'level', 'active']
  Field count: 3
- **tutor:** `fields` should come from `course.keys()`, not a retyped list
  of the labels.
- **pass_rule:** Run exits 0 and stdout is exactly
  `['title', 'level', 'active']` then `Field count: 3`.

### py-6.5-03 · values() Provides the Values

- **type:** concept
- **read:** `dictionary.values()` provides the values without their keys.
  Wrapping it in `list()` gives a regular list in the same insertion order.
  With `scores = {"Ada": 90, "Grace": 95}`, `list(scores.values())`
  produces `[90, 95]`.
- **check:** What does `list({"x": 4, "y": 7}.values())` produce?
  - A. `["x", "y"]`
  - B. `[4, 7]`
  - C. `[("x", 4), ("y", 7)]`
  - D. `[11]`
- **answer:** B
- **rationale:** `values()` selects the two connected values, and `list()`
  collects them.
- **if_incorrect:** Ignore the labels before the colons and keep the values
  after them in their current order.
- **tutor:** Contrast with `keys()` from the previous item — same shape,
  different half of each pair.
- **pass_rule:** Learner selects B.

### py-6.5-04 · Collect Names and Scores

- **type:** practical
- **do:** Assign `{"Ada": 90, "Grace": 95, "Linus": 88}` to `scores`. Store
  its keys in `names` and its values in `points`, using `list()` with the
  matching dictionary methods. Print both lists.
- **starter_code:**
  ```python
  scores = {"Ada": 90, "Grace": 95, "Linus": 88}
  ```
- **solution:**
  ```python
  scores = {"Ada": 90, "Grace": 95, "Linus": 88}
  names = list(scores.keys())
  points = list(scores.values())
  print(names)
  print(points)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `list\s*\(\s*scores\.keys\s*\(\s*\)\s*\)`
  - `list\s*\(\s*scores\.values\s*\(\s*\)\s*\)`
- **expect_exact_output:** |
  ['Ada', 'Grace', 'Linus']
  [90, 95, 88]
- **tutor:** One method for the names, a different one for the numbers —
  both wrapped in `list()`.
- **pass_rule:** Run exits 0 and stdout is exactly
  `['Ada', 'Grace', 'Linus']` then `[90, 95, 88]`.

### py-6.5-05 · items() Provides Key-Value Tuples

- **type:** concept
- **read:** `dictionary.items()` keeps each key beside its value. Wrapped
  in `list()`, it produces a list of two-item tuples. For
  `{"a": 1, "b": 2}`, the result of `list(data.items())` is
  `[("a", 1), ("b", 2)]`.
- **check:** What does `list({"red": 3}.items())` produce?
  - A. `["red"]`
  - B. `[3]`
  - C. `[("red", 3)]`
  - D. `["red", 3]`
- **answer:** C
- **rationale:** `items()` supplies each key and value together as a tuple
  inside the list.
- **if_incorrect:** Keep the pair together. The outer square brackets hold
  the list, and the inner parentheses hold the key-value tuple.
- **tutor:** Ask what shape holds "a key AND its value together" — recall
  tuples from Topic 5.
- **pass_rule:** Learner selects C.

### py-6.5-06 · Create Three Inventory Views

- **type:** practical
- **do:** Assign `{"pens": 4, "books": 2, "markers": 6}` to `inventory`.
  Create `names`, `quantities`, and `pairs` as lists made from the
  dictionary's keys, values, and items. Print all three lists on labeled
  f-string lines.
- **starter_code:**
  ```python
  inventory = {"pens": 4, "books": 2, "markers": 6}
  ```
- **solution:**
  ```python
  inventory = {"pens": 4, "books": 2, "markers": 6}
  names = list(inventory.keys())
  quantities = list(inventory.values())
  pairs = list(inventory.items())
  print(f"Names: {names}")
  print(f"Quantities: {quantities}")
  print(f"Pairs: {pairs}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `list\s*\(\s*inventory\.keys\s*\(\s*\)\s*\)`
  - `list\s*\(\s*inventory\.values\s*\(\s*\)\s*\)`
  - `list\s*\(\s*inventory\.items\s*\(\s*\)\s*\)`
- **expect_exact_output:** |
  Names: ['pens', 'books', 'markers']
  Quantities: [4, 2, 6]
  Pairs: [('pens', 4), ('books', 2), ('markers', 6)]
- **tutor:** Three views of the same dictionary — keys alone, values
  alone, and both together as pairs.
- **pass_rule:** Run exits 0 and stdout is exactly
  `Names: ['pens', 'books', 'markers']` then `Quantities: [4, 2, 6]` then
  `Pairs: [('pens', 4), ('books', 2), ('markers', 6)]`.

### py-6.5-07 · Unpack the First Dictionary Pair

- **type:** practical
- **do:** Assign `{"pen": 2, "book": 8}` to `prices`. Convert its items to
  a list named `pairs`. Assign the first tuple to `first_pair`, unpack it
  into `item` and `price`, then print `Item: pen`, `Price: 2`, and
  `Pair count: 2`. **Use `items()`, `list()`, indexing, and tuple
  unpacking.**
- **starter_code:**
  ```python
  prices = {"pen": 2, "book": 8}
  ```
- **solution:**
  ```python
  prices = {"pen": 2, "book": 8}
  pairs = list(prices.items())
  first_pair = pairs[0]
  item, price = first_pair
  print(f"Item: {item}")
  print(f"Price: {price}")
  print(f"Pair count: {len(pairs)}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `list\s*\(\s*prices\.items\s*\(\s*\)\s*\)`
  - `pairs\[\s*0\s*\]`
  - `item\s*,\s*price\s*=\s*first_pair`
- **expect_exact_output:** |
  Item: pen
  Price: 2
  Pair count: 2
- **tutor:** This chains four ideas from Topics 5 and 6 together — `items()`
  to pair keys with values, `list()` to index into them, then tuple
  unpacking to split one pair into two names.
- **pass_rule:** Run exits 0 and stdout is exactly `Item: pen` then
  `Price: 2` then `Pair count: 2`.

## Lesson 6.6 — Nested Dictionaries and Lists  {#py-6.6}

- **objective:** Retrieve and update values in small structures that
  combine dictionaries and lists.
- **estimated_time:** 15–20 min
- **item_count:** 7
- **live_coding_items:** 3

### py-6.6-00 · Modeling Real, Layered Data

- **type:** reading
- **read:** Real data is almost never flat, and the moment you start working
  with anything resembling an actual application, you'll bump into
  structures nested two, three, sometimes many levels deep. A user has an
  address, and that address has its own city and postal code buried inside
  it. A course has a list of enrolled students, and each of those students is
  their own full record with a name and a set of grades. This is exactly what
  data looks like coming back from a real web API or out of a real database:
  a dictionary is rarely off on its own, it's usually one piece nested inside
  a larger, layered structure that mirrors how the real-world thing you're
  modeling is actually organized. Learning to read a value two levels deep,
  or reach in and update something buried inside a nested list inside a
  nested dictionary, is one of the most immediately useful skills in this
  entire topic, because you will do it constantly the moment you start
  working with anything beyond a toy example.
- **pass_rule:** Learner reads and continues.

### py-6.6-01 · A Dictionary Value Can Be Another Dictionary

- **type:** concept
- **read:** A dictionary value can be another dictionary. This is a
  **nested dictionary**. In
  `user = {"name": "Ada", "contact": {"city": "London"}}`,
  `user["contact"]` retrieves the inner dictionary. Adding another key
  access, `user["contact"]["city"]`, reaches the string `"London"`.
- **check:** With `data = {"player": {"score": 40}}`, what does
  `data["player"]["score"]` produce?
  - A. `"player"`
  - B. `"score"`
  - C. `40`
  - D. `{"score": 40}`
- **answer:** C
- **rationale:** The first key selects the inner dictionary, and the second
  key selects its `"score"` value.
- **if_incorrect:** Work from left to right. Resolve the outer key first,
  then use the next key inside the dictionary it returns.
- **tutor:** Ask what `data["player"]` alone would produce before applying
  the second key.
- **pass_rule:** Learner selects C.

### py-6.6-02 · Read a Nested Profile

- **type:** practical
- **do:** Assign
  `{"name": "Ada", "contact": {"city": "London", "country": "UK"}}` to
  `profile`. Retrieve and print the name, city, and country on separate
  labeled f-string lines. **Use both dictionary levels for city and
  country.**
- **starter_code:**
  ```python
  profile = {"name": "Ada", "contact": {"city": "London", "country": "UK"}}
  ```
- **solution:**
  ```python
  profile = {"name": "Ada", "contact": {"city": "London", "country": "UK"}}
  print(f"Name: {profile['name']}")
  print(f"City: {profile['contact']['city']}")
  print(f"Country: {profile['contact']['country']}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `profile\[['"]contact['"]\]\[['"]city['"]\]`
  - `profile\[['"]contact['"]\]\[['"]country['"]\]`
- **expect_exact_output:** |
  Name: Ada
  City: London
  Country: UK
- **tutor:** City and country both need two key lookups chained together —
  the outer key first, then the inner one.
- **pass_rule:** Run exits 0 and stdout is exactly `Name: Ada` then
  `City: London` then `Country: UK`.

### py-6.6-03 · A Dictionary Value Can Be a List

- **type:** concept
- **read:** Lists also work as dictionary values. With
  `course = {"title": "Python", "lessons": ["Basics", "Strings"]}`,
  `course["lessons"]` retrieves the complete list and
  `course["lessons"][0]` retrieves `"Basics"`. The key selects the list;
  the index then selects an item inside it.
- **check:** With `team = {"members": ["Ada", "Grace"]}`, what does
  `team["members"][1]` produce?
  - A. `"members"`
  - B. `"Ada"`
  - C. `"Grace"`
  - D. `["Ada", "Grace"]`
- **answer:** C
- **rationale:** The key retrieves the member list, and index `1` retrieves
  its second name.
- **if_incorrect:** First retrieve the list connected to `"members"`; then
  apply the familiar zero-based list index.
- **tutor:** Ask what `team["members"]` alone returns before indexing into
  it.
- **pass_rule:** Learner selects C.

### py-6.6-04 · Read a Course Record

- **type:** practical
- **do:** Assign `{"title": "Python", "scores": [82, 91, 88]}` to
  `course`. Print the title, the second score, and the number of scores on
  separate labeled lines. **Retrieve every result through `course`.**
- **starter_code:**
  ```python
  course = {"title": "Python", "scores": [82, 91, 88]}
  ```
- **solution:**
  ```python
  course = {"title": "Python", "scores": [82, 91, 88]}
  print(f"Title: {course['title']}")
  print(f"Second score: {course['scores'][1]}")
  print(f"Score count: {len(course['scores'])}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `course\[['"]scores['"]\]\[\s*1\s*\]`
  - `len\s*\(\s*course\[['"]scores['"]\]\s*\)`
- **expect_exact_output:** |
  Title: Python
  Second score: 91
  Score count: 3
- **tutor:** The score count should come from `len()` on the nested list,
  not a typed `3`.
- **pass_rule:** Run exits 0 and stdout is exactly `Title: Python` then
  `Second score: 91` then `Score count: 3`.

### py-6.6-05 · Nested Values Can Be Updated

- **type:** concept
- **read:** Reach the nested value first, then assign its replacement. If
  `player = {"stats": {"score": 10}}`, the instruction
  `player["stats"]["score"] = 25` changes the score inside the inner
  dictionary. For a list value, `player["levels"][0] = 2` uses a key and
  then an index.
- **check:** What is `data` after this code?

  ```python
  data = {"settings": {"volume": 4}}
  data["settings"]["volume"] = 7
  ```
  - A. `{"settings": {"volume": 4}}`
  - B. `{"settings": {"volume": 7}}`
  - C. `{"volume": 7}`
  - D. `{"settings": 7}`
- **answer:** B
- **rationale:** Both keys lead to the nested value, which is replaced with
  `7`.
- **if_incorrect:** Keep the outer dictionary and inner dictionary intact.
  Only the final value at the complete key path changes.
- **tutor:** Ask them to name the full chain of keys leading to the value
  that changes.
- **pass_rule:** Learner selects B.

### py-6.6-06 · Update a Nested Student Record

- **type:** practical
- **do:** Assign `{"contact": {"city": "Miami"}, "scores": [80, 90]}` to
  `student`. Change the city to `"Boston"`, replace the second score with
  `95`, and append `100` to the score list. Print the updated city,
  complete score list, and final score on labeled lines.
- **starter_code:**
  ```python
  student = {"contact": {"city": "Miami"}, "scores": [80, 90]}
  ```
- **solution:**
  ```python
  student = {"contact": {"city": "Miami"}, "scores": [80, 90]}
  student["contact"]["city"] = "Boston"
  student["scores"][1] = 95
  student["scores"].append(100)
  print(f"City: {student['contact']['city']}")
  print(f"Scores: {student['scores']}")
  print(f"Final score: {student['scores'][-1]}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `student\[['"]contact['"]\]\[['"]city['"]\]\s*=\s*['"]Boston['"]`
  - `student\[['"]scores['"]\]\[\s*1\s*\]\s*=\s*95`
  - `student\[['"]scores['"]\]\.append\s*\(\s*100\s*\)`
- **expect_exact_output:** |
  City: Boston
  Scores: [80, 95, 100]
  Final score: 100
- **tutor:** Three nested writes in one item — a dict-inside-dict update, a
  list-inside-dict index assignment, and an append on that same nested
  list.
- **pass_rule:** Run exits 0 and stdout is exactly `City: Boston` then
  `Scores: [80, 95, 100]` then `Final score: 100`.

## Lesson 6.7 — Creating and Reading Sets  {#py-6.7}

- **objective:** Create sets, remove duplicates through conversion, and
  check their size and membership.
- **estimated_time:** 15–20 min
- **item_count:** 7
- **live_coding_items:** 3

### py-6.7-00 · Why Sets: No Duplicates Allowed

- **type:** reading
- **read:** Some data just shouldn't repeat, and pretending a list is good
  enough for that job usually means writing extra code to solve a problem
  sets already solve for free. Think of the tags on a blog post, where the
  same tag showing up twice would be a bug, not a feature. Think of the
  unique visitors to a page in a single day, where what you actually want to
  know is how many *different* people showed up, not how many times any given
  person hit refresh. Think of the distinct categories buried in a messy
  spreadsheet column, where the real list of categories is far shorter than
  the list of rows. Converting a list into a set is the fastest, most direct
  way to answer "how many genuinely different things are here?", a question
  that turns out to come up constantly once you start looking for it, in
  places you wouldn't necessarily expect.
- **pass_rule:** Learner reads and continues.

### py-6.7-01 · A Set Keeps Distinct Values

- **type:** concept
- **read:** A **set** is a collection that keeps only one copy of each
  distinct value. Write a nonempty set with curly braces but no key-value
  colons, such as `{"red", "green", "blue"}`. Sets do not use numbered
  positions, and their displayed order is not guaranteed.
- **check:** How many values are in the set created by
  `{"red", "blue", "red"}`?
  - A. `1`
  - B. `2`
  - C. `3`
  - D. `4`
- **answer:** B
- **rationale:** The repeated `"red"` is kept only once, alongside
  `"blue"`.
- **if_incorrect:** Count distinct values rather than written occurrences.
  Repeating a value does not add another set member.
- **tutor:** Ask how many DIFFERENT words appear, not how many times any
  word is written.
- **pass_rule:** Learner selects B.

### py-6.7-02 · Build a Tag Set

- **type:** practical
- **do:** Assign `{"python", "beginner", "practice"}` to `tags`. Print its
  length, then print the result of `"python" in tags`. **Do not print the
  complete set, because set display order is not guaranteed.**
- **starter_code:**
  ```python
  tags = {"python", "beginner", "practice"}
  ```
- **solution:**
  ```python
  tags = {"python", "beginner", "practice"}
  print(f"Tag count: {len(tags)}")
  print(f"Has python: {'python' in tags}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `len\s*\(\s*tags\s*\)`
  - `['"]python['"]\s*in\s*tags`
- **forbid_code:**
  - `print\s*\(\s*tags\s*\)`
- **expect_exact_output:** |
  Tag count: 3
  Has python: True
- **tutor:** A raw set has no guaranteed print order — report its size and
  membership instead of printing it directly.
- **pass_rule:** Run exits 0 and stdout is exactly `Tag count: 3` then
  `Has python: True`.

### py-6.7-03 · An Empty Set Uses set()

- **type:** concept
- **read:** `{}` already means an empty dictionary, so an empty set is
  written as `set()`. It has length `0` and can receive values later. The
  type of `set()` is `set`, while the type of `{}` is `dict`.
- **check:** Which expression creates an empty set?
  - A. `{}`
  - B. `[]`
  - C. `()`
  - D. `set()`
- **answer:** D
- **rationale:** Python reserves `{}` for an empty dictionary, so `set()`
  creates the empty set.
- **if_incorrect:** The empty forms for lists, tuples, and dictionaries
  already have other meanings. A set needs the explicit `set()` call when
  it has no values.
- **tutor:** Ask what `{}` alone already means before considering `set()`.
- **pass_rule:** Learner selects D.

### py-6.7-04 · Inspect an Empty Set

- **type:** practical
- **do:** Assign `set()` to `seen`. Print its type, its length, and the
  result of `"Ada" not in seen` on separate lines.
- **starter_code:**
  ```python
  seen = set()
  ```
- **solution:**
  ```python
  seen = set()
  print(type(seen))
  print(len(seen))
  print("Ada" not in seen)
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `type\s*\(\s*seen\s*\)`
  - `len\s*\(\s*seen\s*\)`
  - `['"]Ada['"]\s*not\s*in\s*seen`
- **expect_exact_output:** |
  <class 'set'>
  0
  True
- **tutor:** An empty set still has a real type and a real (zero) length —
  it isn't the same thing as `None`.
- **pass_rule:** Run exits 0 and stdout is exactly `<class 'set'>` then
  `0` then `True`.

### py-6.7-05 · set() Can Remove Duplicate List Values

- **type:** concept
- **read:** `set(list_value)` creates a set from the list's items.
  Duplicate values collapse into one set member. With
  `names = ["Ada", "Grace", "Ada"]`, `set(names)` contains only `"Ada"`
  and `"Grace"`. Use `sorted()` when you need to display the resulting
  members in a predictable order.
- **check:** What does `len(set([2, 2, 3, 4, 4]))` produce?
  - A. `2`
  - B. `3`
  - C. `4`
  - D. `5`
- **answer:** B
- **rationale:** The distinct values are `2`, `3`, and `4`.
- **if_incorrect:** Remove repeated copies first, then count the values
  that remain.
- **tutor:** Ask them to list the distinct numbers before counting.
- **pass_rule:** Learner selects B.

### py-6.7-06 · Create a Unique Guest List

- **type:** practical
- **do:** Assign `["Mina", "Ada", "Mina", "Grace"]` to `guests`. Convert
  it to a set named `unique_guests`. Print the number of unique names and
  the names in predictable alphabetical order. **Use `set()` and
  `sorted()`.**
- **starter_code:**
  ```python
  guests = ["Mina", "Ada", "Mina", "Grace"]
  ```
- **solution:**
  ```python
  guests = ["Mina", "Ada", "Mina", "Grace"]
  unique_guests = set(guests)
  print(f"Unique count: {len(unique_guests)}")
  print(sorted(unique_guests))
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `unique_guests\s*=\s*set\s*\(\s*guests\s*\)`
  - `sorted\s*\(\s*unique_guests\s*\)`
- **expect_exact_output:** |
  Unique count: 3
  ['Ada', 'Grace', 'Mina']
- **tutor:** `set()` drops the duplicate `"Mina"`; `sorted()` makes the
  output predictable since a set's own order isn't guaranteed.
- **pass_rule:** Run exits 0 and stdout is exactly `Unique count: 3` then
  `['Ada', 'Grace', 'Mina']`.

## Lesson 6.8 — Adding and Removing Set Values  {#py-6.8}

- **objective:** Change sets with `add()`, `update()`, `remove()`, and
  `discard()`.
- **estimated_time:** 15–20 min
- **item_count:** 7
- **live_coding_items:** 3

### py-6.8-00 · Keeping a Unique Collection Current

- **type:** reading
- **read:** A set of unique things is rarely something you build once and leave
  alone; it usually needs to grow and shrink as the situation around it
  changes. A user selects another interest on their profile. An application
  grants a new permission, or revokes one that shouldn't have been kept. A
  shopping list drops an item the moment it's actually been bought, or gains
  one the moment someone remembers they're out of it. Sets need their own
  vocabulary for this kind of change, including a way to safely attempt to
  remove something that might already be gone (a permission that was never
  granted in the first place, an item that was already crossed off) without
  that turning into a crash over something that, realistically, should just
  be a non-event.
- **pass_rule:** Learner reads and continues.

### py-6.8-01 · add() Adds One Value

- **type:** concept
- **read:** `add(value)` places one value into an existing set. If the
  value is already present, the set stays unchanged because duplicates are
  not kept. Starting with `numbers = {1, 2}`, `numbers.add(3)` gives three
  members, while another `numbers.add(2)` does not increase the length.
- **check:** What is the length of `values` after this code?

  ```python
  values = {1, 2}
  values.add(2)
  values.add(3)
  ```
  - A. `2`
  - B. `3`
  - C. `4`
  - D. `5`
- **answer:** B
- **rationale:** Adding `2` again changes nothing, and adding `3` creates
  one new member.
- **if_incorrect:** Track distinct members only. A repeated value never
  creates a second copy in a set.
- **tutor:** Ask what happens the second time `add(2)` runs.
- **pass_rule:** Learner selects B.

### py-6.8-02 · Grow a Skill Set

- **type:** practical
- **do:** Start with `skills = {"python"}`. Add `"git"`, add `"python"`
  again, then print the set as `sorted(skills)` and print its length.
  **Use two `add()` calls rather than assigning a finished set.**
- **starter_code:**
  ```python
  skills = {"python"}
  ```
- **solution:**
  ```python
  skills = {"python"}
  skills.add("git")
  skills.add("python")
  print(sorted(skills))
  print(f"Skill count: {len(skills)}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `skills\.add\s*\(\s*['"]git['"]\s*\)`
  - `skills\.add\s*\(\s*['"]python['"]\s*\)`
  - `sorted\s*\(\s*skills\s*\)`
- **expect_exact_output:** |
  ['git', 'python']
  Skill count: 2
- **tutor:** The second `add("python")` should not change the final count —
  that's the whole point of this item.
- **pass_rule:** Run exits 0 and stdout is exactly `['git', 'python']`
  then `Skill count: 2`.

### py-6.8-03 · update() Adds Several Values

- **type:** concept
- **read:** `update(list_value)` adds each value from a list to the set.
  Existing members remain, and duplicates are ignored. If
  `tags = {"python"}`, then
  `tags.update(["web", "python", "api"])` leaves the three distinct
  members `"python"`, `"web"`, and `"api"`.
- **check:** What is the length of `letters` after this code?

  ```python
  letters = {"a"}
  letters.update(["b", "a", "c"])
  ```
  - A. `1`
  - B. `2`
  - C. `3`
  - D. `4`
- **answer:** C
- **rationale:** The final distinct members are `"a"`, `"b"`, and `"c"`.
- **if_incorrect:** Add each provided list value, then collapse any
  duplicates already present in the set.
- **tutor:** Ask which of the three list values was already in the set
  before `update()` ran.
- **pass_rule:** Learner selects C.

### py-6.8-04 · Add Several Categories

- **type:** practical
- **do:** Assign `{"books"}` to `categories`. Use one `update()` call with
  the list `["games", "music", "books"]`. Print the categories with
  `sorted()` and print their count.
- **starter_code:**
  ```python
  categories = {"books"}
  ```
- **solution:**
  ```python
  categories = {"books"}
  categories.update(["games", "music", "books"])
  print(sorted(categories))
  print(f"Category count: {len(categories)}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `categories\.update\s*\(\s*\[\s*['"]games['"]\s*,\s*['"]music['"]\s*,\s*['"]books['"]\s*\]\s*\)`
  - `sorted\s*\(\s*categories\s*\)`
- **expect_exact_output:** |
  ['books', 'games', 'music']
  Category count: 3
- **tutor:** One `update()` call with a list, not three separate `add()`
  calls.
- **pass_rule:** Run exits 0 and stdout is exactly
  `['books', 'games', 'music']` then `Category count: 3`.

### py-6.8-05 · remove() and discard() Both Delete Values

- **type:** concept
- **read:** `remove(value)` deletes a value that is known to be present.
  `discard(value)` also deletes a present value, but it quietly leaves the
  set unchanged when that value is absent. Every required `remove()` call
  in this topic uses a value that exists.
- **check:** What is the length of `colors` after this code?

  ```python
  colors = {"red", "green", "blue"}
  colors.remove("green")
  colors.discard("orange")
  ```
  - A. `1`
  - B. `2`
  - C. `3`
  - D. `4`
- **answer:** B
- **rationale:** `"green"` is removed, while discarding the absent
  `"orange"` changes nothing.
- **if_incorrect:** Remove the present value first. The missing value
  passed to `discard()` is simply ignored.
- **tutor:** Ask what would happen if `remove("orange")` had been used
  instead of `discard("orange")`.
- **pass_rule:** Learner selects B.

### py-6.8-06 · Maintain an Active Tag Set

- **type:** practical
- **do:** Start with `tags = {"python", "old"}`. Add `"api"` with
  `add()`, add `"web"` and `"testing"` from one list with `update()`,
  remove the present `"old"` tag with `remove()`, and safely discard the
  absent `"unused"` tag. Print the final tags with `sorted()`.
- **starter_code:**
  ```python
  tags = {"python", "old"}
  ```
- **solution:**
  ```python
  tags = {"python", "old"}
  tags.add("api")
  tags.update(["web", "testing"])
  tags.remove("old")
  tags.discard("unused")
  print(sorted(tags))
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `tags\.add\s*\(\s*['"]api['"]\s*\)`
  - `tags\.update\s*\(\s*\[\s*['"]web['"]\s*,\s*['"]testing['"]\s*\]\s*\)`
  - `tags\.remove\s*\(\s*['"]old['"]\s*\)`
  - `tags\.discard\s*\(\s*['"]unused['"]\s*\)`
- **expect_exact_output:** |
  ['api', 'python', 'testing', 'web']
- **tutor:** All four set-editing tools together in one item — `add()`,
  `update()`, `remove()`, and a safe `discard()` on a value that isn't
  there.
- **pass_rule:** Run exits 0 and stdout is exactly
  `['api', 'python', 'testing', 'web']`.

## Lesson 6.9 — Combining and Comparing Sets  {#py-6.9}

- **objective:** Create new sets with union, intersection, difference, and
  symmetric difference operations.
- **estimated_time:** 20–25 min
- **item_count:** 8
- **live_coding_items:** 4

### py-6.9-00 · Comparing Two Groups

- **type:** reading
- **read:** Once you have two collections of unique things sitting side by
  side, the interesting questions almost always turn out to be about how they
  relate to each other, not about either one in isolation. What interests do
  these two users have in common, for a recommendation engine deciding what
  to suggest next? Which permissions does someone currently have that they
  technically shouldn't, for a security audit trying to catch a mistake
  before it becomes a problem? Who signed up for a mailing list this month
  that wasn't already a customer last month, for a marketing report trying to
  measure real growth instead of noise? Union, intersection, and difference
  take exactly those plain-English questions (combine these, keep only what's
  shared, show me what's different) and turn each one into a single, direct
  line of code. This is the payoff lesson for everything sets were building
  toward across this entire topic, and it's usually the moment where sets
  stop feeling like an abstract idea and start feeling like the obviously
  right tool for a real problem.
- **pass_rule:** Learner reads and continues.

### py-6.9-01 · Union Combines Distinct Members

- **type:** concept
- **read:** A **union** combines the members of two sets and keeps one
  copy of each value. Use the `|` operator: `first | second`. With `{1, 2}`
  and `{2, 3}`, the union contains `1`, `2`, and `3`. The original sets
  stay unchanged.
- **check:** What does `sorted({1, 3} | {2, 3})` produce?
  - A. `[1, 2, 3]`
  - B. `[1, 3]`
  - C. `[3]`
  - D. `[1, 2, 3, 3]`
- **answer:** A
- **rationale:** The union includes every distinct member from either set,
  then `sorted()` places them in numeric order.
- **if_incorrect:** Gather members from both sets and remove repeated
  copies. Union does not keep only the overlap.
- **tutor:** Ask them to list every member from EITHER set before removing
  duplicates.
- **pass_rule:** Learner selects A.

### py-6.9-02 · Combine Two Permission Sets

- **type:** practical
- **do:** Assign `{"read", "comment"}` to `basic` and
  `{"comment", "edit"}` to `extra`. Assign their union to `combined`, then
  print `sorted(combined)` and the combined count. **Use the `|`
  operator.**
- **starter_code:**
  ```python
  basic = {"read", "comment"}
  extra = {"comment", "edit"}
  ```
- **solution:**
  ```python
  basic = {"read", "comment"}
  extra = {"comment", "edit"}
  combined = basic | extra
  print(sorted(combined))
  print(f"Permission count: {len(combined)}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `combined\s*=\s*basic\s*\|\s*extra`
  - `sorted\s*\(\s*combined\s*\)`
- **expect_exact_output:** |
  ['comment', 'edit', 'read']
  Permission count: 3
- **tutor:** `"comment"` is shared by both sets but still counts only once
  in the union.
- **pass_rule:** Run exits 0 and stdout is exactly
  `['comment', 'edit', 'read']` then `Permission count: 3`.

### py-6.9-03 · Intersection Keeps Shared Members

- **type:** concept
- **read:** An **intersection** keeps only values found in both sets. Use
  the `&` operator. With `first = {1, 2, 3}` and `second = {2, 3, 4}`, the
  expression `first & second` contains `2` and `3`.
- **check:** What does `sorted({"a", "b", "c"} & {"b", "c", "d"})` produce?
  - A. `["a", "d"]`
  - B. `["a", "b", "c", "d"]`
  - C. `["b", "c"]`
  - D. `[]`
- **answer:** C
- **rationale:** `"b"` and `"c"` are the members shared by both sets.
- **if_incorrect:** Check each value against both sets. Intersection keeps
  the overlap and leaves out values found on only one side.
- **tutor:** Ask which values appear in BOTH sets, not just one.
- **pass_rule:** Learner selects C.

### py-6.9-04 · Find Shared and First-Only Values

- **type:** practical
- **do:** Assign `{1, 2, 3, 4}` to `first` and `{3, 4, 5}` to `second`.
  Assign the intersection to `shared` with `&`. Assign values found only
  in `first` to `first_only` with `-`. Print both results with `sorted()`.
- **starter_code:**
  ```python
  first = {1, 2, 3, 4}
  second = {3, 4, 5}
  ```
- **solution:**
  ```python
  first = {1, 2, 3, 4}
  second = {3, 4, 5}
  shared = first & second
  first_only = first - second
  print(f"Shared: {sorted(shared)}")
  print(f"First only: {sorted(first_only)}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `shared\s*=\s*first\s*&\s*second`
  - `first_only\s*=\s*first\s*-\s*second`
- **expect_exact_output:** |
  Shared: [3, 4]
  First only: [1, 2]
- **tutor:** Two different set operators side by side — `&` for the
  overlap, `-` for what's unique to `first`.
- **pass_rule:** Run exits 0 and stdout is exactly `Shared: [3, 4]` then
  `First only: [1, 2]`.

### py-6.9-05 · Difference and Symmetric Difference

- **type:** concept
- **read:** `first - second` keeps members found in `first` but not
  `second`. Order matters: reversing the sets may change the result. The
  `^` operator creates a **symmetric difference**, keeping members found
  in exactly one of the two sets and leaving out their shared members.
- **check:** What does `sorted({1, 2, 3} ^ {3, 4})` produce?
  - A. `[3]`
  - B. `[1, 2]`
  - C. `[4]`
  - D. `[1, 2, 4]`
- **answer:** D
- **rationale:** `3` is shared and is left out; `1`, `2`, and `4` appear in
  exactly one set.
- **if_incorrect:** Remove the overlap from the combined members. Symmetric
  difference keeps both sides' unique members, not just the first set's
  unique members.
- **tutor:** Ask what's different between `^` and the plain `-` from the
  previous item.
- **pass_rule:** Learner selects D.

### py-6.9-06 · Compare Two Campaign Audiences

- **type:** practical
- **do:** Assign `{"Ada", "Grace", "Linus"}` to `first` and
  `{"Grace", "Guido"}` to `second`. Create `everyone` with union, `shared`
  with intersection, and `first_only` with difference. Print all three
  results with `sorted()` on labeled lines.
- **starter_code:**
  ```python
  first = {"Ada", "Grace", "Linus"}
  second = {"Grace", "Guido"}
  ```
- **solution:**
  ```python
  first = {"Ada", "Grace", "Linus"}
  second = {"Grace", "Guido"}
  everyone = first | second
  shared = first & second
  first_only = first - second
  print(f"Everyone: {sorted(everyone)}")
  print(f"Shared: {sorted(shared)}")
  print(f"First only: {sorted(first_only)}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `everyone\s*=\s*first\s*\|\s*second`
  - `shared\s*=\s*first\s*&\s*second`
  - `first_only\s*=\s*first\s*-\s*second`
- **expect_exact_output:** |
  Everyone: ['Ada', 'Grace', 'Guido', 'Linus']
  Shared: ['Grace']
  First only: ['Ada', 'Linus']
- **tutor:** All three combining operations on the same two sets — union,
  intersection, and difference.
- **pass_rule:** Run exits 0 and stdout is exactly
  `Everyone: ['Ada', 'Grace', 'Guido', 'Linus']` then `Shared: ['Grace']`
  then `First only: ['Ada', 'Linus']`.

### py-6.9-07 · Find Values Used by Exactly One Team

- **type:** practical
- **do:** Assign `{"python", "git", "sql"}` to `backend` and
  `{"git", "html"}` to `frontend`. Create `exclusive` with symmetric
  difference and `shared` with intersection. Print both results with
  `sorted()`, followed by `Exclusive count: 3`.
- **starter_code:**
  ```python
  backend = {"python", "git", "sql"}
  frontend = {"git", "html"}
  ```
- **solution:**
  ```python
  backend = {"python", "git", "sql"}
  frontend = {"git", "html"}
  exclusive = backend ^ frontend
  shared = backend & frontend
  print(f"Exclusive: {sorted(exclusive)}")
  print(f"Shared: {sorted(shared)}")
  print(f"Exclusive count: {len(exclusive)}")
  ```
- **evaluator:** browser-exec
- **require_code:**
  - `exclusive\s*=\s*backend\s*\^\s*frontend`
  - `shared\s*=\s*backend\s*&\s*frontend`
- **expect_exact_output:** |
  Exclusive: ['html', 'python', 'sql']
  Shared: ['git']
  Exclusive count: 3
- **tutor:** `^` picks up everything EXCEPT the shared `"git"` — contrast
  with `&`, which keeps only `"git"`.
- **pass_rule:** Run exits 0 and stdout is exactly
  `Exclusive: ['html', 'python', 'sql']` then `Shared: ['git']` then
  `Exclusive count: 3`.

## Checkpoint — Topic 6  {#py-6.CP}

- **objective:** Read a learner's name, location, and three skill entries.
  Build and update a dictionary, use a set to remove repeated skills,
  compare those skills with a core set, and organize the finished values
  in a nested record.
- **estimated_time:** 20–30 min
- **type:** checkpoint
- **brief:** Read a learner's name, location, and three skill entries.
  Build and update a dictionary, use a set to remove repeated skills,
  compare those skills with a core set, and organize the finished values
  in a nested record.
- **requirements:**
  - Read five lines with `input()` in this order: name, location, first
    skill, second skill, and third skill. Do not print prompts.
  - Create `profile` with the keys `"name"` and `"location"` connected to
    the first two inputs.
  - Add the pair `"status": "learning"` with square-bracket assignment.
  - Pop `"location"` into `original_location`.
  - Create `skills` as a set containing the three skill inputs. Repeated
    skill names must collapse into one member.
  - Create `core = {"python", "git", "sql"}`.
  - Create `recognized` as the intersection of `skills` and `core`.
  - Create `additional` as the values in `skills` but not in `core`.
  - Create `record` as the nested dictionary
    `{"profile": profile, "skills": sorted(skills)}`.
  - Use f-strings to print exactly these seven lines:
    `Profile: <record["profile"]>`, `Original location: <original_location>`,
    `Skills: <record["skills"]>`, `Unique skills: <number of set members>`,
    `Recognized: <sorted recognized skills>`,
    `Additional: <sorted additional skills>`,
    `Fields: <profile key list>`.
  - Produce the final field list with `list(profile.keys())`.
  - Do not use loops, comprehensions, branching, dictionaries or sets other
    than those required, or hardcoded finished results.
- **solution:**
  ```python
  name = input()
  location = input()
  first_skill = input()
  second_skill = input()
  third_skill = input()
  profile = {"name": name, "location": location}
  profile["status"] = "learning"
  original_location = profile.pop("location")
  skills = {first_skill, second_skill, third_skill}
  core = {"python", "git", "sql"}
  recognized = skills & core
  additional = skills - core
  record = {"profile": profile, "skills": sorted(skills)}
  print(f"Profile: {record['profile']}")
  print(f"Original location: {original_location}")
  print(f"Skills: {record['skills']}")
  print(f"Unique skills: {len(skills)}")
  print(f"Recognized: {sorted(recognized)}")
  print(f"Additional: {sorted(additional)}")
  print(f"Fields: {list(profile.keys())}")
  ```
- **evaluator:** hidden-tests
- **hidden_tests:**
  ```yaml
  - stdin: "Ada\nLondon\npython\ngit\npython"
    stdout: "Profile: {'name': 'Ada', 'status': 'learning'}\nOriginal location: London\nSkills: ['git', 'python']\nUnique skills: 2\nRecognized: ['git', 'python']\nAdditional: []\nFields: ['name', 'status']"
  - stdin: "Mina\nBoston\nsql\ndesign\ngit"
    stdout: "Profile: {'name': 'Mina', 'status': 'learning'}\nOriginal location: Boston\nSkills: ['design', 'git', 'sql']\nUnique skills: 3\nRecognized: ['git', 'sql']\nAdditional: ['design']\nFields: ['name', 'status']"
  - stdin: "Kai\nTokyo\nart\nart\nmusic"
    stdout: "Profile: {'name': 'Kai', 'status': 'learning'}\nOriginal location: Tokyo\nSkills: ['art', 'music']\nUnique skills: 2\nRecognized: []\nAdditional: ['art', 'music']\nFields: ['name', 'status']"
  ```
- **tutor:** Walk the order of operations: build `profile`, add `status`,
  THEN pop `location` (so it comes out of the already-updated dictionary).
  Passing this checkpoint completes Topic 6.
- **pass_rule:** All hidden tests pass. Passing the checkpoint completes
  the topic.
