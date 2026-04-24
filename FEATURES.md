# Features

## Core platform features

### Cross-platform clients

- web app
- desktop app
- mobile app

### Shared gameplay foundation

- portable game contracts
- deterministic shared rules engine
- support for multiple game definitions
- reusable card helpers layered separately from the generic engine

### Multiplayer

- player accounts
- online rooms or lobbies
- synchronized match state
- server-side move validation

### Persistence

- player identity
- match history
- result tracking
- optional rankings or progression later

## Suggested release phases

### Phase 1

- shared contracts for game state and moves
- local-only game execution
- one sample simple game

### Phase 2

- account system
- online multiplayer rooms
- backend-persisted match results

### Phase 3

- more advanced game examples across different subgenres
- richer player history and statistics
- stronger reconnect and sync handling

## Quality requirements

- rule execution behaves the same across platforms
- online multiplayer does not trust clients for authoritative outcomes
- new games can plug into the template without rewriting auth or persistence layers
- simultaneous-action rule systems are intentionally out of scope
