# Infrastructure

This document describes the backend and environment needs implied by the current product direction.

## Environments

- `local`: developer machine running one or more client apps plus optional local backend services
- `test`: automated validation for shared logic, API contracts, and multiplayer flows
- `staging`: pre-production environment for account, matchmaking, and persistence checks
- `production`: live environment for authenticated players and tracked results

## Required services

| Component            | Purpose                                           | Notes                                                |
| -------------------- | ------------------------------------------------- | ---------------------------------------------------- |
| Client apps          | Web, desktop, and mobile gameplay surfaces        | Share domain contracts and engine integration        |
| Auth service         | Player accounts, login, session lifecycle         | Must support the same identity across platforms      |
| API service          | Game catalog, player profile, match endpoints     | Owns persistence-facing application logic            |
| Realtime service     | Room presence, move delivery, state fan-out       | Required for online multiplayer                      |
| Database             | Accounts, profiles, rooms, match records, results | Should support transactional match completion writes |
| Optional cache/queue | Presence, rate limiting, async processing         | Useful once multiplayer concurrency grows            |

## Data that must persist

- player accounts
- player profiles
- match records
- per-player results
- game metadata
- optional rankings, streaks, or progression summaries

## Environment configuration

Expected secret and config categories:

- auth provider credentials
- database connection string
- realtime provider credentials or server keys
- session signing secret
- storage keys if avatars or media are added later

## Operational constraints

- local development should work with the shared engine without requiring the full online stack
- online mode should tolerate reconnects and transient client disconnects
- result persistence should happen on the backend in multiplayer mode
- the platform should support adding new games without new infrastructure primitives

## Suggested deployment shape

- web app deployed independently
- backend API and realtime services deployed together or behind a shared gateway
- desktop and mobile clients consuming the same backend contracts

## Safety constraints

- never trust client-reported wins in online multiplayer without server validation
- avoid coupling persistent match records to a single client platform
- keep auth and result schemas stable across game additions
