import { expect, test } from '@playwright/test';
import { gotoAndWaitForHydration } from '@/tests/e2e/helpers';

test('story page renders the isolated scroll demo', async ({ page }) => {
  await gotoAndWaitForHydration(page, '/en/examples/story');

  await expect(page.getByRole('heading', { name: 'Story Scroll Demo' })).toBeVisible();
  await expect(
    page.getByText('This page now uses the shared @moritzbrantner/storytelling package instead of the local prototype.'),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Foundation' })).toBeVisible();
  await expect(page.getByText('Internal Progression 0-100')).toBeVisible();
});
