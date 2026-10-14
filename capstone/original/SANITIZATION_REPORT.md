# Sanitization Report — TrakCode CS-499 Baseline Submission

**Prepared:** 2026-08-31
**Purpose:** document how the submission snapshot in `TrakCode-CS499-Baseline/` was derived
from the working development repository, what sensitive material was found, and what was
removed or replaced. No secret values are reproduced in this report.

---

## 1. Method

The submission is a **separate copy**. The working development repository was not modified as
part of producing it (a stale local `client/dist` / `server/dist` build directory and stale
`*.tsbuildinfo` caches were deleted from the working tree beforehand; no source, configuration,
or history was touched).

The copy was built by enumerating the repository's tracked files plus two not-yet-committed
source files that are part of the current baseline, then excluding the items listed in
Section 3. New documentation and a sanitized example environment file were then added.

---

## 2. Sensitive information found and how it was handled

| # | What was found | Where | Handling |
|---|---|---|---|
| 1 | **Live Anthropic API key** (`AI_API_KEY`) | `server/.env.dev` (git-ignored; never committed) | File excluded from the submission entirely. Replaced by a placeholder in `server/.env.example` (`your_anthropic_api_key_here`). |
| 2 | **Real JWT signing secret** (64-hex-character `JWT_SECRET`) | `server/.env.dev` | File excluded. `server/.env.example` ships `JWT_SECRET=replace_with_local_development_secret`. |
| 3 | **Shared admin key** (`DEMO_CODE_ADMIN_KEY`, a weak literal value) | `server/.env.dev` | File excluded. `server/.env.example` ships `DEMO_CODE_ADMIN_KEY=replace_with_local_admin_secret`. |
| 4 | **Real administrator account credentials** — email and a generated login password for a seeded `role: admin` user | `admin-credentials.txt` (git-ignored) | File excluded from the submission entirely. No replacement — there is intentionally no self-serve admin promotion in the codebase. |
| 5 | **Local machine absolute paths** and **personal development-environment details** (operating-system user directory, third-party antivirus product name, personal API-spend figures, local plan-file paths, editor session identifiers) | `CLAUDE.md` (internal AI-assistant build log), `.claude/settings.local.json`, `.claude/scheduled_tasks.lock` | `CLAUDE.md` and the entire `.claude/` directory excluded from the submission. `.claude/` added to `.gitignore`. |
| 6 | **Persistent local development database** — ~300 MB of real signed-up accounts, submissions, and tutor transcripts from prior local usage | `server/.mongo-data/` (git-ignored) | Directory excluded from the submission. Already covered by `.gitignore`. |
| 7 | **Full git history** | `.git/` | Excluded from the submission (standalone academic artifact). The history was inspected first: the real API key and JWT secret in item 1–2 do **not** appear in any committed revision — only `.env.example` files and source were ever committed. Excluding history is a precaution, not a response to a known leak. |

### Items reviewed and confirmed NOT sensitive (left as-is)

- **All application source code** (`client/src/`, `server/src/`, `services/execution-sandbox/src/`)
  reads configuration exclusively through `process.env` / `import.meta.env` and a central
  zod-validated env module (`server/src/config/env.ts`). No API key, token, password, connection
  string, or private endpoint is hard-coded anywhere in source, tests, comments, JSON, or build
  configuration.
- **`localhost` / `127.0.0.1`-style URLs** throughout (`http://localhost:4000`,
  `http://localhost:4100`, `http://localhost:5173`) are local development defaults, not private
  production infrastructure.
- **`package-lock.json`** resolves every dependency from the public `registry.npmjs.org`; it
  contains no auth tokens or private registry references.
- **Generated placeholder email domains** in code (e.g. `@trakcode.demo`,
  `@users.noreply.github.com`) are synthetic, not real addresses.
- **`client/.env.example`** already contained only a `localhost` API URL — kept unchanged.
- **`ARCHITECTURE_ENHANCEMENT_PLAN.md`** contains no secrets or private infrastructure detail;
  kept, as it is the enhancement-plan context for this submission.

---

## 3. Files and directories excluded from the submission

| Path | Reason |
|---|---|
| `.git/` | Standalone artifact; history not needed for review (see item 7 above). |
| `node_modules/` (all workspaces) | Dependencies; reinstalled with `npm install`. |
| `client/dist/`, `server/dist/` | Build output. |
| `*.tsbuildinfo` | TypeScript incremental-build cache. |
| `server/.env.dev` | Contained live credentials (items 1–3). |
| `admin-credentials.txt` | Real admin login (item 4). |
| `CLAUDE.md` | Internal AI-assistant build log with local-environment and personal detail (item 5). |
| `.claude/` | Local Claude Code tooling state, including absolute machine paths (item 5). |
| `server/.mongo-data/` | Local database with real user data (item 6). |

---

## 4. Files modified or added for sanitization

| File | Change |
|---|---|
| `server/.env.example` | **Rewritten** as a clean placeholder file. Every value is an obvious placeholder or a `localhost` default. The `MONGODB_URI` default was set to the zero-setup in-memory option (`memory://trakcode_dev?persist=true`) so the project runs in a clean environment without installing MongoDB; the self-hosted `mongodb://localhost:27017/...` form is retained as a commented alternative. Stale references to an external specification document were removed from the comments. **No behavior change** — the variable names, and the code that reads them, are untouched. |
| `README.md` | **Replaced** with a new submission-specific README (project overview, purpose of the submission, architecture, technology stack, existing functionality, current design, known limitations, planned CS-499 enhancements, run instructions, academic context). The previous README pointed at the now-excluded `CLAUDE.md` and an external spec file. |
| `.gitignore` | Added `.claude/` to the "Editor / OS / local tooling" section. No other change. |
| `SANITIZATION_REPORT.md` | **Added** (this file). |
| `ARCHITECTURE_ENHANCEMENT_PLAN.md` | **Unchanged** — carried over from the working repository as enhancement context. |

No application source file (`.ts` / `.tsx` / `.css` / `.html`), `package.json`, `tsconfig`, or
Mongoose model/schema was altered. The baseline behavior is preserved exactly.

### Cosmetic artifact left in place, by design

Four source-comment lines still say "see `CLAUDE.md`" (`server/src/models/AiUsageLog.ts`,
`server/src/services/tutor.service.ts`, `client/src/styles/global.css`, and one line in
`ARCHITECTURE_ENHANCEMENT_PLAN.md`). The referenced internal build log was intentionally
excluded from this submission (item 5). These comments were **not** edited, so that the code
matches the working baseline byte-for-byte; they point at nothing sensitive.

---

## 5. Functionality that requires external services or credentials

The core learning flow — signup/login, Learn Mode, Practice Mode against seeded problems, code
execution, progress tracking, public profiles — runs fully locally with **no credentials**. The
following require configuration the submitter must supply; without it, each returns a clear,
non-crashing error:

| Feature | Requires | Without it |
|---|---|---|
| AI tutor ("Trak") and AI problem generation | `AI_API_KEY` (Anthropic) | "Not configured" error; seeded curriculum and sample problems still work. |
| GitHub OAuth login / linking / portfolio push | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_OAUTH_CALLBACK_URL`, plus a user with a linked token | 503 / "link a GitHub account" message. |
| Stripe billing — checkout session, webhook, cancel | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_ANNUAL` | 503. `GET /api/billing/status` still works (database-only). |
| C++ submission grading | `g++` or `clang++` on the sandbox host | The execute response explains the compiler is missing; Python and JavaScript are unaffected. |
| Persistent database beyond local dev | A real `MONGODB_URI` (e.g. MongoDB Atlas) | The in-memory option (`memory://...`) is the default and needs nothing. |

---

## 6. Build / verification performed

Performed against the sanitized copy after a clean `npm install` (232 packages, no
`node_modules` carried over):

| Check | Command | Result |
|---|---|---|
| Dependency install | `npm install` | Succeeded (exit 0). |
| Server typecheck | `npm run typecheck:server` (`tsc --noEmit`) | Passed, no errors. |
| Sandbox typecheck | `npm run typecheck:sandbox` (`tsc --noEmit`) | Passed, no errors. |
| Client typecheck | `npm run typecheck:client` (`tsc -b --noEmit`) | Passed, no errors. |
| Client production build | `npm run build:client` (`tsc -b && vite build`) | Succeeded. (Vite emits a "chunks larger than 500 kB" advisory — a pre-existing bundle-size note, not an error.) |
| Server build | `npm run build:server` (`tsc -p tsconfig.json`) | Succeeded. |

Secret / PII sweeps run over the final package (excluding `node_modules`):

- Pattern sweep for `sk-ant-*`, `sk_live_*` / `sk_test_*`, `AKIA…`, `ghp_…`, PEM private-key
  headers, and 64-hex-character strings — **no matches**.
- Literal sweep for the specific API-key fragment, the specific JWT secret, the specific admin
  password, and the demo admin-key literal from the excluded `.env.dev` / `admin-credentials.txt`
  — **no matches**.
- Sweep for the developer's OS username, name, personal email, and Windows/Unix absolute path
  prefixes — **no matches**.
- Confirmed the only `.env*` files present are `server/.env.example` and `client/.env.example`,
  both placeholder-only.
- Confirmed `CLAUDE.md`, `admin-credentials.txt`, `.claude/`, `.git/`, `.mongo-data/`, and all
  `dist/` output are absent.

Runtime was **not** exercised end-to-end for this snapshot (no AI key is included by design);
the working repository from which this copy was taken has previously been run end-to-end against
the live local stack.

---

## 7. Confirmation: no CS-499 enhancements implemented

The submission is the pre-enhancement baseline. Verified absent:

- No test runner or test files (`vitest`, `supertest`, `@testing-library/*`); no `*.test.ts` /
  `*.spec.ts`.
- No `.github/` workflow; no ESLint or Prettier configuration file.
- No `AppError` class hierarchy, `asyncHandler` wrapper, or `validate(schema)` middleware —
  controllers still use per-file `handleXError` and inline `.parse()`.
- No `packages/` shared-contract workspace; `client/src/api/types.ts` is still a hand-written
  mirror of server shapes.
- No `express-rate-limit` or per-user AI budget; no client-side admin role guard.
- No MongoDB transactions (`startSession` / `withTransaction`) around multi-document writes.
- Practice-problem selection is still the single-`findOne` first-match query in
  `server/src/services/problemBank.service.ts`.

---

## 8. Known limitations of this sanitized submission

- **AI-dependent features cannot be demonstrated as-shipped** — no `AI_API_KEY` is included.
  Reviewers wishing to exercise the AI tutor or on-demand problem generation must supply their
  own Anthropic key. The seeded curriculum and sample problems exercise the same non-AI code
  paths.
- **The internal build log (`CLAUDE.md`) is not included.** It documented build history and
  verification notes but also contained personal development-environment detail. The four
  dangling `see CLAUDE.md` comments in source (Section 4) are the only residue.
- **No git history.** The submission is a flat snapshot; there is no commit-by-commit record.
- **`server/.env.dev` must be created by the reviewer** (`cp server/.env.example
  server/.env.dev`) before the server will start — the sanitized example provides working local
  defaults for everything except a `JWT_SECRET` value, which must be set to any 16+ character
  string.
- The application's own architectural limitations are unchanged and are documented in
  `README.md` §7 — that is intentional; they are the baseline the enhancement work addresses.
