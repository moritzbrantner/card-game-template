import { describe, expect, it } from 'vitest';

import { scheduledTimestampMatches } from '@/src/jobs/service';
import { validateAnnouncementInput } from '@/src/site-config/service';

describe('announcement scheduling', () => {
  it('rejects invalid announcement date combinations', () => {
    const result = validateAnnouncementInput({
      locale: 'en',
      title: 'Scheduled maintenance',
      body: 'Short operational update.',
      status: 'scheduled',
      publishAt: new Date('invalid'),
      unpublishAt: new Date('2026-04-16T12:00:00.000Z'),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected validation failure');
    }

    expect(result.error.fieldErrors.publishAt).toBeDefined();
  });

  it('detects stale scheduled timestamps', () => {
    expect(
      scheduledTimestampMatches(
        new Date('2026-04-16T12:00:00.000Z'),
        '2026-04-16T12:00:00.000Z',
      ),
    ).toBe(true);
    expect(
      scheduledTimestampMatches(
        new Date('2026-04-16T12:05:00.000Z'),
        '2026-04-16T12:00:00.000Z',
      ),
    ).toBe(false);
    expect(scheduledTimestampMatches(null, '2026-04-16T12:00:00.000Z')).toBe(
      false,
    );
  });
});
