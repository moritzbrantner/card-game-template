# Plans

This is the initial roadmap implied by the current product brief.

## Status legend

- `pending`: not started yet
- `in_progress`: currently being executed
- `blocked`: cannot safely continue
- `completed`: implemented and validated

## Plan queue

| ID    | Status      | Topic                       | Scope                                                             | Acceptance Criteria                                                         | Notes                                                                 |
| ----- | ----------- | --------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| P-001 | completed   | Shared game contracts       | Define cards, moves, turns, players, rooms, and result models     | Contracts are documented, typed, and reused across apps and server code     | `game-contracts`, `auth-contract`, and `multiplayer-contract` exist   |
| P-002 | completed   | Portable game engine        | Build deterministic rules engine runnable on client and server    | Engine passes tests in local and server-style execution                     | `game-engine`, `game-session`, replay metadata, and integrity checks  |
| P-003 | completed   | Account foundation          | Add account, session, and player profile model                    | A user can authenticate and resolve to one player identity across platforms | Web account/guest ownership and cross-platform client auth adapters exist |
| P-004 | completed   | Online multiplayer backbone | Add rooms, move submission, synchronization, and server authority | Multiple players can complete a match online with validated moves           | Server-authoritative sessions, private rooms, polling realtime, and cross-platform clients exist |
| P-005 | completed   | Result tracking             | Persist match outcomes and surface player history                 | Completed matches create durable records tied to accounts and games         | Web persistence, move logs, replay inspection, account stats, and history exist |
| P-006 | completed   | Sample games                | Implement at least one simple game and one more complex game      | The template proves it can host different rule complexity levels            | UNO-style, Texas Hold'em, and Arcane Duel samples exist               |

## Current implementation snapshot

- `packages/game-contracts`: shared player, game, move, match state, replay, result, and persisted-match types
- `packages/game-engine`: deterministic engine wrapper, move validation/canonicalization, seeded RNG, and card stack helpers
- `packages/game-session`: local sessions, server-authoritative sessions, replay reconstruction, and replay integrity checks
- `packages/game-uno`, `packages/game-poker`, `packages/game-tcg`: sample game adapters with local sessions, bots, and unit/fixture coverage
- `packages/game-catalog`: shared catalog registration for all sample games
- `packages/multiplayer-contract`: shared room contracts, realtime event models, and typed online match/room API client
- `apps/web`: persisted server-authoritative UNO-style and poker matches with guest/account ownership, private rooms, polling updates, move logs, replay analysis, profile stats, and match history
- `apps/mobile` and `apps/desktop`: local-first UNO-style, poker, and TCG demos backed by shared game packages, plus typed adapters for online match and room APIs

## Recommended next queue

| ID    | Status    | Topic                           | Scope                                                                      | Acceptance Criteria                                                                 |
| ----- | --------- | ------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| N-001 | completed | Generic persisted match service | Remove UNO-only persistence assumptions from the web match repository      | Web persistence can store and resume any registered game adapter by `gameId`         |
| N-002 | completed | Poker persisted web path        | Add server-authoritative Texas Hold'em create/resume/submit/replay support | Poker can be played on web through the same persisted match service as UNO           |
| N-003 | completed | Private room backbone           | Add room lifecycle, seats, ready state, and host controls                  | Two human players can join a private room before a match starts                      |
| N-004 | completed | Realtime fan-out                | Add polling/SSE/WebSocket delivery for accepted moves and room updates     | Connected clients receive accepted authoritative state without manual refresh        |
| N-005 | completed | Cross-platform online client    | Share match API/client contracts with mobile and desktop                   | Mobile and desktop can authenticate and submit online moves through typed adapters   |
| N-006 | completed | Player history and stats        | Aggregate match history and replay-derived stats by player and game        | Account profiles show recent matches, win/loss summaries, and replay links          |

## Execution notes

- update contracts before platform implementations when interfaces change
- validate both local and server-authoritative execution paths for gameplay changes
- prefer shared packages for domain logic and typed contracts
- genericize persistence before adding more game-specific web match services
- start online rooms with private rooms before broader matchmaking
