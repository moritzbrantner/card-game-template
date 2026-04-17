#!/usr/bin/env bash
set -euo pipefail

./scripts/ci/tier-nightly.sh
bun run test:integration
