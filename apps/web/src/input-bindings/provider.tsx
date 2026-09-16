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
  navigationInputRegistry,
  readInputProfile,
  writeInputProfile,
  type InputBindingsBrowserModule,
  type InputProfile,
  type InputValidationReport,
} from '@/src/input-bindings/foundation';

type InputBindingsStatus = 'loading' | 'ready' | 'invalid' | 'degraded';

type InputBindingsContextValue = {
  module: InputBindingsBrowserModule | null;
  profile: InputProfile;
  report: InputValidationReport | null;
  status: InputBindingsStatus;
  updateProfile: (profile: InputProfile) => void;
  resetProfile: () => void;
};

const InputBindingsContext = createContext<InputBindingsContextValue | null>(null);

export function InputBindingsProvider({ children }: { children: ReactNode }) {
  const [module, setModule] = useState<InputBindingsBrowserModule | null>(null);
  const [profile, setProfile] = useState<InputProfile>(() =>
    structuredClone(defaultInputProfile),
  );
  const [report, setReport] = useState<InputValidationReport | null>(null);
  const [status, setStatus] = useState<InputBindingsStatus>('loading');

  useEffect(() => {
    let disposed = false;
    const storedProfile = readInputProfile();
    setProfile(storedProfile);

    void loadInputBindingsBrowser().then(
      (browserModule) => {
        if (disposed) {
          return;
        }
        const validationReport = browserModule.validateRegistry(
          navigationInputRegistry,
          storedProfile,
        );
        setModule(browserModule);
        setReport(validationReport);
        setStatus(validationReport.valid ? 'ready' : 'invalid');
      },
      (error) => {
        if (disposed) {
          return;
        }
        console.error('Shared input-bindings foundation could not be loaded.', error);
        setStatus('degraded');
      },
    );

    return () => {
      disposed = true;
    };
  }, []);

  const value = useMemo<InputBindingsContextValue>(
    () => ({
      module,
      profile,
      report,
      status,
      updateProfile: (nextProfile) => {
        setProfile(nextProfile);
        writeInputProfile(nextProfile);
        if (!module) {
          return;
        }
        const validationReport = module.validateRegistry(
          navigationInputRegistry,
          nextProfile,
        );
        setReport(validationReport);
        setStatus(validationReport.valid ? 'ready' : 'invalid');
      },
      resetProfile: () => {
        const nextProfile = structuredClone(defaultInputProfile);
        setProfile(nextProfile);
        writeInputProfile(nextProfile);
        if (!module) {
          return;
        }
        const validationReport = module.validateRegistry(
          navigationInputRegistry,
          nextProfile,
        );
        setReport(validationReport);
        setStatus(validationReport.valid ? 'ready' : 'invalid');
      },
    }),
    [module, profile, report, status],
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
