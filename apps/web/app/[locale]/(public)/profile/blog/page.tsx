import { notFound } from 'next/navigation';

import { BlogPostComposer } from '@/components/blog-post-composer';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LocalizedLink } from '@/i18n/server-link';
import { createTranslator } from '@/src/i18n/messages';
import { getUserBlogUseCase } from '@/src/domain/blog/use-cases';
import { buildPublicProfileBlogPath } from '@/src/profile/tags';
import {
  notFoundUnlessFeatureEnabledForUser,
  requireAuth,
  resolveLocale,
} from '@/src/server/page-guards';

function formatBlogDate(locale: string, date: Date) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default async function ProfileBlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const session = await requireAuth(locale);
  await notFoundUnlessFeatureEnabledForUser('profiles.blog', session.user);
  const t = createTranslator(locale, 'BlogPage');
  const result = await getUserBlogUseCase(session.user.id);

  if (!result.ok) {
    notFound();
  }

  const blog = result.data;

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <CardTitle>{t('editor.title')}</CardTitle>
            <CardDescription>{t('editor.description')}</CardDescription>
          </div>

          <div className="flex flex-wrap gap-3">
            <LocalizedLink
              href="/profile"
              locale={locale}
              className={buttonVariants({ variant: 'outline' })}
            >
              {t('editor.backToProfile')}
            </LocalizedLink>
            <LocalizedLink
              href={
                session.user.tag
                  ? buildPublicProfileBlogPath(session.user.tag)
                  : '/profile/blog'
              }
              locale={locale}
              className={buttonVariants({ variant: 'default' })}
            >
              {t('editor.viewPublicBlog')}
            </LocalizedLink>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('composer.title')}</CardTitle>
          <CardDescription>{t('composer.description')}</CardDescription>
        </CardHeader>

        <CardContent>
          <BlogPostComposer
            userId={session.user.id}
            locale={locale}
            labels={{
              title: t('composer.form.title'),
              titlePlaceholder: t('composer.form.titlePlaceholder'),
              content: t('composer.form.content'),
              contentPlaceholder: t('composer.form.contentPlaceholder'),
              draftsTitle: t('composer.drafts.title'),
              draftsEmpty: t('composer.drafts.empty'),
              untitledDraft: t('composer.drafts.untitled'),
              emptyEditor: t('composer.editor.empty'),
              publishedReadonly: t('composer.editor.publishedReadonly'),
              newDraft: t('composer.actions.newDraft'),
              deleteDraft: t('composer.actions.deleteDraft'),
              publish: t('composer.form.publish'),
              publishing: t('composer.form.publishing'),
              savedLocally: t('composer.status.savedLocally'),
              queuedToPublish: t('composer.status.queuedToPublish'),
              publishFailed: t('composer.status.publishFailed'),
              published: t('composer.status.published'),
              genericError: t('composer.form.error'),
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('posts.title')}</CardTitle>
          <CardDescription>{t('posts.description')}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {blog.posts.length ? (
            blog.posts.map((post) => {
              const createdLabel = formatBlogDate(locale, post.createdAt);
              const updatedLabel = formatBlogDate(locale, post.updatedAt);
              const wasUpdated =
                post.updatedAt.getTime() !== post.createdAt.getTime();

              return (
                <article
                  key={post.id}
                  className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                      <span>
                        {t('posts.publishedAt', { date: createdLabel })}
                      </span>
                      {wasUpdated ? (
                        <span>
                          {t('posts.updatedAt', { date: updatedLabel })}
                        </span>
                      ) : null}
                    </div>
                    <h2 className="text-xl font-semibold tracking-tight">
                      {post.title}
                    </h2>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-700 dark:text-zinc-300">
                      {post.content}
                    </p>
                  </div>
                </article>
              );
            })
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {t('posts.empty')}
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
