'use client';

import LinkBase from 'next/link';
import { forwardRef, type ComponentProps } from 'react';

import { usePathname as useNextPathname, useRouter as useNextRouter } from 'next/navigation';

import { useLocale } from '@/src/i18n';
import { withLocalePath, stripLocaleFromPathname, type AppLocale } from '@/i18n/routing';

type LinkProps = Omit<ComponentProps<typeof LinkBase>, 'href'> & {
  href: string;
  locale?: AppLocale;
};

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, locale, ...props },
  ref,
) {
  const currentLocale = useLocale();

  return (
    <LinkBase
      {...props}
      ref={ref}
      href={withLocalePath(href, locale ?? currentLocale)}
    />
  );
});

export function usePathname() {
  const pathname = useNextPathname();
  return stripLocaleFromPathname(pathname);
}

export function useRouter() {
  const currentLocale = useLocale();
  const router = useNextRouter();

  return {
    push: (href: string, locale?: AppLocale) => router.push(withLocalePath(href, locale ?? currentLocale)),
    replace: (href: string, locale?: AppLocale) => router.replace(withLocalePath(href, locale ?? currentLocale)),
    refresh: () => router.refresh(),
  };
}

export function getPathname(href: string, locale?: AppLocale) {
  return withLocalePath(href, locale);
}
