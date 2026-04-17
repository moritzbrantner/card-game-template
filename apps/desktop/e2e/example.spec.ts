import path from 'node:path';

import { expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import electronPath from 'electron';

import { test } from './fixtures/electron';

const shortcutKey = process.platform === 'darwin' ? 'Meta' : 'Control';

async function relaunchElectronApp() {
  const appRoot = path.resolve(__dirname, '..');

  return electron.launch({
    executablePath: electronPath as unknown as string,
    args: ['--no-sandbox', '--disable-gpu', appRoot],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PLAYWRIGHT_E2E: '1',
    },
  });
}

test('renders the default desktop route with a shared package label', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Hello Electron!' })).toBeVisible();
  await expect(page.getByText('shared:desktop-launch')).toBeVisible();
});

test('persists the selected theme across relaunch', async ({ app, page }) => {
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Dark mode' }).click();

  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');

  await app.close();

  const relaunchedApp = await relaunchElectronApp();
  const relaunchedPage = await relaunchedApp.firstWindow();

  await expect
    .poll(() => relaunchedPage.evaluate(() => document.documentElement.dataset.theme))
    .toBe('dark');

  await relaunchedApp.close();
});

test('opens settings through the command-backed hotkey', async ({ page }) => {
  await page.keyboard.press(`${shortcutKey}+,`);
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
});

test('saves and reopens a document through the command-backed document flow', async ({ page }) => {
  await page.getByRole('link', { name: 'Documents' }).click();

  const editor = page.locator('textarea.document-editor');
  await editor.fill('Playwright save flow');

  await page.keyboard.press(`${shortcutKey}+S`);
  await expect(page.getByText(/Saved e2e-document\.desktop\.json/)).toBeVisible();

  await page.keyboard.press(`${shortcutKey}+N`);
  await expect(editor).toHaveValue(
    'Write here. Save with CmdOrCtrl+S and reopen from the recent files list.',
  );

  await page.getByRole('button', { name: /e2e-document\.desktop\.json/ }).click();
  await expect(editor).toHaveValue('Playwright save flow');
});
