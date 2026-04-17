import { Suspense } from 'react';

import { VerifyEmailPageContent } from '@/components/auth/verify-email-page-content';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createTranslator } from '@/src/i18n/messages';
import { notFoundUnlessFeatureEnabled, resolveLocale } from '@/src/server/page-guards';

export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  notFoundUnlessFeatureEnabled('account.register');
  const t = createTranslator(locale, 'AuthPages.verifyEmail');

  return (
    <div className="mx-auto grid min-h-[calc(100vh-10rem)] max-w-3xl items-center">
      <Card className="border-zinc-200/80 shadow-xl shadow-zinc-950/5 dark:border-zinc-800/80 dark:shadow-black/20">
        <CardHeader>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">{t('eyebrow')}</p>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-sm text-zinc-600 dark:text-zinc-400">{t('verifying')}</p>}>
            <VerifyEmailPageContent
              locale={locale}
              labels={{
                verifying: t('verifying'),
                success: t('success'),
                error: t('error'),
                loginCta: t('loginCta'),
                registerCta: t('registerCta'),
              }}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
