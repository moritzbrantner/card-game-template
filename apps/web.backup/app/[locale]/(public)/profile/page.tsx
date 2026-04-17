import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { ProfileDisplayNameForm } from '@/components/profile-display-name-form';
import { ProfileImageForm } from '@/components/profile-image-form';
import { ProfileTagForm } from '@/components/profile-tag-form';
import { LocalizedLink } from '@/i18n/server-link';
import { buildPublicProfileBlogPath, buildPublicProfilePath } from '@/src/profile/tags';
import { createTranslator } from '@/src/i18n/messages';
import { requireAuth, resolveLocale } from '@/src/server/page-guards';

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const session = await requireAuth(locale);
  const t = createTranslator(locale, 'ProfilePage');
  const blogT = createTranslator(locale, 'BlogPage');

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        <ProfileDisplayNameForm
          currentDisplayName={session.user.name ?? ''}
          labels={{
            label: t('form.displayName.label'),
            placeholder: t('form.displayName.placeholder'),
            save: t('form.displayName.save'),
            saving: t('form.displayName.saving'),
            success: t('form.displayName.success'),
          }}
        />

        <ProfileTagForm
          currentTag={session.user.tag ?? ''}
          labels={{
            label: t('form.tag.label'),
            placeholder: t('form.tag.placeholder'),
            hint: t('form.tag.hint'),
            save: t('form.tag.save'),
            saving: t('form.tag.saving'),
            success: t('form.tag.success'),
          }}
        />

        <ProfileImageForm
          currentImage={session.user.image ?? null}
          labels={{
            upload: t('form.upload'),
            uploading: t('form.uploading'),
            remove: t('form.remove'),
            chooseImage: t('form.chooseImage'),
            hint: t('form.hint'),
            success: t('form.success'),
            empty: t('form.empty'),
            alt: t('form.alt'),
            cropTitle: t('form.cropTitle'),
            cropDescription: t('form.cropDescription'),
            cropZoom: t('form.cropZoom'),
            cropCancel: t('form.cropCancel'),
            cropApply: t('form.cropApply'),
            ready: t('form.ready'),
          }}
        />

        <div className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">{blogT('editor.cardTitle')}</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{blogT('editor.cardDescription')}</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <LocalizedLink
              href="/profile/blog"
              locale={locale}
              className={buttonVariants({ variant: 'default' })}
            >
              {blogT('editor.openComposer')}
            </LocalizedLink>
            <LocalizedLink
              href={session.user.tag ? buildPublicProfileBlogPath(session.user.tag) : '/profile/blog'}
              locale={locale}
              className={buttonVariants({ variant: 'outline' })}
            >
              {blogT('editor.viewPublicBlog')}
            </LocalizedLink>
            <LocalizedLink
              href={session.user.tag ? buildPublicProfilePath(session.user.tag) : '/profile'}
              locale={locale}
              className={buttonVariants({ variant: 'outline' })}
            >
              {t('form.tag.viewProfile')}
            </LocalizedLink>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
