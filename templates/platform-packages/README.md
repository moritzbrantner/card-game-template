# Platform Packages Scaffold

Copy this folder into a dedicated public repository when you are ready to share packages across multiple app repositories.

## What this scaffold includes

- Bun workspace root
- Turbo pipeline
- Changesets configuration
- optional npm publishing workflow (producer side only; consumers never depend on it)
- starter package manifests for UI and config packages
- consumers pin packages as git source dependencies on a commit SHA; see `PLATFORM_PACKAGES.md`

Git pins resolve the repository root and bun cannot install a git subdirectory, so a package kept under `packages/*` of this multi-package layout is not directly consumable; give each consumable package its own repository root.

## First setup

1. Create a new public repository, for example `platform-packages`. Consumers install it without credentials, so it must be public.
2. Copy this folder's contents to the new repository root.
3. Replace every `YOUR_GITHUB_USERNAME` placeholder.
4. Install dependencies with `bun install`.
5. Add real package code under `packages/*`.
6. Commit a changeset for each released change.
7. Publish from GitHub Actions after merging to `main`.
