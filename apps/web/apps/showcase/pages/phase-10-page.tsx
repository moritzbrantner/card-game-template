import type { AppLocale } from '@moritzbrantner/app-pack';

import { Phase10PageClient } from '@/apps/showcase/components/phase-10-page-client';
import { createTranslator } from '@/src/i18n/messages';

export default async function Phase10Page({ locale }: { locale: AppLocale }) {
  const t = createTranslator(locale, 'Phase10Page');

  return (
    <Phase10PageClient
      labels={{
        catalogRouteLabel: t('catalogRouteLabel'),
        description: t('description'),
        drawPileLabel: t('drawPileLabel'),
        handTitle: t('handTitle'),
        hotseatDescription: t('hotseatDescription'),
        hotseatTitle: t('hotseatTitle'),
        legalActionsTitle: t('legalActionsTitle'),
        localModeBadge: t('localModeBadge'),
        phaseLabel: t('phaseLabel'),
        playersTitle: t('playersTitle'),
        presetsTitle: t('presetsTitle'),
        restartAction: t('restartAction'),
        revealHandAction: t('revealHandAction'),
        statusTitle: t('statusTitle'),
        subtitle: t('subtitle'),
        tableDiscardLabel: t('tableDiscardLabel'),
        tableDrawLabel: t('tableDrawLabel'),
        title: t('title'),
        waitingForPlayers: t('waitingForPlayers'),
      }}
    />
  );
}
