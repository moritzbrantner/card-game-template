'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  defaultInputProfile,
  loadInputBindingsBrowser,
  readInputProfile,
  writeInputProfile,
  type InputActionRegistry,
  type InputBindingsBrowserModule,
  type InputProfile,
  type InputValidationReport,
} from '@/src/input-bindings/foundation';

type InputBindingsStatus = 'loading' | 'ready' | 'invalid' | 'degraded';

type InputBindingsContextValue = {
  browserModule: InputBindingsBrowserModule | null;
  registry: InputActionRegistry;
  profile: InputProfile;
  report: InputValidationReport | null;
  status: InputBindingsStatus;
  updateProfile: (profile: InputProfile) => void;
  resetProfile: () => void;
};

const InputBindingsContext = createContext<InputBindingsContextValue | null>(null);

export function InputBindingsProvider({
  children,
  registry,
}: {
  children: ReactNode;
  registry: InputActionRegistry;
}) {
  const [browserModule, setBrowserModule] =
    useState<InputBindingsBrowserModule | null>(null);
  const [profile, setProfile] = useState<InputProfile>(() =>
    structuredClone(defaultInputProfile),
  );
  const [report, setReport] = useState<InputValidationReport | null>(null);
  const [status, setStatus] = useState<InputBindingsStatus>('loading');

  useEffect(() => {
    let disposed = false;
    const storedProfile = readInputProfile();
    setProfile(storedProfile);
    setStatus('loading');

    void loadInputBindingsBrowser().then(
      (loadedBrowserModule) => {
        if (disposed) {
          return;
        }
        const validationReport = loadedBrowserModule.validateRegistry(
          registry,
          storedProfile,
        );
        setBrowserModule(loadedBrowserModule);
        setReport(validationReport);
        setStatus(validationReport.valid ? 'ready' : 'invalid');
      },
      (error) => {
        if (disposed) {
          return;
        }
        console.error(
          'Shared input-bindings foundation could not be loaded.',
          error,
        );
        setStatus('degraded');
      },
    );

    return () => {
      disposed = true;
    };
  }, [registry]);

  const value = useMemo<InputBindingsContextValue>(
    () => ({
      browserModule,
      registry,
      profile,
      report,
      status,
      updateProfile: (nextProfile) => {
        setProfile(nextProfile);
        writeInputProfile(nextProfile);
        if (!browserModule) {
          return;
        }
        const validationReport = browserModule.validateRegistry(
          registry,
          nextProfile,
        );
        setReport(validationReport);
        setStatus(validationReport.valid ? 'ready' : 'invalid');
      },
      resetProfile: () => {
        const nextProfile = structuredClone(defaultInputProfile);
        setProfile(nextProfile);
        writeInputProfile(nextProfile);
        if (!browserModule) {
          return;
        }
        const validationReport = browserModule.validateRegistry(
          registry,
          nextProfile,
        );
        setReport(validationReport);
        setStatus(validationReport.valid ? 'ready' : 'invalid');
      },
    }),
    [browserModule, profile, registry, report, status],
  );

  return (
    <InputBindingsContext.Provider value={value}>
      {children}
    </InputBindingsContext.Provider>
  );
}

export function useInputBindings() {
  const context = useContext(InputBindingsContext);
  if (!context) {
    throw new Error(
      'useInputBindings must be used inside InputBindingsProvider',
    );
  }
  return context;
}
