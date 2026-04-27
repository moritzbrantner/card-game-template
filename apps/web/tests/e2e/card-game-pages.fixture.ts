import {
  test as base,
  expect,
  type Locator,
  type Page,
  type Response,
} from '@playwright/test';

import { gotoAndWaitForHydration } from '@/tests/e2e/helpers';

type UnoPreset = 'bot-duel' | 'hotseat-duo' | 'mixed-table';
type PokerPreset = 'heads-up' | 'four-seat-bots';

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

class PokerMatchesPage {
  constructor(readonly page: Page) {}

  get legalActions(): Locator {
    return this.page.getByRole('group', { name: 'Legal actions' });
  }

  async goto() {
    await gotoAndWaitForHydration(this.page, '/en/poker');
    await expect(
      this.page.getByRole('heading', { name: 'Texas Hold’em matches' }),
    ).toBeVisible();
  }

  async createMatch(input: { playerName: string; preset?: PokerPreset }) {
    await this.page.getByLabel('Player name').fill(input.playerName);
    await this.page
      .getByLabel('Preset')
      .selectOption(input.preset ?? 'heads-up');

    const createResponsePromise = this.page.waitForResponse((response) =>
      isUnoApiResponse(response, {
        method: 'POST',
        pathname: /^\/api\/games\/poker\/matches$/,
      }),
    );

    await this.page.getByRole('button', { name: 'Create match' }).click();
    const snapshot = await readUnoSnapshot(await createResponsePromise);

    await expect(this.page.getByText('Match created.')).toBeVisible();
    await expect(
      this.page.getByRole('heading', { exact: true, name: 'Active table' }),
    ).toBeVisible();

    return snapshot.matchId;
  }

  async submitFirstLegalAction() {
    const actionButton = this.legalActions.getByRole('button').first();
    await expect(actionButton).toBeVisible();

    const moveResponsePromise = this.page.waitForResponse((response) =>
      isUnoApiResponse(response, {
        method: 'POST',
        pathname: /^\/api\/games\/poker\/matches\/[^/]+\/moves$/,
      }),
    );

    await actionButton.click();
    await readUnoSnapshot(await moveResponsePromise);
  }

  async reloadMatchFromPage() {
    const reloadResponsePromise = this.page.waitForResponse((response) =>
      isUnoApiResponse(response, {
        method: 'GET',
        pathname: /^\/api\/games\/poker\/matches$/,
      }),
    );

    await this.page.getByRole('button', { name: 'Reload' }).click();
    await reloadResponsePromise;
    await expect(
      this.page.getByRole('heading', { exact: true, name: 'Active table' }),
    ).toBeVisible();
  }
}

class Phase10Page {
  constructor(readonly page: Page) {}

  get legalActions(): Locator {
    return this.page.getByRole('group', { name: 'Legal actions' });
  }

  async goto() {
    await gotoAndWaitForHydration(this.page, '/en/phase-10');
    await expect(
      this.page.getByRole('heading', { name: 'Phase 10 local showcase' }),
    ).toBeVisible();
  }

  async configureBotDuelRound() {
    await this.page.getByRole('button', { name: 'Bot duel' }).click();
    await this.page.getByRole('button', { name: 'Add set' }).click();
    await this.page.getByRole('button', { name: 'Size +' }).nth(0).click();
    await this.page.getByRole('button', { name: 'Size +' }).nth(1).click();
    await this.page.getByRole('button', { name: 'Size +' }).nth(2).click();
    await this.page.getByRole('button', { name: 'Size +' }).nth(2).click();
    await this.page
      .getByRole('button', { name: 'Start configured round' })
      .click();

    await expect(
      this.page.getByText('Phase 1: 3 sets of 4', { exact: true }).first(),
    ).toBeVisible();
  }

  async verifyLegalActionsAreAvailable() {
    await expect(this.legalActions.getByRole('button').first()).toBeVisible();
  }
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
      .getByLabel('Table size')
      .selectOption(
        input.preset === 'hotseat-duo' || input.preset === 'bot-duel'
          ? '2'
          : '4',
      );
    await this.page
      .getByLabel('Bots')
      .selectOption(input.preset === 'bot-duel' ? '1' : '0');

    const createResponsePromise = this.page.waitForResponse((response) =>
      isUnoApiResponse(response, {
        method: 'POST',
        pathname: /^\/api\/games\/rooms$/,
      }),
    );

    await this.page.getByRole('button', { name: 'Create lobby' }).click();
    await createResponsePromise;

    await expect(
      this.page.getByRole('heading', { exact: true, name: 'Current lobby' }),
    ).toBeVisible();

    const readyResponsePromise = this.page.waitForResponse((response) =>
      isUnoApiResponse(response, {
        method: 'POST',
        pathname: /^\/api\/games\/rooms\/[^/]+\/ready$/,
      }),
    );
    await this.page.getByRole('button', { name: 'Ready up' }).click();
    await readyResponsePromise;

    const startResponsePromise = this.page.waitForResponse((response) =>
      isUnoApiResponse(response, {
        method: 'POST',
        pathname: /^\/api\/games\/rooms\/[^/]+\/start$/,
      }),
    );
    await this.page.getByRole('button', { name: 'Start game' }).click();
    const room = (await (await startResponsePromise).json()) as {
      activeMatchId?: string | null;
    };

    await expect(
      this.page.getByRole('heading', { exact: true, name: 'Active match' }),
    ).toBeVisible();

    return room.activeMatchId ?? '';
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
    const reloadResponsePromise = this.page.waitForResponse((response) => {
      const url = new URL(response.url());

      return (
        response.request().method() === 'GET' &&
        response.status() >= 200 &&
        response.status() < 400 &&
        (/^\/api\/games\/uno\/matches\/[^/]+$/.test(url.pathname) ||
          /^\/api\/games\/rooms$/.test(url.pathname))
      );
    });

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
  phase10Page: Phase10Page;
  pokerPage: PokerMatchesPage;
  replayPage: PastGameReplayPage;
  unoPage: UnoMatchesPage;
};

export const test = base.extend<CardGamePageFixtures>({
  pastGamesPage: async ({ page }, use) => {
    await use(new PastGamesPage(page));
  },
  phase10Page: async ({ page }, use) => {
    await use(new Phase10Page(page));
  },
  pokerPage: async ({ page }, use) => {
    await use(new PokerMatchesPage(page));
  },
  replayPage: async ({ page }, use) => {
    await use(new PastGameReplayPage(page));
  },
  unoPage: async ({ page }, use) => {
    await use(new UnoMatchesPage(page));
  },
});

export { expect };
