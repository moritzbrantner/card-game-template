import { expect, test } from '@playwright/test';

import { gotoAndWaitForHydration } from '@/tests/e2e/helpers';

test('homepage leads with playable games instead of template explanation', async ({
  page,
}) => {
  await gotoAndWaitForHydration(page, '/en');

  await expect(
    page.getByRole('heading', { exact: true, level: 1, name: 'Games' }),
  ).toHaveCount(1);
  await expect(
    page.getByRole('heading', { exact: true, name: 'UNO-style' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { exact: true, name: 'Phase 10-style' }),
  ).toBeVisible();

  await expect(
    page.getByText('Pick a game and play against bots.', { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText('Local browser games', { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText('Reusable engine, rules, and local sessions.', {
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'View source' })).toHaveCount(0);
});
