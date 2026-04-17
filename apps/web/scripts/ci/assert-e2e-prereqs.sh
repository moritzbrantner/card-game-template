#!/usr/bin/env bash
set -euo pipefail

missing=()

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    missing+=("$name")
  fi
}

require_env "DATABASE_URL"
require_env "AUTH_SECRET"

if [[ -z "${AUTH_URL:-}" && -z "${NEXTAUTH_URL:-}" ]]; then
  missing+=("AUTH_URL or NEXTAUTH_URL")
fi

if [[ "${EMAIL_PROVIDER:-console}" == "resend" ]]; then
  require_env "RESEND_API_KEY"
  require_env "EMAIL_FROM"
fi

if [[ "${EMAIL_PROVIDER:-console}" == "mailpit" ]]; then
  require_env "MAILPIT_BASE_URL"
fi

if (( ${#missing[@]} > 0 )); then
  printf '❌ Missing required e2e environment values:\n' >&2
  for name in "${missing[@]}"; do
    printf '  - %s\n' "$name" >&2
  done
  exit 1
fi

if (( ${#AUTH_SECRET} < 32 )); then
  echo "❌ AUTH_SECRET must be at least 32 characters for the session store." >&2
  exit 1
fi

bun --eval '
  (async () => {
    const { Client } = require("pg");

    const connectionString = process.env.DATABASE_URL;
    const client = new Client({ connectionString });

    try {
      await client.connect();
      await client.query("SELECT 1");
    } catch (error) {
      console.error("❌ Unable to reach Postgres using DATABASE_URL.");
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    } finally {
      await client.end().catch(() => undefined);
    }
  })();
'

echo "✅ E2E prerequisites verified."
