# AGENT_WORKFLOW.md — monorepo-nextjs-expo-electron template

Use this file to define exactly how autonomous coding agents should operate in this repository.

## Default execution contract
1. Read `AGENTS.md`, this file, and `PLANS.md` before making changes.
2. Choose the first `pending` plan item and mark it `in_progress`.
3. Implement only that item's scope.
4. Add or update automated tests for all new behavior.
5. Run relevant checks in this order: targeted tests, full impacted suite, lint/type/build.
6. Mark the item `completed` only after checks pass and docs are updated.

## Stop conditions (serious blockers)
- Destructive action required.
- Missing mandatory requirement.
- Conflicting instructions.
- Environment/tooling failure that cannot be worked around.
- Repeated failure (3+ meaningful attempts on the same step).

## Expected progress update format
- `Plan:` ordered steps with statuses.
- `Now:` current step.
- `Checks:` commands + pass/fail.
- `Next:` immediate next action.

## Definition of done per plan item
- Acceptance criteria in `PLANS.md` are satisfied.
- Tests for new/changed behavior exist and pass.
- Relevant lint/type/build checks pass.
- Any architectural/operational changes are reflected in docs.
