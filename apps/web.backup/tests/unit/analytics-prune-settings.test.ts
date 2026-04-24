import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/site-config/service', () => ({
  archiveAnnouncementNow: vi.fn(),
  getAdminAnalyticsSettings: vi.fn().mockResolvedValue({
    pageVisitRetentionDays: 365,
    defaultAdminReportWindow: '7d',
  }),
  getAnnouncementById: vi.fn(),
  publishAnnouncementNow: vi.fn(),
}));

import { resolvePruneAnalyticsOlderThanDays } from '@/src/jobs/service';
import { getAdminAnalyticsSettings } from '@/src/site-config/service';

describe('analytics prune retention', () => {
  it('uses the configured analytics retention when no override is passed', async () => {
    const resolved = await resolvePruneAnalyticsOlderThanDays({});

    expect(resolved).toBe(365);
    expect(getAdminAnalyticsSettings).toHaveBeenCalledTimes(1);
  });

  it('prefers the job payload override when provided', async () => {
    const resolved = await resolvePruneAnalyticsOlderThanDays({
      olderThanDays: 30,
    });

    expect(resolved).toBe(30);
  });
});
