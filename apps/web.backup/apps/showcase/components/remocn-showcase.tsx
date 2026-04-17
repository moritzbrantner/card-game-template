'use client';

import type { ReactNode } from 'react';

import { Player } from '@remotion/player';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { useTranslations } from '@/src/i18n';
import { BlurReveal } from '@/src/components/remocn/blur-reveal';
import { MatrixDecode } from '@/src/components/remocn/matrix-decode';
import { SpotlightCard } from '@/src/components/remocn/spotlight-card';
import { TerminalSimulator, type TerminalLine } from '@/src/components/remocn/terminal-simulator';

const docsUrl = 'https://www.remocn.dev/docs/components';
const installUrl = 'https://www.remocn.dev/docs/getting-started/installation';
const installCommand =
  'bunx shadcn@latest add @remocn/blur-reveal @remocn/matrix-decode @remocn/spotlight-card @remocn/terminal-simulator';

const terminalLines: TerminalLine[] = [
  { text: 'bunx shadcn@latest add @remocn/terminal-simulator', type: 'command', delay: 0 },
  { text: 'Checking registry...', type: 'log', delay: 8, pause: 12 },
  { text: 'Installing remotion peer dependencies...', type: 'log', delay: 6 },
  { text: 'Creating src/components/remocn/terminal-simulator.tsx', type: 'success', delay: 10 },
  { text: 'Embedding the component with @remotion/player', type: 'success', delay: 10 },
  { text: 'Showcase ready.', type: 'success', delay: 8 },
];

const playerBaseProps = {
  fps: 30,
  controls: false,
  loop: true,
  autoPlay: true,
  clickToPlay: false,
  allowFullscreen: false,
  spaceKeyToPlayOrPause: false,
  initiallyMuted: true,
  acknowledgeRemotionLicense: true,
  noSuspense: true,
  style: { width: '100%', height: '100%' },
} as const;

type PreviewCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
};

function PreviewCard({ eyebrow, title, description, children, className }: PreviewCardProps) {
  return (
    <article
      className={[
        'overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-white/90 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.7)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-start justify-between gap-4 border-b border-zinc-200/80 px-5 py-4 dark:border-zinc-800">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">
            {eyebrow}
          </p>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">{title}</h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">{description}</p>
          </div>
        </div>
      </div>
      {children}
    </article>
  );
}

export function RemocnShowcase() {
  const t = useTranslations('RemocnPage');

  const stats = [
    { value: '4', label: t('stats.components') },
    { value: '1', label: t('stats.registryFlow') },
    { value: '100%', label: t('stats.browserPreview') },
  ];

  const importedComponents = ['BlurReveal', 'MatrixDecode', 'SpotlightCard', 'TerminalSimulator'];

  return (
    <section className="space-y-8">
      <div className="relative overflow-hidden rounded-[2rem] border border-zinc-200 bg-[linear-gradient(135deg,#f8fafc_0%,#fff7ed_35%,#ecfeff_100%)] p-6 shadow-[0_32px_120px_-64px_rgba(15,23,42,0.75)] dark:border-zinc-800 dark:bg-[linear-gradient(135deg,#09090b_0%,#111827_38%,#0f172a_100%)] md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.22),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(34,211,238,0.2),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.16),transparent_28%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,540px)] lg:items-center">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-zinc-950 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950">{t('eyebrow')}</Badge>
              <Badge variant="outline" className="border-zinc-400/60 bg-white/60 dark:bg-zinc-950/40">
                {t('subeyebrow')}
              </Badge>
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 md:text-5xl">
                {t('title')}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-zinc-700 dark:text-zinc-300 md:text-lg">
                {t('description')}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={docsUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: 'default' })}
              >
                {t('actions.catalog')}
              </a>
              <a
                href={installUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: 'outline' })}
              >
                {t('actions.installation')}
              </a>
            </div>

            <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">{t('supportingCopy')}</p>
          </div>

          <div className="overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-zinc-950/95 p-3 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.75)] dark:border-zinc-700/80">
            <div className="aspect-[16/11] overflow-hidden rounded-[1.25rem]">
              <Player
                component={TerminalSimulator}
                inputProps={{
                  title: '~/projects/remocn-showcase',
                  lines: terminalLines,
                  fontSize: 17,
                  speed: 0.9,
                }}
                durationInFrames={180}
                compositionWidth={1280}
                compositionHeight={880}
                className="size-full"
                {...playerBaseProps}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[1.5rem] border border-zinc-200 bg-white px-5 py-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <p className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">{stat.value}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <PreviewCard
            eyebrow={t('cards.terminal.eyebrow')}
            title={t('cards.terminal.title')}
            description={t('cards.terminal.description')}
          >
            <div className="aspect-[16/10] overflow-hidden bg-zinc-950">
              <Player
                component={TerminalSimulator}
                inputProps={{
                  title: '~/projects/remocn-showcase',
                  lines: terminalLines,
                  fontSize: 17,
                  speed: 0.9,
                }}
                durationInFrames={180}
                compositionWidth={1280}
                compositionHeight={800}
                className="size-full"
                {...playerBaseProps}
              />
            </div>
          </PreviewCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <PreviewCard
              eyebrow={t('cards.blur.eyebrow')}
              title={t('cards.blur.title')}
              description={t('cards.blur.description')}
            >
              <div className="aspect-[4/3] overflow-hidden bg-white">
                <Player
                  component={BlurReveal}
                  inputProps={{
                    text: 'remocn',
                    fontSize: 138,
                    blur: 18,
                    color: '#111827',
                  }}
                  durationInFrames={90}
                  compositionWidth={1200}
                  compositionHeight={900}
                  className="size-full"
                  {...playerBaseProps}
                />
              </div>
            </PreviewCard>

            <PreviewCard
              eyebrow={t('cards.matrix.eyebrow')}
              title={t('cards.matrix.title')}
              description={t('cards.matrix.description')}
            >
              <div className="aspect-[4/3] overflow-hidden bg-white">
                <Player
                  component={MatrixDecode}
                  inputProps={{
                    text: 'REGISTRY READY',
                    fontSize: 82,
                    color: '#16a34a',
                    revealDuration: 72,
                  }}
                  durationInFrames={96}
                  compositionWidth={1200}
                  compositionHeight={900}
                  className="size-full"
                  {...playerBaseProps}
                />
              </div>
            </PreviewCard>
          </div>

          <PreviewCard
            eyebrow={t('cards.spotlight.eyebrow')}
            title={t('cards.spotlight.title')}
            description={t('cards.spotlight.description')}
          >
            <div className="aspect-[16/9] overflow-hidden bg-zinc-950">
              <Player
                component={SpotlightCard}
                inputProps={{
                  title: 'Render once, showcase anywhere',
                  body: 'These remocn primitives were pulled in with the CLI and mounted in-browser with @remotion/player.',
                  cardWidth: 760,
                  cardHeight: 420,
                  glowOpacity: 0.12,
                }}
                durationInFrames={150}
                compositionWidth={1400}
                compositionHeight={820}
                className="size-full"
                {...playerBaseProps}
              />
            </div>
          </PreviewCard>
        </div>

        <aside className="space-y-6">
          <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">
              {t('install.title')}
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{t('install.description')}</p>
            <pre className="mt-4 overflow-x-auto rounded-2xl bg-zinc-950 p-4 text-xs leading-6 text-zinc-100">
              <code>{installCommand}</code>
            </pre>
            <div className="mt-4 flex flex-wrap gap-2">
              {importedComponents.map((componentName) => (
                <Badge key={componentName} variant="secondary">
                  {componentName}
                </Badge>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">
              {t('integration.title')}
            </p>
            <div className="mt-3 space-y-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              <p>{t('integration.pointOne')}</p>
              <p>{t('integration.pointTwo')}</p>
              <p>{t('integration.pointThree')}</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
