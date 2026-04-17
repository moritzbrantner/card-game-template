# Private Platform Packages Scaffold

Copy this folder into a dedicated private repository when you are ready to publish shared packages for multiple app repositories.

## What this scaffold includes
- Bun workspace root
- Turbo pipeline
- Changesets configuration
- private GitHub Packages npm publishing workflow
- starter package manifests for UI and config packages
- consumer `.npmrc` example

## First setup
1. Create a new private repository, for example `platform-packages`.
2. Copy this folder's contents to the new repository root.
3. Replace every `YOUR_GITHUB_USERNAME` placeholder.
4. Install dependencies with `bun install`.
5. Add real package code under `packages/*`.
6. Commit a changeset for each released change.
7. Publish from GitHub Actions after merging to `main`.
