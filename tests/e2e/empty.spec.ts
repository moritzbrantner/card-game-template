import { test, expect } from '@playwright/test';

test('empty e2e smoke test', async ({ page }) => {
  await page.goto('data:text/html,<title>e2e</title><h1>ok</h1>');
  await expect(page).toHaveTitle('e2e');
});
