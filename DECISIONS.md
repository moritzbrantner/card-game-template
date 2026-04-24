# Decisions

## 2026-04-17

### The repository serves as a turn-based game platform template

- Decision: Position the monorepo as a reusable template for deterministic turn-based games rather than a generic app starter.
- Rationale: The product goal is specific: cross-platform turn-based games with reusable logic, replayability, and multiplayer support.
- Consequence: Root documentation and package boundaries should optimize for a generic turn engine, with card-specific helpers layered on top.

### The game engine must run both locally and on the server

- Decision: Shared game rules should be implemented in a portable package with no platform-specific dependencies.
- Rationale: The same game must support local play and server-authoritative multiplayer without duplicated rule logic.
- Consequence: UI layers can render state, but rule execution and move validation belong in shared domain code.

### Accounts and result tracking are first-class capabilities

- Decision: Player identity and match history are part of the platform baseline.
- Rationale: Multiplayer, progression, and cross-device continuity depend on stable accounts and persisted results.
- Consequence: Backend planning must include authentication, player records, and match result storage from the start.

### Cross-platform parity matters more than platform-specific divergence

- Decision: Web, desktop, and mobile should share the same domain contracts and gameplay behavior.
- Rationale: A template is most useful when a game can be shipped broadly with minimal rule drift between platforms.
- Consequence: Platform-specific code should stay at the shell and UX layers, not in the game model.
