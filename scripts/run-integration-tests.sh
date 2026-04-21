#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_APP_DIR="${ROOT_DIR}/apps/web"

cleanup() {
  local exit_code=$?
  trap - EXIT

  (
    cd "$WEB_APP_DIR"
    ./scripts/ci/bootstrap-e2e-db.sh --teardown
  )

  exit "$exit_code"
}

trap cleanup EXIT

(
  cd "$WEB_APP_DIR"
  ./scripts/ci/bootstrap-e2e-db.sh
)

turbo run test:integration
