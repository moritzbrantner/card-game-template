# ARCHITECTURE.md

## Canonical runtime

This repository ships a Next.js 16 App Router application at the repo root. `app/` is the only canonical runtime entrypoint for pages and route handlers.

## Canonical structure

```text
app/                     Next.js App Router pages, layouts, route handlers
apps/showcase/           App-pack manifest, content, messages, examples, tests
components/              Shared app-facing React components
docs/                    Platform repo contributor documentation
emails/                  React Email source
i18n/                    Routing and navigation adapters
messages/                Foundation localization dictionaries
packages/
  app-pack/              Public app-pack contracts and route helpers
  app-pack-react/        Public React helpers exposed to app packs
  storytelling/          Internal storytelling workspace package
  ui/                    Internal UI workspace package
src/
  admin/                 Admin page composition helpers
  analytics/             Analytics use-cases and adapters
  api/                   Cross-route security and API helpers
  app-config/            App-pack contracts and manifest loading
  auth/                  Auth and account lifecycle services
  content/               MDX/content indexing
  db/                    Database schema and client
  domain/                Business use-cases
  dynamic-db/            Admin data-studio helpers
  email/                 Outbound email delivery/templates
  foundation/            Shared platform features exposed to app packs
  navigation/            App navigation metadata
  observability/         Logging and health helpers
  site-config/           Site settings, flags, announcements, analytics config
```

## Runtime boundaries

- Route handlers and pages live in `app/**`.
- App-pack extension data lives behind `AppManifest` in `apps/**`.
- Domain rules live in `src/domain/**`.
- Database access lives in `src/db/**`.
- Cross-cutting HTTP protections live in `src/api/**`.
- Workspace package public APIs are `@moritzbrantner/app-pack`, `@moritzbrantner/app-pack-react`, `@moritzbrantner/ui`, `@moritzbrantner/ui/styles.css`, `@moritzbrantner/storytelling`, `@moritzbrantner/storytelling/remotion`, and `@moritzbrantner/storytelling/three`.

## Import rules

- Use canonical aliases only: `@/src/*`, `@/components/*`, `@/lib/*`, `@/i18n/*`, `@/messages/*`, `@/emails/*`, `@/tests/*`.
- Do not introduce `features/`, `stores/`, or `lib/services/` namespaces.
- `src/domain/**` must not import app or component layer modules directly.
- `src/db/**` stays infrastructure-only.
- Foundation-owned code must not import `apps/**` directly except through the manifest loader seam.

## Platform direction

- Keep the deployable Next.js app at the repo root for now.
- Treat `AppManifest` as the public app-pack extension seam in phase 1.
- Promote shared code into real workspace packages before considering an `apps/web` relocation.
