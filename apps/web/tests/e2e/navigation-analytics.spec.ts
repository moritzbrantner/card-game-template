import { expect, test } from '@playwright/test';

import {
  acceptAllConsent,
  getSeededUser,
  gotoAndWaitForHydration,
  loginWithCredentials,
  logoutFromProfileMenu,
  waitForAppHydration,
} from '@/tests/e2e/helpers';

const adminUser = getSeededUser('admin@example.com');
const memberUser = getSeededUser('user@example.com');

test.describe('navigation analytics', () => {
  test('captures an anonymous home to blog to login path and lets admins refine filters', async ({ page }) => {
    await gotoAndWaitForHydration(page, '/en', { consent: 'leave' });
    await acceptAllConsent(page);
    await page.reload();
    await waitForAppHydration(page);

    await page.goto('/en/blog');
    await waitForAppHydration(page);
    await page.goto('/en/login');
    await waitForAppHydration(page);

    await page.getByLabel('Email').fill(adminUser.email);
    await page.getByLabel('Password').fill(adminUser.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL('/en/profile');
    await waitForAppHydration(page);

    await gotoAndWaitForHydration(page, '/en/admin/reports/navigationJourneys?window=24h&audience=anonymous&path=/blog');
    await expect(page.getByRole('heading', { name: 'Navigation journeys' })).toBeVisible();
    await expect(page.locator('input[name="path"]')).toHaveValue('/blog');
    await expect(page.getByText('/blog')).toBeVisible();
    await expect(page.getByText('/login')).toBeVisible();

    await page.locator('select[name="audience"]').selectOption('all');
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await expect(page).toHaveURL(/audience=all/);
  });

  test('captures an authenticated multi-page session', async ({ page }) => {
    await gotoAndWaitForHydration(page, '/en/login', { consent: 'leave' });
    await acceptAllConsent(page);
    await page.reload();
    await waitForAppHydration(page);

    await page.getByLabel('Email').fill(memberUser.email);
    await page.getByLabel('Password').fill(memberUser.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL('/en/profile');
    await waitForAppHydration(page);

    await page.goto('/en/people');
    await waitForAppHydration(page);
    await page.goto('/en/profile');
    await waitForAppHydration(page);
    await page.goto('/en/notifications');
    await waitForAppHydration(page);

    await logoutFromProfileMenu(page);
    await loginWithCredentials(page, adminUser.email, adminUser.password);
    await gotoAndWaitForHydration(page, '/en/admin/reports/navigationJourneys?window=24h&audience=authenticated&path=/people');

    await expect(page.getByRole('heading', { name: 'Navigation journeys' })).toBeVisible();
    await expect(page.getByText('/people')).toBeVisible();
    await expect(page.getByText('/profile')).toBeVisible();
  });
});
