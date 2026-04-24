import deMessages from '@/messages/de';
import enMessages from '@/messages/en';
import { hasLocale, routing, type AppLocale } from '@/i18n/routing';
import { loadActiveApp } from '@/src/app-config/load-active-app';
import type {
  AppMessageCatalog,
  AppMessageTree,
  AppMessageValue,
} from '@/src/app-config/contracts';

export type Messages = AppMessageCatalog;
export type MessageNamespace = string;
export type PartialMessages = Partial<Messages>;

const foundationMessageCatalog = {
  en: enMessages,
  de: deMessages,
} as const satisfies Record<AppLocale, Messages>;

function deepMergeMessageTrees(
  baseTree: AppMessageTree | undefined,
  overlayTree: AppMessageTree | undefined,
): AppMessageTree {
  const mergedTree: AppMessageTree = {
    ...(baseTree ?? {}),
  };

  if (!overlayTree) {
    return mergedTree;
  }

  for (const [key, value] of Object.entries(overlayTree)) {
    const existingValue = mergedTree[key];

    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      existingValue &&
      typeof existingValue === 'object' &&
      !Array.isArray(existingValue)
    ) {
      mergedTree[key] = deepMergeMessageTrees(
        existingValue as AppMessageTree,
        value as AppMessageTree,
      );
      continue;
    }

    mergedTree[key] = value;
  }

  return mergedTree;
}

function resolveLocale(locale: string): AppLocale {
  return hasLocale(locale) ? locale : routing.defaultLocale;
}

function getLocaleMessages(locale: string): Messages {
  const resolvedLocale = resolveLocale(locale);
  const foundationMessages = foundationMessageCatalog[
    resolvedLocale
  ] as Messages;
  const appMessages = loadActiveApp().loadMessages(resolvedLocale) as Messages;
  const namespaces = new Set([
    ...Object.keys(foundationMessages),
    ...Object.keys(appMessages),
  ]);

  return Object.fromEntries(
    Array.from(namespaces, (namespace) => [
      namespace,
      deepMergeMessageTrees(
        foundationMessages[namespace],
        appMessages[namespace],
      ),
    ]),
  );
}

export function getMessages(
  locale: string,
  namespaces?: readonly MessageNamespace[],
): PartialMessages {
  const messages = getLocaleMessages(locale);

  if (!namespaces) {
    return messages;
  }

  return Object.fromEntries(
    namespaces
      .filter((namespace) => namespace in messages)
      .map((namespace) => [namespace, messages[namespace]]),
  ) as PartialMessages;
}

function getMessageByPath(
  messages: PartialMessages,
  key: string,
): AppMessageValue {
  return key.split('.').reduce<AppMessageValue>((value, segment) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }

    return (value as Record<string, unknown>)[segment] as AppMessageValue;
  }, messages);
}

function formatMessage(
  template: string,
  values?: Record<string, string | number | boolean | null | undefined>,
) {
  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = values[key];
    return value === null || value === undefined ? '' : String(value);
  });
}

export function createTranslator(locale: string, namespace?: string) {
  const messages = getLocaleMessages(locale);

  return (
    key: string,
    values?: Record<string, string | number | boolean | null | undefined>,
  ) => {
    const messageKey = namespace ? `${namespace}.${key}` : key;
    const value = getMessageByPath(messages, messageKey);

    if (typeof value !== 'string') {
      throw new Error(`Missing translation for key "${messageKey}"`);
    }

    return formatMessage(value, values);
  };
}
