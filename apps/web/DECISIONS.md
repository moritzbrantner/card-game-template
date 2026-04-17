# DECISIONS.md

## DEC-0001: Next.js App Router is the canonical application runtime
- **Date:** 2026-04-16
- **Status:** accepted

### Context

The repository runtime is already Next.js App Router, but major docs and decisions still described an older starter runtime. That mismatch made the platform shape harder to reason about than the code itself.

### Decision

Standardize the repository on Next.js 16 App Router, Bun, and Drizzle. Documentation, CI, and contributor guidance must all reflect that runtime.

### Consequences

- Positive:
  - One runtime model for docs, tests, and generated output
  - No ambiguity around route structure, build tooling, or deployment behavior
- Trade-offs:
  - Stale TanStack-era references are intentionally removed

## DEC-0002: `src/` is the canonical application namespace and `AppManifest` is the app-pack seam
- **Date:** 2026-04-16
- **Status:** accepted

### Context

The repository already exposes app-pack behavior through `AppManifest`, while older docs still implied alternate route trees and parallel namespace roots.

### Decision

Keep `src/` as the sole canonical application namespace for the root app and keep `AppManifest` as the phase-1 extension seam for app packs.

### Consequences

- Positive:
  - New contributors only learn one runtime architecture and one extension seam
  - Foundation code and app-pack code have a clearer contract boundary
- Trade-offs:
  - The manifest shape stays conservative in phase 1 instead of being redesigned immediately

## DEC-0003: Shared libraries are first-class Bun workspaces
- **Date:** 2026-04-16
- **Status:** accepted

### Context

`ui` and `storytelling` were stored as vendored packages with build artifacts and partial package-manager wiring, but the repository did not behave like a real workspace.

### Decision

Promote shared libraries into `packages/*` Bun workspaces and treat their package entrypoints as the only supported public APIs.

### Consequences

- Positive:
  - Clear package boundaries for CI, publishing, and import verification
  - Less ambiguity between app code and shared package code
- Trade-offs:
  - Package checks are now an explicit part of the repository verification surface
