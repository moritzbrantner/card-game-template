#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
APP_NAME="$(basename "$APP_ROOT" | tr -cs '[:alnum:]' '-' | sed 's/^-*//; s/-*$//')"

export DEV_DB_PORT="${DEV_DB_PORT:-55434}"
export DEV_DB_NAME="${DEV_DB_NAME:-next_template}"
export DEV_DB_USER="${DEV_DB_USER:-postgres}"
export DEV_DB_PASSWORD="${DEV_DB_PASSWORD:-postgres}"
export DEV_DB_CONTAINER_NAME="${DEV_DB_CONTAINER_NAME:-${APP_NAME}-dev-postgres}"
export DEV_DB_NETWORK_MODE="${DEV_DB_NETWORK_MODE:-auto}"
export DEV_DATABASE_URL="${DEV_DATABASE_URL:-postgresql://${DEV_DB_USER}:${DEV_DB_PASSWORD}@127.0.0.1:${DEV_DB_PORT}/${DEV_DB_NAME}?schema=public}"
export DATABASE_URL="$DEV_DATABASE_URL"
export DB_BOOTSTRAP_TIMEOUT_SECONDS="${DB_BOOTSTRAP_TIMEOUT_SECONDS:-90}"
DEV_DB_SERVER_PORT="5432"
DEV_APP_PID=""

docker_available() {
  command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1
}

container_exists() {
  docker container inspect "$DEV_DB_CONTAINER_NAME" >/dev/null 2>&1
}

stop_database() {
  if container_exists; then
    echo "Stopping ephemeral dev database..."
    docker rm -f "$DEV_DB_CONTAINER_NAME" >/dev/null 2>&1 || true
  fi
}

cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM

  if [[ -n "$DEV_APP_PID" ]] && kill -0 "$DEV_APP_PID" >/dev/null 2>&1; then
    kill "$DEV_APP_PID" >/dev/null 2>&1 || true
    wait "$DEV_APP_PID" >/dev/null 2>&1 || true
  fi

  stop_database

  exit "$exit_code"
}

can_reach_database() {
  (
    cd "$APP_ROOT"
    bun --eval '
      (async () => {
        const { Client } = require("pg");
        const client = new Client({ connectionString: process.env.DATABASE_URL });

        try {
          await client.connect();
          await client.query("SELECT 1");
          process.exit(0);
        } catch {
          process.exit(1);
        } finally {
          await client.end().catch(() => undefined);
        }
      })();
    ' >/dev/null 2>&1
  )
}

wait_for_database() {
  local timeout_seconds="${1:-$DB_BOOTSTRAP_TIMEOUT_SECONDS}"
  local start_time
  start_time="$(date +%s)"

  while (( $(date +%s) - start_time < timeout_seconds )); do
    if can_reach_database; then
      return 0
    fi

    sleep 1
  done

  echo "Timed out waiting for Postgres after ${timeout_seconds}s." >&2
  return 1
}

wait_for_container_database() {
  local timeout_seconds="${1:-$DB_BOOTSTRAP_TIMEOUT_SECONDS}"
  local start_time
  start_time="$(date +%s)"

  while (( $(date +%s) - start_time < timeout_seconds )); do
    if docker exec "$DEV_DB_CONTAINER_NAME" pg_isready -U "$DEV_DB_USER" -d "$DEV_DB_NAME" -p "$DEV_DB_SERVER_PORT" >/dev/null 2>&1; then
      return 0
    fi

    sleep 1
  done

  echo "Timed out waiting for Postgres in container ${DEV_DB_CONTAINER_NAME} after ${timeout_seconds}s." >&2
  return 1
}

host_network_supported() {
  [[ "$(uname -s)" == "Linux" ]]
}

start_database_with_published_port() {
  DEV_DB_SERVER_PORT="5432"
  echo "Starting ephemeral dev database on port ${DEV_DB_PORT} using Docker port publishing..."
  docker run \
    --detach \
    --rm \
    --name "$DEV_DB_CONTAINER_NAME" \
    --tmpfs /var/lib/postgresql/data:rw \
    --publish "${DEV_DB_PORT}:5432" \
    --env "POSTGRES_DB=${DEV_DB_NAME}" \
    --env "POSTGRES_USER=${DEV_DB_USER}" \
    --env "POSTGRES_PASSWORD=${DEV_DB_PASSWORD}" \
    postgres:16-alpine >/dev/null
}

start_database_with_host_network() {
  DEV_DB_SERVER_PORT="$DEV_DB_PORT"
  echo "Starting ephemeral dev database on port ${DEV_DB_PORT} using host networking..."
  docker run \
    --detach \
    --rm \
    --name "$DEV_DB_CONTAINER_NAME" \
    --network host \
    --tmpfs /var/lib/postgresql/data:rw \
    --env "POSTGRES_DB=${DEV_DB_NAME}" \
    --env "POSTGRES_USER=${DEV_DB_USER}" \
    --env "POSTGRES_PASSWORD=${DEV_DB_PASSWORD}" \
    postgres:16-alpine \
    postgres -c "port=${DEV_DB_PORT}" >/dev/null
}

start_database() {
  local requested_mode="$DEV_DB_NETWORK_MODE"

  case "$requested_mode" in
    auto|published|host)
      ;;
    *)
      echo "Unsupported DEV_DB_NETWORK_MODE: ${requested_mode}. Use auto, published, or host." >&2
      exit 1
      ;;
  esac

  if [[ "$requested_mode" == "host" ]]; then
    if ! host_network_supported; then
      echo "DEV_DB_NETWORK_MODE=host requires Linux host networking support." >&2
      exit 1
    fi

    start_database_with_host_network
    wait_for_container_database
    wait_for_database
    return 0
  fi

  start_database_with_published_port
  wait_for_container_database

  if wait_for_database 5; then
    return 0
  fi

  if [[ "$requested_mode" == "published" ]]; then
    echo "Postgres started, but ${DATABASE_URL} was not reachable from the host." >&2
    exit 1
  fi

  if ! host_network_supported; then
    echo "Postgres started, but ${DATABASE_URL} was not reachable from the host." >&2
    echo "Docker port publishing appears to be unavailable, and host networking fallback is only supported on Linux." >&2
    exit 1
  fi

  echo "Published Docker port was not reachable; retrying with host networking..."
  stop_database
  start_database_with_host_network
  wait_for_container_database
  wait_for_database
}

if ! docker_available; then
  echo "Docker is required for bun dev because it now starts an ephemeral Postgres database." >&2
  exit 1
fi

trap cleanup EXIT INT TERM

stop_database

echo "Waiting for dev database readiness..."
start_database

echo "Applying migrations to ephemeral dev database..."
(
  cd "$APP_ROOT"
  bun run db:migrate
)

echo "Generating db-schema.json for local admin tooling..."
(
  cd "$APP_ROOT"
  bun run db:schema:generate
)

echo "Seeding baseline users into ephemeral dev database..."
(
  cd "$APP_ROOT"
  bun run db:seed:test-users
)

echo "Launching app against the ephemeral database on port ${DEV_DB_PORT}..."
(
  cd "$APP_ROOT"
  bun run dev:app -- "$@"
) &
DEV_APP_PID=$!
wait "$DEV_APP_PID"
