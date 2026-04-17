import NextLink from 'next/link';
import type { ComponentProps } from 'react';

import { withLocalePath, type AppLocale } from '@/i18n/routing';

type LocalizedLinkProps = Omit<ComponentProps<typeof NextLink>, 'href'> & {
  href: string;
  locale: AppLocale;
};

export function LocalizedLink({ href, locale, ...props }: LocalizedLinkProps) {
  return <NextLink {...props} href={withLocalePath(href, locale)} />;
}
