# TrakCode

Coding education platform — Learn Mode skill trees, AI-generated practice problems
run against real sandboxed execution, a Socratic AI tutor, GitHub portfolio push, and
public activity profiles. Full spec: `CodeForge_Specs_1.md` (implementation-facing;
companion to `CodeForge_PRD.docx`).

See `server/.env.example` for the full list of env vars and which features need
a real credential.

This repo is an npm-workspaces monorepo:

```
TrakCode/
  server/                      Node.js + Express + TypeScript API (§7 routes)
  services/execution-sandbox/  Internal code-execution service (§4)
  client/                      React + TypeScript frontend (§8 screens)
```

## Getting started — full stack

```bash
npm install
cp server/.env.example server/.env.dev   # already done in this checkout
# server/.env.dev's defaults work out of the box for local dev:
#   MONGODB_URI=memory://trakcode_dev?persist=true  — real MongoDB, zero setup,
#     data persists in server/.mongo-data/ (gitignored) across restarts
#   EXECUTION_SERVICE_URL=http://localhost:4100

npm run dev:sandbox   # terminal 1 — :4100, execution sandbox
npm run dev:server    # terminal 2 — :4000, main API (auto-seeds curriculum + sample problems)
npm run dev:client    # terminal 3 — :5173, React app
```

Open `http://localhost:5173`. Sign up, and you're in — the seeded curriculum and
sample problems mean Learn Mode and Practice Mode work immediately with no extra
setup, no API keys required for the core flow. Accounts, progress, and demo codes
now survive server restarts (drop `?persist=true` from `MONGODB_URI` if you
actually want a throwaway database instead).

**Features that need a real credential** (AI problem generation, the AI tutor,
GitHub OAuth/portfolio push, Stripe billing) fail gracefully with a clear message
until you add the corresponding key to `server/.env.dev` — see `server/.env.example`
for exactly which env var each feature needs.

### Seeding more demo codes

**While `dev:server` is already running**, use the Admin Panel in the app (needs
a `role: 'admin'` user) or call the live endpoint directly — this is the normal
path:

```bash
curl -X POST http://localhost:4000/api/admin/demo-codes \
  -H "Content-Type: application/json" -H "x-admin-key: <DEMO_CODE_ADMIN_KEY>" \
  -d '{"code":"CS4900-PROF","issuedTo":"Prof. Smith","maxUses":50}'
```

The standalone script below only works when the server is **not** running —
with persistence on, both processes would try to open the same on-disk
database and the second one fails with a clear `DBPathInUse` lock error
(harmless — the already-running server keeps working fine, the script just
exits without creating the code):

```bash
npm run seed:demo-code -- --code=CS4900-PROF --issuedTo="Prof. Smith" --maxUses=50
```

### Other useful scripts

```bash
npm run typecheck:server    # tsc --noEmit
npm run typecheck:sandbox
npm run typecheck:client
npm run build:server        # compile to server/dist
npm run build:client        # production build to client/dist
```

## Open decisions resolved so far

Per spec §10:
- **Capstone DB:** `capstone-submission` gets its own MongoDB database/cluster,
  fully separate from `dev` and `production`. Each environment's `.env.<NODE_ENV>`
  file (or platform-injected env vars in real deployments) carries its own
  `MONGODB_URI` — see `server/.env.example`.
- **Execution sandbox isolation:** local dev uses a lightweight child-process
  runner satisfying the `/internal/execute` contract; production should swap in
  the spec's own recommendation (Fargate tasks-per-request) — see
  `services/execution-sandbox/README.md`.
- **Tutor hint escalation:** implemented as user-driven (an explicit "bigger
  hint" action), per the spec's own MVP recommendation — not automatic.
