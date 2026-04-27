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

  test('UNO page can create, play, reload, and abandon an authoritative match', async ({
    unoPage,
  }) => {
    await unoPage.goto();

    const playerName = `E2E UNO ${Date.now()}`;
    await unoPage.createMatch({ playerName, preset: 'bot-duel' });
    await expect(
      unoPage.page.getByText(playerName, { exact: true }),
    ).toBeVisible();

    await unoPage.submitFirstLegalAction();
    await unoPage.reloadMatchFromPage();
    await unoPage.abandonCurrentMatch();
  });

  test('past games page can open a replay and navigate back to lobbies', async ({
    pastGamesPage,
    unoPage,
  }) => {
    await unoPage.goto();

    const playerName = `E2E Past ${Date.now()}`;
    await unoPage.createMatch({ playerName, preset: 'bot-duel' });
    await unoPage.abandonCurrentMatch();
    await unoPage.openPastGames();

    await pastGamesPage.openReplayForPlayer(playerName);
    await pastGamesPage.goto();
    await pastGamesPage.returnToUnoPage();
  });

  test('replay page can switch perspectives, scrub timeline, and return to past games', async ({
    replayPage,
    unoPage,
  }) => {
    await unoPage.goto();

    const playerName = `E2E Replay ${Date.now()}`;
    const matchId = await unoPage.createMatch({
      playerName,
      preset: 'bot-duel',
    });
    await unoPage.submitFirstLegalAction();
    await unoPage.abandonCurrentMatch();

    await replayPage.goto(matchId);
    await replayPage.switchPerspective(playerName);
    await replayPage.switchPerspective("Bird's eye");
    await replayPage.scrubToOpeningState();
    await replayPage.returnToPastGames();
  });
});
