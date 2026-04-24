export const THEME_STORAGE_KEY = 'theme';
export const THEME_COOKIE_NAME = 'theme';

export type Theme = 'light' | 'dark';

export function isTheme(value: string | null | undefined): value is Theme {
  return value === 'light' || value === 'dark';
}

export function parseThemeFromCookieHeader(
  cookieHeader: string | null | undefined,
): Theme {
  if (!cookieHeader) {
    return 'light';
  }

  const themeCookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${THEME_COOKIE_NAME}=`))
    ?.slice(THEME_COOKIE_NAME.length + 1);

  return isTheme(themeCookie) ? themeCookie : 'light';
}
