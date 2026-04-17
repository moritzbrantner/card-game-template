'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { type AppLocale } from '@/i18n/routing';

type MessageValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | { [key: string]: MessageValue };
type PartialMessages = Record<string, MessageValue | undefined>;

type I18nContextValue = {
  locale: AppLocale;
  messages: PartialMessages;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  locale,
  messages,
}: {
  children: ReactNode;
  locale: AppLocale;
  messages: PartialMessages;
}) {
  const parentContext = useContext(I18nContext);

  return (
    <I18nContext.Provider
      value={{
        locale,
        messages: {
          ...(parentContext?.messages ?? {}),
          ...messages,
        },
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useLocale must be used inside I18nProvider');
  }

  return context.locale;
}

export function useTranslations(namespace?: string) {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useTranslations must be used inside I18nProvider');
  }

  return (key: string, values?: Record<string, string | number | boolean | null | undefined>) => {
    const messageKey = namespace ? `${namespace}.${key}` : key;
    const value = messageKey.split('.').reduce<unknown>((current, segment) => {
      if (!current || typeof current !== 'object' || Array.isArray(current)) {
        return undefined;
      }

      return (current as Record<string, unknown>)[segment];
    }, context.messages);

    if (typeof value !== 'string') {
      throw new Error(`Missing translation for key "${messageKey}"`);
    }

    if (!values) {
      return value;
    }

    return value.replace(/\{(\w+)\}/g, (_match, name: string) => {
      const replacement = values[name];
      return replacement === null || replacement === undefined ? '' : String(replacement);
    });
  };
}
