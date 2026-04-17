# Card Game Template

This repository is a cross-platform template for building card games that can run on web, desktop, and mobile.

The target is not only simple games like UNO-style variants, but also more complex card games with richer rules, multiplayer state, and persistent player progression.

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

## Initial product shape

The repository should evolve toward:

- a shared game engine package for deterministic card game rules
- platform apps for desktop, web, and mobile
- server-side services for authentication, matchmaking or room management, and match persistence
- reusable contracts for moves, game state, players, and results

## Current status

The repository structure already supports a monorepo with platform-specific apps. The root documentation now defines the intended card-game platform direction that future implementation should follow.
