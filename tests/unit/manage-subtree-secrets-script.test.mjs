import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const repoRoot = resolve(new URL('../..', import.meta.url).pathname);
const scriptPath = resolve(repoRoot, 'scripts/manage-subtree-secrets.sh');

function createMockGit(tempDir) {
  const gitPath = join(tempDir, 'git');

  writeFileSync(
    gitPath,
    `#!/usr/bin/env bash
set -euo pipefail

case "\${1:-}" in
  rev-parse)
    if [[ "\${2:-}" == "--show-toplevel" ]]; then
      printf '%s\\n' "\${MOCK_REPO_ROOT:?}"
      exit 0
    fi
    ;;
  remote)
    if [[ "\${2:-}" == "get-url" && "\${3:-}" == "origin" ]]; then
      printf '%s\\n' "\${MOCK_ORIGIN_URL:-https://github.com/moritzbrantner/monorepo.git}"
      exit 0
    fi
    ;;
esac

printf 'unexpected git invocation: %s\\n' "$*" >&2
exit 1
`,
  );

  chmodSync(gitPath, 0o755);
  return gitPath;
}

function createMockGh(tempDir) {
  const ghPath = join(tempDir, 'gh');

  writeFileSync(
    ghPath,
    `#!/usr/bin/env bash
set -euo pipefail

printf '%s\\n' "$*" >> "\${MOCK_GH_LOG:?}"

case "\${1:-} \${2:-}" in
  "secret list")
    repo_name=""
    json_mode="0"

    shift 2
    while [[ $# -gt 0 ]]; do
      case "\${1:-}" in
        --repo)
          repo_name="\${2:-}"
          shift 2
          ;;
        --json)
          json_mode="1"
          shift 2
          ;;
        --jq)
          shift 2
          ;;
        *)
          shift
          ;;
      esac
    done

    case "\${repo_name}" in
      moritzbrantner/monorepo)
        secret_names="\${MOCK_SECRETS_MONOREPO-GH_SUBTREE_SYNC_TOKEN}"
        ;;
      moritzbrantner/next-template)
        secret_names="\${MOCK_SECRETS_NEXT_TEMPLATE-MONOREPO_SUBTREE_DISPATCH_TOKEN}"
        ;;
      moritzbrantner/expo-template)
        secret_names="\${MOCK_SECRETS_EXPO_TEMPLATE-MONOREPO_SUBTREE_DISPATCH_TOKEN}"
        ;;
      moritzbrantner/electron-template)
        secret_names="\${MOCK_SECRETS_ELECTRON_TEMPLATE-MONOREPO_SUBTREE_DISPATCH_TOKEN}"
        ;;
      *)
        secret_names="\${MOCK_SECRETS_DEFAULT-}"
        ;;
    esac

    if [[ "\${json_mode}" == "1" ]]; then
      while IFS= read -r secret_name; do
        [[ -n "\${secret_name}" ]] || continue
        printf '%s\\n' "\${secret_name}"
      done <<< "\${secret_names}"
      exit 0
    fi

    while IFS= read -r secret_name; do
      [[ -n "\${secret_name}" ]] || continue
      printf '%s\\tupdated\\n' "\${secret_name}"
    done <<< "\${secret_names}"
    exit 0
    ;;
  "secret set")
    cat > "\${MOCK_GH_SECRET_STDIN_DIR:?}/\${3}.txt"
    exit 0
    ;;
  "secret delete")
    exit 0
    ;;
esac

printf 'unexpected gh invocation: %s\\n' "$*" >&2
exit 1
`,
  );

  chmodSync(ghPath, 0o755);
  return ghPath;
}

test('manage-subtree-secrets lists configured subtree secrets across monorepo and upstream repos', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'manage-subtree-secrets-list-'));
  const ghLogPath = join(tempDir, 'gh.log');
  const stdinDir = join(tempDir, 'stdin');
  const configPath = join(tempDir, 'subtrees.config.sh');
  const gitPath = createMockGit(tempDir);
  const ghPath = createMockGh(tempDir);
  mkdirSync(stdinDir);

  writeFileSync(
    configPath,
    [
      'APP_SUBTREES=(',
      '  "apps/web|app-web|https://github.com/moritzbrantner/next-template.git|main"',
      '  "apps/mobile|app-mobile|https://github.com/moritzbrantner/expo-template.git|main"',
      ')',
      'PACKAGE_SUBTREES=()',
      '',
    ].join('\n'),
  );

  try {
    const output = execFileSync('bash', [scriptPath, 'list', '--config', configPath], {
      cwd: repoRoot,
      env: {
        ...process.env,
        GIT_BIN: gitPath,
        GH_BIN: ghPath,
        MOCK_REPO_ROOT: repoRoot,
        MOCK_GH_LOG: ghLogPath,
        MOCK_GH_SECRET_STDIN_DIR: stdinDir,
        MOCK_SECRETS_MONOREPO: 'GH_SUBTREE_SYNC_TOKEN',
        MOCK_SECRETS_NEXT_TEMPLATE: 'MONOREPO_SUBTREE_DISPATCH_TOKEN',
        MOCK_SECRETS_EXPO_TEMPLATE: 'MONOREPO_SUBTREE_DISPATCH_TOKEN',
      },
      encoding: 'utf8',
    });

    const ghLog = readFileSync(ghLogPath, 'utf8');

    assert.match(ghLog, /^secret list --repo moritzbrantner\/monorepo$/m);
    assert.match(ghLog, /^secret list --repo moritzbrantner\/next-template$/m);
    assert.match(ghLog, /^secret list --repo moritzbrantner\/expo-template$/m);
    assert.match(output, /Repository: moritzbrantner\/monorepo/);
    assert.match(output, /GH_SUBTREE_SYNC_TOKEN/);
    assert.match(output, /MONOREPO_SUBTREE_DISPATCH_TOKEN/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('manage-subtree-secrets sets the correct secret values for monorepo and upstream repos', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'manage-subtree-secrets-set-'));
  const ghLogPath = join(tempDir, 'gh.log');
  const stdinDir = join(tempDir, 'stdin');
  const configPath = join(tempDir, 'subtrees.config.sh');
  const gitPath = createMockGit(tempDir);
  const ghPath = createMockGh(tempDir);
  mkdirSync(stdinDir);

  writeFileSync(
    configPath,
    [
      'APP_SUBTREES=(',
      '  "apps/web|app-web|https://github.com/moritzbrantner/next-template.git|main"',
      '  "apps/mobile|app-mobile|https://github.com/moritzbrantner/expo-template.git|main"',
      ')',
      'PACKAGE_SUBTREES=()',
      '',
    ].join('\n'),
  );

  try {
    execFileSync('bash', [scriptPath, 'set', '--config', configPath], {
      cwd: repoRoot,
      env: {
        ...process.env,
        GIT_BIN: gitPath,
        GH_BIN: ghPath,
        MOCK_REPO_ROOT: repoRoot,
        MOCK_GH_LOG: ghLogPath,
        MOCK_GH_SECRET_STDIN_DIR: stdinDir,
        GH_SUBTREE_SYNC_TOKEN_VALUE: 'sync-secret',
        MONOREPO_SUBTREE_DISPATCH_TOKEN_VALUE: 'dispatch-secret',
      },
      encoding: 'utf8',
    });

    const ghLog = readFileSync(ghLogPath, 'utf8');
    const syncStdin = readFileSync(join(stdinDir, 'GH_SUBTREE_SYNC_TOKEN.txt'), 'utf8');
    const dispatchStdin = readFileSync(
      join(stdinDir, 'MONOREPO_SUBTREE_DISPATCH_TOKEN.txt'),
      'utf8',
    );

    assert.match(ghLog, /^secret set GH_SUBTREE_SYNC_TOKEN --repo moritzbrantner\/monorepo$/m);
    assert.match(
      ghLog,
      /^secret set MONOREPO_SUBTREE_DISPATCH_TOKEN --repo moritzbrantner\/next-template$/m,
    );
    assert.match(
      ghLog,
      /^secret set MONOREPO_SUBTREE_DISPATCH_TOKEN --repo moritzbrantner\/expo-template$/m,
    );
    assert.equal(syncStdin, 'sync-secret');
    assert.equal(dispatchStdin, 'dispatch-secret');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('manage-subtree-secrets rejects set when the required token values are missing', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'manage-subtree-secrets-missing-'));
  const ghLogPath = join(tempDir, 'gh.log');
  const stdinDir = join(tempDir, 'stdin');
  const configPath = join(tempDir, 'subtrees.config.sh');
  const gitPath = createMockGit(tempDir);
  const ghPath = createMockGh(tempDir);
  mkdirSync(stdinDir);

  writeFileSync(
    configPath,
    [
      'APP_SUBTREES=(',
      '  "apps/web|app-web|https://github.com/moritzbrantner/next-template.git|main"',
      ')',
      'PACKAGE_SUBTREES=()',
      '',
    ].join('\n'),
  );

  try {
    const result = spawnSync('bash', [scriptPath, 'set', '--scope', 'upstreams', '--config', configPath], {
      cwd: repoRoot,
      env: {
        ...process.env,
        GIT_BIN: gitPath,
        GH_BIN: ghPath,
        MOCK_REPO_ROOT: repoRoot,
        MOCK_GH_LOG: ghLogPath,
        MOCK_GH_SECRET_STDIN_DIR: stdinDir,
      },
      encoding: 'utf8',
    });

    assert.equal(result.status, 1);
    assert.match(
      result.stderr,
      /set requires env var MONOREPO_SUBTREE_DISPATCH_TOKEN_VALUE for MONOREPO_SUBTREE_DISPATCH_TOKEN/,
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('manage-subtree-secrets deletes secrets for the requested scope', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'manage-subtree-secrets-delete-'));
  const ghLogPath = join(tempDir, 'gh.log');
  const stdinDir = join(tempDir, 'stdin');
  const configPath = join(tempDir, 'subtrees.config.sh');
  const gitPath = createMockGit(tempDir);
  const ghPath = createMockGh(tempDir);
  mkdirSync(stdinDir);

  writeFileSync(
    configPath,
    [
      'APP_SUBTREES=(',
      '  "apps/desktop|app-desktop|https://github.com/moritzbrantner/electron-template.git|main"',
      ')',
      'PACKAGE_SUBTREES=()',
      '',
    ].join('\n'),
  );

  try {
    execFileSync('bash', [scriptPath, 'delete', '--scope', 'upstreams', '--config', configPath], {
      cwd: repoRoot,
      env: {
        ...process.env,
        GIT_BIN: gitPath,
        GH_BIN: ghPath,
        MOCK_REPO_ROOT: repoRoot,
        MOCK_GH_LOG: ghLogPath,
        MOCK_GH_SECRET_STDIN_DIR: stdinDir,
      },
      encoding: 'utf8',
    });

    const ghLog = readFileSync(ghLogPath, 'utf8');

    assert.match(ghLog, /^secret list --repo moritzbrantner\/electron-template --json name --jq \.\[\]\.name$/m);
    assert.doesNotMatch(ghLog, /^secret delete GH_SUBTREE_SYNC_TOKEN/m);
    assert.match(
      ghLog,
      /^secret delete MONOREPO_SUBTREE_DISPATCH_TOKEN --repo moritzbrantner\/electron-template$/m,
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('manage-subtree-secrets delete is idempotent when a secret is already absent', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'manage-subtree-secrets-delete-absent-'));
  const ghLogPath = join(tempDir, 'gh.log');
  const stdinDir = join(tempDir, 'stdin');
  const configPath = join(tempDir, 'subtrees.config.sh');
  const gitPath = createMockGit(tempDir);
  const ghPath = createMockGh(tempDir);
  mkdirSync(stdinDir);

  writeFileSync(
    configPath,
    [
      'APP_SUBTREES=(',
      '  "apps/web|app-web|https://github.com/moritzbrantner/next-template.git|main"',
      ')',
      'PACKAGE_SUBTREES=()',
      '',
    ].join('\n'),
  );

  try {
    const output = execFileSync('bash', [scriptPath, 'delete', '--scope', 'upstreams', '--config', configPath], {
      cwd: repoRoot,
      env: {
        ...process.env,
        GIT_BIN: gitPath,
        GH_BIN: ghPath,
        MOCK_REPO_ROOT: repoRoot,
        MOCK_GH_LOG: ghLogPath,
        MOCK_GH_SECRET_STDIN_DIR: stdinDir,
        MOCK_SECRETS_NEXT_TEMPLATE: '',
      },
      encoding: 'utf8',
    });

    const ghLog = readFileSync(ghLogPath, 'utf8');

    assert.match(output, /MONOREPO_SUBTREE_DISPATCH_TOKEN is already absent in moritzbrantner\/next-template/);
    assert.match(ghLog, /^secret list --repo moritzbrantner\/next-template --json name --jq \.\[\]\.name$/m);
    assert.doesNotMatch(ghLog, /^secret delete MONOREPO_SUBTREE_DISPATCH_TOKEN --repo moritzbrantner\/next-template$/m);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
