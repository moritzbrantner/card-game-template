// tests/e2e/global-setup.ts
import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { applyE2EEnvironment } from './environment';

const setupFile = __filename;
const setupDir = path.dirname(setupFile);

export default async function globalSetup() {
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
