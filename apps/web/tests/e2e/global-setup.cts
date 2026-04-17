// tests/e2e/global-setup.ts
import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { applyE2EEnvironment } from './environment';

const setupFile = __filename;
const setupDir = path.dirname(setupFile);

function prependNodeToolchainToPath() {
  const candidates = execFileSync('which', ['-a', 'node'], {
    cwd: path.resolve(setupDir, '../..'),
    encoding: 'utf8',
  })
    .split('\n')
    .map((candidate) => candidate.trim())
    .filter(Boolean);

  const nodeBinary =
    candidates.find((candidate) => !candidate.startsWith('/tmp/bun-node-')) ?? candidates[0];

  if (!nodeBinary) {
    return;
  }

  const nodeDir = path.dirname(nodeBinary);
  process.env.PATH = `${nodeDir}:${process.env.PATH ?? ''}`;
}

export default async function globalSetup() {
  prependNodeToolchainToPath();
  applyE2EEnvironment();

  execFileSync('./scripts/ci/bootstrap-e2e-db.sh', [], {
    cwd: path.resolve(setupDir, '../..'),
    stdio: 'inherit',
  });

  const installArgs = ['x', 'playwright', 'install'];

  if (process.env.CI) {
    installArgs.push('--with-deps');
  }

  execFileSync('bun', installArgs, {
    cwd: path.resolve(setupDir, '../..'),
    stdio: 'inherit',
  });
}
