import type { AppLocale } from '@moritzbrantner/app-pack';

import deMessages from './de';
import enMessages from './en';

const showcaseMessagesByLocale = {
  en: enMessages,
  de: deMessages,
} as const;

export function loadShowcaseMessages(locale: AppLocale) {
  return locale === 'de'
    ? showcaseMessagesByLocale.de
    : showcaseMessagesByLocale.en;
}
