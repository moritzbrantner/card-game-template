import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const reportPath = join(repoRoot, 'benchmark-results', 'build-baseline.json');
const command = ['bun', 'run', 'build'];

function readCommand(commandName, args) {
  const result = spawnSync(commandName, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });

  return result.status === 0 ? result.stdout.trim() : null;
}

const startedAt = new Date();
const start = performance.now();
const build = spawnSync(command[0], command.slice(1), {
  cwd: repoRoot,
  env: process.env,
  stdio: 'inherit',
});
const durationMs = Math.round(performance.now() - start);

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const report = {
  name: 'build',
  command: command.join(' '),
  createdAt: startedAt.toISOString(),
  gitCommit: readCommand('git', ['rev-parse', '--short', 'HEAD']),
  durationMs,
  status: 'passed',
  environment: {
    bun: readCommand('bun', ['--version']),
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  },
  threshold: null,
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Build benchmark baseline written to ${reportPath}`);
