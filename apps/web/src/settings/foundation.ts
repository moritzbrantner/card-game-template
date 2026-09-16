import {
  backgroundOptions,
  dateFormatOptions,
  defaultAppSettings,
  type AppSettings,
} from '@/src/settings/preferences';

export const SETTINGS_BROWSER_BUNDLE_URL =
  'https://cdn.jsdelivr.net/gh/moritzbrantner/settings@7c730f8f10441213e08c9cb9dd467f0470085eb2/settings-browser.js';
export const APP_SETTINGS_FOUNDATION_STORAGE_KEY =
  'card-game-template.settings.user.v2';

export type SettingsFoundationStatus = 'loading' | 'ready' | 'degraded';

export type WireSettingValue =
  | { type: 'bool'; value: boolean }
  | { type: 'integer'; value: number }
  | { type: 'number'; value: number }
  | { type: 'text'; value: string }
  | { type: 'choice'; value: string };

type WireSettingDefinition = {
  id: string;
  kind:
    | { type: 'bool' }
    | { type: 'integer'; min: number; max: number }
    | { type: 'number'; min: number; max: number }
    | { type: 'text'; min_chars: number; max_chars: number }
    | { type: 'choice'; options: string[] };
  default: WireSettingValue;
  scope: 'session' | 'save' | 'device' | 'user';
  apply_mode: 'immediate' | 'apply' | 'restart' | 'reconnect';
};

export type SettingsFoundationSession = {
  effectiveValues(): Record<string, WireSettingValue>;
  set(id: string, value: WireSettingValue): void;
  reset(id: string): void;
  importScope(scope: 'save' | 'device' | 'user', snapshot: string): string[];
  exportScope(scope: 'save' | 'device' | 'user'): string;
  dispose(): void;
};

type SettingsBrowserModule = {
  createSettingsSession(
    definitions: readonly WireSettingDefinition[],
  ): Promise<SettingsFoundationSession>;
};

export const settingIds = {
  background: 'appearance.background',
  dateFormat: 'dates.format',
  weekStartsOn: 'dates.week_starts_on',
  showOutsideDays: 'dates.show_outside_days',
  compactSpacing: 'appearance.compact_spacing',
  reducedMotion: 'accessibility.reduced_motion',
  showHotkeyHints: 'controls.show_hotkey_hints',
  notificationsEnabled: 'notifications.enabled',
  notificationType: 'notifications.delivery',
} as const;

export const appSettingDefinitions: readonly WireSettingDefinition[] = [
  choiceDefinition(settingIds.background, backgroundOptions, 'paper'),
  choiceDefinition(settingIds.dateFormat, dateFormatOptions, 'localized'),
  {
    id: settingIds.weekStartsOn,
    kind: { type: 'integer', min: 0, max: 1 },
    default: { type: 'integer', value: 1 },
    scope: 'user',
    apply_mode: 'immediate',
  },
  boolDefinition(settingIds.showOutsideDays, true),
  boolDefinition(settingIds.compactSpacing, false),
  boolDefinition(settingIds.reducedMotion, false),
  boolDefinition(settingIds.showHotkeyHints, true),
  boolDefinition(settingIds.notificationsEnabled, true),
  textDefinition(settingIds.notificationType, 'instant'),
] as const;

let browserModulePromise: Promise<SettingsBrowserModule> | undefined;

export async function createAppSettingsFoundation(
  initialSettings: AppSettings,
  storage: Pick<Storage, 'getItem' | 'setItem'> = window.localStorage,
): Promise<{
  session: SettingsFoundationSession;
  settings: AppSettings;
  diagnostics: string[];
}> {
  const module = await loadSettingsBrowserModule();
  const session = await module.createSettingsSession(appSettingDefinitions);
  let diagnostics: string[] = [];
  const storedSnapshot = storage.getItem(APP_SETTINGS_FOUNDATION_STORAGE_KEY);

  if (storedSnapshot) {
    try {
      diagnostics = session.importScope('user', storedSnapshot);
    } catch (error) {
      console.warn(
        'Ignoring an unreadable shared settings snapshot and migrating the current app preferences.',
        error,
      );
      syncAppSettingsToFoundation(session, initialSettings);
    }
  } else {
    syncAppSettingsToFoundation(session, initialSettings);
  }

  const settings = materializeAppSettings(
    session.effectiveValues(),
    initialSettings,
  );
  storage.setItem(
    APP_SETTINGS_FOUNDATION_STORAGE_KEY,
    session.exportScope('user'),
  );

  return { session, settings, diagnostics };
}

export function syncAppSettingsToFoundation(
  session: SettingsFoundationSession,
  settings: AppSettings,
) {
  session.set(settingIds.background, choice(settings.background));
  session.set(settingIds.dateFormat, choice(settings.dateFormat));
  session.set(settingIds.weekStartsOn, integer(settings.weekStartsOn));
  session.set(settingIds.showOutsideDays, bool(settings.showOutsideDays));
  session.set(settingIds.compactSpacing, bool(settings.compactSpacing));
  session.set(settingIds.reducedMotion, bool(settings.reducedMotion));
  session.set(settingIds.showHotkeyHints, bool(settings.showHotkeyHints));
  session.set(
    settingIds.notificationsEnabled,
    bool(settings.notifications.enabled),
  );
  session.set(settingIds.notificationType, text(settings.notifications.type));
}

export function persistAppSettingsFoundation(
  session: SettingsFoundationSession,
  storage: Pick<Storage, 'setItem'> = window.localStorage,
) {
  storage.setItem(
    APP_SETTINGS_FOUNDATION_STORAGE_KEY,
    session.exportScope('user'),
  );
}

export function materializeAppSettings(
  values: Readonly<Record<string, WireSettingValue>>,
  fallback: AppSettings = defaultAppSettings,
): AppSettings {
  const background = choiceValue(values[settingIds.background]);
  const dateFormat = choiceValue(values[settingIds.dateFormat]);
  const weekStartsOn = integerValue(values[settingIds.weekStartsOn]);
  const notificationType = textValue(values[settingIds.notificationType]);

  return {
    background: backgroundOptions.includes(
      background as (typeof backgroundOptions)[number],
    )
      ? (background as AppSettings['background'])
      : fallback.background,
    dateFormat: dateFormatOptions.includes(
      dateFormat as (typeof dateFormatOptions)[number],
    )
      ? (dateFormat as AppSettings['dateFormat'])
      : fallback.dateFormat,
    weekStartsOn:
      weekStartsOn === 0 || weekStartsOn === 1
        ? weekStartsOn
        : fallback.weekStartsOn,
    showOutsideDays: boolValue(
      values[settingIds.showOutsideDays],
      fallback.showOutsideDays,
    ),
    compactSpacing: boolValue(
      values[settingIds.compactSpacing],
      fallback.compactSpacing,
    ),
    reducedMotion: boolValue(
      values[settingIds.reducedMotion],
      fallback.reducedMotion,
    ),
    showHotkeyHints: boolValue(
      values[settingIds.showHotkeyHints],
      fallback.showHotkeyHints,
    ),
    notifications: {
      enabled: boolValue(
        values[settingIds.notificationsEnabled],
        fallback.notifications.enabled,
      ),
      type: notificationType ?? fallback.notifications.type,
    },
  };
}

async function loadSettingsBrowserModule(): Promise<SettingsBrowserModule> {
  browserModulePromise ??= import(
    /* webpackIgnore: true */ SETTINGS_BROWSER_BUNDLE_URL
  ) as Promise<SettingsBrowserModule>;
  return browserModulePromise;
}

function boolDefinition(
  id: string,
  value: boolean,
): WireSettingDefinition {
  return {
    id,
    kind: { type: 'bool' },
    default: bool(value),
    scope: 'user',
    apply_mode: 'immediate',
  };
}

function choiceDefinition(
  id: string,
  options: readonly string[],
  value: string,
): WireSettingDefinition {
  return {
    id,
    kind: { type: 'choice', options: [...options] },
    default: choice(value),
    scope: 'user',
    apply_mode: 'immediate',
  };
}

function textDefinition(id: string, value: string): WireSettingDefinition {
  return {
    id,
    kind: { type: 'text', min_chars: 0, max_chars: 80 },
    default: text(value),
    scope: 'user',
    apply_mode: 'immediate',
  };
}

function bool(value: boolean): WireSettingValue {
  return { type: 'bool', value };
}

function integer(value: number): WireSettingValue {
  return { type: 'integer', value };
}

function text(value: string): WireSettingValue {
  return { type: 'text', value };
}

function choice(value: string): WireSettingValue {
  return { type: 'choice', value };
}

function boolValue(value: WireSettingValue | undefined, fallback: boolean) {
  return value?.type === 'bool' ? value.value : fallback;
}

function integerValue(value: WireSettingValue | undefined) {
  return value?.type === 'integer' ? value.value : undefined;
}

function textValue(value: WireSettingValue | undefined) {
  return value?.type === 'text' ? value.value : undefined;
}

function choiceValue(value: WireSettingValue | undefined) {
  return value?.type === 'choice' ? value.value : undefined;
}
