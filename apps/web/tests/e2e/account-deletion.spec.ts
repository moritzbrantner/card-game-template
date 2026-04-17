import { expect, test } from '@playwright/test';

import { getE2EBaseURL } from '@/tests/e2e/environment';
import {
  getSeededUser,
  gotoAndWaitForHydration,
  loginWithCredentials,
} from '@/tests/e2e/helpers';

const deletionUser = getSeededUser('delete-account@example.com');
const signupUrl = new URL('/api/account/signup', getE2EBaseURL()).toString();

async function recreateDeletionUserIfNeeded() {
  const response = await fetch(signupUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: deletionUser.name,
      email: deletionUser.email,
      password: deletionUser.password,
      locale: 'en',
    }),
  });

  if (response.ok) {
    return;
  }

  if (response.status === 400) {
    return;
  }

  throw new Error(
    `Unable to restore ${deletionUser.email} after account deletion test.`,
  );
}

test.describe('account deletion', () => {
  test('lets a user delete their account from settings', async ({ page }) => {
    try {
      await loginWithCredentials(
        page,
        deletionUser.email,
        deletionUser.password,
      );

      await gotoAndWaitForHydration(page, '/en/settings');
      await page.getByRole('tab', { name: 'Account' }).click();
      await expect(
        page.getByRole('heading', { name: 'Delete account' }),
      ).toBeVisible();

      const deleteForm = page.locator('form').filter({
        has: page.getByRole('button', { name: 'Delete account' }),
      });

      await deleteForm
        .getByLabel('Current password')
        .fill(deletionUser.password);
      await deleteForm.getByRole('button', { name: 'Delete account' }).click();

      await expect(page).toHaveURL('/en');
      await expect(
        page.getByRole('heading', {
          name: 'One template, multiple production-ready starting points.',
        }),
      ).toBeVisible();

      await gotoAndWaitForHydration(page, '/en/settings');
      await expect(page).toHaveURL('/en');

      await gotoAndWaitForHydration(page, '/en/login');
      await page.getByLabel('Email').fill(deletionUser.email);
      await page.getByLabel('Password').fill(deletionUser.password);
      await page.getByRole('button', { name: 'Log in' }).click();

      await expect(
        page.getByText('Email or password is incorrect.'),
      ).toBeVisible();
      await expect(page).toHaveURL('/en/login');
    } finally {
      await recreateDeletionUserIfNeeded();
    }
  });
});
