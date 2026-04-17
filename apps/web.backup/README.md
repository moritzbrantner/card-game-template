# next-template

Next.js App Router template with localized routing, credential auth, account lifecycle flows, MDX + Postgres content foundations, admin/workspace examples, Drizzle/Postgres persistence, and tiered checks.

## Stack

- TanStack Start + TanStack Router
- Next.js App Router + React 19
- Drizzle ORM + PostgreSQL
- Vitest + Playwright
- Tailwind CSS 4
- MDX with repo-managed content roots and DB-backed operational content

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

3. Start local development:

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

This starts:

- Postgres on `127.0.0.1:55433`
- Mailpit on `http://127.0.0.1:8025`
- MinIO S3 API on `http://127.0.0.1:9000`
- MinIO console on `http://127.0.0.1:9001`

The default `.env.example` values now point profile-image uploads at the local MinIO bucket created by `minio-create-bucket`. The same MinIO instance can also hold other uploaded assets in additional buckets if you need them.

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

- `checks:nightly`: lint, typecheck, unit tests
- `checks:beta`: nightly checks plus integration tests
- `checks:main`: beta checks plus database check, production build, and e2e setup/tests

## GitHub Pages build with Unlighthouse

```bash
bun run build:gh-pages
```

This GitHub Pages build now runs in two passes. It first exports the static site with `NEXT_DEPLOY_TARGET=gh-pages`, serves that export locally, runs `unlighthouse-ci` against the exported files, writes `.generated/unlighthouse/ci-result.json`, and then exports the site again so `/en/unlighthouse` and `/de/unlighthouse` are baked into the final static artifact.

The GitHub Actions Pages workflow uses this build path, so the published Pages site includes a static Unlighthouse summary page. `bun run build:staging` is now an alias to the same flow. The generated report directory is ignored by git.

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

The seed also creates baseline profiles, follow relationships, notification history, and recent page visits so the test database is immediately useful for social and admin workflows.

## Notes

- Product and architecture docs live beside the app root.
- Example/demo experiences are exposed under localized `/examples/*` routes.
- High-risk HTTP endpoints are protected by shared rate limiting and audit logging.
- Repo-managed site content lives under `content/pages`, `content/blog`, and `content/changelog`.
- Operational content such as announcements, settings, flags, analytics retention, and jobs live in Postgres.
