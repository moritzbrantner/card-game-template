import { expect, test } from './card-game-pages.fixture';

test.describe('card game page fixtures', () => {
  test('Phase 10 page can configure, play, and restart a local round', async ({
    phase10Page,
  }) => {
    await phase10Page.goto();
    await phase10Page.configureBotDuelRound();
    await phase10Page.verifyLegalActionsAreAvailable();
  });

  test('poker page can create, play, and reload an authoritative match', async ({
    pokerPage,
  }) => {
    await pokerPage.goto();

    const playerName = `E2E Poker ${Date.now()}`;
    await pokerPage.createMatch({ playerName, preset: 'heads-up' });
    await expect(
      pokerPage.page.getByText(playerName, { exact: true }),
    ).toBeVisible();

    await pokerPage.submitFirstLegalAction();
    await pokerPage.reloadMatchFromPage();
  });

  test('UNO page plays and restarts a browser-local bot match', async ({
    unoPage,
  }) => {
    await unoPage.goto();
    await unoPage.verifyLocalBotMatch();

    const openingHandLabels = await unoPage.readHandLabels();
    expect(openingHandLabels.length).toBeGreaterThan(0);

    await unoPage.submitFirstLegalActionLocally();
    await unoPage.restartAndExpectHand(openingHandLabels);
  });
});
