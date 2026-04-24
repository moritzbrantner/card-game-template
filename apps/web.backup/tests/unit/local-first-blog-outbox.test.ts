import { describe, expect, it } from 'vitest';

import {
  calculatePublishRetryDelayMs,
  getNextPublishAttemptAt,
  isRetryablePublishStatus,
  resolveDraftStatusAfterPublishFailure,
} from '@/src/local-first/blog/outbox';

describe('local-first blog outbox', () => {
  it('uses exponential backoff and caps retry delay', () => {
    expect(calculatePublishRetryDelayMs(0)).toBe(1_000);
    expect(calculatePublishRetryDelayMs(1)).toBe(2_000);
    expect(calculatePublishRetryDelayMs(10)).toBe(300_000);
  });

  it('keeps transient failures retryable and drafts queued', () => {
    expect(isRetryablePublishStatus(undefined)).toBe(true);
    expect(isRetryablePublishStatus(503)).toBe(true);
    expect(isRetryablePublishStatus(429)).toBe(true);
    expect(resolveDraftStatusAfterPublishFailure(503)).toBe('queued_publish');
  });

  it('marks auth and validation failures as non-retryable publish failures', () => {
    expect(isRetryablePublishStatus(401)).toBe(false);
    expect(isRetryablePublishStatus(400)).toBe(false);
    expect(resolveDraftStatusAfterPublishFailure(401)).toBe('publish_failed');
    expect(resolveDraftStatusAfterPublishFailure(400)).toBe('publish_failed');
  });

  it('pushes the next attempt far into the future for non-retryable failures', () => {
    const now = new Date('2026-04-16T10:00:00.000Z');
    const nextAttemptAt = getNextPublishAttemptAt(now, 0, false);

    expect(nextAttemptAt.getTime()).toBeGreaterThan(
      now.getTime() + 300 * 24 * 60 * 60 * 1_000,
    );
  });
});
