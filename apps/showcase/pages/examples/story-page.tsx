import type { AppLocale } from '@moritzbrantner/app-pack';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@moritzbrantner/ui';

import { StorytellingExperience, type StoryScene } from '@/apps/showcase/components/storytelling-experience';
import { createTranslator } from '@/src/i18n/messages';

const storyScenes: StoryScene[] = [
  {
    id: 'foundation',
    title: 'Foundation',
    description: 'Start with a broad system view before narrowing the camera onto the first interaction.',
    progressionStart: 0,
    progressionEnd: 100,
    color: '#38bdf8',
    position: [-1.2, 0, 0],
  },
  {
    id: 'handoff',
    title: 'Handoff',
    description: 'Transition between narrative beats with enough motion to show continuity without losing context.',
    progressionStart: 100,
    progressionEnd: 200,
    color: '#34d399',
    position: [0.8, 0.3, 0],
  },
  {
    id: 'resolution',
    title: 'Resolution',
    description: 'Land the final scene with a calmer pace so the content can carry the end of the sequence.',
    progressionStart: 200,
    progressionEnd: 300,
    color: '#f97316',
    position: [0.1, -0.6, 0],
  },
];

export default async function StoryPage({ locale }: { locale: AppLocale }) {
  const t = createTranslator(locale, 'StoryPage');

  return (
    <div className="space-y-8">
      <Card className="mx-auto max-w-3xl rounded-3xl">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{t('note')}</p>
        </CardContent>
      </Card>

      <StorytellingExperience scenes={storyScenes} />
    </div>
  );
}
