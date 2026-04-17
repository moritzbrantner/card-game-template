import type { AppLocale } from '@/i18n/routing';

import deMessages from './de';
import enMessages from './en';

const showcaseMessagesByLocale = {
  en: enMessages,
  de: deMessages,
} as const;

export function loadShowcaseMessages(locale: AppLocale) {
  return showcaseMessagesByLocale[locale] ?? showcaseMessagesByLocale.en;
}
