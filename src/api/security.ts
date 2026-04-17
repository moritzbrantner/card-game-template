import { eq, lte, sql } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import { securityAuditLogs, securityRateLimitCounters } from "@/src/db/schema";

export type AuditOutcome = "allowed" | "denied" | "error" | "rate_limited";

export type AuditRecord = {
  actorId: string | null;
  action: string;
  outcome: AuditOutcome;
  statusCode: number;
  metadata?: Record<string, unknown>;
};

export type RateLimitResult =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; retryAfterSeconds: number; resetAt: number };

export interface RateLimitAdapter {
  incrementWindow(input: {
    key: string;
    now: number;
    windowMs: number;
    maxRequests: number;
  }): Promise<{ count: number; resetAt: number }>;
}

export interface AuditPersistenceAdapter {
  persist(record: {
    actorId: string | null;
    action: string;
    outcome: AuditOutcome;
    statusCode: number;
    metadata: Record<string, unknown>;
    timestamp: Date;
  }): Promise<void>;
}

export interface SecurityService {
  getRateLimitKey(request: Request, userId: string | null): string;
  enforceRateLimit(key: string): Promise<RateLimitResult>;
  auditAction(record: AuditRecord): Promise<void>;
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

const REDACTED = "[REDACTED]";
const BLOCKED_METADATA_KEYS = [/pass(word)?/i, /secret/i, /token/i, /authorization/i, /cookie/i, /email/i, /phone/i];

function isSensitiveKey(key: string): boolean {
  return BLOCKED_METADATA_KEYS.some((pattern) => pattern.test(key));
}

function sanitizeMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeMetadata(item));
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, nested]) => {
      if (isSensitiveKey(key)) {
        return [key, REDACTED] as const;
      }

      return [key, sanitizeMetadata(nested)] as const;
    });

    return Object.fromEntries(entries);
  }

  return value;
}

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

export class RedisRateLimitAdapter implements RateLimitAdapter {
  constructor(
    private readonly redisClient: {
      eval(script: string, options: { keys: string[]; arguments: string[] }): Promise<(number | string)[]>;
    },
  ) {}

  async incrementWindow(input: {
    key: string;
    now: number;
    windowMs: number;
    maxRequests: number;
  }): Promise<{ count: number; resetAt: number }> {
    const script = `
local counter = redis.call("GET", KEYS[1])
if not counter then
  redis.call("SET", KEYS[1], 1, "PX", ARGV[2])
  return {1, tonumber(ARGV[1]) + tonumber(ARGV[2])}
end

local nextCount = redis.call("INCR", KEYS[1])
local ttl = redis.call("PTTL", KEYS[1])
if ttl < 0 then
  redis.call("PEXPIRE", KEYS[1], ARGV[2])
  ttl = tonumber(ARGV[2])
end

return {nextCount, tonumber(ARGV[1]) + ttl}
`;

    const [count, resetAt] = await this.redisClient.eval(script, {
      keys: [input.key],
      arguments: [String(input.now), String(input.windowMs), String(input.maxRequests)],
    });

    return { count: Number(count), resetAt: Number(resetAt) };
  }
}

export class PostgresRateLimitAdapter implements RateLimitAdapter {
  async incrementWindow(input: {
    key: string;
    now: number;
    windowMs: number;
    maxRequests: number;
  }): Promise<{ count: number; resetAt: number }> {
    const db = getDb();
    const nowDate = new Date(input.now);
    const nextReset = new Date(input.now + input.windowMs);

    const [upserted] = await db
      .insert(securityRateLimitCounters)
      .values({
        key: input.key,
        count: 1,
        resetAt: nextReset,
      })
      .onConflictDoUpdate({
        target: securityRateLimitCounters.key,
        set: {
          count: 1,
          resetAt: nextReset,
        },
        setWhere: lte(securityRateLimitCounters.resetAt, nowDate),
      })
      .returning();

    if (upserted) {
      return { count: upserted.count, resetAt: upserted.resetAt.getTime() };
    }

    const [incremented] = await db
      .update(securityRateLimitCounters)
      .set({
        count: sql`${securityRateLimitCounters.count} + 1`,
      })
      .where(eq(securityRateLimitCounters.key, input.key))
      .returning();

    return {
      count: incremented?.count ?? input.maxRequests,
      resetAt: incremented?.resetAt.getTime() ?? nextReset.getTime(),
    };
  }
}

export class PostgresAuditPersistenceAdapter implements AuditPersistenceAdapter {
  async persist(record: {
    actorId: string | null;
    action: string;
    outcome: AuditOutcome;
    statusCode: number;
    metadata: Record<string, unknown>;
    timestamp: Date;
  }): Promise<void> {
    const db = getDb();

    await db.insert(securityAuditLogs).values({
      id: crypto.randomUUID(),
      actorId: record.actorId,
      action: record.action,
      outcome: record.outcome,
      statusCode: record.statusCode,
      metadata: record.metadata,
      timestamp: record.timestamp,
    });
  }
}

export class DefaultSecurityService implements SecurityService {
  constructor(
    private readonly rateLimitAdapter: RateLimitAdapter,
    private readonly auditPersistenceAdapter: AuditPersistenceAdapter,
    private readonly config: { maxRequests: number; windowMs: number } = {
      maxRequests: MAX_REQUESTS,
      windowMs: WINDOW_MS,
    },
  ) {}

  getRateLimitKey(request: Request, userId: string | null): string {
    if (userId) {
      return `user:${userId}`;
    }

    return `ip:${getClientIp(request)}`;
  }

  async enforceRateLimit(key: string): Promise<RateLimitResult> {
    const now = Date.now();

    const { count, resetAt } = await this.rateLimitAdapter.incrementWindow({
      key,
      now,
      windowMs: this.config.windowMs,
      maxRequests: this.config.maxRequests,
    });

    if (count > this.config.maxRequests) {
      return {
        ok: false,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
        resetAt,
      };
    }

    return {
      ok: true,
      remaining: this.config.maxRequests - count,
      resetAt,
    };
  }

  async auditAction(record: AuditRecord): Promise<void> {
    await this.auditPersistenceAdapter.persist({
      actorId: record.actorId,
      action: record.action,
      outcome: record.outcome,
      statusCode: record.statusCode,
      metadata: (sanitizeMetadata(record.metadata ?? {}) as Record<string, unknown>) ?? {},
      timestamp: new Date(),
    });
  }
}

const securityService = new DefaultSecurityService(
  new PostgresRateLimitAdapter(),
  new PostgresAuditPersistenceAdapter(),
);

export function getRateLimitKey(request: Request, userId: string | null): string {
  return securityService.getRateLimitKey(request, userId);
}

export async function enforceRateLimit(key: string): Promise<RateLimitResult> {
  return securityService.enforceRateLimit(key);
}

export async function auditAction(record: AuditRecord): Promise<void> {
  return securityService.auditAction(record);
}

export function createSecurityService(adapters: {
  rateLimit: RateLimitAdapter;
  audit: AuditPersistenceAdapter;
  config?: { maxRequests: number; windowMs: number };
}): SecurityService {
  return new DefaultSecurityService(adapters.rateLimit, adapters.audit, adapters.config);
}
