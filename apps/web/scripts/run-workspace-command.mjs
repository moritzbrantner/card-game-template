import { readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [scriptName] = process.argv.slice(2);

if (!scriptName) {
  console.error('Usage: bun ./scripts/run-workspace-command.mjs <script>');
  process.exit(1);
}

const packagesRoot = path.join(process.cwd(), 'packages');
const workspaces = readdirSync(packagesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const workspace of workspaces) {
  const workspacePath = path.join(packagesRoot, workspace);
  const result = spawnSync('bun', ['run', scriptName], {
    cwd: workspacePath,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
