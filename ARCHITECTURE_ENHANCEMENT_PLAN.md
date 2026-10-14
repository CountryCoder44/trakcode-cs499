# TrakCode — Architecture Analysis & Software Engineering Enhancement Plan

_Prepared for the Computer Science Capstone (Category III.A.ii — Software Engineering & Design)._
_Date: 2026-08-31_

This document analyzes the current TrakCode implementation, identifies where the
architecture is not yet production-grade, and defines a targeted engineering
enhancement of meaningful scope. It is the basis for the III.A.ii Enhancement
Plan narrative and the accompanying pseudocode/flowchart.

---

## 1. Current architecture (as built)

**Shape:** npm-workspaces monorepo, three deployable units.

| Unit | Stack | Port | Responsibility |
|---|---|---|---|
| `client/` | React 19 + TypeScript, Vite 8, react-router 7, CodeMirror 6, hand-rolled CSS token system (no UI library) | 5173 | 13 screens: landing/auth, onboarding, dashboard, Learn Mode, Practice Mode + Flash Card workspace, public profile, roadmap, billing, admin |
| `server/` | Node + Express 4, TypeScript (`strict`), Mongoose 8, `jsonwebtoken`, `bcryptjs`, `helmet`, zod, `@anthropic-ai/sdk`, `stripe` | 4000 | REST API under `/api`, 8 route groups, ~13 Mongoose models |
| `services/execution-sandbox/` | Express + TypeScript, `child_process.spawn` | 4100 | `POST /internal/execute` — compiles/runs Python, JavaScript, C++ against test cases |

**Backend layering** is already reasonable: `routes/` → `controllers/` →
`services/` → `models/`, with shared enums in `server/src/types/domain.ts` and a
zod-validated environment module (`server/src/config/env.ts`).

**Data layer:** MongoDB via Mongoose. Local development runs
`mongodb-memory-server` with an optional on-disk `?persist=true` mode
(`server/src/config/db.ts`). The `capstone-submission` and `production`
environment branches exist in configuration but have never been exercised — there
is no Dockerfile, deployment manifest, or infrastructure-as-code in the repo.
Hosting is currently aspirational.

**Authentication:** HS256 JWT (`{ userId, role }`, 7-day expiry), sent as
`Authorization: Bearer`, stored in browser `localStorage`
(`client/src/api/client.ts`). Middleware: `requireAuth`, `optionalAuth`,
`requireAdminRole` (trusts the token's role claim, no database re-check),
`requireAdminKey` (shared-secret header). Passwords: bcrypt, 12 rounds,
`select: false`. The GitHub OAuth token is AES-256-GCM encrypted at rest
(`server/src/utils/crypto.ts`), but the encryption key silently falls back to
`JWT_SECRET` when `ENCRYPTION_KEY` is unset.

**AI integration:** `server/src/services/aiClient.ts` performs two-tier model
routing (reasoning tier / fast tier). `server/src/services/tutor.service.ts` is
the complexity hotspot at ~662 lines — it owns prompt assembly, prompt-cache
tiering, a two-layer solution-leak guardrail, a readiness classifier, and a
memory extractor. `server/src/services/problemGeneration.service.ts` runs
generate → validate-against-sandbox → retry (≤3) → store, synchronously inside
the request path.

**Execution sandbox:** zod-validated input, `spawn` with an argv array (never a
shell string), one temp directory per run, wall-clock timeout → `SIGKILL`, 1 MB
output cap, `\r\n` normalization. There is **no container/cgroup isolation, no
memory or CPU cap, no network denial, and no authentication between the API and
the sandbox** (documented as a known gap; the production target is a
Fargate-task-per-request model).

---

## 2. Architectural weaknesses (prioritized)

| # | Weakness | Evidence | Severity |
|---|---|---|---|
| 1 | **No automated tests, no CI, no linter configuration.** Every regression to date was caught by hand (curl / a single Playwright pass). `coverage/` is gitignored but nothing generates it. `.github/` is absent. ESLint appears only in `eslint-disable` comments and is not installed. | whole repo | High |
| 2 | **Authentication hardening.** JWT stored in `localStorage` (readable by any XSS); 7-day non-revocable tokens; admin role trusted from the token with no database recheck; the `/admin` route has an auth guard but **no client-side role guard** (`client/src/App.tsx`); no rate limiting on `/auth/login` or `/auth/signup`. | `server/src/middleware/auth.middleware.ts`, `client/src/App.tsx` | High |
| 3 | **The code-execution surface has no isolation and no caller authentication.** The highest-risk component (it runs arbitrary submitted code) is a plain child process reachable by anything that can address `EXECUTION_SERVICE_URL`. | `services/execution-sandbox/src/utils/runProcess.ts`, `services/execution-sandbox/src/app.ts` | High |
| 4 | **Paid AI calls are ungated.** One `POST /tutor/message` can fire one reasoning-tier call plus three fast-tier calls; `/practice/*` can trigger problem generation. `AiUsageLog` records cost but nothing enforces a per-user quota or rate limit. | `server/src/controllers/tutor.controller.ts` | High |
| 5 | **Error handling is duplicated and brittle.** Every controller re-implements a `handleXError` function that special-cases `ZodError` and **string-matches `err.message`** (e.g. `.includes('AI_API_KEY')`, `.includes('flagged for manual review')`) to choose a status code. There is no `AppError` type. The central handler echoes the raw `err.message` to clients. | `server/src/controllers/practice.controller.ts`, `server/src/controllers/tutor.controller.ts`, `server/src/middleware/errorHandler.ts` | Medium |
| 6 | **Client and server keep two hand-written copies of the same types.** `client/src/api/types.ts` mirrors server response shapes with no shared source of truth — drift is silent. | client vs. server | Medium |
| 7 | **No frontend data layer.** Every page hand-rolls `useEffect` + `loading`/`error`/`submitting` booleans + `.then/.catch`; there is no centralized 401 → logout, retry, or refetch. | `client/src/pages/PracticeWorkspacePage.tsx` and peers | Medium |
| 8 | **Multi-document writes are not transactional.** `submit` writes `Submission` + `UserProblemHistory` + `UserProgress`; `attachNextProblem` and the tutor-memory updates are similar. Several code comments already acknowledge the read-then-write races. | `server/src/controllers/practice.controller.ts`, `server/src/services/curriculumPractice.service.ts` | Medium |
| 9 | **Validation is not reusable.** zod is used well at the boundary, but as an inline `.parse()` in each handler rather than a `validate(schema)` middleware. | all controllers | Low–Medium |
| 10 | `cors()` is open to all origins; there is no structured logging, request IDs, or log levels (`console.*` throughout); `/health` does not check database or sandbox reachability. | `server/src/app.ts` | Low–Medium |

Backend layer separation is genuinely acceptable. The seams that need work are
**error/validation handling**, **the client↔server type contract**, **the
missing test/CI baseline**, and **security controls that are currently
development-grade**.

---

## 3. Enhancement scope, mapped to the template's eight areas

| Template area | Concrete TrakCode work |
|---|---|
| Refactor architecture where appropriate | Introduce an `AppError` hierarchy + an `asyncHandler` wrapper + one error-mapping middleware (error class → status + safe payload); replace all per-controller `handleXError` functions. Split `tutor.service.ts` into `promptBuilder` / `guardrail` / `classifiers`. |
| Separation of responsibilities (frontend / backend / data) | Add a `packages/shared` (`@trakcode/contracts`) workspace holding domain + DTO types (ideally derived from zod), consumed by both client and server — removes the duplicated `api/types.ts`. Add a client `useApi`/query hook so pages stop owning fetch state. Wrap multi-write operations in MongoDB transactions so the data layer owns its own atomicity. |
| Consistent API & component patterns | `validate(schema)` route middleware; one response envelope; a documented status-code convention. On the client: one `<RequireRole>` guard and a shared async-state pattern. |
| Error handling & validation | Covered by the two rows above, plus: stop leaking `err.message`/stack traces to clients outside development, and fail fast in `env.ts` when `ENCRYPTION_KEY === JWT_SECRET` in a non-development environment. |
| Automated testing | Vitest across workspaces: service-layer unit tests (guardrail, `recordUnaidedPassIfApplicable`, problem validation, jwt/crypto, error mapper); API integration tests via `supertest` + `mongodb-memory-server` (already a dependency) against `createApp()`; a small set of React Testing Library component tests. Set a coverage floor on `services/`. |
| Authentication / authorization & security controls | httpOnly cookie **or** a short-TTL access token + refresh; a database-backed admin check; a client-side admin guard; `express-rate-limit` on `/auth/*` and the AI endpoints plus a per-user AI budget check; a CORS allowlist; a shared secret (or a documented mTLS plan) between the API and the sandbox; document the Fargate isolation target. |
| Documentation & maintainability | A C4-style architecture diagram (context / container / component), architecture decision records promoting the decisions currently buried in `CLAUDE.md` prose, a REST/OpenAPI reference, ESLint + Prettier configs, and a GitHub Actions workflow (typecheck + lint + test on every pull request). |
| Evaluate for scalability & reliability | A before/after comparison: test coverage 0 → N %, controller duplication/complexity delta, a list of failure modes now handled cleanly, a sandbox throughput note (execution is currently serial — one child process at a time), and an OWASP-lite security checklist. |

**Realistic capstone scope** is the spine of rows 1, 4, 5, and 6, with row 7
(documentation) and row 8 (evaluation) as deliverables; the remainder is a
stretch goal. This is a cross-cutting refactor that touches every controller and
both type layers — meaningful engineering, not debugging or cosmetic cleanup.

---

## 4. Enhancement Plan narrative (III.A.ii)

> For the Software Engineering and Design enhancement I will evaluate and harden
> the existing architecture of TrakCode, moving it from a working prototype
> toward a production-ready design without rebuilding its feature set. TrakCode
> is an npm-workspaces monorepo containing a React 19 / TypeScript single-page
> client, an Express / TypeScript REST API backed by MongoDB through Mongoose,
> and a separate internal service that compiles and runs learner-submitted
> Python, JavaScript, and C++ against test cases. Authentication is JWT-based,
> the AI tutoring and problem-generation features call the Anthropic API through
> a small model-routing layer, and practice problems are generated and validated
> on demand.
>
> My analysis of the current implementation identifies several areas where the
> architecture is sound in concept but not yet production-grade. Error handling
> and request validation are implemented ad hoc and repeated across every
> controller, with HTTP status codes selected by string-matching error messages.
> The client and server each maintain a separate hand-written copy of the same
> data types, so the two can drift apart silently. There is no automated test
> suite and no continuous-integration pipeline; every regression so far has been
> found by manual testing. Several security controls — token storage and
> lifetime, administrative authorization, request rate limiting on
> authentication and paid AI endpoints, cross-origin policy, and isolation of
> the code-execution service — are currently configured for local development
> rather than real deployment. Multi-step database operations that span several
> documents are not transactional.
>
> Based on this analysis I will make a targeted architectural enhancement
> centered on the request-handling pipeline and the quality infrastructure
> around it. Specifically, I will (1) refactor the API layer to use a single
> typed error hierarchy, a shared asynchronous-handler wrapper, and reusable
> schema-validation middleware in place of the current per-controller code;
> (2) extract the shared domain and data-transfer types into one source of truth
> consumed by both the client and the server, and introduce a consistent
> client-side pattern for calling the API and handling loading and error states;
> (3) strengthen authentication and authorization, including token handling,
> administrative-role checks enforced on both the client and the server, rate
> limiting and a per-user budget on the AI endpoints, and a stricter
> cross-origin policy; (4) establish an automated testing baseline — unit tests
> for the service layer, integration tests that exercise the API against an
> in-memory database, and a small set of client component tests — together with
> a continuous-integration workflow that runs type-checking, linting, and tests
> on every change; and (5) add structured logging with request correlation
> identifiers, a dependency-aware health check, and database transactions around
> the multi-document write paths.
>
> The enhancement will preserve all existing functionality. It will conclude
> with a written evaluation comparing the original and revised architectures —
> test coverage, code-duplication and complexity metrics for the refactored
> layers, a checklist of security controls addressed, and an assessment of how
> the revised design supports future scaling and reliability — and with updated
> technical documentation consisting of an architecture diagram, decision
> records, and an API reference. These changes are intended to demonstrate
> applied software-engineering practice on an actively developed product rather
> than debugging or cosmetic cleanup.

---

## 5. Process flowchart

```
Audit current architecture
  (React client · Express API · execution sandbox · MongoDB)
        |
        v
Map architectural weaknesses
  (duplicated error/validation code · client<->server type drift ·
   no tests/CI · dev-grade auth & CORS · unisolated code execution ·
   ungated paid AI calls · non-transactional multi-writes)
        |
        v
Design target architecture
  (shared contract package · typed error + validation middleware ·
   auth/authz hardening · test + CI baseline · observability)
        |
        v
Refactor API layer
  (AppError hierarchy + asyncHandler + validate(schema) across all controllers;
   split the ~662-line tutor service by responsibility)
        |
        v
Extract shared type/contract package
  (single source of truth consumed by client and server)
        |
        v
Harden auth / authz / abuse controls
  (token storage & TTL · DB-backed + client admin guards ·
   rate limiting + AI budget · CORS allowlist · API<->sandbox auth)
        |
        v
Add automated tests
  (Vitest service unit tests · supertest API integration tests ·
   React Testing Library component tests)
        |
        v
Wire CI + resilience
  (GitHub Actions: typecheck + lint + test · structured logging + request IDs ·
   deep health check · Mongo transactions on multi-writes)
        |
        v
Evaluate enhanced architecture
  (coverage 0 -> N% · duplication/complexity delta · failure-mode table ·
   sandbox throughput note · OWASP-lite security checklist)
        |
        v
Document results
  (C4 architecture diagram · ADRs · API reference · before/after comparison)
```

---

## 6. Assumptions to confirm

- **Hosting:** the repository shows nothing deployed — no Dockerfile, no cloud
  configuration. If the application has been stood up somewhere, that changes
  the plan; it currently assumes "deployment target defined, not yet built."
- **Development database:** development uses in-memory MongoDB, not a real
  connection string. If "connect to a real MongoDB Atlas cluster with migrations
  and seeding" is part of the enhancement, that is a legitimate data-layer
  addition worth naming explicitly.
- **Scope emphasis:** the spine (rows 1/4/5/6 in section 3) is a solid
  one-person capstone. If the rubric rewards breadth, swap in the frontend data
  layer and observability; if it rewards a single deep artifact, error/validation
  + shared contract + tests is the tightest story.
