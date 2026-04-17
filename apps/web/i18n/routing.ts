export const routing = {
  locales: ['en', 'de'],
  defaultLocale: 'en',
  localePrefix: 'always',
} as const;

export type AppLocale = (typeof routing.locales)[number];

export function hasLocale(value: string): value is AppLocale {
  return routing.locales.includes(value as AppLocale);
}

export function stripLocaleFromPathname(pathname: string): string {
  const [path, suffix = ''] = pathname.split(/(?=[?#])/);
  const segments = path.split('/').filter(Boolean);
  const firstSegment = segments[0];

  if (!firstSegment || !hasLocale(firstSegment)) {
    return pathname || '/';
  }

  const strippedPath = `/${segments.slice(1).join('/')}`.replace(/\/+$/, '') || '/';
  return `${strippedPath}${suffix}`;
}

export function withLocalePath(pathname: string, locale: AppLocale = routing.defaultLocale): string {
  if (!pathname.startsWith('/')) {
    return pathname;
  }

  const normalizedPath = stripLocaleFromPathname(pathname);
  return normalizedPath === '/' ? `/${locale}` : `/${locale}${normalizedPath}`;
}
