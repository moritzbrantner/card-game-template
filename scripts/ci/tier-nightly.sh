#!/usr/bin/env bash
set -euo pipefail

bun run lint
bun run typecheck
bun run packages:lint
bun run packages:typecheck
bun run packages:test
bun run test:unit
