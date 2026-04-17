'use client';

import { useSyncExternalStore } from 'react';

import { Button } from '@/components/ui/button';
import { THEME_COOKIE_NAME, THEME_STORAGE_KEY, Theme, isTheme } from '@/lib/theme';
import { useTranslations } from '@/src/i18n';

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getThemeSnapshot(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isTheme(storedTheme) ? storedTheme : getSystemTheme();
}

function subscribeTheme(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const onThemeChange = () => onStoreChange();

  window.addEventListener('storage', onThemeChange);
  window.addEventListener('themechange', onThemeChange);

  return () => {
    window.removeEventListener('storage', onThemeChange);
    window.removeEventListener('themechange', onThemeChange);
  };
}

function persistTheme(theme: Theme) {
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new Event('themechange'));
}

export function ThemeToggle() {
  const t = useTranslations('ThemeToggle');
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => 'light');

  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const nextThemeLabel = nextTheme === 'dark' ? t('darkTheme') : t('lightTheme');

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => persistTheme(nextTheme)}
      aria-label={t('switchTo', { theme: nextThemeLabel })}
      title={t('switchTo', { theme: nextThemeLabel })}
    >
      {theme === 'dark' ? t('darkLabel') : t('lightLabel')}
    </Button>
  );
}
