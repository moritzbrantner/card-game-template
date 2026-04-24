import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { getEnv } from '@/src/config/env';
import type { ValidatedImageUpload } from '@/src/profile/image-validation';

export type StoredProfileImage = {
  key: string;
  url: string;
};

type S3Module = typeof import('@aws-sdk/client-s3');

const LOCAL_PROFILE_IMAGE_PREFIX = 'local-profile-images/';

let s3ModulePromise: Promise<S3Module> | null = null;

function loadS3Module() {
  if (!s3ModulePromise) {
    s3ModulePromise = import('@aws-sdk/client-s3');
  }

  return s3ModulePromise;
}

function requireEnv(name: string) {
  const env = getEnv();
  const value = (() => {
    switch (name) {
      case 'PROFILE_IMAGE_STORAGE_ACCESS_KEY_ID':
        return env.storage.accessKeyId;
      case 'PROFILE_IMAGE_STORAGE_SECRET_ACCESS_KEY':
        return env.storage.secretAccessKey;
      case 'PROFILE_IMAGE_STORAGE_BUCKET':
        return env.storage.bucket;
      default:
        return undefined;
    }
  })();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function getClient() {
  const { S3Client } = await loadS3Module();

  return new S3Client({
    region: getEnv().storage.region,
    endpoint: getEnv().storage.endpoint,
    forcePathStyle: getEnv().storage.forcePathStyle,
    credentials: {
      accessKeyId: requireEnv('PROFILE_IMAGE_STORAGE_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('PROFILE_IMAGE_STORAGE_SECRET_ACCESS_KEY'),
    },
  });
}

function getBucket() {
  return requireEnv('PROFILE_IMAGE_STORAGE_BUCKET');
}

function getPublicBaseUrl() {
  const raw = getEnv().storage.publicBaseUrl;
  if (!raw) {
    return null;
  }

  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

function isObjectStorageConfigured() {
  return getEnv().storage.configured;
}

function isLocalProfileImageKey(keyOrUrl: string) {
  return (
    keyOrUrl.startsWith(LOCAL_PROFILE_IMAGE_PREFIX) ||
    keyOrUrl.startsWith(`/${LOCAL_PROFILE_IMAGE_PREFIX}`)
  );
}

function getLocalProfileImagePath(keyOrUrl: string) {
  const normalizedKey = keyOrUrl.startsWith('/') ? keyOrUrl.slice(1) : keyOrUrl;
  return path.resolve(process.cwd(), 'public', normalizedKey);
}

function extensionForMime(mimeType: string) {
  if (mimeType === 'image/png') {
    return 'png';
  }

  if (mimeType === 'image/jpeg') {
    return 'jpg';
  }

  return 'bin';
}

export function buildProfileImageUrl(keyOrUrl: string | null | undefined) {
  if (!keyOrUrl) {
    return null;
  }

  if (keyOrUrl.startsWith('data:')) {
    return keyOrUrl;
  }

  if (keyOrUrl.startsWith('http://') || keyOrUrl.startsWith('https://')) {
    return keyOrUrl;
  }

  if (keyOrUrl.startsWith('/')) {
    return keyOrUrl;
  }

  if (isLocalProfileImageKey(keyOrUrl)) {
    return `/${keyOrUrl}`;
  }

  const baseUrl = getPublicBaseUrl();
  return baseUrl ? `${baseUrl}/${keyOrUrl}` : null;
}

async function uploadProfileImageToLocalDisk(
  userId: string,
  image: ValidatedImageUpload,
): Promise<StoredProfileImage> {
  const key = `${LOCAL_PROFILE_IMAGE_PREFIX}${userId}/${Date.now()}-${crypto.randomUUID()}.${extensionForMime(image.mimeType)}`;
  const filePath = getLocalProfileImagePath(key);

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, image.bytes);

  return {
    key,
    url: `/${key}`,
  };
}

export async function uploadProfileImage(
  userId: string,
  image: ValidatedImageUpload,
): Promise<StoredProfileImage> {
  if (!isObjectStorageConfigured()) {
    return uploadProfileImageToLocalDisk(userId, image);
  }

  const { PutObjectCommand } = await loadS3Module();
  const key = `profile-images/${userId}/${Date.now()}-${crypto.randomUUID()}.${extensionForMime(image.mimeType)}`;
  const client = await getClient();

  await client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: image.bytes,
      ContentType: image.mimeType,
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: {
        userId,
        width: String(image.width),
        height: String(image.height),
      },
    }),
  );

  return {
    key,
    url: buildProfileImageUrl(key) ?? key,
  };
}

export async function deleteProfileImage(keyOrUrl: string | null | undefined) {
  if (!keyOrUrl) {
    return;
  }

  if (keyOrUrl.startsWith('data:')) {
    return;
  }

  if (isLocalProfileImageKey(keyOrUrl)) {
    await rm(getLocalProfileImagePath(keyOrUrl), { force: true });
    return;
  }

  if (!isObjectStorageConfigured()) {
    return;
  }

  const { DeleteObjectCommand } = await loadS3Module();
  const baseUrl = getPublicBaseUrl();
  const key =
    baseUrl && keyOrUrl.startsWith(`${baseUrl}/`)
      ? keyOrUrl.replace(`${baseUrl}/`, '')
      : keyOrUrl;
  const client = await getClient();

  await client.send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: key,
    }),
  );
}
