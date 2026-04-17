# PRODUCT_BRIEF.md

## Product statement

Reusable TanStack Start application template for teams that need a production-shaped web platform with localized routing, account lifecycle flows, admin/workspace patterns, uploads, and example feature slices.

## Audience

- Teams starting a new authenticated web app on TanStack Start
- Agencies that need a production-ready starter instead of a blank boilerplate
- Internal platform teams standardizing auth, data, and UI patterns

## Problems solved

- Avoids rebuilding auth, profile, email, and admin scaffolding from scratch
- Gives teams a documented domain-first `src/` architecture instead of ad hoc folder growth
- Ships runnable examples for forms, storytelling, communication, and uploads without mixing them into the core app surface

## Value proposition

- TanStack Start runtime with realistic persistence, testing, and CI expectations
- Clear separation between canonical app modules and optional example slices
- Built-in account lifecycle, profile workflows, localized navigation, and API hardening patterns

## Scope guardrails

### In scope

- TanStack Start app shell and route conventions
- Credential auth, registration, email verification, password reset, and account management
- Profile, newsletter, reporting, uploads, and workspace/admin starter modules
- Explicit example routes under `/examples/*`

### Out of scope

- Domain-specific business logic beyond the starter modules
- Turnkey production infrastructure provisioning
- Multiple parallel app architectures in one generated project

## Success metrics

- New project reaches first feature implementation in under 30 minutes
- Generated app passes nightly/beta/main check tiers without authoring-repo patching
- Security-sensitive endpoints share rate limiting and audit logging by default
- Teams extend `src/` without reintroducing deprecated namespace roots
