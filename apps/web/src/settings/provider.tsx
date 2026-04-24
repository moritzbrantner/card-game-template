'use client';

import {
  createContext,
  startTransition,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react';

import {
  APP_SETTINGS_COOKIE_NAME,
  APP_SETTINGS_STORAGE_KEY,
  applyAppSettingsToDocument,
  parseAppSettings,
  buildAppSettingsCookie,
  type AppSettings,
} from '@/src/settings/preferences';

type AppSettingsUpdater =
  | Partial<AppSettings>
  | ((currentSettings: AppSettings) => Partial<AppSettings>);

type AppSettingsContextValue = {
  settings: AppSettings;
  updateSettings: (nextSettings: AppSettingsUpdater) => void;
};

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

type WindowWithAppSettings = Window & {
  __appSettings?: AppSettings;
};

function getInitialClientSettings(initialSettings: AppSettings): AppSettings {
  if (typeof window === 'undefined') {
    return initialSettings;
  }

  const appWindow = window as WindowWithAppSettings;

  if (appWindow.__appSettings) {
    return appWindow.__appSettings;
  }

  const cookieValue = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${APP_SETTINGS_COOKIE_NAME}=`))
    ?.slice(APP_SETTINGS_COOKIE_NAME.length + 1);

  return parseAppSettings(
    cookieValue ?? window.localStorage.getItem(APP_SETTINGS_STORAGE_KEY),
  );
}

export function AppSettingsProvider({
  children,
  initialSettings,
}: {
  children: ReactNode;
  initialSettings: AppSettings;
}) {
  const [settings, setSettings] = useState<AppSettings>(() =>
    getInitialClientSettings(initialSettings),
  );

  useLayoutEffect(() => {
    (window as WindowWithAppSettings).__appSettings = settings;
    applyAppSettingsToDocument(settings);
    window.localStorage.setItem(
      APP_SETTINGS_STORAGE_KEY,
      JSON.stringify(settings),
    );
    document.cookie = buildAppSettingsCookie(settings);
  }, [settings]);

  return (
    <AppSettingsContext.Provider
      value={{
        settings,
        updateSettings: (nextSettings) => {
          startTransition(() => {
            setSettings((currentSettings) => ({
              ...currentSettings,
              ...(typeof nextSettings === 'function'
                ? nextSettings(currentSettings)
                : nextSettings),
            }));
          });
        },
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);

  if (!context) {
    throw new Error('useAppSettings must be used inside AppSettingsProvider');
  }

  return context;
}
