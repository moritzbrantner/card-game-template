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
        activeMatchesTitle: t('activeMatchesTitle'),
        analysisTitle: t('analysisTitle'),
        botAmountHint: t('botAmountHint'),
        botAmountLabel: t('botAmountLabel'),
        completedMatchStatus: t('completedMatchStatus'),
        copyInviteAction: t('copyInviteAction'),
        copyInviteStatus: t('copyInviteStatus'),
        createAction: t('createAction'),
        createHint: t('createHint'),
        createTitle: t('createTitle'),
        emptyOpenLobbies: t('emptyOpenLobbies'),
        emptyRecentMatches: t('emptyRecentMatches'),
        exitGame: t('exitGame'),
        exitedGameStatus: t('exitedGameStatus'),
        finishGame: t('finishGame'),
        hostBadge: t('hostBadge'),
        inviteDescription: t('inviteDescription'),
        inviteLinkLabel: t('inviteLinkLabel'),
        inviteTitle: t('inviteTitle'),
        joinAction: t('joinAction'),
        joinedLobbyStatus: t('joinedLobbyStatus'),
        leaveLobby: t('leaveLobby'),
        leftLobbyStatus: t('leftLobbyStatus'),
        legalActionsTitle: t('legalActionsTitle'),
        lobbyReadyTitle: t('lobbyReadyTitle'),
        nameLabel: t('nameLabel'),
        noActiveMatch: t('noActiveMatch'),
        openLobbiesTitle: t('openLobbiesTitle'),
        overviewAction: t('overviewAction'),
        pastGamesCta: t('pastGamesCta'),
        readyAction: t('readyAction'),
        readyToStart: t('readyToStart'),
        reloadAction: t('reloadAction'),
        recentMatchesTitle: t('recentMatchesTitle'),
        reservedBotsLabel: t('reservedBotsLabel'),
        resumeAction: t('resumeAction'),
        reviewReplayAction: t('reviewReplayAction'),
        roomSizeLabel: t('roomSizeLabel'),
        shareInviteHint: t('shareInviteHint'),
        startGame: t('startGame'),
        startedGameStatus: t('startedGameStatus'),
        title: t('title'),
        waitingForPlayers: t('waitingForPlayers'),
        wildChoiceCancel: t('wildChoiceCancel'),
        wildChoiceDescription: t('wildChoiceDescription'),
        wildChoiceTitle: t('wildChoiceTitle'),
      }}
      pastGamesHref={`/${locale}/past-games`}
    />
  );
}
