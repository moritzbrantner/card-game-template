import type { AppLocale } from '@moritzbrantner/app-pack';

import { RemocnShowcase } from '@/apps/showcase/components/remocn-showcase';

export default function RemocnPage({ locale }: { locale: AppLocale }) {
  void locale;
  return <RemocnShowcase />;
}
