import { getComposeDatabaseUrl, getComposePostgresPort } from '@/tests/environment';

const DEFAULT_E2E_BASE_URL = 'http://127.0.0.1:3006';
const DEFAULT_AUTH_SECRET = 'e2e-auth-secret-0123456789abcdef';
const DEFAULT_MAILPIT_BASE_URL = 'http://127.0.0.1:8025';
const DEFAULT_INTERNAL_CRON_SECRET = 'e2e-internal-cron-secret';
const DEFAULT_MINIO_HOST = '127.0.0.1';
const DEFAULT_MINIO_API_PORT = '9000';
const DEFAULT_MINIO_CONSOLE_PORT = '9001';
const DEFAULT_MINIO_ROOT_USER = 'minioadmin';
const DEFAULT_MINIO_ROOT_PASSWORD = 'minioadmin';
const DEFAULT_PROFILE_IMAGE_STORAGE_BUCKET = 'profile-images';
const DEFAULT_PROFILE_IMAGE_STORAGE_REGION = 'us-east-1';

export function getE2EBaseURL() {
  return process.env.E2E_BASE_URL ?? DEFAULT_E2E_BASE_URL;
}

export function createE2EEnvironment(baseURL = getE2EBaseURL()) {
  const minioApiPort = process.env.MINIO_API_PORT ?? DEFAULT_MINIO_API_PORT;
  const storageBucket = process.env.MINIO_BUCKET ?? DEFAULT_PROFILE_IMAGE_STORAGE_BUCKET;
  const storageEndpoint = `http://${DEFAULT_MINIO_HOST}:${minioApiPort}`;
  const storagePublicBaseUrl = `${storageEndpoint}/${storageBucket}`;
  const minioRootUser = process.env.MINIO_ROOT_USER ?? DEFAULT_MINIO_ROOT_USER;
  const minioRootPassword = process.env.MINIO_ROOT_PASSWORD ?? DEFAULT_MINIO_ROOT_PASSWORD;

  return {
    ...process.env,
    E2E_BASE_URL: baseURL,
    DATABASE_URL: process.env.DATABASE_URL ?? getComposeDatabaseUrl(),
    AUTH_SECRET: DEFAULT_AUTH_SECRET,
    SITE_URL: baseURL,
    AUTH_URL: baseURL,
    NEXTAUTH_URL: baseURL,
    EMAIL_PROVIDER: 'mailpit',
    MAILPIT_BASE_URL: process.env.MAILPIT_BASE_URL ?? DEFAULT_MAILPIT_BASE_URL,
    INTERNAL_CRON_SECRET: DEFAULT_INTERNAL_CRON_SECRET,
    POSTGRES_PORT: process.env.POSTGRES_PORT ?? getComposePostgresPort(),
    MINIO_API_PORT: minioApiPort,
    MINIO_CONSOLE_PORT: process.env.MINIO_CONSOLE_PORT ?? DEFAULT_MINIO_CONSOLE_PORT,
    MINIO_ROOT_USER: minioRootUser,
    MINIO_ROOT_PASSWORD: minioRootPassword,
    MINIO_BUCKET: storageBucket,
    PROFILE_IMAGE_STORAGE_BUCKET: storageBucket,
    PROFILE_IMAGE_STORAGE_REGION: DEFAULT_PROFILE_IMAGE_STORAGE_REGION,
    PROFILE_IMAGE_STORAGE_ENDPOINT: storageEndpoint,
    PROFILE_IMAGE_STORAGE_ACCESS_KEY_ID: minioRootUser,
    PROFILE_IMAGE_STORAGE_SECRET_ACCESS_KEY: minioRootPassword,
    PROFILE_IMAGE_PUBLIC_BASE_URL: storagePublicBaseUrl,
    PROFILE_IMAGE_STORAGE_FORCE_PATH_STYLE: 'true',
  };
}

export function applyE2EEnvironment(baseURL = getE2EBaseURL()) {
  Object.assign(process.env, createE2EEnvironment(baseURL));
}
