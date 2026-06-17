# 0001: Registered Game Match Runtime

## Status

Accepted

## Context

The web app persists server-authoritative game matches for multiple games. UNO and Poker already had public routes and typed DTO wrappers, but match orchestration was duplicated across use-case branches. Arcane Duel/TCG needs the same server-authoritative match surface without changing the generic database schema or breaking existing UNO/Poker URLs.

## Decision

Web match orchestration uses a Registered Game Match runtime in `apps/web/src/domain/game-matches`. The runtime registers each supported game by game id, adapter, move parser, participant builder, setup builder, snapshot/replay DTO builders, and bot continuation behavior.

Existing UNO and Poker public routes stay unchanged. Arcane Duel is added through `/api/games/tcg/matches...` routes with preset-only creation and starter decks. Public DTO names remain game-specific wrappers for compatibility and type ergonomics.

## Rejected Alternatives

- Generic `/api/games/[gameId]/...` routes now: rejected to avoid changing public route shape while stabilizing the internal seam.
- Moving runtime into a shared package now: rejected because persistence, identity, feature gates, and route DTOs are web-specific in this slice.
- Leaving TCG registered but not publicly usable: rejected because the runtime needs one full non-UNO/Poker consumer to prove the seam.

## Consequences

New registered match games should add an internal runtime entry first, then expose public wrappers or routes only where needed. The persistence layer remains generic and continues storing game-specific state/moves in typed JSON columns.
