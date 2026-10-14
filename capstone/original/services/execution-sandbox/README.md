# Execution Sandbox (internal service)

Implements spec §4's `POST /internal/execute` contract. Called by the main API
(`server/`) via `EXECUTION_SERVICE_URL` — never exposed publicly.

## ⚠️ Local-dev implementation vs. the spec's isolation requirements

Spec §4 requires real container isolation: one container per execution, destroyed
after, no network access, CPU/memory/time limits enforced at the container level.
That's genuine infrastructure work (the spec's own open decision, §4/§10, recommends
**Fargate tasks-per-request** to start).

This local implementation satisfies the **API contract** — same request/response
shape, real interpreters, real pass/fail results — using plain child processes with
a fresh temp directory per run (deleted immediately after) and a wall-clock timeout,
so the rest of the system (problem validation, practice submissions) can be built
and tested against it end-to-end right now. It does **not** provide:
- Process-level memory/CPU caps (not portably available outside a container)
- Network denial (a spawned process can still reach the network)
- True crash/exploit containment (it's a subprocess, not a jailed container)

Before a real deployment, swap this service's runners for actual Fargate
task-per-request execution (or equivalent), keeping the same `/internal/execute`
contract so nothing above it has to change.

## Requirements on the host running this service

- `python` or `python3` on PATH, for `language: "python"`
- `node` (used via `process.execPath`), for `language: "javascript"`
- `g++` or `clang++` on PATH, for `language: "cpp"` (two-step compile-then-run)

If a required interpreter/compiler isn't found, the response's `compileError` (C++)
or `stderr` explains what's missing rather than crashing the service.
