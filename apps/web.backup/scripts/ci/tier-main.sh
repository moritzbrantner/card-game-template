#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  if [[ "${CI:-false}" == "true" ]]; then
    ./scripts/ci/bootstrap-e2e-db.sh --teardown
  fi
}

trap cleanup EXIT

./scripts/ci/tier-beta.sh
bun run db:check
bun run build
./scripts/ci/assert-e2e-prereqs.sh
./scripts/ci/bootstrap-e2e-db.sh
bun run test:e2e
