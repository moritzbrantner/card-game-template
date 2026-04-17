#!/usr/bin/env bash
set -euo pipefail

first_candidate=""

while IFS= read -r candidate; do
  [[ -z "$candidate" ]] && continue

  if [[ -z "$first_candidate" ]]; then
    first_candidate="$candidate"
  fi

  if [[ "$candidate" == /tmp/bun-node-*"/node" ]]; then
    continue
  fi

  exec "$candidate" "$@"
done < <(which -a node 2>/dev/null || true)

if [[ -n "$first_candidate" ]]; then
  exec "$first_candidate" "$@"
fi

echo "Unable to find a Node.js binary on PATH." >&2
exit 1
