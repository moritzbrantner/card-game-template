import { redirect } from 'next/navigation';

import { withLocalePath, type AppLocale } from '@/i18n/routing';
import { isAdmin } from '@/lib/authorization';
import type { AppSession } from '@/src/auth';

export function requireAdminPageAccess(session: AppSession | null, locale: AppLocale) {
  if (!session?.user?.id || !isAdmin(session.user.role)) {
    redirect(withLocalePath('/', locale));
  }
}
