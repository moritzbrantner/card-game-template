import { expect, test } from '@playwright/test';
import { gotoAndWaitForHydration } from '@/tests/e2e/helpers';

test('the user can open the about page from the home page', async ({ page }) => {
  await gotoAndWaitForHydration(page, '/en');

  await page.getByRole('button', { name: 'Discover' }).click();
  await page.getByRole('link', { name: 'About' }).click();

  await expect(page).toHaveURL('/en/about');
  await expect(page.getByRole('heading', { name: 'About This Project' })).toBeVisible();
});
