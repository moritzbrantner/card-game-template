# Monorepo (Next.js + Expo + Electron) AGENTS Template

Use this file as the default operating policy for this template folder.

## Primary Trigger
If the user says **"follow the plan step by step"**, switch into **Autonomous Plan Execution Mode**.

## Autonomous Plan Execution Mode
When this mode is active, follow this loop continuously:

1. Build or refresh a concrete plan with clear, ordered steps.
2. Mark exactly one step as `in_progress`.
3. Implement only that step.
4. Run relevant checks/tests.
5. If checks pass, mark the step `completed` and start the next step.
6. If checks fail, fix issues and rerun checks.
7. Continue until all steps are completed.

Do not stop mid-plan unless one of the **Serious Problem Conditions** occurs.

## Serious Problem Conditions (Allowed Stop Reasons)
Stop and ask the user only when at least one of these conditions is true:

1. **Destructive or high-risk action required**: data loss, production-impacting migration, credential/security risk.
2. **Missing critical information**: required business rule or acceptance criteria is unknown and blocks safe progress.
3. **Conflicting requirements**: instructions cannot be satisfied simultaneously.
4. **Environment blocker**: dependency/service/tooling failure that cannot be reasonably worked around.
5. **Repeated failure threshold**: the same step failed 3+ times after meaningful fixes.

When stopping, provide:
- what failed,
- what was attempted,
- minimal options to unblock,
- a recommended next action.

## Test-First Quality Policy
For every new functionality:

1. Add or update automated tests that validate expected behavior and key edge cases.
2. Implement the functionality until tests pass.
3. Run the full relevant test suite to detect regressions.
4. Do not consider the task complete if tests for new behavior are missing.

## Minimum Validation on Each Change
Always run, in this order when available:

1. Fast targeted tests for changed behavior.
2. Repository standard test command (full suite for impacted area).
3. Lint/static checks if configured.

If a check cannot run because of environment limitations, explicitly report:
- command attempted,
- limitation encountered,
- risk assessment,
- next command the user can run locally.

## Reporting Format for Progress Updates
Use concise updates:

- `Plan:` current ordered steps with statuses.
- `Now:` current step being executed.
- `Checks:` commands and pass/fail.
- `Next:` immediate next step.

## Definition of Done
A task is done only if all are true:

- planned steps are completed,
- new functionality has automated tests,
- relevant tests/checks pass,
- changes are documented in the final summary.

## Template-Specific Guidance
## Project Focus
- Keep workspace boundaries explicit (apps vs packages).
- Prefer shared packages for cross-platform business logic and typed contracts.
- Isolate platform-specific adapters in each app.

## Implementation Priorities
1. Identify impacted workspaces and shared packages first.
2. Update contracts/types before platform implementations when interfaces change.
3. Run targeted checks per changed workspace, then monorepo-level checks.
4. Keep dependency graph healthy (no accidental circular dependencies).

## Useful Validation Commands
- `bun run test` (Vitest)
- `bun run lint`
- `bun run typecheck`
- `bun run build`
- `bunx playwright test` (e2e)
