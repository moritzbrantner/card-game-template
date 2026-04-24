# Internal Workspace Packages

The `apps/web/packages/*` workspaces are internal modules for the web app. They are not published independently and should be consumed through the monorepo workspace graph.

## Local verification

```bash
bun run packages:lint
bun run packages:check-types
bun run packages:test:unit
```

## Maintenance expectations

- Keep these workspaces `private`.
- Prefer source-first workspace imports over built `dist/` artifacts.
- Preserve the existing import-hygiene checks for package boundaries.
- Do not commit generated `dist/`, `.turbo`, Playwright, or other test artifacts.
