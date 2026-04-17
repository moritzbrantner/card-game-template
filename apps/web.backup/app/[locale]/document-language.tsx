'use client';

import { useEffect } from 'react';

import type { AppLocale } from '@/i18n/routing';

export function DocumentLanguage({ locale }: { locale: AppLocale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
