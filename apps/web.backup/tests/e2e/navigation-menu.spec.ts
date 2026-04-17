import { expect, test } from '@playwright/test';
import { gotoAndWaitForHydration } from '@/tests/e2e/helpers';

test('navbar groups destinations into categories and reveals submenu links on click', async ({ page }) => {
  await gotoAndWaitForHydration(page, '/en');
  const discoverSubmenu = page.locator('#navigation-submenu-discover');

  await expect(page.getByRole('button', { name: 'Discover' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Workspace' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'About' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Discover' }).click();
  await expect(discoverSubmenu.getByRole('link', { name: 'About' })).toBeVisible();
  await expect(discoverSubmenu.getByRole('link', { name: 'Story Demo', exact: true })).toBeVisible();

  await discoverSubmenu.getByRole('link', { name: 'Story Demo', exact: true }).click();

  await expect(page).toHaveURL('/en/examples/story');
  await expect(page.getByRole('heading', { name: 'Story Scroll Demo' })).toBeVisible();
});
