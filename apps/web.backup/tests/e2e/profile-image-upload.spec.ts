import { expect, test, type Locator } from '@playwright/test';

import { createSolidPngBuffer, gotoAndWaitForHydration } from '@/tests/e2e/helpers';

async function readImageState(locator: Locator) {
  return locator.evaluate((element: HTMLImageElement) => {
    const image = element as HTMLImageElement;

    return {
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      src: image.currentSrc || image.src,
    };
  });
}

test.describe('profile image uploads', () => {
  test('uploads a profile picture to object storage and renders it on private and public profiles', async ({
    page,
  }) => {
    const email = `profile-image-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
    const password = 'StrongPass123';
    const displayName = 'Profile Image User';
    const imageBuffer = createSolidPngBuffer({
      width: 256,
      height: 256,
      rgba: [16, 185, 129, 255],
    });

    await gotoAndWaitForHydration(page, '/en/register');

    await page.getByLabel('Display name').fill(displayName);
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL('/en/profile', { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible({ timeout: 20_000 });

    const publicProfileHref = await page.getByRole('link', { name: 'View public profile' }).getAttribute('href');
    expect(publicProfileHref).toBeTruthy();

    await page.getByLabel('Choose a profile picture').setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: imageBuffer,
    });

    await expect(page.getByText('Crop your picture')).toBeVisible();
    await page.getByRole('button', { name: 'Use crop' }).click();
    await expect(page.getByText('Cropped image ready to upload.')).toBeVisible();

    await page.getByRole('button', { name: 'Upload picture' }).click();
    await expect(page.getByText('Profile picture updated.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove picture' })).toBeVisible();

    const privateProfileImage = page.getByAltText('Profile picture');
    await expect
      .poll(async () => readImageState(privateProfileImage), {
        message: 'expected the private profile image to be loaded from object storage',
      })
      .toMatchObject({
        complete: true,
        naturalWidth: 512,
        naturalHeight: 512,
      });

    const privateImageState = await readImageState(privateProfileImage);
    expect(privateImageState.src).toMatch(/^http:\/\/127\.0\.0\.1:9000\/profile-images\/profile-images\//);

    const uploadedImageResponse = await page.request.get(privateImageState.src);
    expect(uploadedImageResponse.ok()).toBeTruthy();
    expect(uploadedImageResponse.headers()['content-type']).toMatch(/^image\/png\b/);
    expect((await uploadedImageResponse.body()).byteLength).toBeGreaterThan(512);

    await page.reload();
    await gotoAndWaitForHydration(page, '/en/profile');
    await expect(page.getByRole('button', { name: 'Remove picture' })).toBeVisible();
    await expect
      .poll(async () => readImageState(page.getByAltText('Profile picture')))
      .toMatchObject({
        complete: true,
        naturalWidth: 512,
        naturalHeight: 512,
        src: privateImageState.src,
      });

    await gotoAndWaitForHydration(page, publicProfileHref!);

    const publicProfileImage = page.getByRole('main').getByRole('img', { name: displayName });
    await expect
      .poll(async () => readImageState(publicProfileImage), {
        message: 'expected the public profile to render the uploaded profile image',
      })
      .toMatchObject({
        complete: true,
        naturalWidth: 512,
        naturalHeight: 512,
        src: privateImageState.src,
      });
  });
});
