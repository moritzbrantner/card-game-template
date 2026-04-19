import type { AppLocale } from '@moritzbrantner/app-pack';

import { UnoPageClient } from '@/apps/showcase/components/uno-page-client';
import { createTranslator } from '@/src/i18n/messages';

export default async function UnoPage({ locale }: { locale: AppLocale }) {
  const t = createTranslator(locale, 'UnoPage');

  return (
    <UnoPageClient
      labels={{
        description: t('description'),
        activeMatchDescription: t('activeMatchDescription'),
        activeMatchTitle: t('activeMatchTitle'),
        createAction: t('createAction'),
        createHint: t('createHint'),
        createTitle: t('createTitle'),
        emptyOpenLobbies: t('emptyOpenLobbies'),
        exitGame: t('exitGame'),
        exitedGameStatus: t('exitedGameStatus'),
        finishGame: t('finishGame'),
        hostBadge: t('hostBadge'),
        joinAction: t('joinAction'),
        joinedLobbyStatus: t('joinedLobbyStatus'),
        leaveLobby: t('leaveLobby'),
        leftLobbyStatus: t('leftLobbyStatus'),
        lobbyReadyTitle: t('lobbyReadyTitle'),
        nameLabel: t('nameLabel'),
        openLobbiesTitle: t('openLobbiesTitle'),
        pastGamesCta: t('pastGamesCta'),
        readyToStart: t('readyToStart'),
        startGame: t('startGame'),
        startedGameStatus: t('startedGameStatus'),
        title: t('title'),
        waitingForPlayers: t('waitingForPlayers'),
        presetLabel: t('presetLabel'),
        resumeAction: t('resumeAction'),
        reloadAction: t('reloadAction'),
        emptyRecentMatches: t('emptyRecentMatches'),
        recentMatchesTitle: t('recentMatchesTitle'),
        activeMatchesTitle: t('activeMatchesTitle'),
        noActiveMatch: t('noActiveMatch'),
        legalActionsTitle: t('legalActionsTitle'),
        analysisTitle: t('analysisTitle'),
      }}
      pastGamesHref={`/${locale}/past-games`}
    />
  );
}
