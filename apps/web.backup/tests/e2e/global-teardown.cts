// tests/e2e/global-teardown.ts
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const teardownFile = __filename;
const teardownDir = path.dirname(teardownFile);

export default async function globalTeardown() {
  execFileSync('./scripts/ci/bootstrap-e2e-db.sh', ['--teardown'], {
    cwd: path.resolve(teardownDir, '../..'),
    stdio: 'inherit',
  });
}
