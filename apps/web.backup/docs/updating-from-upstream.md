# Updating From Upstream

This repo is structured for subtree-based downstream repos.

## Expected workflow

1. Keep downstream-only changes in `app.config.ts` and `apps/<app>/**`.
2. Pull upstream foundation changes into your downstream repo with your normal subtree merge flow.
3. Resolve conflicts in foundation-owned paths first.
4. Re-run `bun run typecheck` and the relevant test suites after the merge.

## Why this layout helps

- Foundation route files stay thin and stable.
- Public pages and app navigation live behind `AppManifest`.
- Feature enablement is explicit in code and can be diffed during merges.
- Public content and message catalogs stay app-local instead of leaking into root template paths.

## Recommended downstream checks

- Confirm `app.config.ts` still points at the intended app pack.
- Review `apps/<app>/manifest.ts` for new feature keys or contract changes.
- Reconcile any new foundation feature modules with your app manifest.
- Run `bun run typecheck`.
- Run the unit and integration tests that cover manifest routing and feature gates.
