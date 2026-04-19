'use client';

import { useState } from 'react';

import { buttonVariants } from '@moritzbrantner/ui';

type ReplayStep = {
  id: string;
  label: string;
  acceptedAt: string | null;
  status: string;
  matchResultBanner: string | null;
  players: ReadonlyArray<{
    displayName: string;
    handCount: number;
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
  steps,
  timeline,
  analysisCards,
}: {
  backHref: string;
  summaryTitle: string;
  summaryDescription: string;
  steps: readonly ReplayStep[];
  timeline: readonly ReplayTimelineEntry[];
  analysisCards: readonly { label: string; value: string }[];
}) {
  const [stepIndex, setStepIndex] = useState(steps.length - 1);
  const activeStep = steps[stepIndex] ?? steps[steps.length - 1];

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
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{activeStep.status}</p>
            </div>
            {activeStep.acceptedAt ? (
              <span className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                {new Date(activeStep.acceptedAt).toLocaleString()}
              </span>
            ) : null}
          </div>

          {activeStep.matchResultBanner ? (
            <p className="mt-6 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              {activeStep.matchResultBanner}
            </p>
          ) : null}

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
            {activeStep.players.map((player) => (
              <div
                key={`${activeStep.id}:${player.displayName}`}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-zinc-950 dark:text-zinc-50">{player.displayName}</p>
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
