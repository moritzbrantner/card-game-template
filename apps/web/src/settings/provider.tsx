'use client';

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
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
import {
  createAppSettingsFoundation,
  materializeAppSettings,
  persistAppSettingsFoundation,
  syncAppSettingsToFoundation,
  type SettingsFoundationSession,
  type SettingsFoundationStatus,
} from '@/src/settings/foundation';

type AppSettingsUpdater =
  | Partial<AppSettings>
  | ((currentSettings: AppSettings) => Partial<AppSettings>);

type AppSettingsContextValue = {
  settings: AppSettings;
  updateSettings: (nextSettings: AppSettingsUpdater) => void;
  foundationStatus: SettingsFoundationStatus;
  foundationDiagnostics: readonly string[];
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
  const [foundationStatus, setFoundationStatus] =
    useState<SettingsFoundationStatus>('loading');
  const [foundationDiagnostics, setFoundationDiagnostics] = useState<
    readonly string[]
  >([]);
  const sessionRef = useRef<SettingsFoundationSession | null>(null);
  const latestSettingsRef = useRef(settings);

  useLayoutEffect(() => {
    latestSettingsRef.current = settings;
    (window as WindowWithAppSettings).__appSettings = settings;
    applyAppSettingsToDocument(settings);
    window.localStorage.setItem(
      APP_SETTINGS_STORAGE_KEY,
      JSON.stringify(settings),
    );
    document.cookie = buildAppSettingsCookie(settings);
  }, [settings]);

  useEffect(() => {
    let disposed = false;
    const settingsAtLoad = latestSettingsRef.current;

    void createAppSettingsFoundation(settingsAtLoad).then(
      ({ session, settings: restoredSettings, diagnostics }) => {
        if (disposed) {
          session.dispose();
          return;
        }

        let authoritativeSettings = restoredSettings;
        if (latestSettingsRef.current !== settingsAtLoad) {
          // Only fold the legacy projection back into the shared state when the
          // user actually changed it while the remote foundation was loading.
          syncAppSettingsToFoundation(session, latestSettingsRef.current);
          authoritativeSettings = materializeAppSettings(
            session.effectiveValues(),
            restoredSettings,
          );
        }
        persistAppSettingsFoundation(session);

        sessionRef.current = session;
        latestSettingsRef.current = authoritativeSettings;
        setFoundationDiagnostics(diagnostics);
        setFoundationStatus('ready');
        setSettings(authoritativeSettings);
      },
      (error) => {
        if (disposed) {
          return;
        }
        console.error('Shared settings foundation could not be loaded.', error);
        setFoundationStatus('degraded');
      },
    );

    return () => {
      disposed = true;
      sessionRef.current?.dispose();
      sessionRef.current = null;
    };
  }, []);

  return (
    <AppSettingsContext.Provider
      value={{
        settings,
        foundationStatus,
        foundationDiagnostics,
        updateSettings: (nextSettings) => {
          startTransition(() => {
            setSettings((currentSettings) => {
              const proposedSettings = {
                ...currentSettings,
                ...(typeof nextSettings === 'function'
                  ? nextSettings(currentSettings)
                  : nextSettings),
              };
              const session = sessionRef.current;

              if (!session) {
                latestSettingsRef.current = proposedSettings;
                return proposedSettings;
              }

              try {
                syncAppSettingsToFoundation(session, proposedSettings);
                const authoritativeSettings = materializeAppSettings(
                  session.effectiveValues(),
                  currentSettings,
                );
                persistAppSettingsFoundation(session);
                latestSettingsRef.current = authoritativeSettings;
                return authoritativeSettings;
              } catch (error) {
                console.error(
                  'Shared settings foundation rejected a preference update.',
                  error,
                );
                return currentSettings;
              }
            });
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
