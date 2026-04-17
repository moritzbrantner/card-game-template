import { describe, expect, it } from 'vitest';

import {
  areAdminOverviewLayoutsEqual,
  buildDefaultAdminOverviewLayout,
  parseAdminOverviewLayout,
  serializeAdminOverviewLayout,
} from '@/src/admin/overview-layout';

describe('admin overview layout helpers', () => {
  const itemIds = ['content', 'reports', 'users'] as const;

  it('builds the default slot-to-item map from the available workspace ids', () => {
    expect(buildDefaultAdminOverviewLayout(itemIds)).toEqual([
      { slot: 'content', item: 'content' },
      { slot: 'reports', item: 'reports' },
      { slot: 'users', item: 'users' },
    ]);
  });

  it('parses a saved layout when it matches the current workspace ids', () => {
    const savedLayout = [
      { slot: 'content', item: 'users' },
      { slot: 'reports', item: 'content' },
      { slot: 'users', item: 'reports' },
    ];

    expect(parseAdminOverviewLayout(serializeAdminOverviewLayout(savedLayout), itemIds)).toEqual(savedLayout);
  });

  it('falls back to the default layout when the saved arrangement is stale or malformed', () => {
    const malformedLayout = JSON.stringify({
      version: 1,
      layout: [
        { slot: 'content', item: 'users' },
        { slot: 'reports', item: 'legacy-page' },
        { slot: 'users', item: 'reports' },
      ],
    });

    expect(parseAdminOverviewLayout(malformedLayout, itemIds)).toEqual(buildDefaultAdminOverviewLayout(itemIds));
  });

  it('compares layouts by slot and item order', () => {
    const left = buildDefaultAdminOverviewLayout(itemIds);
    const right = buildDefaultAdminOverviewLayout(itemIds);

    expect(areAdminOverviewLayoutsEqual(left, right)).toBe(true);
    expect(
      areAdminOverviewLayoutsEqual(left, [
        { slot: 'content', item: 'reports' },
        { slot: 'reports', item: 'content' },
        { slot: 'users', item: 'users' },
      ]),
    ).toBe(false);
  });
});
