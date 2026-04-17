import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const nextBuildDir = path.join(appRoot, '.next');
const nextCli = path.join(appRoot, 'node_modules', 'next', 'dist', 'bin', 'next');

const args = new Map();

for (let index = 2; index < process.argv.length; index += 1) {
  const current = process.argv[index];

  if (!current.startsWith('--')) {
    continue;
  }

  const [key, inlineValue] = current.slice(2).split('=');
  const nextValue = inlineValue ?? process.argv[index + 1];

  if (inlineValue === undefined && nextValue && !nextValue.startsWith('--')) {
    args.set(key, nextValue);
    index += 1;
    continue;
  }

  args.set(key, inlineValue ?? 'true');
}

const host = args.get('host') ?? process.env.HOST ?? '0.0.0.0';
const port = String(Number(args.get('port') ?? process.env.PORT ?? '3000'));

try {
  await access(nextBuildDir);
} catch {
  console.error(`Missing Next.js build output at ${nextBuildDir}. Run "bun run build" first.`);
  process.exit(1);
}

const child = spawn(process.execPath, [nextCli, 'start', '--hostname', host, '--port', port], {
  cwd: appRoot,
  env: process.env,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

for (const event of ['SIGINT', 'SIGTERM']) {
  process.on(event, () => {
    child.kill(event);
  });
}
