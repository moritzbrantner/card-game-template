import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

import { useColorScheme as useSystemColorScheme } from '@/hooks/use-color-scheme';

type ThemeMode = 'light' | 'dark';

type ThemeModeContextValue = {
  activeTheme: ThemeMode;
  setThemeMode: (theme: ThemeMode) => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

export function ThemeModeProvider({ children }: PropsWithChildren) {
  const systemTheme = useSystemColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>(systemTheme === 'dark' ? 'dark' : 'light');

  const value = useMemo(
    () => ({
      activeTheme: themeMode,
      setThemeMode,
    }),
    [themeMode],
  );

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext);

  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeModeProvider');
  }

  return context;
}
