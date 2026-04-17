'use client';

import { startTransition, useEffect, useRef, useState } from 'react';

import { buttonVariants } from '@moritzbrantner/ui';
import { defaultGameCatalog } from '@repo/game-catalog';
import { createLocalGameSession, type LocalGameSession } from '@repo/game-session';
import {
  createUnoAdapter,
  createUnoBots,
  defaultUnoRules,
  getUnoExamplePreset,
  projectUnoPlayerView,
  type UnoExamplePresetId,
  type UnoMove,
  type UnoPlayerView,
  type UnoRules,
  type UnoState,
} from '@repo/game-uno';

type UnoPageLabels = {
  actionsTitle: string;
  activeColorLabel: string;
  catalogTitle: string;
  confirmHandoff: string;
  deckLabel: string;
  description: string;
  hiddenHand: string;
  pendingDrawLabel: string;
  presetsTitle: string;
  restart: string;
  rulesTitle: string;
  statusTitle: string;
  title: string;
  waitingForPlayer: string;
};

function createSession(presetId: UnoExamplePresetId, rules: UnoRules): LocalGameSession<UnoState, UnoMove, UnoPlayerView> {
  const preset = getUnoExamplePreset(presetId);
  const seed = `${presetId}:${JSON.stringify(rules)}`;

  return createLocalGameSession({
    adapter: createUnoAdapter(),
    bots: createUnoBots(preset.seats, seed),
    hotseat: preset.hotseat,
    matchId: `uno-style:${presetId}`,
    participants: preset.seats,
    projectView: projectUnoPlayerView,
    setup: {
      rules,
      seed,
    },
  });
}

export function UnoPageClient({ labels }: { labels: UnoPageLabels }) {
  const [presetId, setPresetId] = useState<UnoExamplePresetId>('mixed-table');
  const [rules, setRules] = useState<UnoRules>(defaultUnoRules);
  const sessionRef = useRef<LocalGameSession<UnoState, UnoMove, UnoPlayerView> | null>(null);
  const [snapshot, setSnapshot] = useState(() => {
    const session = createSession('mixed-table', defaultUnoRules);
    sessionRef.current = session;
    return session.getSnapshot();
  });

  useEffect(() => {
    const session = createSession(presetId, rules);
    sessionRef.current = session;
    const unsubscribe = session.subscribe((nextSnapshot: ReturnType<typeof session.getSnapshot>) => {
      startTransition(() => {
        setSnapshot(nextSnapshot);
      });
    });

    setSnapshot(session.getSnapshot());

    return unsubscribe;
  }, [presetId, rules]);

  const catalogEntry = defaultGameCatalog.get('uno-style');
  const presetOptions = catalogEntry?.metadata?.presets ?? [];
  const catalogRoute = catalogEntry?.metadata?.route ?? '/uno';

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">
            {labels.catalogTitle}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {labels.title}
          </h1>
          <p className="max-w-3xl text-base leading-7 text-zinc-700 dark:text-zinc-300">
            {labels.description}
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className={buttonVariants({ variant: 'default' })}
            onClick={() => {
              sessionRef.current?.restart();
            }}
          >
            {labels.restart}
          </button>
          <span className="inline-flex items-center rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
            {catalogEntry?.definition.name ?? 'UNO-style'} · {catalogRoute}
          </span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">{labels.presetsTitle}</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                {snapshot.participants.length} seats active in the current local match.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {presetOptions.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={buttonVariants({ variant: preset.id === presetId ? 'default' : 'outline' })}
                  onClick={() => {
                    setPresetId(preset.id);
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {([
              ['drawStacking', 'Draw stacking'],
              ['jumpIn', 'Jump-in'],
              ['sevenZero', '7-0 swap'],
              ['requireUnoCall', 'Require UNO call'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={[
                  'rounded-2xl border px-4 py-3 text-left text-sm transition-colors',
                  rules[key]
                    ? 'border-zinc-950 bg-zinc-950 text-zinc-50 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200',
                ].join(' ')}
                onClick={() => {
                  setRules((currentRules: UnoRules) => ({
                    ...currentRules,
                    [key]: !currentRules[key],
                  }));
                }}
              >
                <span className="block font-medium">{label}</span>
                <span className="block text-xs opacity-80">{labels.rulesTitle}</span>
              </button>
            ))}
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">{labels.statusTitle}</h2>
          <dl className="mt-4 grid gap-3 text-sm text-zinc-600 dark:text-zinc-300">
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
              <dt>{labels.activeColorLabel}</dt>
              <dd className="font-medium capitalize">{snapshot.view.activeColor}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
              <dt>{labels.pendingDrawLabel}</dt>
              <dd className="font-medium">{snapshot.view.pendingDrawAmount}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
              <dt>{labels.deckLabel}</dt>
              <dd className="font-medium">{snapshot.view.drawPileCount}</dd>
            </div>
            <div className="rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
              <dt className="font-medium text-zinc-950 dark:text-zinc-50">Event</dt>
              <dd className="mt-2">{snapshot.view.status}</dd>
            </div>
            {snapshot.view.matchResultBanner ? (
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                {snapshot.view.matchResultBanner}
              </div>
            ) : null}
          </dl>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {snapshot.view.players.map((player: UnoPlayerView['players'][number]) => (
          <article
            key={player.playerId}
            className={[
              'rounded-[1.75rem] border p-6 shadow-sm transition-colors',
              player.isActive
                ? 'border-zinc-950 bg-zinc-950 text-zinc-50 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950'
                : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950',
            ].join(' ')}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{player.displayName}</h2>
                <p className="text-sm opacity-75">
                  {player.controller} · {player.handCount} cards
                </p>
              </div>
              {player.isViewer ? (
                <span className="rounded-full border border-current/20 px-3 py-1 text-xs uppercase tracking-[0.18em]">
                  Viewer
                </span>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {player.visibleCards.length > 0 ? (
                player.visibleCards.map((card: UnoPlayerView['players'][number]['visibleCards'][number]) => (
                  <span
                    key={card.id}
                    className="rounded-2xl border border-current/15 px-3 py-2 text-sm"
                  >
                    {card.label}
                  </span>
                ))
              ) : (
                <p className="text-sm opacity-75">{labels.hiddenHand}</p>
              )}
            </div>
          </article>
        ))}
      </div>

      {snapshot.view.pendingHotseatPlayerId ? (
        <div className="rounded-[1.75rem] border border-amber-300 bg-amber-50 p-6 shadow-sm dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-100">
            {labels.waitingForPlayer.replace('{playerId}', snapshot.view.pendingHotseatPlayerId)}
          </p>
          <button
            type="button"
            className={`${buttonVariants({ variant: 'default' })} mt-4`}
            onClick={() => {
              sessionRef.current?.confirmHotseat();
            }}
          >
            {labels.confirmHandoff}
          </button>
        </div>
      ) : (
        <article className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">{labels.actionsTitle}</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {snapshot.view.legalActions.length > 0 ? (
              snapshot.view.legalActions.map((action: UnoPlayerView['legalActions'][number]) => (
                <button
                  key={action.id}
                  type="button"
                  className={buttonVariants({ variant: 'outline' })}
                  onClick={() => {
                    sessionRef.current?.submitMove(action.move);
                  }}
                >
                  {action.label}
                </button>
              ))
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-300">No visible actions right now.</p>
            )}
          </div>
        </article>
      )}
    </section>
  );
}
