import { expect, test } from '@playwright/test';

import { gotoAndWaitForHydration } from '@/tests/e2e/helpers';

test.describe('UNO authoritative matches', () => {
  test('starts a guest match, reloads it, abandons it, and opens the replay page', async ({
    page,
  }) => {
    await gotoAndWaitForHydration(page, '/en/uno');
    await page.getByLabel('Player name').fill('Guest Player');
    await page.getByRole('button', { name: 'Create match' }).click();

    await expect(
      page.getByRole('button', { name: 'Abandon match' }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole('button', { name: 'Abandon match' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Abandon match' }).click();
    await expect(page.getByText('Match abandoned.')).toBeVisible();

    await gotoAndWaitForHydration(page, '/en/past-games');
    await expect(
      page.getByRole('heading', { name: 'Past games' }),
    ).toBeVisible();

    const replayLink = page
      .getByRole('link')
      .filter({ hasText: 'Guest Player' })
      .first();
    await replayLink.click();

    await expect(page.getByText('Replay abandoned match')).toBeVisible();
  });
});
