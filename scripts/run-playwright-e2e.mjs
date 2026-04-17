#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const workspace = process.argv[2] ?? 'desktop';

const hasPlaywright =
  spawnSync('bunx', ['playwright', '--version'], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  }).status === 0;

if (!hasPlaywright) {
  console.log(`[test:e2e] Playwright is not installed in this environment. Skipping ${workspace} e2e run.`);
  process.exit(0);
}

const install = spawnSync('bunx', ['playwright', 'install', 'chromium'], {
  stdio: 'pipe',
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

if ((install.status ?? 1) !== 0) {
  console.log(
    `[test:e2e] Chromium browser download is unavailable in this environment. Skipping ${workspace} e2e run.`,
  );
  if (install.stderr) {
    console.log(install.stderr.trim());
  }
  process.exit(0);
}

const result = spawnSync('bunx', ['playwright', 'test', '--config', 'playwright.config.ts'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
