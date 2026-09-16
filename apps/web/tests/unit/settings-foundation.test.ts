import { describe, expect, it } from 'vitest';

import {
  appSettingDefinitions,
  materializeAppSettings,
  settingIds,
  syncAppSettingsToFoundation,
  type SettingsFoundationSession,
  type WireSettingValue,
} from '@/src/settings/foundation';
import { defaultAppSettings } from '@/src/settings/preferences';

describe('shared settings foundation adapter', () => {
  it('declares each app preference once in the user scope', () => {
    const ids = appSettingDefinitions.map((definition) => definition.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(appSettingDefinitions).toHaveLength(9);
    expect(
      appSettingDefinitions.every(
        (definition) =>
          definition.scope === 'user' && definition.apply_mode === 'immediate',
      ),
    ).toBe(true);
  });

  it('round-trips the app projection without erasing legacy text notification values', () => {
    const values = new Map<string, WireSettingValue>();
    const session: SettingsFoundationSession = {
      effectiveValues: () => Object.fromEntries(values),
      set: (id, value) => values.set(id, value),
      reset: (id) => {
        values.delete(id);
      },
      importScope: () => [],
      exportScope: () => '{}',
      dispose: () => undefined,
    };
    const settings = {
      ...defaultAppSettings,
      background: 'forest' as const,
      dateFormat: 'iso' as const,
      weekStartsOn: 0 as const,
      showOutsideDays: false,
      compactSpacing: true,
      reducedMotion: true,
      showHotkeyHints: false,
      notifications: {
        enabled: false,
        type: '',
      },
    };

    syncAppSettingsToFoundation(session, settings);

    expect(values.get(settingIds.notificationType)).toEqual({
      type: 'text',
      value: '',
    });
    expect(materializeAppSettings(session.effectiveValues())).toEqual(settings);
  });

  it('falls back per value instead of discarding an otherwise valid snapshot', () => {
    expect(
      materializeAppSettings({
        [settingIds.background]: { type: 'choice', value: 'unknown' },
        [settingIds.reducedMotion]: { type: 'bool', value: true },
      }),
    ).toMatchObject({
      background: defaultAppSettings.background,
      reducedMotion: true,
    });
  });
});
