import { describe, expect, it } from 'vitest';

import {
  defaultAppSettings,
  normalizeAppSettings,
  parseAppSettings,
} from '@/src/settings/preferences';

describe('app settings', () => {
  it('normalizes nested notification preferences', () => {
    expect(
      normalizeAppSettings({
        notifications: {
          enabled: false,
          type: 'digest',
        },
      }),
    ).toMatchObject({
      notifications: {
        enabled: false,
        type: 'digest',
      },
    });
  });

  it('falls back to default notification settings when nested values are invalid', () => {
    expect(
      normalizeAppSettings({
        notifications: {
          enabled: 'yes',
          type: 42,
        },
      }),
    ).toMatchObject({
      notifications: defaultAppSettings.notifications,
    });
  });

  it('parses encoded settings payloads with notification preferences', () => {
    const parsed = parseAppSettings(
      encodeURIComponent(
        JSON.stringify({
          notifications: {
            enabled: true,
            type: '',
          },
        }),
      ),
    );

    expect(parsed.notifications).toEqual({
      enabled: true,
      type: '',
    });
  });
});
