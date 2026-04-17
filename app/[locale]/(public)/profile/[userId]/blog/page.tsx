import Image from 'next/image';
import { notFound } from 'next/navigation';

import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LocalizedLink } from '@/i18n/server-link';
import { getAuthSession } from '@/src/auth.server';
import { createTranslator } from '@/src/i18n/messages';
import { getUserBlogByTagUseCase } from '@/src/domain/blog/use-cases';
import { buildPublicProfilePath, parseProfileTagSegment } from '@/src/profile/tags';
import { notFoundUnlessFeatureEnabled, resolveLocale } from '@/src/server/page-guards';

function formatBlogDate(locale: string, date: Date) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default async function PublicUserBlogPage({
  params,
}: {
  params: Promise<{ locale: string; userId: string }>;
}) {
  const { locale: rawLocale, userId: rawTagSegment } = await params;
  const locale = resolveLocale(rawLocale);
  await notFoundUnlessFeatureEnabled('profiles.blog');
  const profileTag = parseProfileTagSegment(rawTagSegment);

  if (!profileTag) {
    notFound();
  }

  const t = createTranslator(locale, 'BlogPage');
  const session = await getAuthSession();
  const result = await getUserBlogByTagUseCase(profileTag, session?.user.id ?? null);

  if (!result.ok) {
    notFound();
  }

  const blog = result.data;

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <Card className="overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-amber-100 via-white to-sky-100 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900" />

        <CardContent className="-mt-12 flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex items-end gap-4">
              <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-zinc-100 text-3xl font-semibold text-zinc-700 shadow-sm dark:border-zinc-950 dark:bg-zinc-800 dark:text-zinc-100">
                {blog.imageUrl ? (
                  <Image src={blog.imageUrl} alt={blog.displayName} fill sizes="96px" unoptimized className="object-cover" />
                ) : (
                  <span>{blog.displayName.charAt(0).toUpperCase() || 'U'}</span>
                )}
              </div>

              <div className="space-y-1 pb-1">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                  {t('publicPage.eyebrow')}
                </p>
                <h1 className="text-3xl font-semibold tracking-tight">{blog.displayName}</h1>
                <CardDescription>{t('publicPage.description')}</CardDescription>
              </div>
            </div>

            <LocalizedLink
              href={buildPublicProfilePath(blog.tag)}
              locale={locale}
              className={buttonVariants({ variant: 'outline' })}
            >
              {t('publicPage.backToProfile')}
            </LocalizedLink>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {blog.posts.length ? (
          blog.posts.map((post) => {
            const createdLabel = formatBlogDate(locale, post.createdAt);
            const updatedLabel = formatBlogDate(locale, post.updatedAt);
            const wasUpdated = post.updatedAt.getTime() !== post.createdAt.getTime();

            return (
              <Card key={post.id} id={`post-${post.id}`} className="scroll-mt-24">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                    <span>{t('posts.publishedAt', { date: createdLabel })}</span>
                    {wasUpdated ? <span>{t('posts.updatedAt', { date: updatedLabel })}</span> : null}
                  </div>
                  <CardTitle className="pt-1">{post.title}</CardTitle>
                </CardHeader>

                <CardContent>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-700 dark:text-zinc-300">
                    {post.content}
                  </p>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{t('posts.empty')}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
