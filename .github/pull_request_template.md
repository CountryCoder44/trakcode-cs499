## What this changes

<!-- One or two sentences. Link the issue: "Closes #123". -->

## Why

<!-- The problem this solves, and for whom (learners, instructors, the team). -->

## How I tested it

<!-- New or updated tests, and anything you checked by hand. -->

## Risk and rollout

<!-- What could go wrong? Does it touch learner data, cost, or security? Anything to watch after merging? -->

## Review checklist

- [ ] Focused on one problem; unrelated changes are in their own pull request
- [ ] Tests cover the new behavior or reproduce the fixed bug
- [ ] Typecheck and tests pass locally and in CI
- [ ] Failures are handled safely (typed errors, safety checks fail closed, no secrets or learner data in logs)
- [ ] No credentials or personal data committed
- [ ] `server/openapi.yaml` updated if the API changed
