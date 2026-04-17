# MIGRATION_NOTES.md

## April 16, 2026 platform-repo alignment

The repository now treats Next.js App Router as the only canonical runtime and `packages/*` as first-class Bun workspaces.

## Removed stale runtime leftovers

- older starter-runtime references in canonical docs and decisions
- legacy file-route paths as documented runtime entrypoints
- vendored package tarballs and `.turbo` artifacts under the old `vendor/packages/*` layout

## Current extension seams

- `AppManifest` remains the phase-1 app-pack contract
- `packages/ui` supports `.` and `./styles.css`
- `packages/storytelling` supports `.`, `./remotion`, and `./three`

## Result

- Runtime code, docs, tests, and CI now target the same Next.js + Bun platform model.
- Shared libraries live as workspaces instead of ad hoc vendored directories.
- Showcase-owned contract tests can live beside the showcase app pack under `apps/showcase/tests`.
