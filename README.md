# Turn-Based Game Template

This repository is a cross-platform template for building deterministic turn-based games that can run on web, desktop, and mobile.

The target includes simple card and board games as well as more complex turn-based games with richer rules, multiplayer state, and persistent player progression.

It is still a starter template repository, so the original template bootstrap and promotion automation flows remain part of the contract for generated repositories.

## Create a repository from this template

Use the helper script:

```bash
python3 scripts/create_from_template.py my-app --with-main
```

If you already created and cloned the repository and it only has `main`, run:

```bash
bash scripts/setup-promotion-branches.sh --with-main
```

Important details:

- this intentionally avoids `--include-all-branches`
- generated repositories do not inherit secrets, branch protection, rulesets, or local Git remote definitions
- run `bun run setup:subtree-remotes` after cloning a generated repository if you want the subtree remotes configured locally

## Product intent

- support one codebase with web, desktop, and mobile clients
- allow solo play, local-first play, and online multiplayer
- give every player an account
- track match results and player history
- keep game logic portable so it can run locally on a client or authoritatively on a server

## Documentation map

- `PRODUCT_BRIEF.md`: product scope and success criteria
- `FEATURES.md`: capability breakdown and release priorities
- `ARCHITECTURE.md`: intended system boundaries and runtime model
- `INFRASTRUCTURE.md`: required backend services and environments
- `OPERATIONS.md`: deployment and incident handling expectations
- `DECISIONS.md`: initial architectural decisions
- `PLANS.md`: ordered implementation roadmap

## Core principles

- shared game rules should not depend on a single platform
- multiplayer should reuse the same domain model as local play
- accounts and match history are first-class features, not add-ons
- the template should make it easy to add new games without rewriting the platform

## Workspace classes

- `active apps`: `apps/web`, `apps/mobile`, and `apps/desktop` are part of the default workspace graph and must satisfy the standard `lint`, `check-types`, `test:unit`, `test:integration`, and `test:e2e` contract
- `reference apps`: `apps/web.backup` stays in the repository as a preserved reference workspace, but it is excluded from default root commands and CI unless explicitly invoked through `backup:*` scripts
- `app-private modules`: `apps/web/packages/*` and `apps/desktop/packages/*` stay tied to their owning apps; they are internal modules rather than publishable template packages

## Automation notes

- release promotion still follows `develop -> nightly -> beta -> staging`
- `GH_PROMOTION_TOKEN` is required to directly push snapshot branch updates and trigger downstream workflows
- subtree synchronization still uses `GH_SUBTREE_SYNC_TOKEN` in the monorepo and `MONOREPO_SUBTREE_DISPATCH_TOKEN` in upstream subtree repositories
- the subtree sync workflow opens or updates a pull request back into `develop`

## Initial product shape

The repository should evolve toward:

- a shared game engine package for deterministic turn-based rules
- platform apps for desktop, web, and mobile
- server-side services for authentication, matchmaking or room management, and match persistence
- reusable contracts for moves, game state, players, and results

## Current status

The repository structure supports a monorepo with platform-specific apps and shared packages for reusable turn-based game logic.

Implemented foundation:

- shared contracts for players, games, moves, match state, replay logs, and persisted match summaries
- deterministic game engine helpers plus local and server-authoritative session runtimes for one accepted action at a time
- local UNO-style, Texas Hold'em, Arcane Duel, and Tic-Tac-Toe samples shared through the reusable game packages
- web UNO-style server-authoritative matches with guest/account ownership, persisted move logs, replay inspection, and match history

Next platform work should focus on generic multi-game persistence, private online rooms, realtime fan-out, and bringing the persisted server-authoritative path to poker and TCG.
