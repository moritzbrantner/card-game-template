# PLANS.md

## Current objective

Ship a consistent TanStack Start application where the documentation, route structure, and CI all agree on one canonical architecture.

## Completed milestone: repository alignment

- Consolidated the app back to the repository root
- Restored README and CI behavior to target the app directly
- Updated template docs to match the TanStack Start stack
- Removed deprecated namespace roots and demo-only adapters
- Isolated sample experiences under `/examples/*`
- Applied shared API hardening to sensitive HTTP routes

## Next milestone: application ergonomics

- Tighten local contributor setup docs
- Add optional preview deployment guidance
- Keep example routes and route-tree generation aligned with tests

## Risks

- Route tree drift if file-route changes are made without running build/typecheck
- E2E drift if example route paths change without test updates
- Older docs may still reference legacy Next.js naming
