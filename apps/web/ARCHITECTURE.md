# ARCHITECTURE.md

## Canonical structure

This app uses a TanStack Start runtime with a domain-first application layout under `src/`.

```text
app/                     Static assets only
components/              Shared UI components
emails/                  React Email source
i18n/                    Routing and navigation adapters
messages/                Localized copy dictionaries
src/
  admin/                 Admin page composition helpers
  analytics/             Analytics use-cases and adapters
  api/                   Cross-route security and API helpers
  auth/                  Auth and account lifecycle services
  db/                    Database schema and client
  domain/                Business use-cases
  dynamic-db/            Admin data-studio helpers
  email/                 Outbound email delivery/templates
  navigation/            App navigation metadata
  profile/               Profile-specific infrastructure helpers
  routes/                TanStack file routes
  settings/              Client settings persistence/provider
  testing/               Test fixtures
```

## Runtime boundaries

- Route handlers and pages live in `src/routes/**`.
- Domain rules live in `src/domain/**`.
- Database access lives in `src/db/**`.
- Cross-cutting HTTP protections live in `src/api/**`.
- Shared UI lives in `components/**`.

## Import rules

- Use canonical aliases only: `@/src/*`, `@/components/*`, `@/lib/*`, `@/i18n/*`, `@/messages/*`, `@/emails/*`, `@/tests/*`.
- Do not introduce `features/`, `stores/`, or `lib/services/` namespaces.
- `src/domain/**` must not import UI code.
- `src/db/**` stays infrastructure-only.

## Example route policy

Optional example experiences are intentionally isolated under localized `/examples/*` routes and `/api/examples/*` endpoints. They exist to demonstrate extension patterns, not to define the canonical product surface.

## API policy

- Public and authenticated mutation routes use shared rate limiting and audit logging.
- Admin routes require explicit role checks plus audit records.
- Route-specific validation stays close to the handler; persistence and business logic stay in use-cases.
