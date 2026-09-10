'use client';

import { useEffect, useRef, useState } from 'react';

import {
  createLocalGameSession,
  type LocalGameSession,
} from '@repo/game-session';
import {
  createUnoAdapter,
  createUnoBots,
  defaultUnoRules,
  getUnoExamplePreset,
  projectUnoPlayerView,
  type UnoColor,
  type UnoMove,
  type UnoPlayerView,
  type UnoState,
} from '@repo/game-uno';

import {
  HiddenUnoCardStack,
  UnoCardVisual,
  UnoColorBadge,
} from '@/components/uno-card-visuals';

type UnoLocalPageLabels = {
  activeColorLabel: string;
  activeTurnLabel: string;
  botLabel: string;
  cardsLabel: string;
  colors: Record<UnoColor, string>;
  completedMessage: string;
  description: string;
  discardPileLabel: string;
  drawPileLabel: string;
  handTitle: string;
  humanLabel: string;
  inProgressStatus: string;
  legalActionsTitle: string;
  localMatchLabel: string;
  playersTitle: string;
  restartAction: string;
  statusLabel: string;
  tableLabel: string;
  title: string;
  turnLabel: string;
  waitingForPlayers: string;
  winnerLabel: string;
};

const PRESET_ID = 'bot-duel' as const;

function createPreviewSession(): LocalGameSession<
  UnoState,
  UnoMove,
  UnoPlayerView
> {
  const preset = getUnoExamplePreset(PRESET_ID);
  const seed = 'web-preview:uno:bot-duel';

  return createLocalGameSession({
    adapter: createUnoAdapter(),
    bots: createUnoBots(preset.seats, seed),
    hotseat: false,
    matchId: 'web-preview:uno:bot-duel',
    participants: preset.seats,
    projectView: projectUnoPlayerView,
    setup: {
      rules: defaultUnoRules,
      seed,
    },
  });
}

export function UnoLocalPageClient({ labels }: { labels: UnoLocalPageLabels }) {
  const sessionRef = useRef<LocalGameSession<
    UnoState,
    UnoMove,
    UnoPlayerView
  > | null>(null);
  const applyingMoveRef = useRef(false);
  const [isApplyingMove, setIsApplyingMove] = useState(false);
  const [snapshot, setSnapshot] = useState(() =>
    createPreviewSession().getSnapshot(),
  );

  useEffect(() => {
    const session = createPreviewSession();
    sessionRef.current = session;
    const unsubscribe = session.subscribe((nextSnapshot) => {
      setSnapshot(nextSnapshot);
      requestAnimationFrame(() => {
        applyingMoveRef.current = false;
        setIsApplyingMove(false);
      });
    });

    setSnapshot(session.getSnapshot());

    return unsubscribe;
  }, []);

  const humanPlayer = snapshot.view.players.find(
    (player) => player.controller === 'human',
  );
  const winnerPlayer = snapshot.matchResult
    ? snapshot.view.players.find(
        (player) => player.playerId === snapshot.matchResult?.winnerIds[0],
      )
    : null;

  function submitMove(move: UnoMove) {
    const session = sessionRef.current;

    if (!session || applyingMoveRef.current) {
      return;
    }

    applyingMoveRef.current = true;
    setIsApplyingMove(true);

    try {
      session.submitMove(move);
    } catch (error) {
      applyingMoveRef.current = false;
      setIsApplyingMove(false);
      throw error;
    }
  }

  return (
    <section className="space-y-8 pb-8">
      <header className="flex flex-col gap-5 border-b border-zinc-200 pb-8 dark:border-zinc-800 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            {labels.localMatchLabel}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-zinc-950 sm:text-5xl dark:text-zinc-50">
            {labels.title}
          </h1>
          <p className="mt-4 text-base leading-7 text-zinc-600 dark:text-zinc-300">
            {labels.description}
          </p>
        </div>
        <button
          type="button"
          onClick={() => sessionRef.current?.restart()}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          {labels.restartAction}
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            {labels.turnLabel}
          </p>
          <p className="mt-2 font-semibold text-zinc-950 dark:text-zinc-50">
            {snapshot.view.players.find(
              (player) => player.playerId === snapshot.view.activePlayerId,
            )?.displayName ?? snapshot.view.activePlayerId}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            {labels.activeColorLabel}
          </p>
          <div className="mt-2">
            <UnoColorBadge
              color={snapshot.view.activeColor}
              label={labels.colors[snapshot.view.activeColor]}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            {labels.statusLabel}
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
            {snapshot.matchResult
              ? `${labels.winnerLabel}: ${winnerPlayer?.displayName ?? snapshot.matchResult.winnerIds[0]}`
              : labels.inProgressStatus}
          </p>
        </div>
      </div>

      <section
        aria-label={labels.tableLabel}
        className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="grid gap-8 sm:grid-cols-2 sm:items-start">
          <div>
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              {labels.drawPileLabel}
            </h2>
            <div className="mt-3">
              <HiddenUnoCardStack
                cardCount={snapshot.view.drawPileCount}
                label={labels.drawPileLabel}
              />
            </div>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              {labels.discardPileLabel}
            </h2>
            <div className="mt-3">
              {snapshot.view.discardTop ? (
                <UnoCardVisual card={snapshot.view.discardTop} />
              ) : (
                <p className="text-sm text-zinc-500">—</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="hand-heading">
        <h2
          id="hand-heading"
          className="text-xl font-semibold text-zinc-950 dark:text-zinc-50"
        >
          {labels.handTitle}
        </h2>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-3">
          {humanPlayer?.visibleCards.map((card) => (
            <UnoCardVisual key={card.id} card={card} variant="compact" />
          ))}
        </div>
      </section>

      <section aria-labelledby="actions-heading">
        <h2
          id="actions-heading"
          className="text-xl font-semibold text-zinc-950 dark:text-zinc-50"
        >
          {labels.legalActionsTitle}
        </h2>
        <div
          className="mt-4 flex flex-wrap gap-2"
          role="group"
          aria-label={labels.legalActionsTitle}
        >
          {snapshot.matchResult ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {labels.completedMessage}
            </p>
          ) : snapshot.view.legalActions.length > 0 ? (
            snapshot.view.legalActions.map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={isApplyingMove}
                onClick={() => submitMove(action.move)}
                className="min-h-11 rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-100 disabled:cursor-wait disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-800"
              >
                {action.label}
              </button>
            ))
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {labels.waitingForPlayers}
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="players-heading">
        <h2
          id="players-heading"
          className="text-xl font-semibold text-zinc-950 dark:text-zinc-50"
        >
          {labels.playersTitle}
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {snapshot.view.players.map((player) => (
            <article
              key={player.playerId}
              className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-zinc-950 dark:text-zinc-50">
                  {player.displayName}
                </p>
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                  {player.controller === 'human'
                    ? labels.humanLabel
                    : labels.botLabel}
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                {player.handCount} {labels.cardsLabel}
                {player.isActive ? ` · ${labels.activeTurnLabel}` : ''}
              </p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
