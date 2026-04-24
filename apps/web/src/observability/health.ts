import { sql } from 'drizzle-orm';

import { getEnv } from '@/src/config/env';
import { getDb } from '@/src/db/client';
import type {
  HealthCheck,
  HealthCheckResult,
} from '@/src/observability/contracts';

export async function runHealthChecks(checks: HealthCheck[]) {
  const results = await Promise.all(checks.map((check) => check.check()));
  const ok = results.every((result) => result.status === 'pass');

  return {
    ok,
    results,
  };
}

function getObjectStorageReadiness(): HealthCheckResult {
  const env = getEnv();

  if (env.storage.configured) {
    return {
      name: 'objectStorage',
      status: 'pass',
      detail: 'Remote object storage configured.',
    };
  }

  return {
    name: 'objectStorage',
    status: 'pass',
    detail: 'Using local disk storage fallback.',
  };
}

function getEmailProviderReadiness(): HealthCheckResult {
  const env = getEnv();

  if (env.email.provider === 'mailpit' && !env.email.mailpitBaseUrl) {
    return {
      name: 'email',
      status: 'fail',
      detail: 'MAILPIT_BASE_URL is required when EMAIL_PROVIDER=mailpit.',
    };
  }

  return {
    name: 'email',
    status: 'pass',
    detail: `Using ${env.email.provider} email adapter.`,
  };
}

export function getLivenessChecks(): HealthCheck[] {
  return [
    {
      name: 'process',
      check: async () => ({
        name: 'process',
        status: 'pass',
        detail: 'Process is running.',
      }),
    },
  ];
}

export function getReadinessChecks(): HealthCheck[] {
  return [
    {
      name: 'postgres',
      check: async () => {
        try {
          await getDb().execute(sql`select 1`);

          return {
            name: 'postgres',
            status: 'pass',
            detail: 'Database connection ready.',
          };
        } catch (error) {
          return {
            name: 'postgres',
            status: 'fail',
            detail:
              error instanceof Error
                ? error.message
                : 'Database connection failed.',
          };
        }
      },
    },
    {
      name: 'objectStorage',
      check: async () => getObjectStorageReadiness(),
    },
    {
      name: 'email',
      check: async () => getEmailProviderReadiness(),
    },
  ];
}
