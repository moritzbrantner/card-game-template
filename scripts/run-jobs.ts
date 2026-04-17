import { runDueJobs } from '@/src/jobs/service';

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

async function runOnce() {
  const result = await runDueJobs();
  console.info('[jobs] run complete', result);
}

async function main() {
  if (hasFlag('--once')) {
    await runOnce();
    return;
  }

  const intervalMs = 5_000;

  if (hasFlag('--watch')) {
    while (true) {
      await runOnce();
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  await runOnce();
}

void main().catch((error) => {
  console.error('[jobs] worker failed', error);
  process.exit(1);
});
