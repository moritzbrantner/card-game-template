import type { AppLocale } from '@moritzbrantner/app-pack';

import { PokerPageClient } from '@/apps/showcase/components/poker-page-client';
import { createTranslator } from '@/src/i18n/messages';

export default async function PokerPage({ locale }: { locale: AppLocale }) {
  const t = createTranslator(locale, 'PokerPage');

  return (
    <PokerPageClient
      labels={{
        activeMatchDescription: t('activeMatchDescription'),
        activeMatchTitle: t('activeMatchTitle'),
        activeMatchesTitle: t('activeMatchesTitle'),
        analysisTitle: t('analysisTitle'),
        communityCardsLabel: t('communityCardsLabel'),
        createAction: t('createAction'),
        createHint: t('createHint'),
        createTitle: t('createTitle'),
        createdMatchStatus: t('createdMatchStatus'),
        description: t('description'),
        emptyBoard: t('emptyBoard'),
        emptyRecentMatches: t('emptyRecentMatches'),
        holeCardsHidden: t('holeCardsHidden'),
        lastWinnerLabel: t('lastWinnerLabel'),
        legalActionsTitle: t('legalActionsTitle'),
        nameLabel: t('nameLabel'),
        noActiveMatch: t('noActiveMatch'),
        phaseLabel: t('phaseLabel'),
        playersTitle: t('playersTitle'),
        potLabel: t('potLabel'),
        presetLabel: t('presetLabel'),
        recentMatchesTitle: t('recentMatchesTitle'),
        reloadAction: t('reloadAction'),
        resumeAction: t('resumeAction'),
        statusLabel: t('statusLabel'),
        subtitle: t('subtitle'),
        title: t('title'),
        waitingForPlayers: t('waitingForPlayers'),
      }}
    />
  );
}
