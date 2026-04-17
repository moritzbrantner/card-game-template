# ARCHITECTURE.md — monorepo-nextjs-expo-electron template

This repository is a starter template, not the long-lived source of truth for a fleet of production apps.

## Purpose
- bootstrap new app repositories with a working monorepo shape
- provide baseline Next.js, Expo, and Electron entrypoints
- provide lint, typecheck, test, build, CI, and agent conventions
- demonstrate where shared code belongs without making this repo the shared platform itself

## Workspace boundaries

### `apps/*`
Deployable composition roots.

These workspaces own:
- product-specific routes, screens, and flows
- deployment configuration
- app branding and content
- composition of shared packages
- app-level manifests

These workspaces should not become publishable shared packages by default.

### `packages/*`
Reusable local packages that demonstrate extraction boundaries.

Use this area for:
- UI primitives and design tokens
- lint and TypeScript presets
- cross-app utility or domain modules that are still template-level examples

If a package becomes real shared platform code for multiple repositories, extract it into a dedicated private packages repository and consume it as a versioned dependency.

### `templates/platform-packages/*`
Scaffolding for a separate private packages repository.

This folder exists to make the extraction path explicit:
- publish shared packages from a dedicated repo
- version with Changesets
- distribute through private GitHub Packages
- let independent app repos upgrade on their own schedule

## Decision rules
- Put code in `apps/*` when it belongs to one deployable app or one release cadence.
- Put code in `packages/*` when it is shared inside this starter or demonstrates a boundary worth copying.
- Move code to a separate packages repo when 3+ apps are expected to reuse it and it needs independent versioning.
- Keep this template focused on scaffolding improvements, not live product logic.

## Extraction policy
- `@repo/eslint-config`, `@repo/typescript-config`, and `@repo/ui` are examples of what should become private shared packages in a real app portfolio.
- `@repo/upload-playbook` is demo domain code. Keep or replace it only if it teaches the structure; do not treat it as permanent platform logic by default.
- Avoid cross-package private imports and app-specific assumptions in shared packages.
- Favor explicit public APIs and semver-governed exports for anything intended to leave this repository.

## App manifest contract
Every deployable app should expose an `app.manifest.ts` file.

Required fields:
- `appId`
- `slug`
- `displayName`
- `platform`
- `packageName`
- `entryWorkspace`
- `releaseCadence`
- `sharedPackages`
- `featureFlags`
- `deployment`

The manifest is the contract between app-specific configuration and shared platform code. It should stay small, typed by convention, and safe to read in tests and tooling.
