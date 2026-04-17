import type { AppLocale } from '@/i18n/routing';

import { RemocnShowcase } from '@/apps/showcase/components/remocn-showcase';

export default function RemocnPage({ locale }: { locale: AppLocale }) {
  void locale;
  return <RemocnShowcase />;
}
