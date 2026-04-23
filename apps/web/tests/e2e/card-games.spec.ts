import { expect, test } from './card-game-pages.fixture';

test.describe('card game page fixtures', () => {
  test('UNO page can create, play, reload, and abandon an authoritative match', async ({
    unoPage,
  }) => {
    await unoPage.goto();

    const playerName = `E2E UNO ${Date.now()}`;
    await unoPage.createMatch({ playerName, preset: 'bot-duel' });
    await expect(unoPage.page.getByText(playerName)).toBeVisible();

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
