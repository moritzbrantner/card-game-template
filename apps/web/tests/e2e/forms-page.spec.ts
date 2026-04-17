import { expect, test } from '@playwright/test';
import { expectStatusMessage, gotoAndWaitForHydration } from '@/tests/e2e/helpers';

test('user can navigate to the forms page and submit all fields', async ({ page }) => {
  await gotoAndWaitForHydration(page, '/en');

  await page.getByRole('link', { name: 'Open Form Example' }).click();
  await expect(page).toHaveURL('/en/examples/forms');

  await page.getByLabel('First name').fill('Jane');
  await page.getByLabel('Last name').fill('Doe');
  await page.getByLabel('Email').fill('jane@example.com');
  await page.getByLabel('Phone').fill('5551234567');
  await page.getByLabel('Age', { exact: true }).fill('34');
  await page.getByLabel('Job title').fill('Engineering Manager');
  await page.getByLabel('Start date').fill('2024-03-01');
  await page.getByLabel('Department').selectOption('Engineering');
  await page.getByLabel('Subscribe to newsletter').check();
  await page.getByLabel('Short bio').fill('I have worked in product engineering for more than a decade.');

  await page.getByRole('button', { name: 'Submit profile' }).click();

  await expectStatusMessage(page, 'Jane Doe submitted their profile for the Engineering team.');
});

test('form displays validation errors when required fields are empty', async ({ page }) => {
  await gotoAndWaitForHydration(page, '/en/examples/forms');

  await page.getByRole('button', { name: 'Submit profile' }).click();

  await expect(page.getByText('First name is required.')).toBeVisible();
  await expect(page.getByText('Last name is required.')).toBeVisible();
  await expect(page.getByText('Please enter a valid email.')).toBeVisible();
  await expect(page.getByText('Job title is required.')).toBeVisible();
  await expect(page.getByText('Start date is required.')).toBeVisible();
  await expect(page.getByText('Bio must be at least 20 characters.')).toBeVisible();
});
