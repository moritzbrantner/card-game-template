import { notFound } from 'next/navigation';

import { PeopleDirectory } from '@/components/people-directory';
import { createTranslator } from '@/src/i18n/messages';
import { listFollowingProfilesUseCase } from '@/src/domain/profile/use-cases';
import { notFoundUnlessFeatureEnabled, requireAuth, resolveLocale } from '@/src/server/page-guards';

export default async function PeoplePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  notFoundUnlessFeatureEnabled('people.directory');
  const session = await requireAuth(locale);
  const t = createTranslator(locale, 'PeoplePage');
  const followingResult = await listFollowingProfilesUseCase(session.user.id);

  if (!followingResult.ok) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-300">{t('description')}</p>
      </header>

      <PeopleDirectory initialFollowing={followingResult.data.profiles} />
    </section>
  );
}
