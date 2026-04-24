import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

function writeExecutable(filePath: string, contents: string) {
  writeFileSync(filePath, contents);
  chmodSync(filePath, 0o755);
}

describe('dev-with-test-db.sh', () => {
  it('starts the dev Postgres database through the app docker compose file', () => {
    const testFileDir = path.dirname(fileURLToPath(import.meta.url));
    const appRoot = path.resolve(testFileDir, '../..');
    const scriptPath = path.join(appRoot, 'scripts/dev-with-test-db.sh');
    const composeFilePath = path.join(appRoot, 'docker-compose.yml');
    const testDir = mkdtempSync(path.join(tmpdir(), 'dev-with-test-db-'));
    const binDir = path.join(testDir, 'bin');
    const dockerLogPath = path.join(testDir, 'docker.log');
    const bunLogPath = path.join(testDir, 'bun.log');

    try {
      mkdirSync(binDir, { recursive: true });

      writeExecutable(
        path.join(binDir, 'docker'),
        `#!/usr/bin/env bash
set -euo pipefail

printf '%s\\n' "$*" >> "$FAKE_DOCKER_LOG"

case "\${1:-}" in
  info)
    exit 0
    ;;
  exec)
    if [[ "\${2:-}" == "$EXPECTED_CONTAINER_NAME" && "\${3:-}" == "pg_isready" ]]; then
      exit 0
    fi
    echo "unexpected docker exec invocation: $*" >&2
    exit 1
    ;;
  compose)
    ;;
  *)
    echo "unexpected docker invocation: $*" >&2
    exit 1
    ;;
esac

if [[ -n "\${COMPOSE_FILE:-}" && "$COMPOSE_FILE" != "$EXPECTED_COMPOSE_FILE" ]]; then
  echo "inherited COMPOSE_FILE leaked into docker compose: $COMPOSE_FILE" >&2
  exit 1
fi

shift
has_expected_file=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -f)
      shift
      if [[ "\${1:-}" == "$EXPECTED_COMPOSE_FILE" ]]; then
        has_expected_file=1
      fi
      shift
      ;;
    --project-directory)
      shift 2
      ;;
    *)
      subcommand="$1"
      shift
      break
      ;;
  esac
done

if [[ "$subcommand" != "version" && "$has_expected_file" -ne 1 ]]; then
  echo "compose file pin missing for $subcommand" >&2
  exit 1
fi

case "$subcommand" in
  version|up|rm)
    exit 0
    ;;
esac

echo "unexpected docker compose invocation: $*" >&2
exit 1
`,
      );

      writeExecutable(
        path.join(binDir, 'bun'),
        `#!/usr/bin/env bash
set -euo pipefail

printf '%s\\n' "$*" >> "$FAKE_BUN_LOG"

if [[ "\${1:-}" == "--eval" ]]; then
  exit 0
fi

if [[ "\${1:-}" == "run" ]]; then
  case "\${2:-}" in
    db:migrate|db:schema:generate|db:seed:test-users|dev:app)
      exit 0
      ;;
  esac
fi

echo "unexpected bun invocation: $*" >&2
exit 1
`,
      );

      const result = spawnSync('bash', [scriptPath], {
        cwd: appRoot,
        encoding: 'utf8',
        env: {
          ...process.env,
          COMPOSE_FILE: '/tmp/incorrect-compose.yml',
          EXPECTED_COMPOSE_FILE: composeFilePath,
          EXPECTED_CONTAINER_NAME: 'web-dev-postgres',
          FAKE_DOCKER_LOG: dockerLogPath,
          FAKE_BUN_LOG: bunLogPath,
          PATH: `${binDir}:${process.env.PATH ?? ''}`,
          DEV_DB_CONTAINER_NAME: 'web-dev-postgres',
          DEV_DB_HOST_CONTAINER_NAME: 'web-dev-postgres-host',
        },
      });

      expect(result.status).toBe(0);

      const dockerLog = readFileSync(dockerLogPath, 'utf8');
      const bunLog = readFileSync(bunLogPath, 'utf8');

      expect(dockerLog).toContain(
        `compose -f ${composeFilePath} --project-directory ${appRoot} up -d postgres-dev`,
      );
      expect(dockerLog).toContain(
        `compose -f ${composeFilePath} --project-directory ${appRoot} rm -sf postgres-dev postgres-dev-host`,
      );
      expect(dockerLog).toContain('exec web-dev-postgres pg_isready');
      expect(bunLog).toContain('run db:migrate');
      expect(bunLog).toContain('run db:schema:generate');
      expect(bunLog).toContain('run db:seed:test-users');
      expect(bunLog).toContain('run dev:app');
    } finally {
      rmSync(testDir, { force: true, recursive: true });
    }
  });
});
