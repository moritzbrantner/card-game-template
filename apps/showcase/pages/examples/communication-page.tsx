import type { AppLocale } from '@moritzbrantner/app-pack';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@moritzbrantner/ui';

import { NewsletterSignup } from '@/components/newsletter/newsletter-signup';
import type { AppLocale as RoutingLocale } from '@/i18n/routing';
import { createTranslator } from '@/src/i18n/messages';

const sectionKeys = ['websockets', 'crdts'] as const;

export default async function CommunicationPage({ locale }: { locale: AppLocale }) {
  const t = createTranslator(locale, 'CommunicationPage');
  const routingLocale = locale as RoutingLocale;

  return (
    <div className="space-y-8">
      <Card className="mx-auto max-w-4xl rounded-3xl">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">
            {t('eyebrow')}
          </p>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">{t('intro')}</p>
        </CardContent>
      </Card>

      <NewsletterSignup
        locale={routingLocale}
        labels={{
          eyebrow: t('newsletter.eyebrow'),
          title: t('newsletter.title'),
          description: t('newsletter.description'),
          email: t('newsletter.email'),
          submit: t('newsletter.submit'),
          submitting: t('newsletter.submitting'),
          requiredEmail: t('newsletter.requiredEmail'),
          invalidEmail: t('newsletter.invalidEmail'),
          success: t('newsletter.success'),
          genericError: t('newsletter.genericError'),
        }}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {sectionKeys.map((key) => (
          <Card key={key} id={key} className="rounded-3xl">
            <CardHeader>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">
                {t(`sections.${key}.eyebrow`)}
              </p>
              <CardTitle className="text-xl">{t(`sections.${key}.title`)}</CardTitle>
              <CardDescription>{t(`sections.${key}.summary`)}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                {[0, 1, 2].map((index) => (
                  <li key={index} className="rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
                    {t(`sections.${key}.bullets.${index}`)}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
