import type { AppLocale } from '@moritzbrantner/app-pack';

import { UnoLocalPageClient } from '@/apps/showcase/components/uno-local-page-client';
import { createTranslator } from '@/src/i18n/messages';

export default async function UnoPage({ locale }: { locale: AppLocale }) {
  const t = createTranslator(locale, 'UnoPage');

  return (
    <UnoLocalPageClient
      labels={{
        activeColorLabel: t('activeColorLabel'),
        activeTurnLabel: t('activeTurnLabel'),
        botLabel: t('botLabel'),
        cardsLabel: t('cardsLabel'),
        colors: {
          blue: t('colors.blue'),
          green: t('colors.green'),
          red: t('colors.red'),
          yellow: t('colors.yellow'),
        },
        completedMessage: t('completedMessage'),
        description: t('description'),
        discardPileLabel: t('discardPileLabel'),
        drawPileLabel: t('drawPileLabel'),
        handTitle: t('handTitle'),
        humanLabel: t('humanLabel'),
        inProgressStatus: t('inProgressStatus'),
        legalActionsTitle: t('legalActionsTitle'),
        localMatchLabel: t('localMatchLabel'),
        playersTitle: t('playersTitle'),
        restartAction: t('restartAction'),
        statusLabel: t('statusLabel'),
        tableLabel: t('tableLabel'),
        title: t('title'),
        turnLabel: t('turnLabel'),
        waitingForPlayers: t('waitingForPlayers'),
        winnerLabel: t('winnerLabel'),
      }}
    />
  );
}
