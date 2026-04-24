# Architecture

This repository is intended to become a reusable platform for deterministic turn-based games across web, desktop, and mobile.

It remains a starter template, so the architecture still needs to preserve the thin-template boundary and the extraction path for long-lived shared packages.

## Primary architectural goal

Keep game rules independent from delivery surface so the same game can run:

- entirely on-device for local or offline play
- on a backend service for online multiplayer and validation

## Workspace boundaries

The repository still uses `apps/*`, `packages/*`, and `templates/platform-packages/*` as its top-level layout, but the default workspace graph is intentionally narrower than the directory tree.

## Workspace classes

### Active apps

`apps/web`, `apps/mobile`, and `apps/desktop` are the active apps. They participate in default root commands and CI, and each one is expected to expose `lint`, `check-types`, `test:unit`, `test:integration`, and `test:e2e`.

### Reference apps

`apps/web.backup` remains on disk as a reference app. It is intentionally excluded from the default root workspace graph so it can evolve or be consulted without affecting the primary validation path.

### App-private modules

`apps/web/packages/*` and `apps/desktop/packages/*` are app-private modules. They should be treated as internal implementation modules owned by their parent app rather than reusable publishable packages.

### `apps/web`

Browser client for account-based play, onboarding, lobbies, match history, and gameplay.

### `apps/mobile`

Mobile client with the same core gameplay features, adapted for touch interactions and mobile authentication/session handling.

### `apps/desktop`

Desktop client for larger-screen play, local sessions, and multiplayer access with the same shared domain logic.

#### `apps/web/packages/*`

Internal web-only modules such as app-pack seams and presentation helpers. They are validated like code, but they are not part of the template's publishable package surface.

#### `apps/desktop/packages/*`

Internal Electron platform modules for commands, persistence, documents, preferences, and window state. They are validated through the desktop app rather than promoted into the top-level shared package graph.

### `packages/*`

Shared packages should carry the reusable platform logic. The intended package split is:

- `game-contracts`: shared types for cards, moves, turns, players, rooms, and results
- `game-engine`: deterministic serial turn engine that can run locally or on the server
- `card-kit`: card-specific identities, visibility helpers, stack helpers, and deck utilities layered on top of the generic engine
- `game-catalog`: registration of supported games and their metadata
- `multiplayer`: room and synchronization abstractions used by clients and server adapters
- `auth`: account/session contracts and shared client helpers
- `ui`: cross-platform presentation primitives where reuse is worth it

### `templates/platform-packages/*`

This scaffold remains the extraction path for packages that outgrow this repository and need to move into a dedicated private packages repository.

## Runtime model

### Local mode

- the client hosts the game engine
- moves are validated in-process
- results can be stored locally first and synced later when appropriate

### Online mode

- the server is authoritative for room state and accepted moves
- clients submit intents or moves through a typed transport layer
- the same shared engine validates and applies those moves on the server
- clients render the resulting state and maintain optimistic UI only where safe

## Core invariants

- game rules must be deterministic for the same starting state and move sequence
- shared rule evaluation must not depend on UI framework or platform APIs
- the core engine only accepts one authoritative action at a time from one selected actor at a time
- simultaneous-action engines are out of scope for this platform
- account identity must be stable across platforms
- match results must be attributable to players and games in a normalized way
- adding a new game should mostly mean implementing a new rules package plus metadata, not reworking the platform

## Data flow

1. A player authenticates and enters a local session or online room.
2. A game definition is loaded from the shared game catalog.
3. The shared engine creates the initial match state.
4. Players submit moves through the local runtime or server API.
5. The engine validates and applies the move.
6. State updates are broadcast to connected clients when online.
7. Final results are persisted to player history when the match ends.

## Recommended implementation order

1. define shared contracts
2. implement the portable game engine
3. add a server-authoritative multiplayer path
4. connect account and result persistence
5. add sample games from simple to complex

## App manifest contract

Every deployable app should expose an `app.manifest.ts` file.
