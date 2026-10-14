# Contributing to TrakCode

Thanks for helping. This guide explains how changes move from an idea to the `main` branch, so that anyone on the team, technical or not, can take part and every change gets the same checks.

## Who can contribute, and how

- **Anyone (learners, instructors, product or business stakeholders):** open an issue. Use the **Bug report** template for something broken, or the **Feature request** template for an idea. You don't need to know the code: describe what you saw or what you need, and why it matters.
- **Developers:** pick up an issue, make the change on a branch, and open a pull request. The rest of this guide is for you.

Decisions that affect learners or cost (new features, pricing, data handling) are discussed on the issue first, so the people affected can weigh in before code is written.

## Setting up

See the [README](README.md) for requirements and how to run the app locally. In short:

```bash
npm install
npm run dev:sandbox   # code-execution service, http://localhost:4100
npm run dev:server    # API, http://localhost:4000
npm run dev:client    # web app, http://localhost:5173
```

## Making a change

1. **Branch from `main`.** Name it after the work, for example `fix/hint-for-cpp-compile-errors` or `feat/practice-filters`.
2. **Keep it focused.** One problem per pull request. Unrelated cleanups go in their own pull request, so each one is easy to review and easy to revert.
3. **Add or update tests.** New behavior needs a test that would fail without it. Bug fixes need a test that reproduces the bug.
4. **Run the checks locally** before opening the pull request:

   ```bash
   npm run typecheck:server
   npm run typecheck:client
   npm run typecheck:sandbox
   npm run test:server
   npm run test:sandbox
   ```

5. **Open a pull request** and fill in the template: what changed, why, how you tested it, and any risk.

## What happens on every pull request

- **Continuous integration** (`.github/workflows/ci.yml`) type-checks all three packages and runs the full server and sandbox test suites. Don't merge a pull request while it fails.
- **Code review.** At least one other person reviews the change against the checklist below before it merges. The reviewer's job is to protect learners and the codebase, not to grade the author; ask questions, suggest alternatives, and approve once the checklist is met.

## Review checklist

- [ ] The change does what the linked issue asks, and nothing unrelated.
- [ ] Tests cover the new behavior or reproduce the fixed bug, and they pass in CI.
- [ ] Errors are thrown as the typed errors in `server/src/errors/AppError.ts`, not plain strings.
- [ ] Anything that fails (a network call, the AI API, the database) fails safely: no secrets in logs, no learner data exposed, and safety checks fail closed.
- [ ] No credentials, API keys, or personal data are committed. Configuration goes in `.env` files, which are never committed.
- [ ] Database changes keep existing data valid, and new queries are checked against the query planner when they touch large collections.
- [ ] API changes are reflected in `server/openapi.yaml`.

## Reporting a security problem

Please don't open a public issue for a security vulnerability. Contact the maintainer directly through the GitHub profile, and allow time for a fix before disclosing it.
