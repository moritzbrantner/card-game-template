import {
  test as base,
  expect,
  type Locator,
  type Page,
  type Request,
  type Response,
} from '@playwright/test';

import { gotoAndWaitForHydration } from '@/tests/e2e/helpers';

type PokerPreset = 'heads-up' | 'four-seat-bots';

type MatchSnapshotResponse = {
  matchId: string;
  status: 'active' | 'completed' | 'abandoned';
};

function isGameApiResponse(
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

async function readMatchSnapshot(response: Response) {
  return (await response.json()) as MatchSnapshotResponse;
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
      isGameApiResponse(response, {
        method: 'POST',
        pathname: /^\/api\/games\/poker\/matches$/,
      }),
    );

    await this.page.getByRole('button', { name: 'Create match' }).click();
    const snapshot = await readMatchSnapshot(await createResponsePromise);

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
      isGameApiResponse(response, {
        method: 'POST',
        pathname: /^\/api\/games\/poker\/matches\/[^/]+\/moves$/,
      }),
    );

    await actionButton.click();
    await readMatchSnapshot(await moveResponsePromise);
  }

  async reloadMatchFromPage() {
    const reloadResponsePromise = this.page.waitForResponse((response) =>
      isGameApiResponse(response, {
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

  get hand(): Locator {
    return this.page.locator('section[aria-labelledby="hand-heading"]');
  }

  get legalActions(): Locator {
    return this.page.getByRole('group', { name: 'Your move' });
  }

  async goto() {
    await gotoAndWaitForHydration(this.page, '/en/uno');
    await expect(
      this.page.getByRole('heading', { exact: true, name: 'UNO-style' }),
    ).toBeVisible();
  }

  async verifyLocalBotMatch() {
    await expect(
      this.page.getByText('Player One', { exact: true }),
    ).toBeVisible();
    await expect(
      this.page.getByText('House Bot', { exact: true }),
    ).toBeVisible();
    await expect(this.legalActions.getByRole('button').first()).toBeVisible();
  }

  async readHandLabels() {
    return this.hand.locator('[aria-label]').evaluateAll((elements) =>
      elements
        .map((element) => element.getAttribute('aria-label'))
        .filter((label): label is string => Boolean(label)),
    );
  }

  async submitFirstLegalActionLocally() {
    const gameApiRequests: string[] = [];
    const recordGameApiRequest = (request: Request) => {
      const pathname = new URL(request.url()).pathname;

      if (pathname.startsWith('/api/games/')) {
        gameApiRequests.push(pathname);
      }
    };

    this.page.on('request', recordGameApiRequest);

    try {
      const actionButton = this.legalActions.getByRole('button').first();
      await expect(actionButton).toBeVisible();
      await expect(actionButton).toBeEnabled();
      await actionButton.click();
      await expect(this.legalActions.getByRole('button').first()).toBeVisible();
    } finally {
      this.page.off('request', recordGameApiRequest);
    }

    expect(gameApiRequests).toEqual([]);
  }

  async restartAndExpectHand(openingHandLabels: string[]) {
    await this.page.getByRole('button', { name: 'Restart match' }).click();
    await expect.poll(() => this.readHandLabels()).toEqual(openingHandLabels);
  }
}

type CardGamePageFixtures = {
  phase10Page: Phase10Page;
  pokerPage: PokerMatchesPage;
  unoPage: UnoMatchesPage;
};

export const test = base.extend<CardGamePageFixtures>({
  phase10Page: async ({ page }, use) => {
    await use(new Phase10Page(page));
  },
  pokerPage: async ({ page }, use) => {
    await use(new PokerMatchesPage(page));
  },
  unoPage: async ({ page }, use) => {
    await use(new UnoMatchesPage(page));
  },
});

export { expect };
