'use client';

import { useState } from 'react';

import { CardTable } from '@moritzbrantner/card-games';
import type { ChartConfig } from '@moritzbrantner/ui';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  buttonVariants,
} from '@moritzbrantner/ui';
import type { UnoCard } from '@repo/game-uno';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  PanelRightClose,
  PanelRightOpen,
  UserRound,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';

import { UnoHandPreview } from '@/components/uno-card-visuals';

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
    visibleCards: readonly UnoCard[];
  }>;
};

type ReplayTimelineEntry = {
  id: string;
  label: string;
  acceptedAt: string | null;
  stepIndex: number;
};

const HAND_SIZE_COLORS = [
  '#ef4444',
  '#3b82f6',
  '#eab308',
  '#10b981',
  '#f97316',
  '#8b5cf6',
] as const;

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
  const birdEyePerspectiveId =
    perspectives.find((perspective) => perspective.kind === 'bird-eye')?.id ??
    firstPerspectiveId;
  const [perspectiveId, setPerspectiveId] = useState(firstPerspectiveId);
  const [stepIndex, setStepIndex] = useState(steps.length - 1);
  const [isTimelineMinimized, setIsTimelineMinimized] = useState(false);
  const activeStep = steps[stepIndex] ?? steps[steps.length - 1];
  const activePerspective =
    perspectives.find((perspective) => perspective.id === perspectiveId) ??
    perspectives[0];
  const activeView = activeStep?.views[activePerspective?.id ?? ''];
  const chartPlayers = steps[0]?.views[birdEyePerspectiveId]?.players ?? [];
  const handSizeChartConfig = Object.fromEntries(
    chartPlayers.map((player, index) => [
      player.playerId,
      {
        label: player.displayName,
        color: HAND_SIZE_COLORS[index % HAND_SIZE_COLORS.length],
      },
    ]),
  ) satisfies ChartConfig;
  const handSizeHistory = steps.map((step, index) => {
    const birdEyePlayers = step.views[birdEyePerspectiveId]?.players ?? [];

    return Object.fromEntries([
      ['sequenceLabel', index === 0 ? 'Start' : `Move ${index}`],
      ['stepLabel', step.label],
      ['acceptedAt', step.acceptedAt ?? ''],
      ...chartPlayers.map((player) => [
        player.playerId,
        birdEyePlayers.find(
          (candidate) => candidate.playerId === player.playerId,
        )?.handCount ?? 0,
      ]),
    ]);
  });
  const currentSequenceLabel =
    handSizeHistory[stepIndex]?.sequenceLabel ??
    handSizeHistory[0]?.sequenceLabel;
  const replayShellClassName =
    'relative left-1/2 w-[calc(100vw-1.5rem)] max-w-[112rem] -translate-x-1/2 space-y-6 sm:w-[calc(100vw-2rem)]';

  if (!activeStep || !activeView) {
    return (
      <section className={replayShellClassName}>
        <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {summaryTitle}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-700 dark:text-zinc-300">
            {summaryDescription}
          </p>
          <div className="mt-6">
            <a
              href={backHref}
              className={buttonVariants({ variant: 'default' })}
            >
              Back to past games
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={replayShellClassName}>
      <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {summaryTitle}
          </h1>
          <p className="max-w-3xl text-base leading-7 text-zinc-700 dark:text-zinc-300">
            {summaryDescription}
          </p>
        </div>

        <div className="mt-6">
          <a href={backHref} className={buttonVariants({ variant: 'default' })}>
            Back to past games
          </a>
        </div>
      </div>

      <div
        className={`grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem] ${
          isTimelineMinimized
            ? '2xl:grid-cols-[minmax(0,1fr)_24rem_5.5rem]'
            : '2xl:grid-cols-[minmax(0,1fr)_24rem_22rem]'
        }`}
      >
        <article className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                {activeStep.label}
              </h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                {activeView.status}
              </p>
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

          <div
            className="mt-6 flex flex-wrap gap-2"
            role="group"
            aria-label="Replay perspective"
          >
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
              aria-label="Replay step"
              min={0}
              max={Math.max(steps.length - 1, 0)}
              value={stepIndex}
              onChange={(event) => {
                setStepIndex(Number(event.target.value));
              }}
              className="w-full"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              Step {stepIndex + 1} of {steps.length}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={stepIndex === 0}
                onClick={() => {
                  setStepIndex((current) => Math.max(current - 1, 0));
                }}
                className={[
                  'inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition',
                  stepIndex === 0
                    ? 'cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600'
                    : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-500',
                ].join(' ')}
              >
                <ChevronLeft aria-hidden="true" className="size-4 shrink-0" />
                <span>Previous step</span>
              </button>
              <button
                type="button"
                disabled={stepIndex === steps.length - 1}
                onClick={() => {
                  setStepIndex((current) =>
                    Math.min(current + 1, steps.length - 1),
                  );
                }}
                className={[
                  'inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition',
                  stepIndex === steps.length - 1
                    ? 'cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600'
                    : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-500',
                ].join(' ')}
              >
                <span>Next step</span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
              </button>
            </div>
          </div>

          <div className="mt-6">
            <CardTable
              eyebrow={activePerspective.label}
              subtitle="Replay cards are rendered from the active perspective while hidden hands stay face down."
              title={activeView.status}
              tone="midnight"
            >
              <div className="grid gap-3 md:grid-cols-2">
                {activeView.players.map((player) => {
                  const hiddenCount = Math.max(
                    player.handCount - player.visibleCards.length,
                    0,
                  );

                  return (
                    <div
                      key={`${activeStep.id}:${player.playerId}`}
                      className="rounded-[1.4rem] border border-white/12 bg-white/8 p-4 backdrop-blur-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate font-medium text-white">
                            {player.displayName}
                          </p>
                          {player.isViewer ? (
                            <span className="shrink-0 rounded-full border border-sky-300/40 bg-sky-400/15 px-2 py-0.5 text-xs font-medium text-sky-100">
                              View
                            </span>
                          ) : null}
                        </div>
                        <span className="text-sm text-white/72">
                          {player.handCount} cards
                        </span>
                      </div>

                      <UnoHandPreview
                        className="mt-4"
                        hiddenCount={hiddenCount}
                        label={player.displayName}
                        visibleCards={player.visibleCards}
                      />
                    </div>
                  );
                })}
              </div>
            </CardTable>
          </div>
        </article>

        <div className="space-y-4">
          <article className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
              Analysis
            </h2>
            <div className="mt-4 grid gap-3">
              {analysisCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    {card.label}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                    {card.value}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
                  Hand sizes
                </h2>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  Card count for each player at every replay step.
                </p>
              </div>
            </div>

            {chartPlayers.length > 0 ? (
              <>
                <ChartContainer
                  config={handSizeChartConfig}
                  className="mt-6 h-72 w-full"
                >
                  <LineChart
                    data={handSizeHistory}
                    margin={{ left: 0, right: 12, top: 8 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="sequenceLabel"
                      tickLine={false}
                      axisLine={false}
                      minTickGap={20}
                    />
                    <YAxis
                      allowDecimals={false}
                      width={32}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          indicator="line"
                          labelFormatter={(_value, payload) => {
                            const point = payload[0]?.payload as
                              | {
                                  acceptedAt?: string;
                                  stepLabel?: string;
                                }
                              | undefined;
                            return (
                              <div className="space-y-1">
                                <div>{point?.stepLabel ?? 'Replay step'}</div>
                                {point?.acceptedAt ? (
                                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                    {new Date(
                                      point.acceptedAt,
                                    ).toLocaleString()}
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                    Match start
                                  </div>
                                )}
                              </div>
                            );
                          }}
                        />
                      }
                    />
                    <ReferenceLine
                      x={currentSequenceLabel}
                      stroke="#18181b"
                      strokeDasharray="4 4"
                    />
                    {chartPlayers.map((player) => (
                      <Line
                        key={player.playerId}
                        type="monotone"
                        dataKey={player.playerId}
                        name={player.displayName}
                        stroke={`var(--color-${player.playerId})`}
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        activeDot={{ r: 4 }}
                      />
                    ))}
                  </LineChart>
                </ChartContainer>

                <div className="mt-4 flex flex-wrap gap-2">
                  {chartPlayers.map((player) => (
                    <div
                      key={player.playerId}
                      className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                    >
                      <span
                        aria-hidden="true"
                        className="mr-2 inline-block size-2 rounded-full align-middle"
                        style={{
                          backgroundColor:
                            handSizeChartConfig[player.playerId]?.color,
                        }}
                      />
                      <span className="align-middle">
                        {player.displayName}:{' '}
                        {activeStep.views[birdEyePerspectiveId]?.players.find(
                          (candidate) => candidate.playerId === player.playerId,
                        )?.handCount ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
                No hand-size history is available for this replay.
              </p>
            )}
          </article>
        </div>

        <article
          className={`rounded-[1.75rem] border border-zinc-200 bg-white shadow-sm xl:col-span-2 2xl:col-span-1 dark:border-zinc-800 dark:bg-zinc-950 ${
            isTimelineMinimized ? 'p-3' : 'p-6'
          }`}
        >
          <div
            className={`flex gap-3 ${
              isTimelineMinimized
                ? 'flex-col items-center'
                : 'items-start justify-between'
            }`}
          >
            <div className={isTimelineMinimized ? 'sr-only' : ''}>
              <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
                Timeline
              </h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                Jump to any move or keep the rail minimized while you inspect
                the table.
              </p>
            </div>
            <button
              type="button"
              aria-expanded={!isTimelineMinimized}
              aria-label={
                isTimelineMinimized ? 'Expand timeline' : 'Minimize timeline'
              }
              onClick={() => {
                setIsTimelineMinimized((current) => !current);
              }}
              className="inline-flex min-h-10 items-center gap-2 self-start rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-500"
            >
              {isTimelineMinimized ? (
                <PanelRightOpen
                  aria-hidden="true"
                  className="size-4 shrink-0"
                />
              ) : (
                <PanelRightClose
                  aria-hidden="true"
                  className="size-4 shrink-0"
                />
              )}
              <span className={isTimelineMinimized ? 'sr-only' : ''}>
                {isTimelineMinimized ? 'Expand timeline' : 'Minimize timeline'}
              </span>
            </button>
          </div>

          <ol
            className={`mt-4 ${
              isTimelineMinimized ? 'space-y-2' : 'space-y-3'
            }`}
          >
            {timeline.length === 0 ? (
              <li className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                No move timeline is available for this replay.
              </li>
            ) : null}
            {timeline.map((entry, index) => {
              const isActive = stepIndex === entry.stepIndex;

              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    aria-pressed={isActive}
                    aria-label={
                      isTimelineMinimized ? `Go to ${entry.label}` : undefined
                    }
                    onClick={() => {
                      setStepIndex(entry.stepIndex);
                    }}
                    className={`w-full rounded-2xl border text-left transition ${
                      isTimelineMinimized
                        ? [
                            'flex min-h-12 items-center justify-center px-2 py-3 text-sm font-semibold',
                            isActive
                              ? 'border-zinc-950 bg-zinc-950 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950'
                              : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600',
                          ].join(' ')
                        : [
                            'bg-zinc-50 p-4 dark:bg-zinc-900',
                            isActive
                              ? 'border-zinc-950 dark:border-zinc-50'
                              : 'border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600',
                          ].join(' ')
                    }`}
                  >
                    {isTimelineMinimized ? (
                      <span>{index === 0 ? 'S' : index}</span>
                    ) : (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          {index === 0 ? 'Start' : `Move ${index}`}
                        </p>
                        <p className="mt-2 text-sm text-zinc-900 dark:text-zinc-100">
                          {entry.label}
                        </p>
                        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                          {entry.acceptedAt
                            ? new Date(entry.acceptedAt).toLocaleString()
                            : 'Match start'}
                        </p>
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </article>
      </div>
    </section>
  );
}
