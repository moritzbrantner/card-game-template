# Operations

This file captures the intended operating model for the card-game template once backend capabilities are added.

## Deployment model

- web: deploy as a standard web application connected to the shared backend
- desktop: ship packaged releases that point at environment-specific backend endpoints
- mobile: ship mobile builds that use the same auth and gameplay APIs as web and desktop
- backend: deploy API, auth integration, and realtime services together with versioned contracts

## Release expectations

- shared contracts and engine changes should be validated before platform-specific releases
- gameplay changes should be tested in both local and online execution modes
- schema-affecting backend changes should be rolled out with backward compatibility where possible

## Rollback priorities

1. restore backend compatibility for active matches
2. disable or roll back broken game definitions
3. preserve match integrity and result correctness ahead of non-critical UI fixes

## Operational runbooks to add during implementation

- account login failure handling
- realtime room desynchronization handling
- stuck or abandoned match resolution
- result reconciliation when local state and server state disagree
- game version compatibility during app upgrades

## Monitoring priorities

- authentication success and failure rates
- room join success rate
- move processing latency
- desync or invalid-move rejection rate
- match completion rate
- result write failures
