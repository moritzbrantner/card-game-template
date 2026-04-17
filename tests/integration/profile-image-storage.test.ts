import { access } from 'node:fs/promises';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { buildProfileImageUrl, deleteProfileImage, uploadProfileImage } from '@/src/profile/object-storage';

const PROFILE_IMAGE_ENV_KEYS = [
  'PROFILE_IMAGE_STORAGE_BUCKET',
  'PROFILE_IMAGE_STORAGE_REGION',
  'PROFILE_IMAGE_STORAGE_ENDPOINT',
  'PROFILE_IMAGE_STORAGE_ACCESS_KEY_ID',
  'PROFILE_IMAGE_STORAGE_SECRET_ACCESS_KEY',
  'PROFILE_IMAGE_PUBLIC_BASE_URL',
  'PROFILE_IMAGE_STORAGE_FORCE_PATH_STYLE',
] as const;

const originalEnv = Object.fromEntries(PROFILE_IMAGE_ENV_KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of PROFILE_IMAGE_ENV_KEYS) {
    const value = originalEnv[key];

    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }
});

describe('profile image storage', () => {
  it('stores profile images on local disk when object storage is not configured', async () => {
    for (const key of PROFILE_IMAGE_ENV_KEYS) {
      delete process.env[key];
    }

    const uploaded = await uploadProfileImage('local-test-user', {
      bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      mimeType: 'image/png',
      width: 128,
      height: 128,
      size: 4,
    });
    const localFilePath = path.resolve(process.cwd(), 'public', uploaded.key);

    expect(uploaded.key).toMatch(/^local-profile-images\/local-test-user\//);
    expect(uploaded.url).toBe(`/${uploaded.key}`);
    expect(buildProfileImageUrl(uploaded.key)).toBe(uploaded.url);

    // should be null or undefined
    await expect(access(localFilePath)).resolves.toBeFalsy();

    await deleteProfileImage(uploaded.key);

    await expect(access(localFilePath)).rejects.toThrow();
  });
});
