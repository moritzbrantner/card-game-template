'use client';

import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from '@moritzbrantner/ui';
import { CardTable, PlayerHand, PlayingCard } from '@moritzbrantner/card-games';
import { defaultGameCatalog } from '@repo/game-catalog';
import {
  createLocalGameSession,
  type LocalGameSession,
} from '@repo/game-session';
import {
  createPhase10Adapter,
  createPhase10Bots,
  defaultPhase10Rules,
  getPhase10ExamplePreset,
  phase10ExamplePresets,
  projectPhase10PlayerView,
  type Phase10Card,
  type Phase10ExamplePresetId,
  type Phase10Move,
  type Phase10PlayerView,
  type Phase10State,
} from '@repo/game-phase-10';

type Phase10PageLabels = {
  catalogRouteLabel: string;
  description: string;
  drawPileLabel: string;
  handTitle: string;
  hotseatDescription: string;
  hotseatTitle: string;
  legalActionsTitle: string;
  localModeBadge: string;
  phaseLabel: string;
  playersTitle: string;
  presetsTitle: string;
  restartAction: string;
  revealHandAction: string;
  statusTitle: string;
  subtitle: string;
  tableDiscardLabel: string;
  tableDrawLabel: string;
  title: string;
  waitingForPlayers: string;
};

const DEFAULT_PRESET_ID: Phase10ExamplePresetId = 'mixed-table';

function createSession(
  presetId: Phase10ExamplePresetId,
): LocalGameSession<Phase10State, Phase10Move, Phase10PlayerView> {
  const preset = getPhase10ExamplePreset(presetId);
  const seed = `web-phase-10:${presetId}`;

  return createLocalGameSession({
    adapter: createPhase10Adapter(),
    bots: createPhase10Bots(preset.seats, seed),
    hotseat: preset.hotseat,
    matchId: `web-phase-10:${presetId}`,
    participants: preset.seats,
    projectView: projectPhase10PlayerView,
    setup: {
      rules: defaultPhase10Rules,
      seed,
    },
  });
}

function getCardTone(card: Phase10Card) {
  switch (card.color) {
    case 'blue':
      return 'midnight';
    case 'green':
      return 'emerald';
    case 'red':
      return 'rose';
    case 'yellow':
      return 'classic';
    case 'wild':
      return 'midnight';
    case 'skip':
      return 'rose';
    default:
      return 'classic';
  }
}

function getCardRank(card: Phase10Card) {
  if (card.kind === 'number') {
    return String(card.value ?? '?');
  }

  return card.kind === 'wild' ? 'W' : 'SK';
}

function getCardSubtitle(card: Phase10Card) {
  if (card.kind === 'wild') {
    return 'Wildcard';
  }

  if (card.kind === 'skip') {
    return 'Skip turn';
  }

  return `${card.color} set`;
}

function renderCard(
  card: Phase10Card,
  {
    compact = false,
    interactive = false,
  }: {
    compact?: boolean;
    interactive?: boolean;
  } = {},
) {
  return (
    <PlayingCard
      key={card.id}
      aria-label={card.label}
      artwork={
        <div className="text-center text-lg font-semibold tracking-tight">
          {card.kind === 'number' ? card.value : card.kind === 'wild' ? 'Wild' : 'Skip'}
        </div>
      }
      badge={<Badge variant="outline">{card.color}</Badge>}
      className={compact ? 'w-24 min-w-[6rem]' : 'w-28 min-w-[7rem]'}
      effect={card.kind === 'wild' ? 'foil' : 'standard'}
      headline={card.label}
      interactive={interactive}
      rank={getCardRank(card)}
      selected={interactive}
      size={compact ? 'sm' : 'md'}
      subtitle={getCardSubtitle(card)}
      tone={getCardTone(card)}
    />
  );
}

export function Phase10PageClient({
  labels,
}: {
  labels: Phase10PageLabels;
}) {
  const catalogEntry = defaultGameCatalog.get('phase-10');
  const [presetId, setPresetId] =
    useState<Phase10ExamplePresetId>(DEFAULT_PRESET_ID);
  const [snapshot, setSnapshot] = useState(() =>
    createSession(DEFAULT_PRESET_ID).getSnapshot(),
  );
  const sessionRef = useRef<LocalGameSession<
    Phase10State,
    Phase10Move,
    Phase10PlayerView
  > | null>(null);

  const handleSnapshot = useEffectEvent(
    (
      nextSnapshot: ReturnType<
        LocalGameSession<Phase10State, Phase10Move, Phase10PlayerView>['getSnapshot']
      >,
    ) => {
      startTransition(() => {
        setSnapshot(nextSnapshot);
      });
    },
  );

  useEffect(() => {
    const session = createSession(presetId);
    sessionRef.current = session;

    const unsubscribe = session.subscribe((nextSnapshot) => {
      handleSnapshot(nextSnapshot);
    });

    handleSnapshot(session.getSnapshot());

    return () => {
      unsubscribe();
      if (sessionRef.current === session) {
        sessionRef.current = null;
      }
    };
  }, [presetId]);

  const viewer =
    snapshot.view.players.find((player) => player.isViewer) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-8">
      <CardTable
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <span>{labels.localModeBadge}</span>
            {snapshot.view.matchResultBanner ? (
              <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">
                {snapshot.view.matchResultBanner}
              </Badge>
            ) : null}
          </span>
        }
        subtitle={labels.description}
        title={labels.title}
        tone="crimson"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.9fr)]">
          <div className="space-y-4">
            <div className="grid gap-3 rounded-[1.5rem] border border-white/14 bg-black/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
                  {labels.phaseLabel}
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {snapshot.view.phaseLabel}
                </p>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  {labels.subtitle}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
                  {labels.catalogRouteLabel}
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {catalogEntry?.metadata?.route ?? '/phase-10'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
                  {labels.drawPileLabel}
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {snapshot.view.drawPileCount} cards
                </p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/14 bg-black/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="flex flex-wrap items-center gap-2">
                <p className="mr-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
                  {labels.presetsTitle}
                </p>
                {phase10ExamplePresets.map((preset) => (
                  <Button
                    key={preset.id}
                    aria-pressed={preset.id === presetId}
                    className={cn(
                      'border-white/16 text-white hover:border-white/26 hover:bg-white/10',
                      preset.id === presetId
                        ? 'bg-white text-slate-950 hover:bg-white/90'
                        : 'bg-transparent',
                    )}
                    onClick={() => {
                      setPresetId(preset.id);
                    }}
                    size="sm"
                    variant="outline"
                  >
                    {preset.label}
                  </Button>
                ))}
                <Button
                  className="ml-auto border-white/16 bg-transparent text-white hover:border-white/26 hover:bg-white/10"
                  onClick={() => {
                    sessionRef.current?.restart();
                  }}
                  size="sm"
                  variant="outline"
                >
                  {labels.restartAction}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/14 bg-black/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
                  {labels.tableDrawLabel}
                </p>
                <div className="mt-4 flex items-center gap-4">
                  <PlayingCard
                    aria-label="Draw pile"
                    className="w-24 min-w-[6rem]"
                    face="back"
                    interactive={false}
                    rank="10"
                    size="sm"
                    tone="midnight"
                  />
                  <div className="space-y-1">
                    <p className="text-xl font-semibold text-white">
                      {snapshot.view.drawPileCount}
                    </p>
                    <p className="text-sm text-white/70">
                      Cards left to draw
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/14 bg-black/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
                  {labels.tableDiscardLabel}
                </p>
                <div className="mt-4 flex items-center gap-4">
                  {snapshot.view.discardTop ? (
                    renderCard(snapshot.view.discardTop, { compact: true })
                  ) : (
                    <PlayingCard
                      aria-label="Empty discard pile"
                      className="w-24 min-w-[6rem]"
                      face="back"
                      interactive={false}
                      rank="0"
                      size="sm"
                      tone="classic"
                    />
                  )}
                  <div className="space-y-1">
                    <p className="text-xl font-semibold text-white">
                      {snapshot.view.discardTop?.label ?? 'Empty pile'}
                    </p>
                    <p className="text-sm text-white/70">{snapshot.view.status}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/14 bg-black/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
                  {labels.statusTitle}
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {snapshot.view.status}
                </p>
              </div>
              {snapshot.view.players
                .filter((player) => player.isActive)
                .map((player) => (
                  <Badge
                    key={player.playerId}
                    className="border-white/18 bg-white/10 text-white hover:bg-white/10"
                    variant="outline"
                  >
                    {player.displayName} active
                  </Badge>
                ))}
            </div>

            {snapshot.pendingHotseatPlayerId ? (
              <div className="mt-6 rounded-[1.25rem] border border-amber-200/30 bg-amber-50/10 p-4 text-white">
                <p className="text-sm font-semibold">{labels.hotseatTitle}</p>
                <p className="mt-2 text-sm leading-6 text-white/76">
                  {labels.hotseatDescription.replace(
                    '{playerId}',
                    snapshot.pendingHotseatPlayerId,
                  )}
                </p>
                <Button
                  className="mt-4 border-white/16 bg-white text-slate-950 hover:bg-white/90"
                  onClick={() => {
                    sessionRef.current?.confirmHotseat();
                  }}
                  size="sm"
                  variant="outline"
                >
                  {labels.revealHandAction}
                </Button>
              </div>
            ) : null}

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
                {labels.legalActionsTitle}
              </p>
              <div
                aria-label={labels.legalActionsTitle}
                className="mt-4 flex flex-wrap gap-2"
                role="group"
              >
                {snapshot.view.legalActions.length > 0 ? (
                  snapshot.view.legalActions.map((action) => (
                    <Button
                      key={action.id}
                      className="border-white/16 bg-white/8 text-white hover:border-white/26 hover:bg-white/14"
                      onClick={() => {
                        sessionRef.current?.submitMove(action.move);
                      }}
                      size="sm"
                      variant="outline"
                    >
                      {action.label}
                    </Button>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-white/70">
                    {labels.waitingForPlayers}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardTable>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>{labels.handTitle}</CardTitle>
            <CardDescription>
              {viewer
                ? `${viewer.displayName} can currently inspect ${viewer.visibleCards.length} cards.`
                : 'The current hand is hidden until the next local player confirms takeover.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {viewer?.visibleCards.length ? (
              <PlayerHand aria-label={`${viewer.displayName} hand`}>
                {viewer.visibleCards.map((card) => renderCard(card))}
              </PlayerHand>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                {labels.waitingForPlayers}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>{labels.playersTitle}</CardTitle>
            <CardDescription>
              Each seat reflects the local round state projected from the shared
              Phase 10 engine.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.view.players.map((player) => (
              <div
                key={player.playerId}
                className="rounded-2xl border border-border/80 bg-muted/35 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{player.displayName}</p>
                  <Badge variant={player.isActive ? 'default' : 'outline'}>
                    {player.controller}
                  </Badge>
                  {player.phaseComplete ? (
                    <Badge variant="secondary">Phase laid</Badge>
                  ) : null}
                  {player.skipped ? <Badge variant="destructive">Skipped</Badge> : null}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {player.handCount} cards remaining
                </p>

                {player.laidGroups.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {player.laidGroups.map((group, index) => (
                      <div
                        key={`${player.playerId}-${index}`}
                        className="rounded-xl border border-border/80 bg-background p-3"
                      >
                        <p className="text-sm font-medium">{group.label}</p>
                        <PlayerHand
                          aria-label={`${player.displayName} laid group ${index + 1}`}
                          className="mt-3"
                        >
                          {group.cards.map((card) =>
                            renderCard(card, { compact: true }),
                          )}
                        </PlayerHand>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
