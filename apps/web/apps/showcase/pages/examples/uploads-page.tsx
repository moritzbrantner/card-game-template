import type { AppLocale } from '@moritzbrantner/app-pack';
import { Card, CardDescription, CardHeader, CardTitle } from '@moritzbrantner/ui';

import { UploadPlayground } from '@/apps/showcase/components/uploads/upload-playground';
import { createTranslator } from '@/src/i18n/messages';

export default async function UploadsPage({ locale }: { locale: AppLocale }) {
  const t = createTranslator(locale, 'UploadsPage');

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
      </Card>

      <UploadPlayground
        copy={{
          heroTitle: t('heroTitle'),
          heroDescription: t('heroDescription'),
          queueTitle: t('queueTitle'),
          queueDescription: t('queueDescription'),
          empty: t('empty'),
          clearQueue: t('clearQueue'),
          chooseFiles: t('chooseFiles'),
          acceptedTitle: t('acceptedTitle'),
          lifecycleTitle: t('lifecycleTitle'),
        }}
      />
    </div>
  );
}
