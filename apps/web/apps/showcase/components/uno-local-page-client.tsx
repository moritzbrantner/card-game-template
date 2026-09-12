'use client';

import { useEffect, useRef, useState } from 'react';

import { CardActionPileControl, PlayerHand } from '@moritzbrantner/card-games';
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
  type UnoDirectPlayActionView,
  type UnoMove,
  type UnoPlayerView,
  type UnoState,
  type UnoVisibleCardView,
} from '@repo/game-uno';

import {
  HiddenUnoCardStack,
  UnoCardVisual,
  UnoColorBadge,
} from '@/components/uno-card-visuals';
import { GameSessionFrame } from './game-session';

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

type PendingColorChoice = {
  actions: readonly UnoDirectPlayActionView[];
  cardId: string;
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

function colorChoiceActions(actions: readonly UnoDirectPlayActionView[]) {
  const seen = new Set<UnoColor>();

  return actions.filter((action) => {
    if (!action.chosenColor || seen.has(action.chosenColor)) {
      return false;
    }

    seen.add(action.chosenColor);
    return true;
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
  const [pendingColorChoice, setPendingColorChoice] =
    useState<PendingColorChoice | null>(null);
  const [snapshot, setSnapshot] = useState(() =>
    createPreviewSession().getSnapshot(),
  );

  useEffect(() => {
    const session = createPreviewSession();
    sessionRef.current = session;
    const unsubscribe = session.subscribe((nextSnapshot) => {
      setSnapshot(nextSnapshot);
      setPendingColorChoice(null);
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
  const activePlayer = snapshot.view.players.find(
    (player) => player.playerId === snapshot.view.activePlayerId,
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
    setPendingColorChoice(null);

    try {
      session.submitMove(move);
    } catch (error) {
      applyingMoveRef.current = false;
      setIsApplyingMove(false);
      throw error;
    }
  }

  function handleCardPlay(card: UnoVisibleCardView) {
    if (isApplyingMove || !card.directPlay) {
      return;
    }

    if (card.directPlay.promptsForColorChoice) {
      setPendingColorChoice({
        actions: card.directPlay.actions,
        cardId: card.id,
      });
      return;
    }

    const action = card.directPlay.actions.find(
      (candidate) => candidate.id === card.directPlay?.defaultActionId,
    );

    if (action) {
      submitMove(action.move);
    }
  }

  function restartMatch() {
    setPendingColorChoice(null);
    sessionRef.current?.restart();
  }

  const winnerText = snapshot.matchResult
    ? `${labels.winnerLabel}: ${winnerPlayer?.displayName ?? snapshot.matchResult.winnerIds[0]}`
    : labels.inProgressStatus;
  const nonCardActions = snapshot.view.legalActions.filter(
    (action) => action.move.kind !== 'play-card',
  );

  return (
    <div className="pb-8">
      <GameSessionFrame
        actions={[
          ...nonCardActions.map((action) => ({
            id: action.id,
            label: action.label,
            disabled: isApplyingMove,
            onSelect: () => submitMove(action.move),
          })),
          {
            id: 'restart',
            label: labels.restartAction,
            disabled: isApplyingMove,
            onSelect: restartMatch,
            tone: 'secondary' as const,
          },
        ]}
        actionsLabel={labels.legalActionsTitle}
        badges={[
          {
            id: 'mode',
            label: labels.localMatchLabel,
            tone: 'neutral',
          },
        ]}
        emptyActionsLabel={
          snapshot.matchResult ? labels.completedMessage : labels.waitingForPlayers
        }
        eyebrow={labels.localMatchLabel}
        participants={snapshot.view.players.map((player) => ({
          detail: `${player.controller === 'human' ? labels.humanLabel : labels.botLabel} · ${player.handCount} ${labels.cardsLabel}`,
          displayName: player.displayName,
          id: player.playerId,
          isActive: player.isActive,
          isActor: player.isActor,
          isViewer: player.isViewer,
        }))}
        pending={isApplyingMove}
        result={snapshot.matchResult ? winnerText : undefined}
        statusItems={[
          {
            id: 'turn',
            label: labels.turnLabel,
            value: activePlayer?.displayName ?? snapshot.view.activePlayerId,
          },
          {
            id: 'color',
            label: labels.activeColorLabel,
            value: (
              <UnoColorBadge
                color={snapshot.view.activeColor}
                label={labels.colors[snapshot.view.activeColor]}
              />
            ),
          },
          {
            id: 'status',
            label: labels.statusLabel,
            value: winnerText,
          },
        ]}
        subtitle={labels.description}
        table={
          <div aria-label={labels.tableLabel} className="space-y-9">
            <div className="flex flex-wrap items-start justify-center gap-10 sm:gap-16">
              <div className="text-center">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  {labels.drawPileLabel}
                </p>
                <CardActionPileControl
                  actionTarget="draw-pile"
                  aria-label={labels.drawPileLabel}
                  className="p-0 text-left"
                >
                  <HiddenUnoCardStack
                    cardCount={snapshot.view.drawPileCount}
                    label={labels.drawPileLabel}
                    compact
                    className="justify-center text-white"
                  />
                </CardActionPileControl>
              </div>

              <div className="text-center">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  {labels.discardPileLabel}
                </p>
                {snapshot.view.discardTop ? (
                  <UnoCardVisual
                    card={snapshot.view.discardTop}
                    interactive={false}
                    variant="compact"
                  />
                ) : (
                  <div className="grid aspect-[5/7] w-24 place-items-center rounded-2xl border border-dashed border-white/20 text-sm text-white/40">
                    —
                  </div>
                )}
              </div>
            </div>

            <section
              aria-labelledby="hand-heading"
              className="border-t border-white/10 pt-6"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3
                  id="hand-heading"
                  className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60"
                >
                  {labels.handTitle}
                </h3>
                {humanPlayer ? (
                  <p className="text-xs text-white/45">
                    {humanPlayer.handCount} {labels.cardsLabel}
                    {humanPlayer.isActive ? ` · ${labels.activeTurnLabel}` : ''}
                  </p>
                ) : null}
              </div>

              {humanPlayer?.visibleCards.length ? (
                <PlayerHand
                  aria-label={labels.handTitle}
                  className="-mx-3 mt-5 overflow-x-auto px-3 pb-3 pt-2"
                  curve={8}
                  overlap={38}
                  spreadDegrees={10}
                >
                  {humanPlayer.visibleCards.map((card) => {
                    const playable = Boolean(card.directPlay);

                    return (
                      <UnoCardVisual
                        key={card.id}
                        aria-disabled={!playable || isApplyingMove}
                        card={card}
                        className={
                          pendingColorChoice?.cardId === card.id
                            ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-zinc-950'
                            : undefined
                        }
                        interactive={playable && !isApplyingMove}
                        onClick={() => handleCardPlay(card)}
                        onKeyDown={(event) => {
                          if (
                            playable &&
                            (event.key === 'Enter' || event.key === ' ')
                          ) {
                            event.preventDefault();
                            handleCardPlay(card);
                          }
                        }}
                        role={playable ? 'button' : 'img'}
                        tabIndex={playable && !isApplyingMove ? 0 : undefined}
                        variant="compact"
                      />
                    );
                  })}
                </PlayerHand>
              ) : (
                <p className="mt-5 text-sm text-white/55">
                  {labels.waitingForPlayers}
                </p>
              )}

              {pendingColorChoice ? (
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/12 bg-black/20 p-3">
                  <span className="mr-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                    {labels.activeColorLabel}
                  </span>
                  {colorChoiceActions(pendingColorChoice.actions).map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      aria-label={action.label}
                      className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                      disabled={isApplyingMove}
                      onClick={() => submitMove(action.move)}
                    >
                      <UnoColorBadge
                        color={action.chosenColor!}
                        label={labels.colors[action.chosenColor!]}
                      />
                    </button>
                  ))}
                  <button
                    type="button"
                    className="min-h-8 rounded-full border border-white/14 px-3 text-xs font-medium text-white/65 hover:bg-white/8 hover:text-white"
                    onClick={() => setPendingColorChoice(null)}
                  >
                    ×
                  </button>
                </div>
              ) : null}
            </section>
          </div>
        }
        title={labels.title}
      />
    </div>
  );
}
