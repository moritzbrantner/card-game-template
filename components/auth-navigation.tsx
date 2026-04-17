import type { AppLocale } from '@/i18n/routing';
import { LocalizedLink } from '@/i18n/server-link';

import { buttonVariants } from '@/components/ui/button';

type AuthNavigationProps = {
  locale: AppLocale;
  labels: {
    login: string;
    register: string;
  };
};

export function AuthNavigation({ locale, labels }: AuthNavigationProps) {
  return (
    <>
      <LocalizedLink href="/login" locale={locale} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
        {labels.login}
      </LocalizedLink>
      <LocalizedLink href="/register" locale={locale} className={buttonVariants({ size: 'sm' })}>
        {labels.register}
      </LocalizedLink>
    </>
  );
}
