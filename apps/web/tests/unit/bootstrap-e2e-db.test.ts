import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

function writeExecutable(filePath: string, contents: string) {
  writeFileSync(filePath, contents);
  chmodSync(filePath, 0o755);
}

describe('bootstrap-e2e-db.sh', () => {
  it('pins docker compose to the app compose file even when COMPOSE_FILE is inherited', () => {
    const testFileDir = path.dirname(fileURLToPath(import.meta.url));
    const appRoot = path.resolve(testFileDir, '../..');
    const scriptPath = path.join(appRoot, 'scripts/ci/bootstrap-e2e-db.sh');
    const composeFilePath = path.join(appRoot, 'docker-compose.yml');
    const testDir = mkdtempSync(path.join(tmpdir(), 'bootstrap-e2e-db-'));
    const binDir = path.join(testDir, 'bin');
    const dockerLogPath = path.join(testDir, 'docker.log');
    const nodeStatePath = path.join(testDir, 'node-state');
    const bunLogPath = path.join(testDir, 'bun.log');

    try {
      mkdirSync(binDir, { recursive: true });

      writeExecutable(
        path.join(binDir, 'docker'),
        `#!/usr/bin/env bash
set -euo pipefail

printf '%s\\n' "$*" >> "$FAKE_DOCKER_LOG"

if [[ "$1" == "info" ]]; then
  exit 0
fi

if [[ "$1" != "compose" ]]; then
  echo "unexpected docker invocation: $*" >&2
  exit 1
fi

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

case "$subcommand" in
  version)
    exit 0
    ;;
  config)
    if [[ "\${1:-}" == "--services" ]]; then
      if [[ "$has_expected_file" -eq 1 ]]; then
        printf 'postgres\\nmailpit\\nminio\\n'
      else
        printf 'postgres\\n'
      fi
      exit 0
    fi
    ;;
  up)
    if [[ "$has_expected_file" -ne 1 ]]; then
      echo "compose file pin missing for up" >&2
      exit 1
    fi
    exit 0
    ;;
  run)
    if [[ "$has_expected_file" -ne 1 ]]; then
      echo "compose file pin missing for run" >&2
      exit 1
    fi
    exit 0
    ;;
  stop|rm)
    exit 0
    ;;
esac

echo "unexpected docker compose invocation: $*" >&2
exit 1
`,
      );

      writeExecutable(
        path.join(binDir, 'node'),
        `#!/usr/bin/env bash
set -euo pipefail

count=0
if [[ -f "$FAKE_NODE_STATE" ]]; then
  count="$(cat "$FAKE_NODE_STATE")"
fi
count=$((count + 1))
printf '%s' "$count" > "$FAKE_NODE_STATE"

case "$count" in
  1|2)
    exit 1
    ;;
  3)
    echo "Postgres is ready."
    exit 0
    ;;
  4)
    echo "Mailpit is ready."
    exit 0
    ;;
  *)
    exit 0
    ;;
esac
`,
      );

      writeExecutable(
        path.join(binDir, 'bun'),
        `#!/usr/bin/env bash
set -euo pipefail

printf '%s\\n' "$*" >> "$FAKE_BUN_LOG"
exit 0
`,
      );

      const result = spawnSync('bash', [scriptPath], {
        cwd: appRoot,
        encoding: 'utf8',
        env: {
          ...process.env,
          COMPOSE_FILE: '/tmp/incorrect-compose.yml',
          EXPECTED_COMPOSE_FILE: composeFilePath,
          FAKE_DOCKER_LOG: dockerLogPath,
          FAKE_NODE_STATE: nodeStatePath,
          FAKE_BUN_LOG: bunLogPath,
          PATH: `${binDir}:${process.env.PATH ?? ''}`,
          TMPDIR: testDir,
        },
      });

      expect(result.status).toBe(0);

      const dockerLog = readFileSync(dockerLogPath, 'utf8');
      const bunLog = readFileSync(bunLogPath, 'utf8');

      expect(dockerLog).toContain(
        `compose -f ${composeFilePath} --project-directory ${appRoot} config --services`,
      );
      expect(dockerLog).toContain(
        `compose -f ${composeFilePath} --project-directory ${appRoot} up -d postgres mailpit minio`,
      );
      expect(dockerLog).toContain(
        `compose -f ${composeFilePath} --project-directory ${appRoot} run --rm -T minio-create-bucket`,
      );
      expect(bunLog).toContain('run db:migrate');
      expect(bunLog).toContain('run db:seed:test-users');
    } finally {
      rmSync(testDir, { force: true, recursive: true });
    }
  });
});
