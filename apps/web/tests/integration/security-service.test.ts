import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSecurityService, type AuditOutcome, type RateLimitAdapter } from "@/src/api/security";

class FakeWindowedRateLimitAdapter implements RateLimitAdapter {
  private readonly store = new Map<string, { count: number; resetAt: number }>();

  async incrementWindow(input: {
    key: string;
    now: number;
    windowMs: number;
    maxRequests: number;
  }): Promise<{ count: number; resetAt: number }> {
    const current = this.store.get(input.key);

    if (!current || current.resetAt <= input.now) {
      const resetAt = input.now + input.windowMs;
      const record = { count: 1, resetAt };
      this.store.set(input.key, record);
      return record;
    }

    current.count += 1;
    this.store.set(input.key, current);

    return current;
  }
}

describe("security service", () => {
  const auditRows: Array<{
    actorId: string | null;
    action: string;
    outcome: AuditOutcome;
    statusCode: number;
    metadata: Record<string, unknown>;
    timestamp: Date;
  }> = [];

  beforeEach(() => {
    auditRows.length = 0;
    vi.useRealTimers();
  });

  it("returns 429 after max requests and preserves reset window semantics", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));

    const service = createSecurityService({
      rateLimit: new FakeWindowedRateLimitAdapter(),
      audit: {
        async persist(record) {
          auditRows.push(record);
        },
      },
      config: {
        maxRequests: 2,
        windowMs: 1_000,
      },
    });

    const first = await service.enforceRateLimit("ip:test");
    const second = await service.enforceRateLimit("ip:test");
    const third = await service.enforceRateLimit("ip:test");

    expect(first).toMatchObject({ ok: true, remaining: 1 });
    expect(second).toMatchObject({ ok: true, remaining: 0 });
    expect(third).toMatchObject({ ok: false });
    if (!third.ok) {
      expect(third.retryAfterSeconds).toBe(1);
      expect(third.resetAt).toBe(new Date("2024-01-01T00:00:01.000Z").getTime());
    }
  });

  it("resets the counter when the window expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));

    const service = createSecurityService({
      rateLimit: new FakeWindowedRateLimitAdapter(),
      audit: {
        async persist(record) {
          auditRows.push(record);
        },
      },
      config: {
        maxRequests: 1,
        windowMs: 500,
      },
    });

    const first = await service.enforceRateLimit("user:u1");
    const second = await service.enforceRateLimit("user:u1");

    vi.setSystemTime(new Date("2024-01-01T00:00:00.600Z"));
    const third = await service.enforceRateLimit("user:u1");

    expect(first).toMatchObject({ ok: true, remaining: 0 });
    expect(second).toMatchObject({ ok: false });
    expect(third).toMatchObject({ ok: true, remaining: 0 });
  });

  it("persists sanitized audit rows", async () => {
    const service = createSecurityService({
      rateLimit: new FakeWindowedRateLimitAdapter(),
      audit: {
        async persist(record) {
          auditRows.push(record);
        },
      },
      config: {
        maxRequests: 2,
        windowMs: 1_000,
      },
    });

    await service.auditAction({
      actorId: "admin_1",
      action: "viewReports",
      outcome: "allowed",
      statusCode: 200,
      metadata: {
        requestId: "req-1",
        accessToken: "token-value",
        nested: {
          password: "secret-value",
        },
      },
    });

    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]).toMatchObject({
      actorId: "admin_1",
      action: "viewReports",
      outcome: "allowed",
      statusCode: 200,
      metadata: {
        requestId: "req-1",
        accessToken: "[REDACTED]",
        nested: {
          password: "[REDACTED]",
        },
      },
    });
    expect(auditRows[0]?.timestamp).toBeInstanceOf(Date);
  });
});
