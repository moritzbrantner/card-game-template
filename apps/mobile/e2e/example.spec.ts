import { expect, test } from '@playwright/test';

test('mobile web smoke flow covers navigation, theme, profile, and gameplay', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.getByText('Welcome!')).toBeVisible();

  const darkThemeButton = page.getByTestId('theme-dark-button');
  await page.getByRole('tab', { name: /Settings/ }).click();
  await expect(darkThemeButton).toBeVisible();
  await darkThemeButton.click();

  await page.getByRole('tab', { name: /Home/ }).click();
  await expect(page.getByText('Profiles')).toBeVisible();

  await page.getByTestId('home-profile-link-current').click();
  await expect(page.getByText('Mobile profile', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/profile\/@/);

  await page.goto('/');
  await expect(page.getByText('Profiles')).toBeVisible();

  await page.getByRole('tab', { name: /UNO-style/ }).click();
  await expect(page.getByText('Legal actions')).toBeVisible();
});
