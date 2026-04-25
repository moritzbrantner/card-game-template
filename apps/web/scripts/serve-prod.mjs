import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const nextBuildDir = path.join(appRoot, '.next');
const customServerEntry = path.join(
  nextBuildDir,
  'custom-server',
  'next-websocket-server.mjs',
);
const runWithNode = path.resolve(
  appRoot,
  '..',
  '..',
  'scripts',
  'run-with-node.sh',
);

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
  await access(customServerEntry);
} catch {
  console.error(
    `Missing build output at ${customServerEntry}. Run "bun run build" first.`,
  );
  process.exit(1);
}

const child = spawn(
  runWithNode,
  [
    './.next/custom-server/next-websocket-server.mjs',
    '--prod',
    '--host',
    host,
    '--port',
    port,
  ],
  {
    cwd: appRoot,
    env: process.env,
    stdio: 'inherit',
  },
);

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
