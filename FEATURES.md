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
- one sample simple card game

### Phase 2

- account system
- online multiplayer rooms
- backend-persisted match results

### Phase 3

- more advanced game example
- richer player history and statistics
- stronger reconnect and sync handling

## Quality requirements

- rule execution behaves the same across platforms
- online multiplayer does not trust clients for authoritative outcomes
- new games can plug into the template without rewriting auth or persistence layers
