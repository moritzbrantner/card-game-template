import { expect, test } from '@playwright/test';

import { expectStatusMessage, gotoAndWaitForHydration } from '@/tests/e2e/helpers';

test('the user can open the report problem page and submit a report', async ({ page }) => {
  await gotoAndWaitForHydration(page, '/en');

  await page.getByRole('button', { name: 'Discover' }).click();
  await page.getByRole('link', { name: 'Report a problem' }).click();

  await expect(page).toHaveURL('/en/report-problem');
  await expect(page.getByRole('heading', { name: 'Report a problem' })).toBeVisible();

  await page.getByLabel('Email address').fill('alex@example.com');
  await page.getByLabel('Problem area').selectOption('performance');
  await page.getByLabel('Page URL').fill('https://app.example.com/dashboard');
  await page.getByLabel('Short summary').fill('Dashboard freezes after filters change');
  await page
    .getByLabel('What happened?')
    .fill('Every time I update the region filter, the dashboard hangs for about thirty seconds before recovering.');

  await page.getByRole('button', { name: 'Send report' }).click();

  await expectStatusMessage(page, 'Problem report received.');
  await expect(page.getByRole('status')).toContainText('PRB-');
});
