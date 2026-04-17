# Plans

This is the initial roadmap implied by the current product brief.

## Status legend

- `pending`: not started yet
- `in_progress`: currently being executed
- `blocked`: cannot safely continue
- `completed`: implemented and validated

## Plan queue

| ID    | Status  | Topic                       | Scope                                                             | Acceptance Criteria                                                         | Notes                                               |
| ----- | ------- | --------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------- |
| P-001 | pending | Shared game contracts       | Define cards, moves, turns, players, rooms, and result models     | Contracts are documented, typed, and reused across apps and server code     | Start here before platform-specific work            |
| P-002 | pending | Portable game engine        | Build deterministic rules engine runnable on client and server    | Engine passes tests in local and server-style execution                     | Keep it free of UI dependencies                     |
| P-003 | pending | Account foundation          | Add account, session, and player profile model                    | A user can authenticate and resolve to one player identity across platforms |                                                     |
| P-004 | pending | Online multiplayer backbone | Add rooms, move submission, synchronization, and server authority | Multiple players can complete a match online with validated moves           | Start with private rooms before broader matchmaking |
| P-005 | pending | Result tracking             | Persist match outcomes and surface player history                 | Completed matches create durable records tied to accounts and games         |                                                     |
| P-006 | pending | Sample games                | Implement at least one simple game and one more complex game      | The template proves it can host different rule complexity levels            | UNO-style game is a good first sample               |

## Execution notes

- update contracts before platform implementations when interfaces change
- validate both local and online execution paths for gameplay changes
- prefer shared packages for domain logic and typed contracts
- the initial UNO-style sample proves shared local execution first; online rooms, persistence, and realtime transport remain a follow-up slice
