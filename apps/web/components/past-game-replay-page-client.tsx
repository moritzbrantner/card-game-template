'use client';

import { useState } from 'react';

import { buttonVariants } from '@moritzbrantner/ui';
import { Eye, UserRound } from 'lucide-react';

type ReplayPerspective = {
  id: string;
  kind: 'bird-eye' | 'player';
  label: string;
};

type ReplayStep = {
  id: string;
  label: string;
  acceptedAt: string | null;
  views: Readonly<Record<string, ReplayStepView>>;
};

type ReplayStepView = {
  status: string;
  matchResultBanner: string | null;
  players: ReadonlyArray<{
    playerId: string;
    displayName: string;
    handCount: number;
    isViewer: boolean;
    visibleCards: readonly { id: string; label: string }[];
  }>;
};

type ReplayTimelineEntry = {
  id: string;
  label: string;
  acceptedAt: string;
};

export function PastGameReplayPageClient({
  backHref,
  summaryTitle,
  summaryDescription,
  perspectives,
  steps,
  timeline,
  analysisCards,
}: {
  backHref: string;
  summaryTitle: string;
  summaryDescription: string;
  perspectives: readonly ReplayPerspective[];
  steps: readonly ReplayStep[];
  timeline: readonly ReplayTimelineEntry[];
  analysisCards: readonly { label: string; value: string }[];
}) {
  const firstPerspectiveId = perspectives[0]?.id ?? '';
  const [perspectiveId, setPerspectiveId] = useState(firstPerspectiveId);
  const [stepIndex, setStepIndex] = useState(steps.length - 1);
  const activeStep = steps[stepIndex] ?? steps[steps.length - 1];
  const activePerspective = perspectives.find((perspective) => perspective.id === perspectiveId) ?? perspectives[0];
  const activeView = activeStep?.views[activePerspective?.id ?? ''];

  if (!activeStep || !activeView) {
    return (
      <section className="space-y-6">
        <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">{summaryTitle}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-700 dark:text-zinc-300">{summaryDescription}</p>
          <div className="mt-6">
            <a href={backHref} className={buttonVariants({ variant: 'default' })}>
              Back to past games
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">{summaryTitle}</h1>
          <p className="max-w-3xl text-base leading-7 text-zinc-700 dark:text-zinc-300">{summaryDescription}</p>
        </div>

        <div className="mt-6">
          <a href={backHref} className={buttonVariants({ variant: 'default' })}>
            Back to past games
          </a>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{activeStep.label}</h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{activeView.status}</p>
            </div>
            {activeStep.acceptedAt ? (
              <span className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                {new Date(activeStep.acceptedAt).toLocaleString()}
              </span>
            ) : null}
          </div>

          {activeView.matchResultBanner ? (
            <p className="mt-6 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              {activeView.matchResultBanner}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Replay perspective">
            {perspectives.map((perspective) => {
              const isActive = perspective.id === activePerspective.id;
              const Icon = perspective.kind === 'bird-eye' ? Eye : UserRound;

              return (
                <button
                  key={perspective.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => {
                    setPerspectiveId(perspective.id);
                  }}
                  className={[
                    'inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition',
                    isActive
                      ? 'border-zinc-950 bg-zinc-950 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950'
                      : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-500',
                  ].join(' ')}
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  <span>{perspective.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            <input
              type="range"
              min={0}
              max={Math.max(steps.length - 1, 0)}
              value={stepIndex}
              onChange={(event) => {
                setStepIndex(Number(event.target.value));
              }}
              className="w-full"
            />
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {activeView.players.map((player) => (
              <div
                key={`${activeStep.id}:${player.playerId}`}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate font-medium text-zinc-950 dark:text-zinc-50">{player.displayName}</p>
                    {player.isViewer ? (
                      <span className="shrink-0 rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200">
                        View
                      </span>
                    ) : null}
                  </div>
                  <span className="text-sm text-zinc-600 dark:text-zinc-300">{player.handCount} cards</span>
                </div>

                {player.visibleCards.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {player.visibleCards.map((card) => (
                      <span
                        key={card.id}
                        className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                      >
                        {card.label}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </article>

        <div className="space-y-4">
          <article className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">Analysis</h2>
            <div className="mt-4 grid gap-3">
              {analysisCards.map((card) => (
                <div key={card.label} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">{card.label}</p>
                  <p className="mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">{card.value}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">Timeline</h2>
            <ol className="mt-4 space-y-3">
              {timeline.map((entry, index) => (
                <li key={entry.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Move {index + 1}</p>
                  <p className="mt-2 text-sm text-zinc-900 dark:text-zinc-100">{entry.label}</p>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{new Date(entry.acceptedAt).toLocaleString()}</p>
                </li>
              ))}
            </ol>
          </article>
        </div>
      </div>
    </section>
  );
}
