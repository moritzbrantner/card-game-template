# PRODUCT_BRIEF.md

## Product statement

Reusable Next.js 16 App Router platform template for teams that need a production-shaped web platform with localized routing, account lifecycle flows, admin/workspace patterns, uploads, and extensible app packs.

## Audience

- Teams starting a new authenticated web app on Next.js App Router
- Agencies that need a production-ready starter instead of a blank boilerplate
- Internal platform teams standardizing auth, data, UI primitives, and app-pack seams

## Problems solved

- Avoids rebuilding auth, profile, email, admin scaffolding, and operational settings from scratch
- Gives teams a documented domain-first `src/` architecture instead of ad hoc folder growth
- Ships runnable showcase examples without mixing them into the core platform surface
- Separates internal workspace packages from app-pack customization seams

## Value proposition

- Next.js App Router runtime with realistic persistence, testing, and CI expectations
- Clear separation between the root deployable app, internal workspace packages, and app-pack manifests
- Built-in account lifecycle, profile workflows, localized navigation, and API hardening patterns

## Scope guardrails

### In scope

- Next.js App Router shell and route conventions
- Credential auth, registration, email verification, password reset, and account management
- Profile, newsletter, reporting, uploads, workspace/admin starter modules, and showcase examples
- App-pack extension through `AppManifest`

### Out of scope

- Domain-specific business logic beyond the starter modules
- Turnkey production infrastructure provisioning
- Multiple competing runtime architectures in one generated project
