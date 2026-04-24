export const APP_SETTINGS_COOKIE_NAME = 'app-settings';
export const APP_SETTINGS_STORAGE_KEY = 'app-settings';
const APP_SETTINGS_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const backgroundOptions = ['paper', 'aurora', 'dusk', 'forest'] as const;
export type BackgroundOption = (typeof backgroundOptions)[number];

export const dateFormatOptions = ['localized', 'long', 'iso'] as const;
export type DateFormatOption = (typeof dateFormatOptions)[number];

export type NotificationSettings = {
  enabled: boolean;
  type: string;
};

export type AppSettings = {
  background: BackgroundOption;
  dateFormat: DateFormatOption;
  weekStartsOn: 0 | 1;
  showOutsideDays: boolean;
  compactSpacing: boolean;
  reducedMotion: boolean;
  showHotkeyHints: boolean;
  notifications: NotificationSettings;
};

export const defaultAppSettings: AppSettings = {
  background: 'paper',
  dateFormat: 'localized',
  weekStartsOn: 1,
  showOutsideDays: true,
  compactSpacing: false,
  reducedMotion: false,
  showHotkeyHints: true,
  notifications: {
    enabled: true,
    type: 'instant',
  },
};

function isBackgroundOption(value: unknown): value is BackgroundOption {
  return (
    typeof value === 'string' &&
    backgroundOptions.includes(value as BackgroundOption)
  );
}

function isDateFormatOption(value: unknown): value is DateFormatOption {
  return (
    typeof value === 'string' &&
    dateFormatOptions.includes(value as DateFormatOption)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeAppSettings(value: unknown): AppSettings {
  if (!isRecord(value)) {
    return defaultAppSettings;
  }

  const notifications = isRecord(value.notifications)
    ? value.notifications
    : null;

  return {
    background: isBackgroundOption(value.background)
      ? value.background
      : defaultAppSettings.background,
    dateFormat: isDateFormatOption(value.dateFormat)
      ? value.dateFormat
      : defaultAppSettings.dateFormat,
    weekStartsOn: value.weekStartsOn === 0 ? 0 : 1,
    showOutsideDays:
      typeof value.showOutsideDays === 'boolean'
        ? value.showOutsideDays
        : defaultAppSettings.showOutsideDays,
    compactSpacing:
      typeof value.compactSpacing === 'boolean'
        ? value.compactSpacing
        : defaultAppSettings.compactSpacing,
    reducedMotion:
      typeof value.reducedMotion === 'boolean'
        ? value.reducedMotion
        : defaultAppSettings.reducedMotion,
    showHotkeyHints:
      typeof value.showHotkeyHints === 'boolean'
        ? value.showHotkeyHints
        : defaultAppSettings.showHotkeyHints,
    notifications: {
      enabled:
        typeof notifications?.enabled === 'boolean'
          ? notifications.enabled
          : defaultAppSettings.notifications.enabled,
      type:
        typeof notifications?.type === 'string'
          ? notifications.type
          : defaultAppSettings.notifications.type,
    },
  };
}

export function parseAppSettings(
  value: string | null | undefined,
): AppSettings {
  if (!value) {
    return defaultAppSettings;
  }

  try {
    const decodedValue = decodeURIComponent(value);
    return normalizeAppSettings(JSON.parse(decodedValue) as unknown);
  } catch {
    try {
      return normalizeAppSettings(JSON.parse(value) as unknown);
    } catch {
      return defaultAppSettings;
    }
  }
}

export function parseAppSettingsFromCookieHeader(
  cookieHeader: string | null | undefined,
): AppSettings {
  if (!cookieHeader) {
    return defaultAppSettings;
  }

  const cookieValue = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${APP_SETTINGS_COOKIE_NAME}=`))
    ?.slice(APP_SETTINGS_COOKIE_NAME.length + 1);

  return parseAppSettings(cookieValue);
}

export function serializeAppSettings(settings: AppSettings): string {
  return JSON.stringify(settings);
}

export function buildAppSettingsCookie(settings: AppSettings): string {
  return `${APP_SETTINGS_COOKIE_NAME}=${encodeURIComponent(serializeAppSettings(settings))}; Path=/; Max-Age=${APP_SETTINGS_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function applyAppSettingsToDocument(settings: AppSettings) {
  document.documentElement.dataset.background = settings.background;
  document.documentElement.dataset.density = settings.compactSpacing
    ? 'compact'
    : 'comfortable';
  document.documentElement.dataset.motion = settings.reducedMotion
    ? 'reduced'
    : 'full';
  document.documentElement.dataset.hotkeyHints = settings.showHotkeyHints
    ? 'visible'
    : 'hidden';
}

export function formatDatePreview(
  date: Date,
  settings: AppSettings,
  locale: string,
): string {
  if (settings.dateFormat === 'iso') {
    return date.toISOString().slice(0, 10);
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: settings.dateFormat === 'long' ? 'full' : 'medium',
  }).format(date);
}
