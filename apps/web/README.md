# next-template

Next.js 16 App Router platform template with localized routing, credential auth, account lifecycle flows, MDX + Postgres content foundations, internal workspace packages, and app-pack seams built around `AppManifest`.

## Stack

- Next.js 16 App Router + React 19
- Bun workspaces
- Drizzle ORM + PostgreSQL
- Vitest + Playwright
- Tailwind CSS 4
- MDX with repo-managed content roots and DB-backed operational content

## Repository layout

- `app/`: canonical Next.js App Router entrypoints, pages, and route handlers
- `apps/showcase/`: showcase app-pack manifest, content, messages, example pages, and contract tests
- `packages/ui/`: shared UI workspace package
- `packages/storytelling/`: storytelling workspace package
- `src/`: domain, infrastructure, and foundation code used by the root app runtime
- `docs/`: platform repo guidance for package and app-pack contributors

## Local setup

1. Copy the environment files:

```bash
cp .env.example .env
cp .env.e2e.example .env.e2e
```

2. Set at least:

- `AUTH_SECRET`
- `SITE_URL` or `AUTH_URL`
- `DATABASE_URL` for long-lived database flows
- `INTERNAL_CRON_SECRET` if you want the internal cron jobs endpoint

3. Install dependencies and start development:

```bash
bun install
bun run dev
```

`bun run dev` starts an ephemeral Postgres database, applies migrations, seeds baseline users, regenerates `db-schema.json`, and launches the app.

## Long-lived local services

```bash
docker compose up -d postgres mailpit minio minio-create-bucket
bun run db:migrate
bun run db:schema:generate
bun run db:seed:test-users
bun run dev:app
```

Run the outbox worker in another shell if you want queued email and announcement jobs processed locally:

```bash
bun run jobs:work
```

## Checks

```bash
bun run checks:nightly
bun run checks:beta
bun run checks:main
```

- `checks:nightly`: app lint/typecheck/unit tests plus workspace package lint/typecheck/tests
- `checks:beta`: nightly checks plus integration tests
- `checks:main`: beta checks plus database check, production build, and e2e setup/tests

Workspace package commands are also available directly:

```bash
bun run packages:lint
bun run packages:typecheck
bun run packages:test
bun run packages:build
```

## GitHub Pages build with Unlighthouse

```bash
bun run build:gh-pages
```

The GitHub Pages workflow uses Bun end to end. It builds the static export, runs Unlighthouse against the exported site, then re-exports so `/en/unlighthouse` and `/de/unlighthouse` are present in the final artifact.

## Seeded users

- `superadmin@example.com` / `superadmin`
- `admin@example.com` / `admin`
- `manager@example.com` / `manager`
- `user@example.com` / `user`
- `alice@example.com` / `alice`
- `bob@example.com` / `bob`
- `casey@example.com` / `casey`
- `dana@example.com` / `dana`
- `private@example.com` / `private`
- `delete-account@example.com` / `DeleteAccount123`

## Further docs

- [ARCHITECTURE.md](/home/moenarch/moritzbrantner/next-template/ARCHITECTURE.md)
- [docs/platform-layout.md](/home/moenarch/moritzbrantner/next-template/docs/platform-layout.md)
- [docs/adding-an-app-pack.md](/home/moenarch/moritzbrantner/next-template/docs/adding-an-app-pack.md)
- [docs/releasing-packages.md](/home/moenarch/moritzbrantner/next-template/docs/releasing-packages.md)
