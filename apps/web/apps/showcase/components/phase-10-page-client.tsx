'use client';

import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';

import { Badge, Button, cn } from '@moritzbrantner/ui';
import { PlayerHand, PlayingCard } from '@moritzbrantner/card-games';
import { defaultGameCatalog } from '@repo/game-catalog';
import {
  createLocalGameSession,
  type LocalGameSession,
} from '@repo/game-session';
import {
  createPhase10Adapter,
  defaultPhase10Phases,
  defaultPhase10Rules,
  formatPhase10PhaseLabel,
  formatPhase10RequirementLabel,
  getPhase10ExamplePreset,
  phase10ExamplePresets,
  projectPhase10PlayerView,
  type Phase10Card,
  type Phase10ExamplePresetId,
  type Phase10PhaseDefinition,
  type Phase10PhaseRequirement,
  type Phase10Move,
  type Phase10PlayerView,
  type Phase10State,
} from '@repo/game-phase-10';

import {
  createPhase10BotsFromProfiles,
  getDefaultPhase10BotAiProfiles,
  type Phase10BotAiProfile,
} from '@/src/domain/game-bot-ai/logic';
import { GameSessionFrame } from './game-session';

type Phase10PageLabels = {
  addPhaseAction: string;
  catalogRouteLabel: string;
  decreaseSetCountAction: string;
  decreaseSetSizeAction: string;
  description: string;
  drawPileLabel: string;
  handTitle: string;
  hotseatDescription: string;
  hotseatTitle: string;
  increaseSetCountAction: string;
  increaseSetSizeAction: string;
  legalActionsTitle: string;
  localModeBadge: string;
  movePhaseEarlierAction: string;
  movePhaseLaterAction: string;
  phaseLabel: string;
  phaseConfiguratorDescription: string;
  phaseConfiguratorTitle: string;
  phaseOrderTitle: string;
  playersTitle: string;
  presetsTitle: string;
  removePhaseAction: string;
  restartAction: string;
  roundLabel: string;
  revealHandAction: string;
  startConfiguredRoundAction: string;
  statusTitle: string;
  subtitle: string;
  tableDiscardLabel: string;
  tableDrawLabel: string;
  title: string;
  waitingForPlayers: string;
};

const DEFAULT_PRESET_ID: Phase10ExamplePresetId = 'mixed-table';

type Phase10TableConfig = {
  phases: Phase10PhaseDefinition[];
  presetId: Phase10ExamplePresetId;
};

function clonePhaseRequirement(
  requirement: Phase10PhaseRequirement,
): Phase10PhaseRequirement {
  return { ...requirement };
}

function clonePhaseDefinitions(phases: readonly Phase10PhaseDefinition[]) {
  return phases.map((phase) => ({
    ...phase,
    requirements: (phase.requirements ?? []).map(clonePhaseRequirement),
  }));
}

function createDefaultRequirement(
  type: Phase10PhaseRequirement['type'] = 'set',
): Phase10PhaseRequirement {
  return {
    size: type === 'set' ? 2 : 4,
    type,
  };
}

function createDefaultPhaseDefinition(index: number): Phase10PhaseDefinition {
  const requirements = [createDefaultRequirement()];

  return {
    id: `phase-${index + 1}`,
    label: formatPhase10PhaseLabel(requirements, index + 1),
    requirements,
  };
}

function getPhaseRequirementMinSize(_requirement: Phase10PhaseRequirement) {
  return 2;
}

function getPhaseRequirementMaxSize(requirement: Phase10PhaseRequirement) {
  return requirement.type === 'set' ? 6 : 12;
}

function formatPhaseRequirementSummary(
  requirements: readonly Phase10PhaseRequirement[],
) {
  return requirements
    .map((requirement) => formatPhase10RequirementLabel(requirement))
    .join(' + ');
}

function createDefaultTableConfig(): Phase10TableConfig {
  return {
    phases: clonePhaseDefinitions(defaultPhase10Phases),
    presetId: DEFAULT_PRESET_ID,
  };
}

function serializePhaseConfig(phases: readonly Phase10PhaseDefinition[]) {
  return phases
    .map((phase) =>
      (phase.requirements ?? [])
        .map((requirement) => `${requirement.type[0]}${requirement.size}`)
        .join('+'),
    )
    .join(',');
}

function serializePhaseUrlValue(phases: readonly Phase10PhaseDefinition[]) {
  return phases
    .map((phase) =>
      (phase.requirements ?? [])
        .map((requirement) => `${requirement.type[0]}${requirement.size}`)
        .join('+'),
    )
    .join(',');
}

function parsePhaseUrlValue(value: string | null) {
  if (!value) {
    return null;
  }

  const parsedPhases = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry, index) => {
      const requirements = entry
        .split('+')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const typeKey = part[0];
          const size = Number(part.slice(1));
          const type =
            typeKey === 's'
              ? 'set'
              : typeKey === 'c'
                ? 'color'
                : typeKey === 'r'
                  ? 'run'
                  : null;

          if (!type || !Number.isInteger(size) || size < 2) {
            return null;
          }

          const requirement = {
            size,
            type,
          } satisfies Phase10PhaseRequirement;

          return size <= getPhaseRequirementMaxSize(requirement)
            ? requirement
            : null;
        });

      if (
        requirements.length === 0 ||
        requirements.some((requirement) => requirement === null)
      ) {
        return null;
      }

      return {
        id: `phase-${index + 1}`,
        label: formatPhase10PhaseLabel(
          requirements as Phase10PhaseRequirement[],
          index + 1,
        ),
        requirements: requirements as Phase10PhaseRequirement[],
      } satisfies Phase10PhaseDefinition;
    });

  if (
    parsedPhases.length === 0 ||
    parsedPhases.some((phase) => phase === null)
  ) {
    return null;
  }

  return parsedPhases as Phase10PhaseDefinition[];
}

function renumberPhases(
  phases: readonly Phase10PhaseDefinition[],
): Phase10PhaseDefinition[] {
  return phases.map((phase, index) => ({
    ...phase,
    id: `phase-${index + 1}`,
    label: formatPhase10PhaseLabel(phase.requirements ?? [], index + 1),
    requirements: (phase.requirements ?? []).map(clonePhaseRequirement),
  }));
}

function movePhase(
  phases: readonly Phase10PhaseDefinition[],
  fromIndex: number,
  toIndex: number,
) {
  if (toIndex < 0 || toIndex >= phases.length) {
    return [...phases];
  }

  const next = [...phases];
  const [phase] = next.splice(fromIndex, 1);

  if (!phase) {
    return next;
  }

  next.splice(toIndex, 0, phase);
  return renumberPhases(next);
}

function createSession(
  config: Phase10TableConfig,
  botAiProfiles: readonly Phase10BotAiProfile[],
): LocalGameSession<Phase10State, Phase10Move, Phase10PlayerView> {
  const preset = getPhase10ExamplePreset(config.presetId);
  const seed = `web-phase-10:${config.presetId}:${serializePhaseConfig(config.phases)}`;

  return createLocalGameSession({
    adapter: createPhase10Adapter(),
    bots: createPhase10BotsFromProfiles(preset.seats, botAiProfiles, seed),
    hotseat: preset.hotseat,
    matchId: `web-phase-10:${config.presetId}`,
    participants: preset.seats,
    projectView: projectPhase10PlayerView,
    setup: {
      phases: config.phases,
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

function readPhase10TableConfigFromUrl(): Phase10TableConfig {
  const fallback = createDefaultTableConfig();
  const url = new URL(window.location.href);
  const presetId = url.searchParams.get('preset');
  const phases =
    parsePhaseUrlValue(url.searchParams.get('phases')) ?? fallback.phases;

  return {
    phases,
    presetId: phase10ExamplePresets.some((preset) => preset.id === presetId)
      ? (presetId as Phase10ExamplePresetId)
      : fallback.presetId,
  };
}

function replacePhase10Url(config: Phase10TableConfig) {
  const url = new URL(window.location.href);
  url.searchParams.set('preset', config.presetId);
  url.searchParams.set('phases', serializePhaseUrlValue(config.phases));
  window.history.replaceState({}, '', url);
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
          {card.kind === 'number'
            ? card.value
            : card.kind === 'wild'
              ? 'Wild'
              : 'Skip'}
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
  botAiProfiles = getDefaultPhase10BotAiProfiles(),
  labels,
}: {
  botAiProfiles?: readonly Phase10BotAiProfile[];
  labels: Phase10PageLabels;
}) {
  const catalogEntry = defaultGameCatalog.get('phase-10');
  const [hasInitializedFromUrl, setHasInitializedFromUrl] = useState(false);
  const [activeConfig, setActiveConfig] = useState<Phase10TableConfig>(() =>
    createDefaultTableConfig(),
  );
  const [draftConfig, setDraftConfig] = useState<Phase10TableConfig>(() =>
    createDefaultTableConfig(),
  );
  const [snapshot, setSnapshot] = useState(() =>
    createSession(createDefaultTableConfig(), botAiProfiles).getSnapshot(),
  );
  const sessionRef = useRef<LocalGameSession<
    Phase10State,
    Phase10Move,
    Phase10PlayerView
  > | null>(null);

  const handleSnapshot = useEffectEvent(
    (
      nextSnapshot: ReturnType<
        LocalGameSession<
          Phase10State,
          Phase10Move,
          Phase10PlayerView
        >['getSnapshot']
      >,
    ) => {
      startTransition(() => {
        setSnapshot(nextSnapshot);
      });
    },
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const nextConfig = readPhase10TableConfigFromUrl();
    setActiveConfig(nextConfig);
    setDraftConfig(nextConfig);
    setHasInitializedFromUrl(true);
  }, []);

  useEffect(() => {
    if (!hasInitializedFromUrl || typeof window === 'undefined') {
      return;
    }

    replacePhase10Url(activeConfig);
  }, [activeConfig, hasInitializedFromUrl]);

  useEffect(() => {
    const session = createSession(activeConfig, botAiProfiles);
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
  }, [activeConfig, botAiProfiles]);

  const viewer =
    snapshot.view.players.find((player) => player.isViewer) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-[112rem] flex-col gap-6 px-4 py-8 md:px-8">
      <section className="rounded-[2rem] border border-slate-800 bg-slate-950 p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60">
              {labels.localModeBadge}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              {labels.title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
              {labels.description}
            </p>
          </div>
          {snapshot.view.matchResultBanner ? (
            <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">
              {snapshot.view.matchResultBanner}
            </Badge>
          ) : null}
        </div>

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
              <p className="mt-2 text-sm leading-6 text-white/60">
                {labels.roundLabel}: {snapshot.view.round}
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
                  aria-pressed={preset.id === draftConfig.presetId}
                  className={cn(
                    'border-white/16 text-white hover:border-white/26 hover:bg-white/10',
                    preset.id === draftConfig.presetId
                      ? 'bg-white text-slate-950 hover:bg-white/90'
                      : 'bg-transparent',
                  )}
                  onClick={() => {
                    setDraftConfig((current) => ({
                      ...current,
                      presetId: preset.id,
                    }));
                  }}
                  size="sm"
                  variant="outline"
                >
                  {preset.label}
                </Button>
              ))}
              <Button
                className="border-white/16 bg-white text-slate-950 hover:bg-white/90"
                onClick={() => {
                  setActiveConfig({
                    phases: clonePhaseDefinitions(draftConfig.phases),
                    presetId: draftConfig.presetId,
                  });
                }}
                size="sm"
                variant="outline"
              >
                {labels.startConfiguredRoundAction}
              </Button>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/14 bg-black/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
                  {labels.phaseConfiguratorTitle}
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                  {labels.phaseConfiguratorDescription}
                </p>
              </div>
              <Button
                className="border-white/16 bg-transparent text-white hover:border-white/26 hover:bg-white/10"
                onClick={() => {
                  setDraftConfig((current) => ({
                    ...current,
                    phases: renumberPhases([
                      ...current.phases,
                      createDefaultPhaseDefinition(current.phases.length),
                    ]),
                  }));
                }}
                size="sm"
                variant="outline"
              >
                {labels.addPhaseAction}
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {draftConfig.phases.map((phase, index) => (
                <div
                  key={phase.id}
                  className="rounded-[1.25rem] border border-white/12 bg-black/18 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {phase.label}
                      </p>
                      <p className="text-sm text-white/60">
                        {labels.phaseOrderTitle} {index + 1} ·{' '}
                        {formatPhaseRequirementSummary(
                          phase.requirements ?? [],
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        className="border-white/16 bg-transparent text-white hover:border-white/26 hover:bg-white/10"
                        disabled={index === 0}
                        onClick={() => {
                          setDraftConfig((current) => ({
                            ...current,
                            phases: movePhase(current.phases, index, index - 1),
                          }));
                        }}
                        size="sm"
                        variant="outline"
                      >
                        {labels.movePhaseEarlierAction}
                      </Button>
                      <Button
                        className="border-white/16 bg-transparent text-white hover:border-white/26 hover:bg-white/10"
                        disabled={index === draftConfig.phases.length - 1}
                        onClick={() => {
                          setDraftConfig((current) => ({
                            ...current,
                            phases: movePhase(current.phases, index, index + 1),
                          }));
                        }}
                        size="sm"
                        variant="outline"
                      >
                        {labels.movePhaseLaterAction}
                      </Button>
                      <Button
                        className="border-white/16 bg-transparent text-white hover:border-white/26 hover:bg-white/10"
                        disabled={draftConfig.phases.length === 1}
                        onClick={() => {
                          setDraftConfig((current) => ({
                            ...current,
                            phases: renumberPhases(
                              current.phases.filter(
                                (_, phaseIndex) => phaseIndex !== index,
                              ),
                            ),
                          }));
                        }}
                        size="sm"
                        variant="outline"
                      >
                        {labels.removePhaseAction}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(['set', 'color', 'run'] as const).map((type) => (
                      <Button
                        key={type}
                        className="border-white/16 bg-transparent text-white hover:border-white/26 hover:bg-white/10"
                        onClick={() => {
                          setDraftConfig((current) => ({
                            ...current,
                            phases: renumberPhases(
                              current.phases.map((candidate, phaseIndex) =>
                                phaseIndex === index
                                  ? {
                                      ...candidate,
                                      requirements: [
                                        ...(candidate.requirements ?? []),
                                        createDefaultRequirement(type),
                                      ],
                                    }
                                  : candidate,
                              ),
                            ),
                          }));
                        }}
                        size="sm"
                        variant="outline"
                      >
                        {type === 'set'
                          ? 'Add set'
                          : type === 'color'
                            ? 'Add color'
                            : 'Add street'}
                      </Button>
                    ))}
                  </div>

                  <div className="mt-4 space-y-3">
                    {(phase.requirements ?? []).map(
                      (requirement, requirementIndex) => (
                        <div
                          key={`${phase.id}-${requirementIndex}-${requirement.type}`}
                          className="flex flex-wrap items-center gap-2 rounded-full border border-white/12 px-3 py-2"
                        >
                          <span className="text-sm font-medium text-white">
                            {formatPhase10RequirementLabel(requirement)}
                          </span>
                          <span className="text-sm text-white/60">Size</span>
                          <Button
                            className="border-white/16 bg-transparent text-white hover:border-white/26 hover:bg-white/10"
                            disabled={
                              requirement.size <=
                              getPhaseRequirementMinSize(requirement)
                            }
                            onClick={() => {
                              setDraftConfig((current) => ({
                                ...current,
                                phases: renumberPhases(
                                  current.phases.map((candidate, phaseIndex) =>
                                    phaseIndex === index
                                      ? {
                                          ...candidate,
                                          requirements: (
                                            candidate.requirements ?? []
                                          ).map((entry, entryIndex) =>
                                            entryIndex === requirementIndex
                                              ? {
                                                  ...entry,
                                                  size: Math.max(
                                                    getPhaseRequirementMinSize(
                                                      entry,
                                                    ),
                                                    entry.size - 1,
                                                  ),
                                                }
                                              : entry,
                                          ),
                                        }
                                      : candidate,
                                  ),
                                ),
                              }));
                            }}
                            size="sm"
                            variant="outline"
                          >
                            {labels.decreaseSetSizeAction}
                          </Button>
                          <span className="min-w-6 text-center text-sm font-semibold text-white">
                            {requirement.size}
                          </span>
                          <Button
                            className="border-white/16 bg-transparent text-white hover:border-white/26 hover:bg-white/10"
                            disabled={
                              requirement.size >=
                              getPhaseRequirementMaxSize(requirement)
                            }
                            onClick={() => {
                              setDraftConfig((current) => ({
                                ...current,
                                phases: renumberPhases(
                                  current.phases.map((candidate, phaseIndex) =>
                                    phaseIndex === index
                                      ? {
                                          ...candidate,
                                          requirements: (
                                            candidate.requirements ?? []
                                          ).map((entry, entryIndex) =>
                                            entryIndex === requirementIndex
                                              ? {
                                                  ...entry,
                                                  size: Math.min(
                                                    getPhaseRequirementMaxSize(
                                                      entry,
                                                    ),
                                                    entry.size + 1,
                                                  ),
                                                }
                                              : entry,
                                          ),
                                        }
                                      : candidate,
                                  ),
                                ),
                              }));
                            }}
                            size="sm"
                            variant="outline"
                          >
                            {labels.increaseSetSizeAction}
                          </Button>
                          <Button
                            className="border-white/16 bg-transparent text-white hover:border-white/26 hover:bg-white/10"
                            disabled={(phase.requirements ?? []).length === 1}
                            onClick={() => {
                              setDraftConfig((current) => ({
                                ...current,
                                phases: renumberPhases(
                                  current.phases.map((candidate, phaseIndex) =>
                                    phaseIndex === index
                                      ? {
                                          ...candidate,
                                          requirements: (
                                            candidate.requirements ?? []
                                          ).filter(
                                            (_, entryIndex) =>
                                              entryIndex !== requirementIndex,
                                          ),
                                        }
                                      : candidate,
                                  ),
                                ),
                              }));
                            }}
                            size="sm"
                            variant="outline"
                          >
                            Remove group
                          </Button>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <GameSessionFrame
        actions={[
          ...snapshot.view.legalActions.map((action) => ({
            id: action.id,
            label: action.label,
            onSelect: () => {
              sessionRef.current?.submitMove(action.move);
            },
          })),
          {
            id: 'restart',
            label: labels.restartAction,
            onSelect: () => {
              sessionRef.current?.restart();
            },
            tone: 'secondary' as const,
          },
        ]}
        actionsLabel={labels.legalActionsTitle}
        badges={[
          {
            id: 'mode',
            label: labels.localModeBadge,
            tone: 'neutral',
          },
        ]}
        emptyActionsLabel={labels.waitingForPlayers}
        eyebrow={labels.localModeBadge}
        participants={snapshot.view.players.map((player) => ({
          detail: `${player.controller} - ${player.handCount} cards - ${player.phaseLabel}`,
          displayName: player.displayName,
          id: player.playerId,
          isActive: player.isActive,
          isViewer: player.isViewer,
        }))}
        result={snapshot.view.matchResultBanner}
        statusItems={[
          {
            id: 'status',
            label: labels.statusTitle,
            value: snapshot.view.status,
          },
          {
            detail: `${labels.roundLabel}: ${snapshot.view.round}`,
            id: 'phase',
            label: labels.phaseLabel,
            value: snapshot.view.phaseLabel,
          },
          {
            id: 'draw',
            label: labels.drawPileLabel,
            value: `${snapshot.view.drawPileCount} cards`,
          },
        ]}
        subtitle={labels.description}
        table={
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
                  <p className="text-sm text-white/70">Cards left to draw</p>
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
                  <p className="text-sm text-white/70">
                    {snapshot.view.status}
                  </p>
                </div>
              </div>
            </div>
          </div>
        }
        aside={
          <div className="space-y-4">
            {snapshot.pendingHotseatPlayerId ? (
              <div className="rounded-[1.25rem] border border-amber-200/30 bg-amber-50/10 p-4 text-white">
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

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
                {labels.phaseOrderTitle}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {snapshot.view.phaseOrder.map((phaseLabel, index) => (
                  <Badge
                    key={`${phaseLabel}-${index}`}
                    className="border-white/18 bg-white/10 text-white hover:bg-white/10"
                    variant="outline"
                  >
                    {index + 1}. {phaseLabel}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        }
        title={labels.statusTitle}
        footer={
          <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.7fr)]">
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                {labels.handTitle}
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                {viewer
                  ? `${viewer.displayName} can currently inspect ${viewer.visibleCards.length} cards.`
                  : 'The current hand is hidden until the next local player confirms takeover.'}
              </p>
              <div className="mt-4">
                {viewer?.visibleCards.length ? (
                  <PlayerHand
                    aria-label={`${viewer.displayName} hand`}
                    className="-mx-2 px-2"
                    curve={10}
                    overlap={36}
                    spreadDegrees={12}
                  >
                    {viewer.visibleCards.map((card) => renderCard(card))}
                  </PlayerHand>
                ) : (
                  <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                    {labels.waitingForPlayers}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                {labels.playersTitle}
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                Each seat reflects the local round state projected from the
                shared Phase 10 engine.
              </p>
              <div className="mt-4 space-y-3">
                {snapshot.view.players.map((player) => (
                  <div
                    key={player.playerId}
                    className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-zinc-950 dark:text-zinc-50">
                        {player.displayName}
                      </p>
                      <Badge variant={player.isActive ? 'default' : 'outline'}>
                        {player.controller}
                      </Badge>
                      {player.phaseComplete ? (
                        <Badge variant="secondary">Phase laid</Badge>
                      ) : null}
                      {player.skipped ? (
                        <Badge variant="destructive">Skipped</Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                      {player.handCount} cards remaining
                    </p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                      {player.phaseLabel}
                    </p>

                    {player.laidGroups.length > 0 ? (
                      <div className="mt-3 space-y-3">
                        {player.laidGroups.map((group, index) => (
                          <div
                            key={`${player.playerId}-${index}`}
                            className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
                          >
                            <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                              {group.label}
                            </p>
                            <PlayerHand
                              aria-label={`${player.displayName} laid group ${index + 1}`}
                              className="mt-3"
                              curve={8}
                              overlap={30}
                              spreadDegrees={10}
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
              </div>
            </section>
          </div>
        }
      />
    </div>
  );
}
