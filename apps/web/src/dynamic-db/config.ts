import { profiles, securityAuditLogs, securityRateLimitCounters, users } from '@/src/db/schema';

export type WritableTableConfig = {
  name: string;
  label: string;
  description?: string;
  table: typeof users | typeof profiles | typeof securityAuditLogs | typeof securityRateLimitCounters;
  includeFields?: string[];
  excludeFields?: string[];
  includeDefaultedFields?: boolean;
};

export const writableTableConfigs: WritableTableConfig[] = [
  {
    name: 'Profile',
    label: 'Profile',
    description: 'Create profile records from a schema-driven form.',
    table: profiles,
    includeFields: ['id', 'userId', 'bio', 'locale', 'timezone'],
  },
  {
    name: 'SecurityRateLimitCounter',
    label: 'Security Rate Limit Counter',
    description: 'Create or repair security rate-limit rows.',
    table: securityRateLimitCounters,
    includeFields: ['key', 'count', 'resetAt'],
  },
  {
    name: 'SecurityAuditLog',
    label: 'Security Audit Log',
    description: 'Create security audit entries manually.',
    table: securityAuditLogs,
    includeFields: ['id', 'actorId', 'action', 'outcome', 'statusCode', 'metadata', 'timestamp'],
    includeDefaultedFields: true,
  },
  {
    name: 'User',
    label: 'User',
    description: 'Create local user records (admin use only).',
    table: users,
    includeFields: ['id', 'email', 'name', 'role', 'passwordHash'],
  },
];

export const writableTableMap = Object.fromEntries(
  writableTableConfigs.map((config) => [config.name, config.table]),
) as Record<string, WritableTableConfig['table']>;
