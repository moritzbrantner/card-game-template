import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(testFileDir, '../..');

function readAppFile(relativePath: string) {
  return readFileSync(path.join(appRoot, relativePath), 'utf8');
}

function parseEnvExample(source: string) {
  const entries = new Map<string, string>();

  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex);
    const value = trimmed
      .slice(separatorIndex + 1)
      .replace(/^"|"$/g, '');

    entries.set(key, value);
  }

  return entries;
}

describe('local service configuration', () => {
  it('documents compose-backed Postgres settings in .env.example', () => {
    const env = parseEnvExample(readAppFile('.env.example'));

    expect(env.get('POSTGRES_PORT')).toBe('55433');
    expect(env.get('DATABASE_URL')).toBe(
      'postgresql://postgres:postgres@127.0.0.1:55433/next_template?schema=public',
    );
    expect(env.get('DEV_DB_PORT')).toBe('55434');
    expect(env.get('DEV_DB_NAME')).toBe('next_template');
    expect(env.get('DEV_DB_USER')).toBe('postgres');
    expect(env.get('DEV_DB_PASSWORD')).toBe('postgres');
    expect(env.get('DEV_DB_NETWORK_MODE')).toBe('auto');
    expect(env.get('DB_BOOTSTRAP_TIMEOUT_SECONDS')).toBe('90');
  });

  it('documents the ephemeral test database defaults in .env.e2e.example', () => {
    const env = parseEnvExample(readAppFile('.env.e2e.example'));

    expect(env.get('POSTGRES_PORT')).toBe('55435');
    expect(env.get('TEST_POSTGRES_PORT')).toBe('55435');
    expect(env.get('E2E_MANAGED_DATABASE')).toBe('1');
    expect(env.get('DATABASE_URL')).toBe(
      'postgresql://postgres:postgres@127.0.0.1:55435/next_template?schema=public',
    );
  });

  it('defines both long-lived and ephemeral Postgres compose services', () => {
    const compose = readAppFile('docker-compose.yml');

    expect(compose).toContain('postgres:');
    expect(compose).toContain('postgres-dev:');
    expect(compose).toContain('postgres-dev-host:');
    expect(compose).toContain('postgres-test:');
    expect(compose).toContain('${POSTGRES_PORT:-55433}:5432');
    expect(compose).toContain('${DEV_DB_PORT:-55434}:5432');
    expect(compose).toContain('${TEST_POSTGRES_PORT:-55435}:5432');
    expect(compose).toContain('network_mode: host');
    expect(compose).toContain('/var/lib/postgresql/data:rw');
  });
});
