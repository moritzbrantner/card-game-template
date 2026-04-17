# DECISIONS.md

## DEC-0001: TanStack Start is the canonical application runtime
- **Date:** 2026-04-06
- **Status:** accepted

### Context

The repository previously mixed a TanStack Start app with stale Next.js/App Router documentation and template metadata.

### Decision

Standardize the generated application on TanStack Start, TanStack Router, Vite, and Drizzle. Documentation, routes, and template metadata must all reflect that runtime.

### Consequences

- Positive:
  - One runtime model for docs, tests, and generated output
  - No ambiguity around route structure or build tooling
- Trade-offs:
  - Older Next.js-oriented references are intentionally removed

## DEC-0002: `src/` is the only canonical application namespace
- **Date:** 2026-04-06
- **Status:** accepted

### Context

Deprecated `features/`, `stores/`, and `lib/services/` paths remained in the repository after the migration to a domain-first layout.

### Decision

Keep `src/` as the sole canonical application namespace. Deprecated roots are removed instead of maintained in parallel.

### Consequences

- Positive:
  - Fewer parallel abstractions and cleaner import rules
  - New contributors only learn one structure
- Trade-offs:
  - Historical migration shims are no longer available

## DEC-0003: Example features live under explicit example routes
- **Date:** 2026-04-06
- **Status:** accepted

### Context

Sample pages for forms, storytelling, communication, uploads, and mock REST data were exposed as first-class product routes.

### Decision

Move non-canonical sample features under localized `/examples/*` routes and `/api/examples/*` endpoints. The main product surface stays focused on core platform capabilities.

### Consequences

- Positive:
  - Example code stays useful without confusing product intent
  - Navigation can distinguish core routes from demonstrations
- Trade-offs:
  - Route paths changed and required test updates
