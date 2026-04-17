import { expect, test } from '@playwright/test';

import { getSeededUser, gotoAndWaitForHydration, loginWithCredentials } from '@/tests/e2e/helpers';

const adminUser = getSeededUser('admin@example.com');

test.describe('admin reports', () => {
  test('shows operational pulse cards on the admin overview and links to report details', async ({ page }) => {
    await loginWithCredentials(page, adminUser.email, adminUser.password);
    await gotoAndWaitForHydration(page, '/en/admin');

    await expect(page.getByRole('heading', { name: 'Operational pulse' })).toBeVisible();
    await page.getByRole('link', { name: /Denied admin actions/i }).click();

    await expect(page).toHaveURL(/\/en\/admin\/reports\/securityAccess\?window=7d/);
  });

  test('opens a live report detail page and exports CSV data', async ({ page }) => {
    await loginWithCredentials(page, adminUser.email, adminUser.password);
    await gotoAndWaitForHydration(page, '/en/admin/reports');

    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
    await page.getByRole('link', { name: 'Open' }).first().click();

    await expect(page).toHaveURL(/\/en\/admin\/reports\/securityAccess/);
    await expect(page.getByRole('heading', { name: 'Security access review' })).toBeVisible();
    await expect(page.getByText('Denied and rate-limited actions')).toBeVisible();
    await expect(page.getByText('Denied actions by endpoint')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recent events' })).toBeVisible();

    await page.getByRole('link', { name: '24h' }).click();
    await expect(page).toHaveURL(/window=24h/);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Export CSV' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('securityAccess-24h.csv');
  });
});
