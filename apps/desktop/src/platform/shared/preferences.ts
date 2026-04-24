export type ThemePreference = 'dark' | 'light' | 'system';

export interface DesktopPreferences {
  appearance: {
    theme: ThemePreference;
  };
  developer: {
    openDevToolsOnLaunch: boolean;
  };
  documents: {
    reopenLastDocument: boolean;
  };
}

export const defaultDesktopPreferences: DesktopPreferences = {
  appearance: {
    theme: 'system',
  },
  developer: {
    openDevToolsOnLaunch: false,
  },
  documents: {
    reopenLastDocument: false,
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object');
}

export function isDesktopPreferences(
  value: unknown,
): value is DesktopPreferences {
  if (!isRecord(value)) {
    return false;
  }

  if (
    !isRecord(value.appearance) ||
    !isRecord(value.developer) ||
    !isRecord(value.documents)
  ) {
    return false;
  }

  if (
    value.appearance.theme !== 'system' &&
    value.appearance.theme !== 'light' &&
    value.appearance.theme !== 'dark'
  ) {
    return false;
  }

  return (
    typeof value.developer.openDevToolsOnLaunch === 'boolean' &&
    typeof value.documents.reopenLastDocument === 'boolean'
  );
}

export function resolveThemePreference(
  theme: ThemePreference,
  systemPrefersDark: boolean,
): 'dark' | 'light' {
  if (theme === 'system') {
    return systemPrefersDark ? 'dark' : 'light';
  }

  return theme;
}
