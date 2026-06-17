import type { AppLocale } from '@moritzbrantner/app-pack';

import { TcgPageClient } from '@/apps/showcase/components/tcg-page-client';
import { createTranslator } from '@/src/i18n/messages';

export default async function TcgPage({ locale }: { locale: AppLocale }) {
  const t = createTranslator(locale, 'TcgPage');

  return (
    <TcgPageClient
      labels={{
        activeMatchDescription: t('activeMatchDescription'),
        activeMatchTitle: t('activeMatchTitle'),
        activeMatchesTitle: t('activeMatchesTitle'),
        analysisTitle: t('analysisTitle'),
        battlefieldLabel: t('battlefieldLabel'),
        createAction: t('createAction'),
        createHint: t('createHint'),
        createTitle: t('createTitle'),
        createdMatchStatus: t('createdMatchStatus'),
        deckLabel: t('deckLabel'),
        description: t('description'),
        emptyBattlefield: t('emptyBattlefield'),
        emptyRecentMatches: t('emptyRecentMatches'),
        handLabel: t('handLabel'),
        lastWinnerLabel: t('lastWinnerLabel'),
        legalActionsTitle: t('legalActionsTitle'),
        lifeLabel: t('lifeLabel'),
        manaLabel: t('manaLabel'),
        nameLabel: t('nameLabel'),
        noActiveMatch: t('noActiveMatch'),
        playersTitle: t('playersTitle'),
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
