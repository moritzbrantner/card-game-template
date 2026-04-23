import {
  test as base,
  expect,
  type Locator,
  type Page,
  type Response,
} from '@playwright/test';

import { gotoAndWaitForHydration } from '@/tests/e2e/helpers';

type UnoPreset = 'bot-duel' | 'hotseat-duo' | 'mixed-table';

type UnoMatchSnapshotResponse = {
  matchId: string;
  status: 'active' | 'completed' | 'abandoned';
};

function isUnoApiResponse(
  response: Response,
  input: { method: string; pathname: RegExp },
) {
  const url = new URL(response.url());

  return (
    input.pathname.test(url.pathname) &&
    response.request().method() === input.method &&
    response.status() >= 200 &&
    response.status() < 400
  );
}

async function readUnoSnapshot(response: Response) {
  return (await response.json()) as UnoMatchSnapshotResponse;
}

export class UnoMatchesPage {
  constructor(readonly page: Page) {}

  get legalActions(): Locator {
    return this.page.getByRole('group', { name: 'Legal actions' });
  }

  async goto() {
    await gotoAndWaitForHydration(this.page, '/en/uno');
    await expect(
      this.page.getByRole('heading', { name: 'UNO-style matches' }),
    ).toBeVisible();
  }

  async createMatch(input: { playerName: string; preset?: UnoPreset }) {
    await this.page.getByLabel('Player name').fill(input.playerName);
    await this.page
      .getByLabel('Preset')
      .selectOption(input.preset ?? 'bot-duel');

    const createResponsePromise = this.page.waitForResponse((response) =>
      isUnoApiResponse(response, {
        method: 'POST',
        pathname: /^\/api\/games\/uno\/matches$/,
      }),
    );

    await this.page.getByRole('button', { name: 'Create match' }).click();
    const snapshot = await readUnoSnapshot(await createResponsePromise);

    await expect(this.page.getByText('Match created.')).toBeVisible();
    await expect(
      this.page.getByRole('heading', { exact: true, name: 'Active match' }),
    ).toBeVisible();

    return snapshot.matchId;
  }

  async submitFirstLegalAction() {
    const actionButton = this.legalActions.getByRole('button').first();
    await expect(actionButton).toBeVisible();

    const moveResponsePromise = this.page.waitForResponse((response) =>
      isUnoApiResponse(response, {
        method: 'POST',
        pathname: /^\/api\/games\/uno\/matches\/[^/]+\/moves$/,
      }),
    );

    await actionButton.click();
    await readUnoSnapshot(await moveResponsePromise);
    await expect(
      this.page.getByText(/\d+ accepted moves/).first(),
    ).toBeVisible();
  }

  async reloadMatchFromPage() {
    const reloadResponsePromise = this.page.waitForResponse((response) =>
      isUnoApiResponse(response, {
        method: 'GET',
        pathname: /^\/api\/games\/uno\/matches$/,
      }),
    );

    await this.page.getByRole('button', { name: 'Reload' }).click();
    await reloadResponsePromise;
    await expect(
      this.page.getByRole('heading', { exact: true, name: 'Active match' }),
    ).toBeVisible();
  }

  async abandonCurrentMatch() {
    const abandonResponsePromise = this.page.waitForResponse((response) =>
      isUnoApiResponse(response, {
        method: 'POST',
        pathname: /^\/api\/games\/uno\/matches\/[^/]+\/abandon$/,
      }),
    );

    await this.page.getByRole('button', { name: 'Abandon match' }).click();
    const snapshot = await readUnoSnapshot(await abandonResponsePromise);

    await expect(this.page.getByText('Match abandoned.')).toBeVisible();
    await expect(
      this.page.getByRole('button', { name: 'Abandon match' }),
    ).toBeHidden();

    return snapshot.matchId;
  }

  async openPastGames() {
    await this.page.getByRole('link', { name: 'Past games' }).click();
    await expect(this.page).toHaveURL('/en/past-games');
    await expect(
      this.page.getByRole('heading', { exact: true, name: 'Past games' }),
    ).toBeVisible();
  }
}

export class PastGamesPage {
  constructor(readonly page: Page) {}

  async goto() {
    await gotoAndWaitForHydration(this.page, '/en/past-games');
    await expect(
      this.page.getByRole('heading', { exact: true, name: 'Past games' }),
    ).toBeVisible();
  }

  async openReplayForPlayer(playerName: string) {
    const replayLink = this.page
      .getByRole('link')
      .filter({ hasText: playerName })
      .first();
    await expect(replayLink).toBeVisible();
    await replayLink.click();
    await expect(
      this.page.getByText(/^Replay (completed|abandoned) match /),
    ).toBeVisible();
  }

  async returnToUnoPage() {
    await this.page.getByRole('link', { name: 'Back to lobbies' }).click();
    await expect(this.page).toHaveURL('/en/uno');
    await expect(
      this.page.getByRole('heading', { name: 'UNO-style matches' }),
    ).toBeVisible();
  }
}

export class PastGameReplayPage {
  constructor(readonly page: Page) {}

  async goto(matchId: string) {
    await gotoAndWaitForHydration(this.page, `/en/past-games/${matchId}`);
    await expect(
      this.page.getByText(/^Replay (completed|abandoned) match /),
    ).toBeVisible();
  }

  async switchPerspective(label: string) {
    await this.page.getByRole('button', { name: label }).click();
    await expect(
      this.page.getByRole('button', { name: label }),
    ).toHaveAttribute('aria-pressed', 'true');
  }

  async scrubToOpeningState() {
    await this.page.getByRole('slider', { name: 'Replay step' }).fill('0');
    await expect(
      this.page.getByRole('heading', { name: 'Opening state' }),
    ).toBeVisible();
  }

  async returnToPastGames() {
    await this.page.getByRole('link', { name: 'Back to past games' }).click();
    await expect(this.page).toHaveURL('/en/past-games');
    await expect(
      this.page.getByRole('heading', { exact: true, name: 'Past games' }),
    ).toBeVisible();
  }
}

type CardGamePageFixtures = {
  pastGamesPage: PastGamesPage;
  replayPage: PastGameReplayPage;
  unoPage: UnoMatchesPage;
};

export const test = base.extend<CardGamePageFixtures>({
  pastGamesPage: async ({ page }, use) => {
    await use(new PastGamesPage(page));
  },
  replayPage: async ({ page }, use) => {
    await use(new PastGameReplayPage(page));
  },
  unoPage: async ({ page }, use) => {
    await use(new UnoMatchesPage(page));
  },
});

export { expect };
