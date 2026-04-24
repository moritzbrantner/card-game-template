import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const repoRoot = resolve(new URL('../..', import.meta.url).pathname);
const scriptPath = resolve(repoRoot, 'scripts/setup-promotion-branches.sh');

function createMockGit(tempDir) {
  const gitPath = join(tempDir, 'git');

  writeFileSync(
    gitPath,
    `#!/usr/bin/env bash
set -euo pipefail

branch_list_contains() {
  local branch_name="\${1:?}"
  local branch_list=",\${2:-},"
  [[ "\${branch_list}" == *",\${branch_name},"* ]]
}

case "\${1:-}" in
  rev-parse)
    if [[ "\${2:-}" == "--show-toplevel" ]]; then
      printf '%s\\n' "\${MOCK_REPO_ROOT:?}"
      exit 0
    fi
    ;;
  show-ref)
    if [[ "\${2:-}" == "--verify" && "\${3:-}" == "--quiet" ]]; then
      branch_name="\${4#refs/heads/}"
      if branch_list_contains "\${branch_name}" "\${MOCK_LOCAL_BRANCHES:-}"; then
        exit 0
      fi
      exit 1
    fi
    ;;
  remote)
    if [[ "\${2:-}" == "get-url" && "\${3:-}" == "origin" ]]; then
      printf '%s\\n' "\${MOCK_ORIGIN_URL:-https://github.com/moritzbrantner/example.git}"
      exit 0
    fi
    ;;
  branch)
    case "\${2:-}" in
      --show-current)
        printf '%s\\n' "\${MOCK_CURRENT_BRANCH:-main}"
        exit 0
        ;;
      -m|-f)
        printf '%s\\n' "$*" >> "\${MOCK_GIT_LOG:?}"
        exit 0
        ;;
    esac
    ;;
  push)
    printf '%s\\n' "$*" >> "\${MOCK_GIT_LOG:?}"
    exit 0
    ;;
  ls-remote)
    if [[ "\${2:-}" == "--heads" && "\${3:-}" == "origin" ]]; then
      if branch_list_contains "\${4:-}" "\${MOCK_REMOTE_BRANCHES:-}"; then
        printf 'deadbeef\\trefs/heads/%s\\n' "\${4:-}"
        exit 0
      fi
      case "\${4:-}" in
        main)
          if [[ "\${MOCK_REMOTE_BRANCH_MAIN:-}" == "1" ]]; then
            printf 'deadbeef\\trefs/heads/main\\n'
          fi
          exit 0
          ;;
        trunk)
          if [[ "\${MOCK_REMOTE_BRANCH_TRUNK:-}" == "1" ]]; then
            printf 'deadbeef\\trefs/heads/trunk\\n'
          fi
          exit 0
          ;;
      esac
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

case "\${1:-} \${2:-}" in
  "repo view")
    printf '%s\\n' "\${MOCK_DEFAULT_BRANCH:-main}"
    exit 0
    ;;
  "repo edit")
    printf '%s\\n' "$*" >> "\${MOCK_GH_LOG:?}"
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

test('setup-promotion-branches renames main to develop and creates promotion branches', () => {
  const tempDir = mkdtempSync(
    join(tmpdir(), 'setup-promotion-branches-default-'),
  );
  const gitLogPath = join(tempDir, 'git.log');
  const ghLogPath = join(tempDir, 'gh.log');
  const gitPath = createMockGit(tempDir);
  const ghPath = createMockGh(tempDir);

  try {
    const output = execFileSync(scriptPath, ['--with-main'], {
      cwd: repoRoot,
      env: {
        ...process.env,
        GIT_BIN: gitPath,
        GH_BIN: ghPath,
        MOCK_REPO_ROOT: repoRoot,
        MOCK_GIT_LOG: gitLogPath,
        MOCK_GH_LOG: ghLogPath,
        MOCK_CURRENT_BRANCH: 'main',
        MOCK_DEFAULT_BRANCH: 'main',
        MOCK_REMOTE_BRANCH_MAIN: '1',
        MOCK_ORIGIN_URL: 'https://github.com/moritzbrantner/example.git',
      },
      encoding: 'utf8',
    });

    const gitLog = readFileSync(gitLogPath, 'utf8');
    const ghLog = readFileSync(ghLogPath, 'utf8');

    assert.match(gitLog, /^branch -m main develop$/m);
    assert.match(gitLog, /^push -u origin develop$/m);
    assert.match(gitLog, /^push origin --delete main$/m);
    assert.match(gitLog, /^branch -f nightly develop$/m);
    assert.match(gitLog, /^push -u origin nightly$/m);
    assert.match(gitLog, /^branch -f beta develop$/m);
    assert.match(gitLog, /^branch -f staging develop$/m);
    assert.match(gitLog, /^branch -f main develop$/m);
    assert.match(
      ghLog,
      /^repo edit moritzbrantner\/example --default-branch develop$/m,
    );
    assert.match(
      output,
      /Configured promotion branches for moritzbrantner\/example:/,
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('setup-promotion-branches can keep the old default branch and skip extra branches', () => {
  const tempDir = mkdtempSync(
    join(tmpdir(), 'setup-promotion-branches-keep-old-'),
  );
  const gitLogPath = join(tempDir, 'git.log');
  const ghLogPath = join(tempDir, 'gh.log');
  const gitPath = createMockGit(tempDir);
  const ghPath = createMockGh(tempDir);

  try {
    execFileSync(
      scriptPath,
      ['--keep-old-default-branch', '--no-extra-branches'],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          GIT_BIN: gitPath,
          GH_BIN: ghPath,
          MOCK_REPO_ROOT: repoRoot,
          MOCK_GIT_LOG: gitLogPath,
          MOCK_GH_LOG: ghLogPath,
          MOCK_CURRENT_BRANCH: 'main',
          MOCK_DEFAULT_BRANCH: 'main',
          MOCK_REMOTE_BRANCH_MAIN: '1',
        },
        encoding: 'utf8',
      },
    );

    const gitLog = readFileSync(gitLogPath, 'utf8');

    assert.match(gitLog, /^branch -m main develop$/m);
    assert.match(gitLog, /^push -u origin develop$/m);
    assert.doesNotMatch(gitLog, /^push origin --delete main$/m);
    assert.doesNotMatch(gitLog, /^branch -f nightly develop$/m);
    assert.doesNotMatch(gitLog, /^branch -f beta develop$/m);
    assert.doesNotMatch(gitLog, /^branch -f staging develop$/m);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('setup-promotion-branches accepts explicit repo and custom branch lists', () => {
  const tempDir = mkdtempSync(
    join(tmpdir(), 'setup-promotion-branches-custom-'),
  );
  const gitLogPath = join(tempDir, 'git.log');
  const ghLogPath = join(tempDir, 'gh.log');
  const gitPath = createMockGit(tempDir);
  const ghPath = createMockGh(tempDir);

  try {
    execFileSync(
      scriptPath,
      [
        '--repo',
        'acme/platform',
        '--develop-branch',
        'trunk',
        '--extra-branches',
        'preview',
        'qa',
        'preview',
        '--with-main',
      ],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          GIT_BIN: gitPath,
          GH_BIN: ghPath,
          MOCK_REPO_ROOT: repoRoot,
          MOCK_GIT_LOG: gitLogPath,
          MOCK_GH_LOG: ghLogPath,
          MOCK_CURRENT_BRANCH: 'main',
          MOCK_DEFAULT_BRANCH: 'main',
          MOCK_REMOTE_BRANCH_MAIN: '1',
          MOCK_ORIGIN_URL: 'https://example.com/not-github.git',
        },
        encoding: 'utf8',
      },
    );

    const gitLog = readFileSync(gitLogPath, 'utf8');
    const ghLog = readFileSync(ghLogPath, 'utf8');
    const previewMatches = gitLog.match(/^branch -f preview trunk$/gm) ?? [];

    assert.match(gitLog, /^branch -m main trunk$/m);
    assert.match(gitLog, /^push -u origin trunk$/m);
    assert.match(gitLog, /^branch -f preview trunk$/m);
    assert.match(gitLog, /^branch -f qa trunk$/m);
    assert.match(gitLog, /^branch -f main trunk$/m);
    assert.equal(previewMatches.length, 1, 'preview should appear only once');
    assert.match(ghLog, /^repo edit acme\/platform --default-branch trunk$/m);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('setup-promotion-branches is idempotent when the repository is already configured', () => {
  const tempDir = mkdtempSync(
    join(tmpdir(), 'setup-promotion-branches-idempotent-'),
  );
  const gitLogPath = join(tempDir, 'git.log');
  const ghLogPath = join(tempDir, 'gh.log');
  const gitPath = createMockGit(tempDir);
  const ghPath = createMockGh(tempDir);

  try {
    const output = execFileSync(scriptPath, ['--with-main'], {
      cwd: repoRoot,
      env: {
        ...process.env,
        GIT_BIN: gitPath,
        GH_BIN: ghPath,
        MOCK_REPO_ROOT: repoRoot,
        MOCK_GIT_LOG: gitLogPath,
        MOCK_GH_LOG: ghLogPath,
        MOCK_CURRENT_BRANCH: 'feature/auth-flow',
        MOCK_DEFAULT_BRANCH: 'develop',
        MOCK_LOCAL_BRANCHES: 'develop,nightly,beta,staging,main',
        MOCK_REMOTE_BRANCHES: 'develop,nightly,beta,staging,main',
      },
      encoding: 'utf8',
    });

    assert.match(output, /GitHub default branch already set to develop/);
    assert.match(output, /Branch nightly already exists locally and on origin/);
    assert.equal(
      existsSync(gitLogPath),
      false,
      'expected no mutating git commands',
    );
    assert.equal(
      existsSync(ghLogPath),
      false,
      'expected no mutating gh commands',
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
