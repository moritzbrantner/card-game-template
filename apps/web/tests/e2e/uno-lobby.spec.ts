import { expect, test } from '@playwright/test';

import { gotoAndWaitForHydration } from '@/tests/e2e/helpers';

test.describe('UNO lobbies', () => {
  test('lets players create and join a lobby before the game starts', async ({ browser }) => {
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    const guestPage = await context.newPage();

    await gotoAndWaitForHydration(hostPage, '/en/uno');
    await hostPage.getByLabel('Player name').fill('Alice');
    await hostPage.getByRole('button', { name: 'Create lobby' }).click();

    await expect(hostPage.getByRole('heading', { name: 'Lobby ready' })).toBeVisible();
    await expect(hostPage.getByText('Alice (Host)')).toBeVisible();

    await gotoAndWaitForHydration(guestPage, '/en/uno');
    await guestPage.getByLabel('Player name').fill('Bob');
    await guestPage.getByRole('button', { name: 'Join lobby Alice table' }).click();

    await expect(guestPage.getByRole('heading', { name: 'Lobby ready' })).toBeVisible();
    await expect(guestPage.getByText('Bob')).toBeVisible();
    await expect(hostPage.getByText('Bob')).toBeVisible();

    await guestPage.getByRole('button', { name: 'Leave lobby' }).click();
    await expect(guestPage.getByRole('heading', { name: 'Open lobbies' })).toBeVisible();
    await expect(guestPage.getByText('Bob')).toHaveCount(0);
    await expect(hostPage.getByText('1 / 4 seats filled')).toBeVisible();

    await context.close();
  });

  test('archives exited matches on the past games page', async ({ browser }) => {
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    const guestPage = await context.newPage();

    await gotoAndWaitForHydration(hostPage, '/en/uno');
    await hostPage.getByLabel('Player name').fill('Alice');
    await hostPage.getByRole('button', { name: 'Create lobby' }).click();

    await gotoAndWaitForHydration(guestPage, '/en/uno');
    await guestPage.getByLabel('Player name').fill('Bob');
    await guestPage.getByRole('button', { name: 'Join lobby Alice table' }).click();

    await hostPage.getByRole('button', { name: 'Start game' }).click();
    await expect(hostPage.getByRole('heading', { name: 'Active match' })).toBeVisible();
    await expect(guestPage.getByRole('heading', { name: 'Active match' })).toBeVisible();

    await guestPage.getByRole('button', { name: 'Exit game' }).click();
    await expect(guestPage.getByText('You exited the game.')).toBeVisible();

    await gotoAndWaitForHydration(hostPage, '/en/past-games');
    await expect(hostPage.getByRole('heading', { name: 'Past games' })).toBeVisible();
    await expect(hostPage.getByText('Alice table')).toBeVisible();
    await expect(hostPage.getByText('Abandoned', { exact: true })).toBeVisible();
    await expect(hostPage.getByText('Bob exited the match')).toBeVisible();

    await context.close();
  });
});
