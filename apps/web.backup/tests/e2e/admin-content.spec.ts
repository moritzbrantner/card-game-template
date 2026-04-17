import { expect, test } from '@playwright/test';

import { getSeededUser, gotoAndWaitForHydration, loginWithCredentials } from '@/tests/e2e/helpers';

const adminUser = getSeededUser('admin@example.com');

function createToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

test.describe('admin content', () => {
  test('creates, edits, publishes, and archives an announcement', async ({ page }) => {
    const token = createToken();
    const updatedToken = `${token}-edited`;

    await loginWithCredentials(page, adminUser.email, adminUser.password);
    await gotoAndWaitForHydration(page, '/en/admin/content');

    await page.getByLabel('Title').fill(`Scheduled maintenance ${token}`);
    await page.getByLabel('Body').fill(`Operational update ${token}`);
    await page.getByLabel('Destination link').fill('/status');
    await page.getByLabel('Status').selectOption('scheduled');
    await page.getByLabel('Publish at', { exact: true }).fill('2026-04-20T09:00');
    await page.getByLabel('Unpublish at', { exact: true }).fill('2026-04-21T09:00');
    await page.getByRole('button', { name: 'Create announcement' }).click();

    await expect(page).toHaveURL(/announcementId=/);
    await expect(page.getByText(`Scheduled maintenance ${token}`)).toBeVisible();

    await page.getByLabel('Title').fill(`Scheduled maintenance ${updatedToken}`);
    await page.getByRole('button', { name: 'Update announcement' }).click();
    await expect(page.getByText(`Scheduled maintenance ${updatedToken}`)).toBeVisible();

    const announcementCard = page.getByText(`Scheduled maintenance ${updatedToken}`).locator('xpath=../..');

    await announcementCard.getByRole('button', { name: 'Publish now' }).click();
    await expect(announcementCard).toContainText('published');

    await announcementCard.getByRole('button', { name: 'Archive now' }).click();
    await expect(announcementCard).toContainText('archived');
  });
});
