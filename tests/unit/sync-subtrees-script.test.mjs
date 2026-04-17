import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const repoRoot = resolve(new URL('../..', import.meta.url).pathname);
const scriptPath = resolve(repoRoot, 'scripts/sync-subtrees.sh');
const setupScriptPath = resolve(repoRoot, 'scripts/setup-subtree-remotes.sh');

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
  status)
    printf '%s' "\${MOCK_GIT_STATUS:-}"
    exit 0
    ;;
  remote)
    case "\${2:-}" in
      get-url)
        case "\${3:-}" in
          app-web)
            printf '%s\\n' "\${MOCK_REMOTE_URL_APP_WEB:-https://example.com/app-web.git}"
            exit 0
            ;;
          app-mobile)
            printf '%s\\n' "\${MOCK_REMOTE_URL_APP_MOBILE:-https://example.com/app-mobile.git}"
            exit 0
            ;;
          app-desktop)
            printf '%s\\n' "\${MOCK_REMOTE_URL_APP_DESKTOP:-https://example.com/app-desktop.git}"
            exit 0
            ;;
          package-ui)
            printf '%s\\n' "\${MOCK_REMOTE_URL_PACKAGE_UI:-https://example.com/package-ui.git}"
            exit 0
            ;;
          missing-*)
            exit 2
            ;;
        esac
        ;;
      add|set-url)
        printf '%s\\n' "$*" >> "\${MOCK_GIT_LOG:?}"
        if [[ "\${2:-}" == "add" && "\${3:-}" == "missing-app-web" ]]; then
          printf '%s\\n' "\${4:-}" > "\${MOCK_SET_URL_APP_WEB:?}"
          exit 0
        fi
        if [[ "\${2:-}" == "set-url" && "\${3:-}" == "app-web" ]]; then
          printf '%s\\n' "\${4:-}" > "\${MOCK_SET_URL_APP_WEB:?}"
          exit 0
        fi
        exit 0
        ;;
    esac
    ;;
  fetch)
    printf '%s\\n' "$*" >> "\${MOCK_GIT_LOG:?}"
    exit 0
    ;;
  subtree)
    if [[ "\${2:-}" == "pull" ]]; then
      printf '%s\\n' "$*" >> "\${MOCK_GIT_LOG:?}"
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

test('sync-subtrees pulls selected app and package mappings from config', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'sync-subtrees-'));
  const logPath = join(tempDir, 'git.log');
  const configPath = join(tempDir, 'subtrees.config.sh');
  const gitPath = createMockGit(tempDir);

  writeFileSync(
    configPath,
    [
      'APP_SUBTREES=(',
      '  "apps/web|app-web|https://github.com/moritzbrantner/next-template.git|main"',
      ')',
      'PACKAGE_SUBTREES=(',
      '  "packages/ui|package-ui|https://github.com/moritzbrantner/platform-packages.git|stable"',
      ')',
      '',
    ].join('\n'),
  );

  try {
    execFileSync(scriptPath, ['--config', configPath], {
      cwd: repoRoot,
      env: {
        ...process.env,
        GIT_BIN: gitPath,
        MOCK_GIT_LOG: logPath,
        MOCK_REPO_ROOT: repoRoot,
      },
      encoding: 'utf8',
    });

    const log = readFileSync(logPath, 'utf8');

    assert.match(log, /^fetch app-web main$/m);
    assert.match(log, /^subtree pull --prefix=apps\/web app-web main --squash$/m);
    assert.match(log, /^fetch package-ui stable$/m);
    assert.match(log, /^subtree pull --prefix=packages\/ui package-ui stable --squash$/m);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('sync-subtrees refuses to run on a dirty tree unless explicitly allowed', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'sync-subtrees-dirty-'));
  const configPath = join(tempDir, 'subtrees.config.sh');
  const gitPath = createMockGit(tempDir);

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
    const result = spawnSync(scriptPath, ['--config', configPath], {
      cwd: repoRoot,
      env: {
        ...process.env,
        GIT_BIN: gitPath,
        MOCK_REPO_ROOT: repoRoot,
        MOCK_GIT_STATUS: 'M README.md',
      },
      encoding: 'utf8',
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /tracked changes detected/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('sync-subtrees skips packages cleanly when no package mappings are configured', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'sync-subtrees-empty-packages-'));
  const logPath = join(tempDir, 'git.log');
  const configPath = join(tempDir, 'subtrees.config.sh');
  const gitPath = createMockGit(tempDir);

  writeFileSync(
    configPath,
    [
      'APP_SUBTREES=(',
      '  "apps/mobile|app-mobile|https://github.com/moritzbrantner/expo-template.git|main"',
      ')',
      'PACKAGE_SUBTREES=()',
      '',
    ].join('\n'),
  );

  try {
    const output = execFileSync(scriptPath, ['--config', configPath], {
      cwd: repoRoot,
      env: {
        ...process.env,
        GIT_BIN: gitPath,
        MOCK_GIT_LOG: logPath,
        MOCK_REPO_ROOT: repoRoot,
      },
      encoding: 'utf8',
    });

    const log = readFileSync(logPath, 'utf8');

    assert.match(output, /No package subtree mappings configured/);
    assert.match(log, /^fetch app-mobile main$/m);
    assert.doesNotMatch(log, /^fetch package-/m);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('sync-subtrees filters selected mappings by prefix', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'sync-subtrees-prefix-'));
  const logPath = join(tempDir, 'git.log');
  const configPath = join(tempDir, 'subtrees.config.sh');
  const gitPath = createMockGit(tempDir);

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
    execFileSync(scriptPath, ['--apps', '--prefix', 'apps/mobile', '--config', configPath], {
      cwd: repoRoot,
      env: {
        ...process.env,
        GIT_BIN: gitPath,
        MOCK_GIT_LOG: logPath,
        MOCK_REPO_ROOT: repoRoot,
      },
      encoding: 'utf8',
    });

    const log = readFileSync(logPath, 'utf8');

    assert.match(log, /^fetch app-mobile main$/m);
    assert.match(log, /^subtree pull --prefix=apps\/mobile app-mobile main --squash$/m);
    assert.doesNotMatch(log, /^fetch app-web main$/m);
    assert.doesNotMatch(log, /^subtree pull --prefix=apps\/web app-web main --squash$/m);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('sync-subtrees rejects unknown prefixes', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'sync-subtrees-unknown-prefix-'));
  const configPath = join(tempDir, 'subtrees.config.sh');
  const gitPath = createMockGit(tempDir);

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
    const result = spawnSync(scriptPath, ['--apps', '--prefix', 'apps/mobile', '--config', configPath], {
      cwd: repoRoot,
      env: {
        ...process.env,
        GIT_BIN: gitPath,
        MOCK_REPO_ROOT: repoRoot,
      },
      encoding: 'utf8',
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /requested prefix is not configured: apps\/mobile/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('setup-subtree-remotes adds missing remotes from config', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'setup-subtrees-add-'));
  const logPath = join(tempDir, 'git.log');
  const configPath = join(tempDir, 'subtrees.config.sh');
  const addedUrlPath = join(tempDir, 'app-web.url');
  const gitPath = createMockGit(tempDir);

  writeFileSync(
    configPath,
    [
      'APP_SUBTREES=(',
      '  "apps/web|missing-app-web|https://github.com/moritzbrantner/next-template.git|main"',
      ')',
      'PACKAGE_SUBTREES=()',
      '',
    ].join('\n'),
  );

  try {
    const output = execFileSync(setupScriptPath, ['--config', configPath], {
      cwd: repoRoot,
      env: {
        ...process.env,
        GIT_BIN: gitPath,
        MOCK_GIT_LOG: logPath,
        MOCK_REPO_ROOT: repoRoot,
        MOCK_SET_URL_APP_WEB: addedUrlPath,
      },
      encoding: 'utf8',
    });

    const log = readFileSync(logPath, 'utf8');
    const addedUrl = readFileSync(addedUrlPath, 'utf8').trim();

    assert.match(output, /Adding remote missing-app-web/);
    assert.match(log, /^remote add missing-app-web https:\/\/github.com\/moritzbrantner\/next-template\.git$/m);
    assert.equal(addedUrl, 'https://github.com/moritzbrantner/next-template.git');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('setup-subtree-remotes updates mismatched remote URLs', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'setup-subtrees-update-'));
  const logPath = join(tempDir, 'git.log');
  const configPath = join(tempDir, 'subtrees.config.sh');
  const updatedUrlPath = join(tempDir, 'app-web.url');
  const gitPath = createMockGit(tempDir);

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
    const output = execFileSync(setupScriptPath, ['--config', configPath], {
      cwd: repoRoot,
      env: {
        ...process.env,
        GIT_BIN: gitPath,
        MOCK_GIT_LOG: logPath,
        MOCK_REPO_ROOT: repoRoot,
        MOCK_REMOTE_URL_APP_WEB: 'https://example.com/old.git',
        MOCK_SET_URL_APP_WEB: updatedUrlPath,
      },
      encoding: 'utf8',
    });

    const log = readFileSync(logPath, 'utf8');
    const updatedUrl = readFileSync(updatedUrlPath, 'utf8').trim();

    assert.match(output, /Updating remote app-web/);
    assert.match(log, /^remote set-url app-web https:\/\/github.com\/moritzbrantner\/next-template\.git$/m);
    assert.equal(updatedUrl, 'https://github.com/moritzbrantner/next-template.git');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('setup-subtree-remotes respects scope selection', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'setup-subtrees-scope-'));
  const logPath = join(tempDir, 'git.log');
  const configPath = join(tempDir, 'subtrees.config.sh');
  const gitPath = createMockGit(tempDir);

  writeFileSync(
    configPath,
    [
      'APP_SUBTREES=(',
      '  "apps/mobile|missing-app-web|https://github.com/moritzbrantner/expo-template.git|main"',
      ')',
      'PACKAGE_SUBTREES=(',
      '  "packages/ui|package-ui|https://github.com/moritzbrantner/platform-packages.git|stable"',
      ')',
      '',
    ].join('\n'),
  );

  try {
    const output = execFileSync(setupScriptPath, ['--packages', '--config', configPath], {
      cwd: repoRoot,
      env: {
        ...process.env,
        GIT_BIN: gitPath,
        MOCK_GIT_LOG: logPath,
        MOCK_REPO_ROOT: repoRoot,
      },
      encoding: 'utf8',
    });

    const log = readFileSync(logPath, 'utf8');

    assert.match(output, /Configured 1 subtree remote/);
    assert.doesNotMatch(output, /missing-app-web/);
    assert.doesNotMatch(log, /missing-app-web/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('setup-subtree-remotes is idempotent when remotes already match config', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'setup-subtrees-idempotent-'));
  const logPath = join(tempDir, 'git.log');
  const configPath = join(tempDir, 'subtrees.config.sh');
  const gitPath = createMockGit(tempDir);

  writeFileSync(
    configPath,
    [
      'APP_SUBTREES=(',
      '  "apps/web|app-web|https://example.com/app-web.git|main"',
      ')',
      'PACKAGE_SUBTREES=()',
      '',
    ].join('\n'),
  );

  try {
    const output = execFileSync(setupScriptPath, ['--config', configPath], {
      cwd: repoRoot,
      env: {
        ...process.env,
        GIT_BIN: gitPath,
        MOCK_GIT_LOG: logPath,
        MOCK_REPO_ROOT: repoRoot,
        MOCK_REMOTE_URL_APP_WEB: 'https://example.com/app-web.git',
      },
      encoding: 'utf8',
    });

    assert.match(output, /Remote app-web already matches https:\/\/example\.com\/app-web\.git/);
    assert.equal(existsSync(logPath), false, 'expected no git remote mutations');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
