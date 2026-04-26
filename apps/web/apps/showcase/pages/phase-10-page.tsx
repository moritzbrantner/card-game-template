import type { AppLocale } from '@moritzbrantner/app-pack';

import { Phase10PageClient } from '@/apps/showcase/components/phase-10-page-client';
import { listPhase10BotAiProfiles } from '@/src/domain/game-bot-ai/service';
import { createTranslator } from '@/src/i18n/messages';

export default async function Phase10Page({ locale }: { locale: AppLocale }) {
  const t = createTranslator(locale, 'Phase10Page');
  const botAiProfiles = await listPhase10BotAiProfiles();

  return (
    <Phase10PageClient
      botAiProfiles={botAiProfiles}
      labels={{
        addPhaseAction: t('addPhaseAction'),
        catalogRouteLabel: t('catalogRouteLabel'),
        decreaseSetCountAction: t('decreaseSetCountAction'),
        decreaseSetSizeAction: t('decreaseSetSizeAction'),
        description: t('description'),
        drawPileLabel: t('drawPileLabel'),
        handTitle: t('handTitle'),
        hotseatDescription: t('hotseatDescription'),
        hotseatTitle: t('hotseatTitle'),
        increaseSetCountAction: t('increaseSetCountAction'),
        increaseSetSizeAction: t('increaseSetSizeAction'),
        legalActionsTitle: t('legalActionsTitle'),
        localModeBadge: t('localModeBadge'),
        movePhaseEarlierAction: t('movePhaseEarlierAction'),
        movePhaseLaterAction: t('movePhaseLaterAction'),
        phaseLabel: t('phaseLabel'),
        phaseConfiguratorDescription: t('phaseConfiguratorDescription'),
        phaseConfiguratorTitle: t('phaseConfiguratorTitle'),
        phaseOrderTitle: t('phaseOrderTitle'),
        playersTitle: t('playersTitle'),
        presetsTitle: t('presetsTitle'),
        removePhaseAction: t('removePhaseAction'),
        restartAction: t('restartAction'),
        roundLabel: t('roundLabel'),
        revealHandAction: t('revealHandAction'),
        startConfiguredRoundAction: t('startConfiguredRoundAction'),
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
