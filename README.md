# Card Game Template

This repository is a cross-platform template for building card games that can run on web, desktop, and mobile.

The target is not only simple games like UNO-style variants, but also more complex card games with richer rules, multiplayer state, and persistent player progression.

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

## Automation notes

- release promotion still follows `develop -> nightly -> beta -> staging`
- `GH_PROMOTION_TOKEN` is required to directly push snapshot branch updates and trigger downstream workflows
- subtree synchronization still uses `GH_SUBTREE_SYNC_TOKEN` in the monorepo and `MONOREPO_SUBTREE_DISPATCH_TOKEN` in upstream subtree repositories
- the subtree sync workflow opens or updates a pull request back into `develop`

## Initial product shape

The repository should evolve toward:

- a shared game engine package for deterministic card game rules
- platform apps for desktop, web, and mobile
- server-side services for authentication, matchmaking or room management, and match persistence
- reusable contracts for moves, game state, players, and results

## Current status

The repository structure already supports a monorepo with platform-specific apps. The root documentation now defines the intended card-game platform direction that future implementation should follow.

The first playable sample is now a local-first UNO-style example shared across web, mobile, and desktop through common rules and session packages. Online rooms, authoritative multiplayer, and match persistence remain deferred follow-up work.
