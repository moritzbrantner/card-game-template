import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { getEnv } from '@/src/config/env';
import * as schema from '@/src/db/schema';
import { getLogger } from '@/src/observability/logger';

const globalForDb = globalThis as unknown as {
  pool?: Pool;
  db?: ReturnType<typeof drizzle<typeof schema>>;
};

export function getDb() {
  if (globalForDb.db) {
    return globalForDb.db;
  }

  const connectionString = getEnv().database.url;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const pool =
    globalForDb.pool ??
    new Pool({
      connectionString,
    });

  pool.on('error', (error) => {
    getLogger({ subsystem: 'db' }).warn({ err: error }, 'Idle client error');
  });

  const db = drizzle(pool, { schema });

  globalForDb.pool = pool;
  globalForDb.db = db;

  return db;
}
