import type { AppLocale } from '@moritzbrantner/app-pack';

import { UnoPageClient } from '@/apps/showcase/components/uno-page-client';
import { createTranslator } from '@/src/i18n/messages';

export default async function UnoPage({ locale }: { locale: AppLocale }) {
  const t = createTranslator(locale, 'UnoPage');

  return (
    <UnoPageClient
      labels={{
        actionsTitle: t('actionsTitle'),
        activeColorLabel: t('activeColorLabel'),
        catalogTitle: t('catalogTitle'),
        confirmHandoff: t('confirmHandoff'),
        deckLabel: t('deckLabel'),
        description: t('description'),
        hiddenHand: t('hiddenHand'),
        pendingDrawLabel: t('pendingDrawLabel'),
        presetsTitle: t('presetsTitle'),
        restart: t('restart'),
        rulesTitle: t('rulesTitle'),
        statusTitle: t('statusTitle'),
        title: t('title'),
        waitingForPlayer: t('waitingForPlayer'),
      }}
    />
  );
}
