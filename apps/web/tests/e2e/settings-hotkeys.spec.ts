import { expect, test } from '@playwright/test';

import {
  getSeededUser,
  gotoAndWaitForHydration,
  loginWithCredentials,
} from '@/tests/e2e/helpers';

const managerUser = getSeededUser('manager@example.com');
const regularUser = getSeededUser('user@example.com');

test.describe('settings and hotkeys', () => {
  test('persists settings choices across reloads', async ({ page }) => {
    await loginWithCredentials(page, regularUser.email, regularUser.password);

    await gotoAndWaitForHydration(page, '/en/settings');
    await page.getByRole('tab', { name: 'Appearance' }).click();
    await page
      .getByRole('button', { name: /Aurora Cool cyan and green gradients\./ })
      .click();

    await page.getByRole('tab', { name: 'Dates' }).click();
    await page.getByLabel('Date format').selectOption('iso');
    await expect(page.getByText(/\d{4}-\d{2}-\d{2}/)).toBeVisible();

    await page.getByRole('tab', { name: 'Workflow' }).click();
    await page.getByRole('switch', { name: 'Show hotkey hints' }).click();
    await expect(page.getByRole('button', { name: 'Hotkeys' })).toHaveCount(0);

    await page.getByRole('tab', { name: 'Notifications' }).click();
    await page.getByRole('switch', { name: 'Enable notifications' }).click();
    await page.getByLabel('Notification type').selectOption('digest');

    await page.reload();
    await gotoAndWaitForHydration(page, '/en/settings');

    await expect(page.locator('html')).toHaveAttribute(
      'data-hotkey-hints',
      'hidden',
    );
    await expect(page.getByRole('button', { name: 'Hotkeys' })).toHaveCount(0);

    await page.getByRole('tab', { name: 'Appearance' }).click();
    await expect(
      page.getByRole('button', {
        name: /Aurora Cool cyan and green gradients\./,
      }),
    ).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('tab', { name: 'Dates' }).click();
    await expect(page.getByText(/\d{4}-\d{2}-\d{2}/)).toBeVisible();

    await page.getByRole('tab', { name: 'Workflow' }).click();
    await expect(
      page.getByRole('switch', { name: 'Show hotkey hints' }),
    ).toHaveAttribute('aria-checked', 'false');

    await page.getByRole('tab', { name: 'Notifications' }).click();
    await expect(
      page.getByRole('switch', { name: 'Enable notifications' }),
    ).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByLabel('Notification type')).toHaveValue('digest');

    await page.getByRole('tab', { name: 'Privacy' }).click();
    await expect(
      page.getByRole('switch', { name: 'Allow people to find me' }),
    ).toBeVisible();
  });

  test('does not expose admin hotkeys to manager roles', async ({ page }) => {
    await loginWithCredentials(page, managerUser.email, managerUser.password);

    const hotkeysButton = page.getByRole('button', { name: 'Hotkeys' });
    await expect(hotkeysButton).toBeVisible();

    await hotkeysButton.click();
    const hotkeysDialog = page.getByRole('dialog', {
      name: 'Navigation hotkeys',
    });
    await expect(
      hotkeysDialog.getByRole('button', { name: 'Admin' }),
    ).toHaveCount(0);
    await expect(
      hotkeysDialog.getByRole('button', { name: 'Settings' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');

    await hotkeysButton.focus();
    await page.keyboard.press('Alt+E');
    await expect(page).toHaveURL('/en/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    await hotkeysButton.focus();
    await page.keyboard.press('Alt+P');
    await expect(page).toHaveURL('/en/profile');

    await hotkeysButton.focus();
    await page.keyboard.press('Alt+E');
    await expect(page).toHaveURL('/en/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  });

  test('keeps regular users out of admin pages', async ({ page }) => {
    await loginWithCredentials(page, regularUser.email, regularUser.password);

    await gotoAndWaitForHydration(page, '/en/admin');
    await expect(page).toHaveURL('/en');
    await expect(
      page.getByRole('heading', {
        name: 'One template, multiple production-ready starting points.',
      }),
    ).toBeVisible();
  });

  test('lets a user change their email from settings', async ({ page }) => {
    const timestamp = Date.now();
    const email = `settings-${timestamp}@example.com`;
    const nextEmail = `settings-updated-${timestamp}@example.com`;
    const password = 'SettingsUser123';

    await gotoAndWaitForHydration(page, '/en/register');
    await page.getByLabel('Display name').fill('Settings User');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL('/en/profile');
    await gotoAndWaitForHydration(page, '/en/settings');
    await page.getByRole('tab', { name: 'Account' }).click();

    await page.getByLabel('New email address').fill(nextEmail);
    await page.getByLabel('Current password').first().fill(password);
    await page.getByRole('button', { name: 'Update email' }).click();

    await expect(page.getByLabel('Current email address')).toHaveValue(
      nextEmail,
    );
  });
});
