import { defineConfig } from '@playwright/test';
import { createE2EEnvironment, getE2EBaseURL } from '@/tests/e2e/environment';

const baseURL = getE2EBaseURL();
const e2eEnvironment = createE2EEnvironment(baseURL);
const port = Number(new URL(baseURL).port);

export default defineConfig({
  tsconfig: './playwright.tsconfig.json',
  globalSetup: './tests/e2e/global-setup.cts',
  globalTeardown: './tests/e2e/global-teardown.cts',
  testDir: 'tests/e2e',
  timeout: 120_000,
  use: {
    baseURL,
    channel: 'chrome',
  },
  webServer: {
    command: `./scripts/e2e/start-playwright-server.sh ${port}`,
    env: {
      ...e2eEnvironment,
      PLAYWRIGHT_TEST: '1',
    },
    port,
    timeout: 180_000,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
