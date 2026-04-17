# CI/CD Migration

This repository now uses direct branch promotion instead of promotion pull requests.

## What Changed

- Removed `peter-evans/create-pull-request` based promotion jobs.
- Removed all `auto-promote/*` branch creation and auto-merge behavior.
- Replaced the branch-specific promotion logic with one reusable workflow at [`.github/workflows/snapshot-stage.yml`](/home/moenarch/moritzbrantner/monorepo/.github/workflows/snapshot-stage.yml).
- Kept the existing branch order, but promotion now updates the target snapshot branch ref directly to the exact commit that just passed.

## New Branch Flow

The branch chain is now:

`develop` -> `nightly` -> `beta` -> `staging`

Each stage works like this:

1. A push lands on the current branch.
2. That branch runs its stage-specific test suite.
3. If the suite passes, GitHub Actions moves the next snapshot branch to the exact tested commit SHA.
4. The push on the promoted branch triggers the next workflow in the chain.

The stage suites are:

- `develop`: lint, type checks, build, and unit tests
- `nightly`: integration tests
- `beta`: integration tests plus desktop and web end-to-end tests
- `staging`: benchmark gate

## Snapshot Branch Assumptions

`nightly`, `beta`, and `staging` are now treated as snapshot branches only.

That means:

- no direct commits on those branches
- no feature branches merged into those branches
- no release PRs used to advance those branches

The promotion workflow verifies that the target snapshot branch tip is already contained in the tested commit history before it updates the branch. If the branch has drifted with an independent commit, promotion fails instead of overwriting it silently.

## Tokens And Branch Protection

The promotion jobs use `GH_PROMOTION_TOKEN`.

They do not fall back to `github.token`, because GitHub does not start a new `push` workflow run for pushes created with the default `GITHUB_TOKEN`. This direct-promotion chain needs a token that can both push the branch update and trigger the next branch workflow.

For this to work reliably, branch protection for `nightly`, `beta`, and `staging` must allow the selected token to push directly to those branches. A common setup is:

- require status checks before merge on `develop`
- prevent manual pushes to `nightly`, `beta`, and `staging`
- allow the promotion token or GitHub App behind that token to update `nightly`, `beta`, and `staging`

If snapshot branches are protected from all direct updates, the promotion job will fail when it tries to move the branch ref.

## Workflow Files

- [`.github/workflows/develop.yml`](/home/moenarch/moritzbrantner/monorepo/.github/workflows/develop.yml) now triggers the reusable workflow for `develop -> nightly`.
- [`.github/workflows/nightly.yml`](/home/moenarch/moritzbrantner/monorepo/.github/workflows/nightly.yml) now triggers the reusable workflow for `nightly -> beta`.
- [`.github/workflows/beta.yml`](/home/moenarch/moritzbrantner/monorepo/.github/workflows/beta.yml) now triggers the reusable workflow for `beta -> staging`.
- [`.github/workflows/staging.yml`](/home/moenarch/moritzbrantner/monorepo/.github/workflows/staging.yml) now triggers the reusable workflow for `staging` only.
- [`.github/workflows/snapshot-stage.yml`](/home/moenarch/moritzbrantner/monorepo/.github/workflows/snapshot-stage.yml) contains the shared stage test logic and direct promotion step.
