# TrakCode API (server)

Node / Express / TypeScript REST API, MongoDB via Mongoose. Full route
reference: [`openapi.yaml`](openapi.yaml). This file is about how the code is
put together.

## Running this locally

```bash
npm install
cp server/.env.example server/.env.dev
npm run dev:sandbox   # :4100 — execution sandbox (required for grading routes)
npm run dev:server    # :4000 — this API (auto-seeds sample problems on boot)
```

`MONGODB_URI=memory://trakcode_dev?persist=true` in `.env.example` runs a
real, self-contained MongoDB with no external setup — no separate database
install or connection string needed. `AI_API_KEY`, GitHub OAuth, and Stripe
are all optional: every route that needs one degrades to a clean 503 instead
of crashing when it's unset (see `errors/AppError.ts`'s `AiUnavailableError`).

**No temporary login is needed or provided.** Signup is open and
self-service — `POST /auth/signup` with any email/password/name creates a
usable account immediately (see `openapi.yaml`). There's also a demo-code
redemption path (`POST /auth/demo-code/redeem`) for a lower-friction
onboarding flow, but it requires seeding a code first
(`npm run seed:demo-code -w server`, gated by `DEMO_CODE_ADMIN_KEY`) — signup
is the simpler path for just trying the API out.

## Layering

```
routes/       Express Router wiring only — path + method + middleware + which
              controller function handles it. No logic.
controllers/  Parse/validate the request (zod), call into services, shape the
              HTTP response. No business logic of their own beyond that.
services/     Business logic, external calls (Anthropic, GitHub, Stripe, the
              execution-sandbox microservice), and the actual Mongoose queries.
models/       Mongoose schemas — the persistence layer.
```

A route handler's `catch` block is always just `catch (err) { next(err); }`.
There is deliberately no per-controller error-formatting logic anymore — see
"Error handling" below.

## Error handling

Every domain failure that needs a specific HTTP status is a typed subclass of
`AppError` (`src/errors/AppError.ts` — `AiUnavailableError`,
`GenerationExhaustedError`, `SandboxUnavailableError`, `NotFoundError`,
`GithubNotLinkedError`, `GithubApiError`). A service throws the specific error
that describes what went wrong; it never has to know or care which HTTP
status that becomes.

`src/middleware/errorHandler.ts` is the single place an error becomes a
response — it recognizes `AppError` subclasses, `zod.ZodError` (→ 400 with
field-level details), and a Mongo duplicate-key error (→ 409 with a friendly,
field-aware message), and falls back to a generic 500 for anything else
(hiding the stack trace outside local dev).

This replaced ten separate, near-identical `handleXError` functions — one per
controller — each re-implementing the same ZodError check, and a few of them
additionally doing `err.message.includes('some substring')` to guess an
appropriate status for a specific failure. That pattern was fragile (a
reworded error message silently changed the HTTP status a client saw, and it
was easy to add a new failure mode to a service without remembering to also
teach some controller's string-matching about it). Throwing a typed error at
the source and mapping it once, centrally, makes that whole class of drift
impossible instead of just documented against.

## Configuration

Cross-cutting business tunables (trial length, retry budgets, a guardrail
length threshold) live in `src/config/constants.ts`, each with a comment
explaining what it trades off. Deliberately NOT everything numeric in the
codebase — a purely local implementation detail (a crypto algorithm name, a
cache-pricing multiplier) stays next to the one function that uses it. See
that file's own header comment for the line being drawn.

Environment variables are validated centrally and once, in
`src/config/env.ts` (zod schema, fails loud at boot). See that file's own
comment for a real gotcha around running tests under Jest, which sets
`NODE_ENV=test` itself unless the test script pins it first.

## The AI tutor (`src/services/tutor*`)

`tutor.service.ts` is a thin orchestration facade — it owns only the actual
reply-generation retry loop (`generateTutorReply`). Everything it coordinates
lives in its own independently-testable module under `src/services/tutor/`:

- `promptBuilder.ts` — builds the system prompt (three cache tiers) and the
  conversation's cache breakpoint.
- `guardrail.ts` — the two-layer leaked-solution guardrail (real sandbox
  execution + an LLM classifier that also judges legitimate offer-and-consent).
- `classifiers.ts` — the readiness-to-practice classifier.
- `memory.ts` — cross-session memory extraction, plus its cheap pure-function
  pre-filter (`isPureAcknowledgment`).

Every function that talks to the Anthropic API takes the client as a
parameter, defaulting to the real singleton
(`client: Anthropic | null = getAnthropicClient()`), rather than reaching for
it internally. That's what makes each module unit-testable with a fake
client object passed straight in — see `src/services/tutor/__tests__/` —
instead of needing to mock the `aiClient` module itself.

## Testing

`npm run test` (Jest + ts-jest). Three kinds of test exist in this codebase,
by design, not by accident:

- **Pure unit tests** (`seqGrader.test.ts`, `promptBuilder.test.ts`,
  `memory.test.ts`) — no I/O, no mocking, just inputs and assertions.
- **Contract tests with dependency injection** (`guardrail.test.ts`,
  `errorHandler.test.ts`) — a fake collaborator (an Anthropic-shaped client,
  a fake `Response`) is passed directly into the function under test.
- **Integration tests** (`seq.submit.integration.test.ts`) — a real Express
  app (`createApp()`) via `supertest`, against a real ephemeral MongoDB
  (`mongodb-memory-server` — the same mechanism `config/db.ts` uses for local
  dev), with a real signed JWT. Deliberately scoped to routes that don't need
  the execution-sandbox microservice running, so this test suite has no
  external service dependency.

CI (`.github/workflows/ci.yml`) runs typecheck + this suite + the client
build on every push and pull request.

## API documentation

[`openapi.yaml`](openapi.yaml) is hand-authored directly from the actual
route/controller/zod-schema definitions — not produced by a codegen tool, but
kept close enough to the code (every path matches a real `router.<method>`
call) that it stays a reliable reference rather than documentation that
drifts from what the server actually does. Open it in any OpenAPI viewer
(Redocly, Swagger UI) or lint it with `npx @redocly/cli lint server/openapi.yaml`.
