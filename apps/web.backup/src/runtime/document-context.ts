import { cookies } from 'next/headers';

import { parseThemeFromCookieHeader, type Theme } from '@/lib/theme';
import {
  defaultAppSettings,
  parseAppSettingsFromCookieHeader,
  type AppSettings,
} from '@/src/settings/preferences';
import { isGithubPagesBuild } from '@/src/runtime/build-target';

export type DocumentRouteContext = {
  theme: Theme;
  settings: AppSettings;
};

async function getCookieHeader() {
  if (isGithubPagesBuild) {
    return '';
  }

  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');
}

export async function loadDocumentContext(): Promise<DocumentRouteContext> {
  if (isGithubPagesBuild) {
    return {
      theme: 'light',
      settings: defaultAppSettings,
    };
  }

  const cookieHeader = await getCookieHeader();

  return {
    theme: parseThemeFromCookieHeader(cookieHeader),
    settings: parseAppSettingsFromCookieHeader(cookieHeader),
  };
}
