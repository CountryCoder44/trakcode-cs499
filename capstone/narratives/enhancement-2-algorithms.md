# Enhancement Two: Algorithms and Data Structures

Ryan Cartwright · CS 499 Computer Science Capstone · Milestone Three (revised for the final ePortfolio)

## 1. Artifact Description

This artifact is part of TrakCode, the coding education platform I have been building on my own, outside of my coursework, and my project for all three capstone categories. This enhancement covers the part of TrakCode that makes decisions: choosing which practice problem a learner sees next, working out which lesson items a learner has unlocked, and giving a helpful nudge when a submitted answer is close but not quite right. I built these pieces earlier this year, and this milestone is where I went back and improved them. The `enhancement-2-algorithms` folder contains the files this milestone changed.

## 2. Justification for Inclusion

I picked this part of TrakCode because it is where the app does its thinking rather than just moving data around. Deciding whether an answer deserves a hint, which problem out of a whole bank a learner should see, and how to avoid repeating expensive work are exactly the problems an algorithms and data structures course prepares you for. I made three improvements, and for each one I describe the cost before and after.

### Fair, efficient problem selection

Before this change, when more than one problem matched what a learner needed, the app asked the database for a single match with no ordering at all, so it got whichever document the database happened to return first. In practice the same problem was served over and over while others sat unused.

The new algorithm asks for the five least-served matching problems (ordered by a `timesServed` counter) and picks one of those five at random. Serving a problem increments its counter, so the pool keeps rotating: least-served first gives fairness, and a random pick among near-ties gives variety. A random number generator is the right tool here because nothing about the choice needs to be unpredictable for security reasons.

The cost depends on how that query is answered. Let n be the number of problems in the bank, m the number that match a request, and k the pool size (five).

- Ordering the matches without an index means scanning all m matches and sorting them in memory on every request: O(m log m).
- I added two compound indexes, one for each shape of request. Their leading fields are the request's exact-match fields (language, difficulty, type, validated, and the topic when one is requested) and their last field is `timesServed`. The database can then seek straight to the first matching entry in the index's B-tree in O(log n) and read the next k entries already in `timesServed` order. The whole lookup becomes O(log n + k), and the random pick is O(1).

I checked this against the database's own query planner on a bank of 500 seeded problems rather than assuming it. Both query shapes produced a plan of `LIMIT → FETCH → IXSCAN` with no in-memory sort stage. The topic-scoped query examined exactly 5 index entries to return 5 problems. The topic-number-scoped query examined 13 entries for 5 results, because its topic ceiling is not part of that index, so some entries are read and then skipped. That is still a small, bounded cost.

One cost remained: the app still loaded a learner's entire history of served problems to build the "already seen" filter, which grows with every problem they complete. I named this in my code review and fixed it in the databases enhancement, so the two milestones build on each other.

### Caching the lesson walk

TrakCode works out what a learner has unlocked by flattening a topic into one ordered list of items, a walk over every lesson and item: O(I) for a topic with I items. That walk was being repeated within a single request, sometimes three times for the same topic, so a request making c calls cost O(c·I).

I cached the result in a `WeakMap` keyed by the topic object itself. The first call does the O(I) walk, and every later call for the same object is an O(1) lookup, so a request now costs O(I + c). For one real case, scoping practice problems across 20 topics with three calls each, that is 60 walks reduced to 20. The cache costs O(I) memory per topic per request, and because a `WeakMap` does not keep its keys alive, that memory is freed as soon as the request's topic object is discarded.

The measured difference was large. During the milestone, 10,000 calls on a synthetic 1,000-item topic took **172.16 ms uncached and 0.61 ms cached**, about 282 times faster: roughly 17 microseconds per call down to 0.06. I re-ran the same benchmark for this revision and got 83 to 96 ms uncached against under 1 ms cached. The exact ratio varies a lot between runs, because the cached total is so small that ordinary timer noise dominates it, but the scale of the improvement holds every time.

### A language-aware hint rule table

The original hint feature was a long chain of checks evaluated one after another. It only really worked for Python, and it would flag Python-looking error text even when the learner was writing TypeScript or C++. I rebuilt it as a table of 11 rules. Each rule declares which languages it applies to and a priority, and the hint function filters the table to the learner's language, orders it by priority, and returns the first hint that matches. With R rules and an error message of length L, that is at most R checks of O(L) each, and R is small and fixed. Adding a rule is now a one-entry change that cannot accidentally reorder the others.

I added two new rules, one for TypeScript and one for C++, using the actual error messages produced by compiling real broken code on my machine rather than wording I remembered. The lowest-priority rule compares expected and actual output line by line using the `diff` library, which uses Myers' diff algorithm (O((N + M) · D) for N and M lines with D differences). It only produces a hint for the clean case of exactly one changed line, and gives no hint rather than a confusing one for larger differences.

### What testing found

I wrote **51 new tests in three new test files** for these changes: 24 for the hint rules, 21 for the lesson ordering and cache, and 6 for problem selection. The server suite grew from 55 tests after Milestone Two to 100, all passing. Six older hint tests moved out of another file into the new one, which is why the net growth is 45.

Testing the whole path found two real bugs. The original hint code contained a condition that could never be true given the checks before it, so it silently did nothing. The more serious one: when TypeScript or C++ code failed to compile, the grader never asked for a hint at all, because no test ever ran. The two new language rules passed their own tests but would never have run for a real learner. I fixed the grader to check the compiler's error text when compilation fails and added tests that go through the grader, not just the rules.

## 3. Course Outcomes

- **Outcome 3, design and evaluation with trade-offs (met):** each change weighs a cost. The selection algorithm balances fairness (least-served first) against variety (a random pick among them), and the indexes trade extra write work for fast reads. For the cache, I chose a per-request identity cache over storing a precomputed list, which would have saved slightly more work but could go stale or show an administrator's view of a topic to a learner.
- **Outcome 4, well-founded techniques and tools (met):** 51 new tests, query-planner verification, and benchmarks instead of assumed improvements.
- **Outcome 5, security and reliability mindset (partially met):** the compile-error bug was a reliability defect rather than a security hole, but finding it came from asking whether a feature runs in every situation, not only whether it works in isolation. That is the same habit a security review depends on.
- **Outcome 2, communication (partially met):** this narrative and the code comments explain the reasoning behind each change, but the main communication evidence in my portfolio is the API reference and architecture documentation from Enhancement One.
- **Outcome 1, collaboration (addressed elsewhere):** this was individual algorithm work. Collaboration is demonstrated by the code review, the contributor infrastructure in Enhancement One, and the team experience described in my self-assessment.

## 4. Reflection

The most useful lesson was that testing something in isolation is not the same as confirming it is wired up correctly. My new TypeScript and C++ rules passed their own tests on the first try. Only when I asked whether the function that should call them actually did, in every situation, did I find that compile errors skipped the hint step entirely.

The biggest challenge was scope. It would have been easy to rewrite other nearby code while I was in there, but I stayed with the three problems I had identified ahead of time. I also had to think carefully about whether the cache could ever show the wrong version of a lesson to the wrong person, since administrators see slightly different content than learners. Keying the cache on the exact object each request builds, rather than on the topic's ID, is what rules that out.

**Incorporating feedback.** My instructor's review asked for formal complexity analysis of the major changes, an explanation of how the indexes affect lookup efficiency, and the actual timings behind the reported improvement. I added the before-and-after complexity for all three changes, the query planner results, and both the original and re-run timings. While re-checking the numbers I also found that my original narrative overstated the new test count as "more than seventy". Re-running the milestone's test suite showed 51 new tests, so I corrected it here.
