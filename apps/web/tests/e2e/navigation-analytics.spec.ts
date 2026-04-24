import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';

import {
  getSeededUser,
  gotoAndWaitForHydration,
  loginWithCredentials,
  waitForAppHydration,
} from '@/tests/e2e/helpers';
import { classifyNavigationPathname } from '@/src/analytics/navigation-classification';
import { getDb } from '@/src/db/client';
import { pageVisits } from '@/src/db/schema';

const adminUser = getSeededUser('admin@example.com');
const memberUser = getSeededUser('user@example.com');

test.describe('navigation analytics', () => {
  test('captures an anonymous home to blog to login path and lets admins refine filters', async ({
    page,
  }) => {
    await seedNavigationJourney(['/en', '/en/blog', '/en/login']);

    await gotoAndWaitForHydration(page, '/en/login');
    await page.getByLabel('Email').fill(adminUser.email);
    await page.getByLabel('Password').fill(adminUser.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL('/en/profile');
    await waitForAppHydration(page);

    await gotoAndWaitForHydration(
      page,
      '/en/admin/reports/navigationJourneys?window=24h&audience=anonymous&path=/blog',
    );
    await expect(
      page.getByRole('heading', { name: 'Navigation journeys' }),
    ).toBeVisible();
    await expect(page.locator('input[name="path"]')).toHaveValue('/blog');
    await expect(
      page.getByRole('cell', { name: '/blog', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('cell', { name: '/login', exact: true }),
    ).toBeVisible();

    await page.locator('select[name="audience"]').selectOption('all');
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await expect(page).toHaveURL(/audience=all/);
  });

  test('captures an authenticated multi-page session', async ({ page }) => {
    await seedNavigationJourney(
      ['/en/people', '/en/profile', '/en/notifications'],
      memberUser.email,
    );

    await loginWithCredentials(page, adminUser.email, adminUser.password);
    await gotoAndWaitForHydration(
      page,
      '/en/admin/reports/navigationJourneys?window=24h&audience=authenticated&path=/people',
    );

    await expect(
      page.getByRole('heading', { name: 'Navigation journeys' }),
    ).toBeVisible();
    await expect(
      page.getByRole('row', { name: /\/people\s+\/profile/ }),
    ).toBeVisible();
  });
});

async function seedNavigationJourney(paths: string[], userEmail?: string) {
  const visitorId = `e2e-visitor:${randomUUID()}`;
  const sessionId = `e2e-session:${randomUUID()}`;
  const userId = userEmail ? await getUserIdByEmail(userEmail) : null;
  const startedAt = Date.now() - paths.length * 1000;
  let previousHref: string | undefined;

  for (const [index, href] of paths.entries()) {
    const pathname = getPathname(href);
    const classification = classifyNavigationPathname(pathname);
    const previousPathname = previousHref ? getPathname(previousHref) : null;
    const previousClassification = previousPathname
      ? classifyNavigationPathname(previousPathname)
      : null;

    await getDb()
      .insert(pageVisits)
      .values({
        id: randomUUID(),
        userId,
        trackingVersion: 2,
        visitorId,
        sessionId,
        href,
        pathname,
        canonicalPath: classification.canonicalPath,
        routeGroup: classification.routeGroup,
        isAuthenticated: Boolean(userId),
        previousPathname,
        previousCanonicalPath: previousClassification?.canonicalPath ?? null,
        referrerType: previousPathname ? 'internal' : 'direct',
        referrerHost: null,
        visitedAt: new Date(startedAt + index * 1000),
      });

    previousHref = href;
  }
}

function getPathname(href: string) {
  return new URL(href, 'https://e2e.local').pathname;
}

async function getUserIdByEmail(email: string) {
  const user = await getDb().query.users.findFirst({
    where: (table, { eq }) => eq(table.email, email),
    columns: {
      id: true,
    },
  });

  if (!user) {
    throw new Error(`Expected seeded user for ${email}.`);
  }

  return user.id;
}
