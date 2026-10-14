# Enhancement Three: Databases

Ryan Cartwright · CS 499 Computer Science Capstone · Milestone Four (revised for the final ePortfolio)

## 1. Artifact Description

This artifact is part of TrakCode, the coding education platform I have been building on my own, outside of my coursework, and my project for all three capstone categories. This enhancement covers TrakCode's data layer in MongoDB: the code that records and reads a learner's progress through the curriculum, and the query that picks which practice problem to serve someone next. I built these pieces earlier this year, and this milestone is where I went back and improved how they store, validate, and retrieve data. The `enhancement-3-databases` folder is a full copy of the project as submitted for this milestone.

## 2. Justification for Inclusion

I picked this part of TrakCode because it deals directly with how the app stores and retrieves data as it grows, which is exactly what this category is meant to demonstrate. I made three improvements.

### One data access layer for learner progress

Before this change, the same basic question, "which items has this learner already passed?", was answered by nine separate pieces of code across three files, each written slightly differently and each building its own result by hand. That duplication is a real risk: a bug fix or rule change has to be remembered and repeated in every copy. I built a single repository module with eight functions covering every read and write of learner progress, and moved all nine call sites onto it. The rest of the application no longer touches the progress collection directly, so a change to how progress is stored now happens in one place.

### A referential integrity check

A learner's progress record points at a lesson item by its ID, but MongoDB does not enforce that link the way a foreign key would in a relational database. TrakCode re-imports its lesson content from source files every time the server starts, replacing each topic's content wholesale. When I rename or remove an item, or delete a topic outright, any progress record that pointed at it is silently stranded.

I wrote an integrity check that walks every live topic once, builds the set of valid item IDs for each, and then checks every progress record against those sets. Building the sets costs O(T · I) for T topics of I items each, and each record is then checked with a constant-time set lookup, so the whole check is O(T · I + P) for P progress records. Each orphan is reported with one of two reasons: its topic no longer exists, or its topic exists but the item does not.

**What happens to an orphan once it is found.** The check is read-only by default. It prints a summary by reason and lists every orphaned record, and it deletes nothing. Removing records is a separate, deliberate step: the same command run with an explicit `--delete` flag deletes exactly the reported records by ID. I designed it this way because an orphan is not automatically garbage. A record might point at an item that was renamed by mistake and should be restored rather than having the learner's history erased, so a person should review the report before anything is removed.

When I ran it against my development database, which held months of real testing data, it found **36 orphaned records**: 34 pointing at items I had removed from a rewritten Topic 1, and 2 pointing at a retired topic. I reviewed the report, confirmed every record traced to content I had removed on purpose, and left them in place rather than deleting live data during the milestone. They were cleared later, when I reset the database for the final capstone copy.

### Moving the "already seen" check into the database

To avoid repeating problems, the app has to exclude every problem a learner has already been served. The original version loaded the learner's entire history of served problem IDs into the application, then sent that whole list back to the database inside a `$nin` (not in) filter. With h problems in a learner's history, every request transferred and held O(h) IDs in memory, and the list grew with every problem the learner completed.

I replaced it with an aggregation pipeline that does the check inside the database:

1. `$match` the problems that fit the request (language, difficulty, type, and validated), using the compound index from the algorithms enhancement.
2. `$lookup` into the history collection with a small sub-pipeline that asks, for each candidate, "has this learner seen this one?" It matches on both the learner and the problem and stops at the first hit (`$limit: 1`).
3. Keep only the candidates with no match, `$sort` by how often each has been served, and `$limit` to the five least-served.

The history collection has a unique compound index on `{ userId, problemId }`, so each "has this learner seen it" probe is a single index seek, O(log H) in the size of that collection, instead of anything proportional to the learner's history. Nothing resembling the learner's full history is ever loaded into the application, and the database returns only the five problem IDs it needs.

I verified this with the database's own query planner rather than assuming it, using a seeded test database with 2,000 candidate problems, 1,500 of them already seen by the test learner, and 100 more seen by a different learner as noise:

- The first `$match` stage ran as an index scan (`IXSCAN`) on the `stack_1_difficulty_1_type_1_validated_1_timesServed_1` index, and the documents examined equaled the index keys examined equaled the documents returned. No document was read and then thrown away.
- The `$lookup` sub-pipeline reported **zero collection scans** and listed `userId_1_problemId_1` as the index it used, confirming that every "already seen" probe was an index seek.

I bundled one more fix with this change. Serving a problem used to read its `timesServed` counter, add one in the application, and save it. Two requests landing on the same problem at the same moment could both read the same value, so one increment was lost. I replaced it with a single atomic `$inc` update in the database, and a test now fires five concurrent requests at one problem and confirms all five increments land.

### Test results

This milestone added **20 tests**: 12 for the repository layer, 5 for the integrity check, and 3 for the new query. They cover a 301-problem bank where 300 are already seen (the old approach would have built a 300-item exclusion list; the new one never builds one), falling through to generation when every problem has been seen, and the concurrent increments. The full server suite grew to **121 tests in 11 suites**. I re-ran the milestone's snapshot for this revision, and all 121 still pass.

## 3. Course Outcomes

- **Outcome 3, design and evaluation with trade-offs (met):** the database does not enforce the link between a progress record and a lesson item, so I decided where to handle that gap in code, and chose detect-and-review over automatic deletion. Moving the "already seen" check into the database trades a slightly more complex query for constant memory in the application and no growth with a learner's history.
- **Outcome 4, well-founded techniques and tools (met):** a repository layer, query-planner verification of every index claim, an atomic update to close a race condition, and 20 new tests against a real, temporary MongoDB instance.
- **Outcome 5, security mindset (partially met):** this enhancement protects data integrity, closing a lost-update race and making deletion an explicit, reviewed step instead of an automatic one. I deliberately left a broader data-layer security pass (query input validation, rate limiting, and session cookie hardening) out of scope for this milestone. The security mindset is shown most directly by the fail-closed guardrail in Enhancement One.
- **Outcome 2, communication (partially met):** this narrative and the inline documentation explain each decision, but the main communication evidence in my portfolio is the API reference and architecture documentation from Enhancement One.
- **Outcome 1, collaboration (addressed elsewhere):** this was individual data work. Collaboration is demonstrated by the code review, the contributor infrastructure in Enhancement One, and the team experience described in my self-assessment.

## 4. Reflection

The most useful part of this work was finding those 36 orphaned records in real data. It would have been easy to write the integrity check, run it against a small test database, watch it pass, and move on. Running it against my actual development environment is what turned it from a feature I assumed worked into one I know works, because it surfaced a real problem I did not know I had.

The biggest challenge was working carefully with a database that held real accumulated data. I ran everything read-only first and did not make destructive changes until I was sure what I was looking at. That habit is what shaped the integrity check itself, with reporting as the default and deletion as an explicit second step. I think that kind of judgment is exactly what this category is meant to build.

**Incorporating feedback.** My instructor's review asked what happens after the integrity check identifies an orphaned record, and for more detail on the indexes the aggregation uses and how the query planner confirmed the improvement. I added a section on the report-then-review workflow and the `--delete` step, explained each stage of the pipeline and the index each one uses, and included the specific query planner results. Re-running the milestone's test suite for this revision also let me report exact test numbers.
