import { expect, test } from '@playwright/test';

import { gotoAndWaitForHydration, waitForMailpitMessage } from '@/tests/e2e/helpers';

test.describe('communication page', () => {
  test('subscribes to the newsletter and sends a welcome email', async ({ page }) => {
    const email = `newsletter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

    await gotoAndWaitForHydration(page, '/en/examples/communication');

    await page.getByLabel('Email address').fill(email);
    await page.getByRole('button', { name: 'Subscribe' }).click();

    await expect(page.getByRole('status')).toContainText(
      'You are subscribed. Check your inbox for the welcome message.',
    );

    const message = await waitForMailpitMessage({
      to: email,
      subject: 'You are subscribed to the newsletter',
    });

    expect(message.raw).toContain('/en/examples/communication');
  });
});
