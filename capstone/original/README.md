# TrakCode — CS-499 Baseline Submission

> **Submission type:** baseline artifact snapshot for SNHU CS-499 (Computer Science Capstone), Module One.
> This repository is the **current implementation of TrakCode as it exists *before* the planned
> CS-499 enhancements.** It is provided so the enhancement work can be reviewed against a fixed
> starting point.

---

## 1. Project Overview

**TrakCode** is an educational programming platform for learning to code across three tracks
(Python, the MERN/JavaScript stack, and C++). It is an actively developed, single-developer
software project — not a finished commercial product. It is functional end-to-end for its core
flows in a local development environment, and several subsystems are deliberately still at a
development-grade level of maturity (see [Known Limitations](#7-known-limitations)).

What a learner can do in the application today:

- Sign up / log in and complete a short onboarding step.
- Work through **Learn Mode** skill trees: read a lesson, then demonstrate understanding by
  solving AI-served practice questions on that lesson's topic without the AI tutor revealing a
  solution.
- Work through **Practice Mode**: request a coding problem (from a reusable bank, or generated on
  demand), solve it in an in-browser code editor, and have it graded by running the submitted
  code against test cases in a separate execution service.
- Run a rapid-fire **Flash Card** practice session.
- Ask **Trak**, a Socratic AI tutor, for help — it paces its own hints, keeps per-user memory
  across sessions, and is guarded against handing over complete solutions.
- Track progress with streaks and activity heatmaps, and publish a **public profile**.
- Push a passed solution to a **GitHub portfolio** repository (requires a linked GitHub account).
- Request and vote on entries in a **Skill Roadmap**.
- Subscribe through a **billing** flow (requires Stripe configuration).
- Use an **Admin** dashboard for demo codes, problem-bank review, AI-usage/cost reporting, and
  user metrics.

---

## 2. Purpose of This Submission

This package is the **baseline / current implementation, captured before any CS-499 enhancement
work has been done.** It is submitted as the artifact for evaluation in three enhancement
categories:

| Category | What the enhancement will target |
|---|---|
| **Software Engineering and Design** | Architectural refactoring, a shared client/server type contract, an automated-test and CI baseline, authentication/authorization hardening, observability, and technical documentation. |
| **Algorithms and Data Structures** | A formalized, testable *curriculum-aware practice-selection and problem-management algorithm*, replacing the current first-match bank lookup. |
| **Databases** | Schema constraints and indexing, query-pattern optimization, multi-document transactions, and data-integrity/validation improvements. |

The planned enhancements are **not implemented in this repository.** They are summarized in
[Section 8](#8-planned-cs-499-enhancements) and described in more depth in
[`ARCHITECTURE_ENHANCEMENT_PLAN.md`](ARCHITECTURE_ENHANCEMENT_PLAN.md), which is included for
context. Any reference in that document to "the current implementation" describes **this**
codebase.

This snapshot has been sanitized for submission: real credentials, private configuration, local
machine paths, and the internal AI-assistant build log have been removed or replaced with safe
placeholders. See [`SANITIZATION_REPORT.md`](SANITIZATION_REPORT.md) for the full account of
what changed.

---

## 3. Project Architecture

TrakCode is an **npm-workspaces monorepo** with three deployable units:

```
TrakCode-CS499-Baseline/
├── client/                      React + TypeScript single-page app (Vite)
├── server/                      Express + TypeScript REST API
└── services/execution-sandbox/  Internal code-execution service
```

### Request path (application data flow)

```
        Browser (React SPA, client/)
                 │  fetch  →  Authorization: Bearer <JWT>
                 ▼
        Express API  (server/, port 4000, base path /api)
                 │
        Routes ──► Controllers ──► Services ──► Models (Mongoose)
                 │                                   │
                 ▼                                   ▼
        External integrations                  MongoDB
        (Anthropic API, Stripe,
         GitHub API)
```

### Code-execution path (separate service)

```
        Express API  (server/)
                 │  HTTP POST /internal/execute
                 │  { language, source, testCases }
                 ▼
        Execution Sandbox  (services/execution-sandbox/, port 4100)
                 │  child_process.spawn (argv array, never a shell string)
                 │  one temp directory per run, wall-clock timeout → SIGKILL
                 ▼
        Local interpreter / compiler
        (python | node | g++/clang++)  →  per-test pass / fail results
```

### Component responsibilities

| Unit | Port | Responsibility |
|---|---|---|
| `client/` | 5173 (dev) | 13 screens: landing/auth, onboarding, dashboard, Learn Mode (stack select → skill tree → lesson), Practice Mode (mode select → workspace) + Flash Card, public profile, profile settings, roadmap, billing, admin. Hand-rolled CSS token system, no UI component library. CodeMirror 6 editor. |
| `server/` | 4000 | REST API under `/api`. Nine route groups (`auth`, `practice`, `tutor`, `portfolio`, `profile`, `roadmap`, `billing`, `admin`, plus flat `learn`/`curriculum` paths). ~12 Mongoose models. zod-validated environment module. Two-tier AI model routing. |
| `services/execution-sandbox/` | 4100 | Single endpoint `POST /internal/execute`. Compiles/runs learner-submitted Python, JavaScript, and C++ against test cases and returns structured pass/fail results. Called only by `server/`, never exposed publicly. |

### Data layer

MongoDB, accessed through Mongoose. Local development uses `mongodb-memory-server`, which starts
a real `mongod` process in memory with an optional on-disk `?persist=true` mode
(`server/src/config/db.ts`). The `capstone-submission` and `production` environment branches
exist in configuration but have not been exercised — there is no Dockerfile, deployment
manifest, or infrastructure-as-code in the repository.

### AI integration

`server/src/services/aiClient.ts` performs two-tier model routing (a reasoning tier for problem
generation and substantive tutoring; a fast tier for short classification-style calls). The AI
tutor logic lives in `server/src/services/tutor.service.ts` (~662 lines: prompt assembly,
prompt-cache tiering, a two-layer solution-leak guardrail, a readiness classifier, and a memory
extractor). `server/src/services/problemGeneration.service.ts` runs
generate → validate-against-sandbox → retry (≤ 3) → store, synchronously within the request.

### Authentication

HS256 JWT (`{ userId, role }`, 7-day expiry), sent as `Authorization: Bearer` and stored in the
browser's `localStorage`. Middleware: `requireAuth`, `optionalAuth`, `requireAdminRole` (trusts
the token's `role` claim without re-checking the database), and `requireAdminKey` (a shared-secret
header for one machine-to-machine admin route). Passwords are bcrypt-hashed (12 rounds,
`select: false`). A linked GitHub access token is AES-256-GCM encrypted at rest
(`server/src/utils/crypto.ts`); the encryption key falls back to `JWT_SECRET` when
`ENCRYPTION_KEY` is unset.

---

## 4. Technology Stack

Versions are those declared in the repository's `package.json` files.

### Client (`client/`)

| Technology | Version | Role |
|---|---|---|
| React / React DOM | ^19.2.8 | UI framework |
| TypeScript | ^5.9.3 | Language (`strict`) |
| Vite | ^8.2.1 | Dev server + build (`@vitejs/plugin-react` ^6.0.5) |
| react-router-dom | ^7.18.2 | Routing |
| CodeMirror 6 | `@uiw/react-codemirror` ^4.25.11, `@codemirror/lang-{python,javascript,cpp}`, `@codemirror/state`/`view` | In-browser code editor |
| react-resizable-panels | ^4.12.2 | Dockable workspace layout |
| _(styling)_ | — | Hand-authored CSS custom-property token system; no component library |

### Server (`server/`)

| Technology | Version | Role |
|---|---|---|
| Node.js | 20+ (`@types/node` ^20.14.0) | Runtime |
| Express | ^4.19.2 | HTTP framework |
| TypeScript | ^5.5.4 | Language (`strict`) |
| Mongoose | ^8.5.0 | MongoDB ODM |
| zod | ^4.0.0 | Request + environment validation |
| jsonwebtoken | ^9.0.2 | JWT signing/verification |
| bcryptjs | ^2.4.3 | Password hashing |
| helmet | ^7.1.0 | Security headers |
| cors | ^2.8.5 | CORS (currently open to all origins) |
| @anthropic-ai/sdk | ^0.116.0 | AI tutor + problem generation |
| stripe | ^22.5.0 | Billing |
| mongodb-memory-server | ^10.0.0 (dev) | Zero-setup local MongoDB |
| tsx | ^4.16.2 (dev) | TypeScript execution / watch |

### Execution sandbox (`services/execution-sandbox/`)

| Technology | Version | Role |
|---|---|---|
| Express | ^4.19.2 | HTTP framework |
| zod | ^4.0.0 | Input validation |
| TypeScript / tsx | ^5.5.4 / ^4.16.2 | Language / execution |
| Node `child_process` | built-in | Process spawning for code execution |

**Host requirements for the sandbox:** `python`/`python3` on `PATH` for Python, `node` for
JavaScript, and `g++` or `clang++` on `PATH` for C++. If a required interpreter/compiler is
missing, the response explains what is missing instead of crashing.

---

## 5. Existing Functionality

Everything in this section exists in the submitted baseline. Items marked **(needs credential)**
require external configuration and otherwise fail with a clear, non-crashing message.

### Authentication & user accounts
- Email/password signup and login; bcrypt hashing; JWT sessions.
- `GET /api/auth/me` session hydration.
- Demo-code redemption — creates or links a demo account (atomic use-count decrement).
- GitHub OAuth login/link and callback **(needs credential)**.
- Trial / demo / subscription status tracked on the user record.

### Learn Mode
- Curriculum skill trees for three stacks: **Python** (6 lessons), **MERN** (6 lessons),
  **C++** (4 lessons) — 16 curriculum items, auto-seeded on boot.
- Prerequisite locking with an unlock cascade as lessons are completed.
- Lesson flow: a full-screen calibration chat with the AI tutor, then a topic-matched practice
  problem attached into a split workspace. A lesson is *complete* after five distinct AI-served
  questions are passed **without** the tutor revealing a solution.
- Continue-where-you-left-off, restart-the-conversation, and full `reset-progress` options.
- Completed lessons offer uncapped bonus questions.

### Practice Mode
- Deep-Dive and Flash-Card problem requests.
- **Bank-first lookup:** a validated, previously-unseen problem is served from the `problems`
  collection when one matches; generation is triggered only on a miss **(generation needs
  credential)**.
- In-browser CodeMirror editor, a parsed error panel with jump-to-line, and a raw
  execution-console popup.
- Submission grading by real execution against test cases; per-user submission history.
- "Solved with help" is tracked so a tutor-assisted pass does not count toward Learn Mode
  completion.

### AI Tutor ("Trak") **(needs credential)**
- Conversational, self-paced hinting (no fixed hint ladder).
- Two-layer solution-leak guardrail: a sandbox-execution check plus an LLM classification check.
- Persistent cross-session memory (`TutorMemory`) — goals and volunteered context, captured
  passively; a refresher is offered after a real gap between visits.
- Generated opening turns (calibration question / continuation / refresher).
- Practice questions are scoped to the topics the individual learner has actually completed.

### AI-generated practice content **(needs credential)**
- generate → validate against the sandbox → retry (≤ 3) → store pipeline.
- A content hash and a `timesServed` counter on each stored problem.
- Graceful, non-crashing failure when the generator exhausts its retries.

### Code execution
- `POST /internal/execute` for Python, JavaScript, and C++.
- zod-validated input; `spawn` with an argv array (never a shell string); one temp directory per
  run, deleted after; a wall-clock timeout enforced with `SIGKILL`; a 1 MB output cap; `\r\n`
  normalization on captured streams.

### Progress tracking & public profiles
- `UserProgress` per curriculum item; `UserProblemHistory` per served problem.
- Learning and practice activity heatmaps; current/longest streak.
- Public profile at `/u/:slug` with privacy enforcement (a private or unset slug returns 404, not
  403, so existence is not leaked).

### GitHub portfolio push **(needs credential)**
- One GitHub repository per pushed passing submission (solution file + README).
- Allowed only when the submission result is `pass`.

### Skill Roadmap
- Public listing with optional-auth "did I vote" personalization; request creation; vote toggle.

### Billing (Stripe) **(needs credential)**
- Checkout-session creation, subscription status (database-only, no Stripe dependency),
  cancellation, and a signature-verified webhook writing `billing` notifications.

### Administrative functionality
- Demo-code creation (gated by the `DEMO_CODE_ADMIN_KEY` header, not a user JWT).
- Pending-problem review queue; roadmap status transitions.
- **Usage dashboard:** per-call `AiUsageLog` records aggregated at query time by purpose, tier,
  model, and user, with a best-effort cost estimate (Anthropic list pricing; the console is the
  billing source of truth).
- Full problem-bank browser and paginated user metrics (submission / tutor-session / completed-
  lesson counts).

### Notifications
- `Notification` model only; records are written by the billing and roadmap flows. There is no
  read endpoint (the spec defines none).

---

## 6. Current Architecture and Design

### Backend layering

```
HTTP request
   │
   ▼
routes/         Thin route definitions; attach middleware (requireAuth, optionalAuth,
   │            requireAdminRole, requireAdminKey) and map paths to controller handlers.
   ▼
controllers/    Parse and zod-validate the request, call one or more services, shape the
   │            HTTP response. Each controller currently also defines its own
   │            handleXError(err) function for status-code mapping.
   ▼
services/       Business logic and orchestration: problem-bank lookup + generation, tutor
   │            reply generation + guardrail, curriculum/practice coupling, activity
   │            aggregation, external clients (Anthropic, Stripe, GitHub, sandbox).
   ▼
models/         Mongoose schemas and model exports. ~12 models: User, DemoCode,
                CurriculumItem, UserProgress, Problem, UserProblemHistory, Submission,
                TutorSession, TutorMemory, SkillRequest, Notification, AiUsageLog.
```

Shared domain enums live in `server/src/types/domain.ts`. Environment configuration is parsed
and validated once, centrally, in `server/src/config/env.ts` (zod); the process exits on an
invalid environment.

### Frontend structure

`client/src/` is organized into `pages/` (route screens), `components/` (shared UI, including
the `workspace/` dockable-panel shell), `context/` (`AuthContext`, `ThemeContext`), `api/`
(a hand-written typed client — `client.ts` transport, `endpoints.ts` per-route functions,
`types.ts` response shapes), `hooks/`, and `utils/`. There is no data-fetching library; each
page manages its own `loading` / `error` / `submitting` state.

### Execution sandbox

A deliberately minimal Express service. One controller, one route, three language runners behind
a shared `runProcess` utility. It satisfies the `/internal/execute` *contract* so the rest of
the system can be built and tested against it; it is **not** a hardened isolation boundary (see
below).

This layering is reasonable in shape. The seams that are **not** yet production-grade are error
and validation handling, the client↔server type contract, the absence of a test/CI baseline, and
several security controls that are currently configured for local development.

---

## 7. Known Limitations

These are real limitations of the submitted baseline. They are listed here deliberately —
they define the starting point the CS-499 enhancements will improve. They are **not** fixed in
this repository.

1. **No automated tests, no CI, no linter configuration.** There is no test runner, no test
   files, and no `.github/` workflow. `coverage/` is gitignored but nothing generates it.
   ESLint appears only in `eslint-disable` comments and is not installed or configured.
   Regressions to date have been caught by manual testing.

2. **Authentication / authorization is development-grade.**
   - The JWT is stored in `localStorage` (readable by any XSS) and is valid for 7 days with no
     revocation mechanism.
   - `requireAdminRole` trusts the `role` claim in the token without re-checking the database.
   - The client `/admin` route has an authentication guard but **no role guard**
     (`client/src/App.tsx`) — a signed-in non-admin can load the page shell.
   - There is no rate limiting on `/auth/login`, `/auth/signup`, or anywhere else.

3. **The code-execution service has no isolation and no caller authentication.** It runs
   arbitrary submitted code as a plain child process, with no container/cgroup isolation, no
   memory or CPU cap, and no network denial. Any caller that can reach `EXECUTION_SERVICE_URL`
   can invoke it — there is no shared secret or mTLS between the API and the sandbox. The
   documented production target is a Fargate-task-per-request model, which is not implemented.

4. **Paid AI calls are ungated.** A single `POST /api/tutor/message` can trigger one
   reasoning-tier call plus up to three fast-tier calls; `/api/practice/*` can trigger problem
   generation. `AiUsageLog` records cost after the fact but nothing enforces a per-user quota,
   budget, or rate limit.

5. **Error handling is duplicated and brittle.** Every controller re-implements a `handleXError`
   function that special-cases `ZodError` and **string-matches `err.message`**
   (e.g. `.includes('AI_API_KEY')`) to choose an HTTP status code. There is no `AppError` type
   or async-handler wrapper. The central error handler echoes the raw `err.message` to the
   client and includes the stack trace outside `production` / `capstone-submission`.

6. **The client and server keep two hand-written copies of the same types.**
   `client/src/api/types.ts` mirrors server response shapes with no shared source of truth, so
   the two can drift apart silently.

7. **There is no frontend data layer.** Every page hand-rolls `useEffect` + loading/error/
   submitting booleans + `.then/.catch`. There is no centralized 401 → logout, retry, or
   refetch.

8. **Multi-document writes are not transactional.** `submit` writes `Submission` +
   `UserProblemHistory` + `UserProgress`; `attachNextProblem` and the tutor-memory updates are
   similar. Several code comments already acknowledge read-then-write races and work around them
   ad hoc with upserts.

9. **Practice-problem selection is a first-match query, not an algorithm.**
   `findOrGenerateProblem` runs a single `Problem.findOne(...)` on `{ stack, difficulty, type,
   validated, topic, _id ∉ seen }` and returns whatever matches first. The `timesServed`
   counter is incremented but never used for selection. The curriculum prerequisite graph is
   expressed implicitly through the *array order* of the seed data (a documented fragile spot).

10. **Validation is applied inline, not reusably.** zod is used well at the boundary, but as an
    inline `.parse()` in each handler rather than a `validate(schema)` middleware.

11. **Database schema constraints and indexing are minimal.** Hot query paths (`Submission` by
    user+problem, `UserProgress` by user+curriculum item, `Problem` by stack+topic+validated)
    rely on collection scans; there are no compound indexes for them and no uniqueness
    constraint enforcing one `UserProgress` per (user, curriculum item). Several context queries
    do N `.find()` calls plus in-JS reduction where one aggregation would do.

12. **Configuration and infrastructure are development-oriented.** Local development uses an
    in-memory MongoDB; the `production` / `capstone-submission` environment branches exist but
    have never run; there is no Dockerfile, deployment manifest, or IaC. `cors()` is open to all
    origins. Logging is `console.*` throughout with no levels, request IDs, or structured
    output. `/health` returns `{ ok: true }` without checking database or sandbox reachability.
    `ENCRYPTION_KEY` silently falls back to `JWT_SECRET`.

---

## 8. Planned CS-499 Enhancements

**None of the following is implemented in this repository.** This section summarizes intent
only. See [`ARCHITECTURE_ENHANCEMENT_PLAN.md`](ARCHITECTURE_ENHANCEMENT_PLAN.md) for the fuller
write-up used in the enhancement-plan narrative.

### Software Engineering and Design *(planned)*

- **Request-pipeline refactor:** introduce an `AppError` hierarchy, a shared `asyncHandler`
  wrapper, and one error-mapping middleware (error class → status + safe payload); remove every
  per-controller `handleXError`. Split `tutor.service.ts` by responsibility
  (`promptBuilder` / `guardrail` / `classifiers`).
- **Reusable validation:** a `validate(schema)` route middleware, one response envelope, and a
  documented status-code convention.
- **Separation of responsibilities:** a `packages/shared` (`@trakcode/contracts`) workspace
  holding domain + DTO types (derived from zod) consumed by both client and server, removing the
  duplicated `api/types.ts`; a client `useApi`/query hook so pages stop owning fetch state; a
  single `<RequireRole>` client guard.
- **Security controls (design + implementation):** httpOnly-cookie or short-TTL access + refresh
  tokens; a database-backed admin check; a client-side admin guard; `express-rate-limit` on
  `/auth/*` and the AI endpoints plus a per-user AI budget; a CORS allowlist; a shared secret
  (or documented mTLS plan) between the API and the sandbox; stop leaking `err.message`/stack
  traces outside development; fail fast when `ENCRYPTION_KEY === JWT_SECRET` in a non-dev
  environment.
- **Automated testing + CI:** Vitest across the workspaces — service-layer unit tests
  (guardrail, pass-count logic, problem validation, jwt/crypto, the error mapper), API
  integration tests via `supertest` + `mongodb-memory-server` against `createApp()`, and a small
  set of React Testing Library component tests; a coverage floor on `services/`; a GitHub
  Actions workflow running typecheck + lint + test on every pull request.
- **Documentation & maintainability:** a C4-style architecture diagram (context / container /
  component), architecture decision records, a REST/OpenAPI reference, and ESLint + Prettier
  configuration.
- **Evaluation:** a before/after comparison — coverage 0 → N %, controller
  duplication/complexity delta, a failure-mode table, a sandbox-throughput note (execution is
  currently serial), and an OWASP-lite security checklist.

### Algorithms and Data Structures *(planned)*

A formalized, unit-testable **curriculum-aware practice-selection and problem-management
algorithm**, replacing the current first-match bank query:

- **Scored candidate ranking.** Instead of `Problem.findOne(...)` returning the first match,
  score each eligible candidate on: topic relevance, difficulty fit to the learner's
  demonstrated level, novelty against `UserProblemHistory`, satisfaction of the per-learner
  scope constraint (`getCompletedTopics`), and load-balancing across the bank using the existing
  `timesServed` counter. Select the top-ranked candidate; generate only when no candidate clears
  a quality threshold. Extract this as a pure, deterministic function so it can be tested with
  fixture learners.
- **Explicit prerequisite graph.** Model the curriculum as a directed acyclic graph with real
  nodes and edges rather than relying on seed **array position**. Add topological ordering, cycle
  detection at seed time, and an explicit unlock-cascade computation.
- **Mastery-aware sequencing.** Track per-topic mastery from submission outcomes and use it to
  choose the next problem (and its difficulty), rather than a fixed level→difficulty map.
- **Bank-management policy.** Deduplicate by `contentHash`, define a staleness/invalidation
  policy for stored problems, and add the indexes the selection query needs (see the Databases
  section).

### Databases *(planned)*

- **Schema & integrity:** compound indexes for the hot query paths listed in
  [Known Limitations #11](#7-known-limitations); a uniqueness constraint for one `UserProgress`
  per (user, curriculum item); consistent handling of the Mongoose "`required` rejects empty
  string" cases; tightened schema validation.
- **Query optimization:** replace N+1 `.find()` + in-JS reduction (e.g. the tutor-context
  progress summary) with aggregation pipelines, extending the `$lookup` pattern already used by
  the admin users endpoint.
- **Transactions:** wrap the multi-document write paths (`submit`, `attachNextProblem`,
  tutor-memory updates) in MongoDB transactions (`withTransaction`), removing the ad-hoc
  read-then-write workarounds.
- **Integrity & lifecycle:** referential-integrity checks and cleanup for orphaned rows; a real
  migration/seed path for a non-in-memory database (a MongoDB Atlas connection for the
  `capstone-submission` / `production` branches that currently only exist in configuration).

---

## 9. Running the Project

### Prerequisites

- **Node.js 20 or newer** and npm.
- For the execution sandbox's language support (optional — Learn/Practice core flows work
  without it, but grading a submission needs the relevant toolchain):
  - Python: `python` or `python3` on `PATH`
  - JavaScript: `node` (already required)
  - C++: `g++` or `clang++` on `PATH`
- No local MongoDB install is required — the default configuration starts one in-memory.
- Internet access on first run: `mongodb-memory-server` downloads a `mongod` binary the first
  time it runs.

### Installation

```bash
npm install          # run at the repository root — installs all three workspaces
```

### Environment configuration

```bash
cp server/.env.example server/.env.dev
cp client/.env.example client/.env.dev      # optional; the client default already targets :4000
```

Then edit `server/.env.dev`:

- `MONGODB_URI` — leave as `memory://trakcode_dev?persist=true` for zero-setup local MongoDB.
- `JWT_SECRET` — set any random string of 16+ characters.
- Everything else can stay blank. The AI tutor, AI problem generation, GitHub OAuth/portfolio
  push, and Stripe billing each stay disabled until you supply the corresponding credential, and
  fail with a clear message rather than crashing. **Do not put real credentials in a file that
  will be committed** — `.gitignore` already excludes `server/.env.dev`.

### Database setup

None. With `MONGODB_URI=memory://...` the server starts its own MongoDB process and auto-seeds
the curriculum and sample problems on boot. Data persists under `server/.mongo-data/`
(gitignored) across restarts. Drop `?persist=true` for a throwaway database that resets every
restart.

### Start the services (three terminals)

```bash
npm run dev:sandbox   # terminal 1 — http://localhost:4100  (execution sandbox)
npm run dev:server    # terminal 2 — http://localhost:4000  (API; auto-seeds on boot)
npm run dev:client    # terminal 3 — http://localhost:5173  (React app)
```

Open <http://localhost:5173> and sign up. Learn Mode and Practice Mode work immediately against
the seeded content with no API keys. AI-dependent behavior (tutor replies, on-demand problem
generation) requires `AI_API_KEY`.

### Build / typecheck

```bash
npm run typecheck:server
npm run typecheck:sandbox
npm run typecheck:client
npm run build:server        # → server/dist
npm run build:client        # → client/dist
```

### Features that require external services

| Feature | Configuration required | Behavior without it |
|---|---|---|
| AI tutor, AI problem generation | `AI_API_KEY` (Anthropic) | Clear "not configured" error; seeded content still works |
| GitHub OAuth login / portfolio push | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_OAUTH_CALLBACK_URL`, and a user with a linked token | Route returns 503 / a "link a GitHub account" message |
| Stripe billing (checkout, webhook, cancel) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_ANNUAL` | Route returns 503; `GET /api/billing/status` still works (database-only) |
| C++ submission grading | `g++` or `clang++` on the sandbox host | The execute response explains the compiler is missing |

No real credentials are included in this package. Each feature above requires credentials you
supply yourself.

---

## 10. Academic Context

This project is submitted as an **independently developed artifact for the SNHU CS-499 Computer
Science Capstone.** TrakCode was designed and built by the student author; this repository is the
starting point from which the planned Software Engineering and Design, Algorithms and Data
Structures, and Databases enhancements will be developed and then evaluated against this
baseline.

No claim of instructor review or approval is made or implied by this document.

---

## Repository contents

| Path | Purpose |
|---|---|
| `client/` | React + TypeScript single-page application |
| `server/` | Express + TypeScript REST API and data models |
| `services/execution-sandbox/` | Internal code-execution service |
| `ARCHITECTURE_ENHANCEMENT_PLAN.md` | The CS-499 Software Engineering & Design analysis and enhancement plan (context) |
| `SANITIZATION_REPORT.md` | What was removed or replaced to prepare this submission snapshot |
| `server/.env.example`, `client/.env.example` | Safe example environment files (placeholders only) |
| `package.json`, `package-lock.json` | Workspace manifests |
