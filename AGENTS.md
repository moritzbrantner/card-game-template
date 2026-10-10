# Monorepo (Next.js + Expo + Electron) AGENTS Template

Use this file as the default operating policy for this template folder.

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

## Definition of Done

A task is done only if all are true:

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

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
