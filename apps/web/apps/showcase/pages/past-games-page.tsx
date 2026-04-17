import type { AppLocale } from '@moritzbrantner/app-pack';

import { PastGamesPageClient } from '@/apps/showcase/components/past-games-page-client';
import { createTranslator } from '@/src/i18n/messages';

export default async function PastGamesPage({ locale }: { locale: AppLocale }) {
  const t = createTranslator(locale, 'PastGamesPage');

  return (
    <PastGamesPageClient
      labels={{
        backToLobbies: t('backToLobbies'),
        description: t('description'),
        emptyDescription: t('emptyDescription'),
        emptyTitle: t('emptyTitle'),
        noteLabel: t('noteLabel'),
        playersLabel: t('playersLabel'),
        statusAbandoned: t('statusAbandoned'),
        statusCompleted: t('statusCompleted'),
        title: t('title'),
        winnerLabel: t('winnerLabel'),
      }}
      lobbiesHref={`/${locale}/uno`}
    />
  );
}
