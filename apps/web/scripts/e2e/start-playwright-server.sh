#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-3006}"

resolve_node_binary() {
  local first_candidate=""
  local candidate=""

  while IFS= read -r candidate; do
    [[ -z "$candidate" ]] && continue

    if [[ -z "$first_candidate" ]]; then
      first_candidate="$candidate"
    fi

    if [[ "$candidate" == /tmp/bun-node-*"/node" ]]; then
      continue
    fi

    printf '%s\n' "$candidate"
    return 0
  done < <(which -a node 2>/dev/null || true)

  if [[ -n "$first_candidate" ]]; then
    printf '%s\n' "$first_candidate"
    return 0
  fi

  return 1
}

NODE_BINARY="$(resolve_node_binary || command -v node)"
NODE_DIR="$(dirname "$NODE_BINARY")"
export PATH="${NODE_DIR}:${PATH}"
BUN_BINARY="${BUN_BINARY:-${NODE_DIR}/bun}"

if [[ ! -x "$BUN_BINARY" ]]; then
  BUN_BINARY="bun"
fi

"$BUN_BINARY" run build
exec node ./scripts/serve-prod.mjs --port "$PORT" --host 127.0.0.1
