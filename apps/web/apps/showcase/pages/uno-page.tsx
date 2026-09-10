import type { AppLocale } from '@moritzbrantner/app-pack';

import { UnoLocalPageClient } from '@/apps/showcase/components/uno-local-page-client';
import { createTranslator } from '@/src/i18n/messages';

export default async function UnoPage({ locale }: { locale: AppLocale }) {
  const t = createTranslator(locale, 'UnoPage');

  return (
    <UnoLocalPageClient
      labels={{
        description: t('description'),
        discardPileLabel: t('discardPileLabel'),
        drawPileLabel: t('drawPileLabel'),
        handTitle: t('handTitle'),
        legalActionsTitle: t('legalActionsTitle'),
        playersTitle: t('playersTitle'),
        restartAction: t('restartAction'),
        title: t('title'),
        waitingForPlayers: t('waitingForPlayers'),
      }}
    />
  );
}
