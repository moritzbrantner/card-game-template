import { startTransition, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { defaultGameCatalog } from '@repo/game-catalog';
import {
  createLocalGameSession,
  type LocalGameSession,
} from '@repo/game-session';
import {
  createPhase10Adapter,
  createPhase10Bots,
  defaultPhase10Phases,
  defaultPhase10Rules,
  formatPhase10PhaseLabel,
  formatPhase10RequirementLabel,
  getPhase10ExamplePreset,
  phase10ExamplePresets,
  projectPhase10PlayerView,
  type Phase10ExamplePresetId,
  type Phase10PhaseDefinition,
  type Phase10PhaseRequirement,
  type Phase10Move,
  type Phase10PlayerView,
  type Phase10State,
} from '@repo/game-phase-10';

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
    presetId: 'mixed-table',
  };
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
): LocalGameSession<Phase10State, Phase10Move, Phase10PlayerView> {
  const preset = getPhase10ExamplePreset(config.presetId);
  const seed = `mobile-phase-10:${config.presetId}:${config.phases
    .map((phase) =>
      (phase.requirements ?? [])
        .map((requirement) => `${requirement.type[0]}${requirement.size}`)
        .join('+'),
    )
    .join('|')}`;

  return createLocalGameSession({
    adapter: createPhase10Adapter(),
    bots: createPhase10Bots(preset.seats, seed),
    hotseat: preset.hotseat,
    matchId: `mobile-phase-10:${config.presetId}`,
    participants: preset.seats,
    projectView: projectPhase10PlayerView,
    setup: {
      phases: config.phases,
      rules: defaultPhase10Rules,
      seed,
    },
  });
}

export default function Phase10Screen() {
  const borderColor = useThemeColor({}, 'border');
  const mutedTextColor = useThemeColor({}, 'mutedText');
  const accentSurface = useThemeColor({}, 'accentSurface');
  const tintColor = useThemeColor({}, 'tint');
  const catalogEntry = defaultGameCatalog.get('phase-10');
  const [activeConfig, setActiveConfig] = useState<Phase10TableConfig>(() =>
    createDefaultTableConfig(),
  );
  const [draftConfig, setDraftConfig] = useState<Phase10TableConfig>(() =>
    createDefaultTableConfig(),
  );
  const sessionRef = useRef<LocalGameSession<
    Phase10State,
    Phase10Move,
    Phase10PlayerView
  > | null>(null);
  const [snapshot, setSnapshot] = useState(() =>
    createSession(createDefaultTableConfig()).getSnapshot(),
  );

  useEffect(() => {
    const session = createSession(activeConfig);
    sessionRef.current = session;
    const unsubscribe = session.subscribe((nextSnapshot) => {
      startTransition(() => {
        setSnapshot(nextSnapshot);
      });
    });

    setSnapshot(session.getSnapshot());
    return unsubscribe;
  }, [activeConfig]);

  return (
    <ThemedView style={styles.page}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedView
            style={[styles.hero, { borderColor }]}
            lightColor={Colors.light.surface}
            darkColor={Colors.dark.surface}
          >
            <ThemedText type="title">Phase 10</ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>
              Configure an ordered list of set-based phases before starting the
              next round, then play through draws, lays, hits, discards, and
              skips with the shared engine.
            </ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>
              Catalog route: {catalogEntry?.metadata?.route}
            </ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>
              Current round: {snapshot.view.round}
            </ThemedText>
            <Pressable
              onPress={() => {
                sessionRef.current?.restart();
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: tintColor, opacity: pressed ? 0.82 : 1 },
              ]}
            >
              <ThemedText style={styles.primaryButtonText}>
                Restart round
              </ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText type="subtitle">Table presets</ThemedText>
            <ThemedView style={styles.buttonRow}>
              {phase10ExamplePresets.map((preset) => (
                <Pressable
                  key={preset.id}
                  onPress={() => {
                    setDraftConfig((current) => ({
                      ...current,
                      presetId: preset.id,
                    }));
                  }}
                  style={({ pressed }) => [
                    styles.choiceButton,
                    {
                      borderColor,
                      backgroundColor:
                        preset.id === draftConfig.presetId
                          ? accentSurface
                          : 'transparent',
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <ThemedText type="defaultSemiBold">{preset.label}</ThemedText>
                </Pressable>
              ))}
            </ThemedView>
            <Pressable
              onPress={() => {
                setActiveConfig({
                  phases: clonePhaseDefinitions(draftConfig.phases),
                  presetId: draftConfig.presetId,
                });
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: tintColor,
                  marginTop: 12,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <ThemedText style={styles.primaryButtonText}>
                Start configured round
              </ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView
            style={[styles.card, { borderColor }]}
            lightColor={Colors.light.surface}
            darkColor={Colors.dark.surface}
          >
            <ThemedText type="subtitle">Phase order</ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>
              Build the ordered phase list before the next restart.
            </ThemedText>
            <Pressable
              onPress={() => {
                setDraftConfig((current) => ({
                  ...current,
                  phases: renumberPhases([
                    ...current.phases,
                    createDefaultPhaseDefinition(current.phases.length),
                  ]),
                }));
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor, opacity: pressed ? 0.82 : 1 },
              ]}
            >
              <ThemedText type="defaultSemiBold">Add phase</ThemedText>
            </Pressable>

            <ThemedView style={styles.groupList}>
              {draftConfig.phases.map((phase, index) => (
                <ThemedView
                  key={phase.id}
                  style={[styles.groupCard, { borderColor }]}
                  lightColor={Colors.light.background}
                  darkColor={Colors.dark.background}
                >
                  <ThemedText type="defaultSemiBold">{phase.label}</ThemedText>
                  <ThemedText style={{ color: mutedTextColor }}>
                    Order {index + 1} ·{' '}
                    {formatPhaseRequirementSummary(phase.requirements ?? [])}
                  </ThemedText>

                  <View style={styles.phaseButtonRow}>
                    <Pressable
                      disabled={index === 0}
                      onPress={() => {
                        setDraftConfig((current) => ({
                          ...current,
                          phases: movePhase(current.phases, index, index - 1),
                        }));
                      }}
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        {
                          borderColor,
                          opacity: index === 0 ? 0.45 : pressed ? 0.82 : 1,
                        },
                      ]}
                    >
                      <ThemedText type="defaultSemiBold">Earlier</ThemedText>
                    </Pressable>
                    <Pressable
                      disabled={index === draftConfig.phases.length - 1}
                      onPress={() => {
                        setDraftConfig((current) => ({
                          ...current,
                          phases: movePhase(current.phases, index, index + 1),
                        }));
                      }}
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        {
                          borderColor,
                          opacity:
                            index === draftConfig.phases.length - 1
                              ? 0.45
                              : pressed
                                ? 0.82
                                : 1,
                        },
                      ]}
                    >
                      <ThemedText type="defaultSemiBold">Later</ThemedText>
                    </Pressable>
                    <Pressable
                      disabled={draftConfig.phases.length === 1}
                      onPress={() => {
                        setDraftConfig((current) => ({
                          ...current,
                          phases: renumberPhases(
                            current.phases.filter(
                              (_, phaseIndex) => phaseIndex !== index,
                            ),
                          ),
                        }));
                      }}
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        {
                          borderColor,
                          opacity:
                            draftConfig.phases.length === 1
                              ? 0.45
                              : pressed
                                ? 0.82
                                : 1,
                        },
                      ]}
                    >
                      <ThemedText type="defaultSemiBold">Remove</ThemedText>
                    </Pressable>
                  </View>

                  <View style={styles.phaseButtonRow}>
                    {(['set', 'color', 'run'] as const).map((type) => (
                      <Pressable
                        key={`${phase.id}-${type}`}
                        onPress={() => {
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
                        style={({ pressed }) => [
                          styles.secondaryButton,
                          { borderColor, opacity: pressed ? 0.82 : 1 },
                        ]}
                      >
                        <ThemedText type="defaultSemiBold">
                          {type === 'set'
                            ? 'Add set'
                            : type === 'color'
                              ? 'Add color'
                              : 'Add street'}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>

                  {(phase.requirements ?? []).map(
                    (requirement, requirementIndex) => (
                      <View
                        key={`${phase.id}-${requirementIndex}-${requirement.type}`}
                        style={styles.phaseButtonRow}
                      >
                        <ThemedText style={{ color: mutedTextColor }}>
                          {formatPhase10RequirementLabel(requirement)} (
                          {requirement.size})
                        </ThemedText>
                        <Pressable
                          disabled={
                            requirement.size <=
                            getPhaseRequirementMinSize(requirement)
                          }
                          onPress={() => {
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
                          style={({ pressed }) => [
                            styles.secondaryButton,
                            {
                              borderColor,
                              opacity:
                                requirement.size <=
                                getPhaseRequirementMinSize(requirement)
                                  ? 0.45
                                  : pressed
                                    ? 0.82
                                    : 1,
                            },
                          ]}
                        >
                          <ThemedText type="defaultSemiBold">Size -</ThemedText>
                        </Pressable>
                        <Pressable
                          disabled={
                            requirement.size >=
                            getPhaseRequirementMaxSize(requirement)
                          }
                          onPress={() => {
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
                          style={({ pressed }) => [
                            styles.secondaryButton,
                            {
                              borderColor,
                              opacity:
                                requirement.size >=
                                getPhaseRequirementMaxSize(requirement)
                                  ? 0.45
                                  : pressed
                                    ? 0.82
                                    : 1,
                            },
                          ]}
                        >
                          <ThemedText type="defaultSemiBold">Size +</ThemedText>
                        </Pressable>
                        <Pressable
                          disabled={(phase.requirements ?? []).length === 1}
                          onPress={() => {
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
                          style={({ pressed }) => [
                            styles.secondaryButton,
                            {
                              borderColor,
                              opacity:
                                (phase.requirements ?? []).length === 1
                                  ? 0.45
                                  : pressed
                                    ? 0.82
                                    : 1,
                            },
                          ]}
                        >
                          <ThemedText type="defaultSemiBold">
                            Remove group
                          </ThemedText>
                        </Pressable>
                      </View>
                    ),
                  )}
                </ThemedView>
              ))}
            </ThemedView>
          </ThemedView>

          <ThemedView
            style={[styles.card, { borderColor }]}
            lightColor={Colors.light.surface}
            darkColor={Colors.dark.surface}
          >
            <ThemedText type="subtitle">Round status</ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>
              Target: {snapshot.view.phaseLabel}
            </ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>
              Phase order: {snapshot.view.phaseOrder.join(' -> ')}
            </ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>
              Draw pile: {snapshot.view.drawPileCount}
            </ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>
              Discard: {snapshot.view.discardTop?.label ?? 'None'}
            </ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>
              {snapshot.view.status}
            </ThemedText>
            {snapshot.view.matchResultBanner ? (
              <ThemedText type="defaultSemiBold">
                {snapshot.view.matchResultBanner}
              </ThemedText>
            ) : null}
          </ThemedView>

          {snapshot.pendingHotseatPlayerId ? (
            <ThemedView
              style={[styles.card, { borderColor }]}
              lightColor={Colors.light.surface}
              darkColor={Colors.dark.surface}
            >
              <ThemedText type="subtitle">Hotseat handoff</ThemedText>
              <ThemedText style={{ color: mutedTextColor }}>
                Waiting for {snapshot.pendingHotseatPlayerId} to take over this
                device.
              </ThemedText>
              <Pressable
                onPress={() => {
                  sessionRef.current?.confirmHotseat();
                }}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: tintColor, opacity: pressed ? 0.82 : 1 },
                ]}
              >
                <ThemedText style={styles.primaryButtonText}>
                  Reveal next hand
                </ThemedText>
              </Pressable>
            </ThemedView>
          ) : null}

          <ThemedView style={styles.section}>
            <ThemedText type="subtitle">Players</ThemedText>
            {snapshot.view.players.map((player) => (
              <ThemedView
                key={player.playerId}
                style={[styles.card, { borderColor }]}
                lightColor={Colors.light.surface}
                darkColor={Colors.dark.surface}
              >
                <ThemedText type="defaultSemiBold">
                  {player.displayName} · {player.controller}
                </ThemedText>
                <ThemedText style={{ color: mutedTextColor }}>
                  {player.handCount} cards ·{' '}
                  {player.phaseComplete ? 'Phase laid' : 'Building phase'} ·{' '}
                  {player.skipped
                    ? 'Queued to skip'
                    : player.isActive
                      ? 'Active turn'
                      : 'Waiting'}
                </ThemedText>
                <ThemedText style={{ color: mutedTextColor }}>
                  {player.phaseLabel}
                </ThemedText>

                {player.laidGroups.length > 0 ? (
                  <ThemedView style={styles.groupList}>
                    {player.laidGroups.map((group, groupIndex) => (
                      <ThemedView
                        key={`${player.playerId}-${groupIndex}`}
                        style={[styles.groupCard, { borderColor }]}
                        lightColor={Colors.light.background}
                        darkColor={Colors.dark.background}
                      >
                        <ThemedText type="defaultSemiBold">
                          {group.label}
                        </ThemedText>
                        <ThemedText style={{ color: mutedTextColor }}>
                          {group.cards.map((card) => card.label).join(', ')}
                        </ThemedText>
                      </ThemedView>
                    ))}
                  </ThemedView>
                ) : null}

                {player.visibleCards.length > 0 ? (
                  <ThemedView style={styles.handRow}>
                    {player.visibleCards.map((card) => (
                      <ThemedView
                        key={card.id}
                        style={[styles.handCard, { borderColor }]}
                        lightColor={Colors.light.background}
                        darkColor={Colors.dark.background}
                      >
                        <ThemedText>{card.label}</ThemedText>
                      </ThemedView>
                    ))}
                  </ThemedView>
                ) : null}
              </ThemedView>
            ))}
          </ThemedView>

          {!snapshot.pendingHotseatPlayerId ? (
            <ThemedView style={styles.section}>
              <ThemedText type="subtitle">Legal actions</ThemedText>
              <ThemedView style={styles.buttonRow}>
                {snapshot.view.legalActions.length > 0 ? (
                  snapshot.view.legalActions.map((action) => (
                    <Pressable
                      key={action.id}
                      onPress={() => {
                        sessionRef.current?.submitMove(action.move);
                      }}
                      style={({ pressed }) => [
                        styles.choiceButton,
                        {
                          borderColor,
                          opacity: pressed ? 0.82 : 1,
                        },
                      ]}
                    >
                      <ThemedText type="defaultSemiBold">
                        {action.label}
                      </ThemedText>
                    </Pressable>
                  ))
                ) : (
                  <ThemedText style={{ color: mutedTextColor }}>
                    Waiting for a bot, a hotseat handoff, or a completed round.
                  </ThemedText>
                )}
              </ThemedView>
            </ThemedView>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  hero: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 12,
  },
  section: {
    gap: 12,
  },
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  primaryButtonText: {
    color: Colors.light.background,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  choiceButton: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  phaseButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  groupList: {
    gap: 8,
  },
  groupCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    gap: 6,
  },
  handRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  handCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
