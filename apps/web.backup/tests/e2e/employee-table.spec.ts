import { expect, test } from '@playwright/test';
import { gotoAndWaitForHydration } from '@/tests/e2e/helpers';

test('the employee REST table page displays, sorts, and filters data', async ({ page }) => {
  await gotoAndWaitForHydration(page, '/en/table');

  await expect(page.getByRole('heading', { name: 'Employee table' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'First name' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Ava', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'ava.thompson@example.com' })).toBeVisible();

  const firstNameCells = page.locator('tbody tr td:nth-child(2)');
  await expect(firstNameCells.first()).toHaveText('Ava');

  await page.getByRole('button', { name: 'Salary (USD)' }).click();
  await expect(firstNameCells.first()).toHaveText('Mila');

  await page.getByRole('button', { name: 'Salary (USD)' }).click();
  await expect(firstNameCells.first()).toHaveText('Noah');

  await page.getByLabel('Filter Team').fill('Engineering');
  await expect(page.getByRole('cell', { name: 'Ava', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Noah', exact: true })).toHaveCount(0);

  await page.getByLabel('Filter Team').fill('');
  await page.getByLabel('Filter Active').selectOption('false');
  await expect(page.getByRole('cell', { name: 'Mila', exact: true })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(1);
});
