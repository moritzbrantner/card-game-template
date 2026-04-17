#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-3006}"
BUN_BINARY="${BUN_BINARY:-bun}"

"$BUN_BINARY" run build
exec "$BUN_BINARY" ./scripts/serve-prod.mjs --port "$PORT" --host 127.0.0.1
