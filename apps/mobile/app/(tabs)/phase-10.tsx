import { startTransition, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
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
  defaultPhase10Rules,
  getPhase10ExamplePreset,
  phase10ExamplePresets,
  projectPhase10PlayerView,
  type Phase10ExamplePresetId,
  type Phase10Move,
  type Phase10PlayerView,
  type Phase10State,
} from '@repo/game-phase-10';

function createSession(
  presetId: Phase10ExamplePresetId,
): LocalGameSession<Phase10State, Phase10Move, Phase10PlayerView> {
  const preset = getPhase10ExamplePreset(presetId);
  const seed = `mobile-phase-10:${presetId}`;

  return createLocalGameSession({
    adapter: createPhase10Adapter(),
    bots: createPhase10Bots(preset.seats, seed),
    hotseat: preset.hotseat,
    matchId: `mobile-phase-10:${presetId}`,
    participants: preset.seats,
    projectView: projectPhase10PlayerView,
    setup: {
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
  const [presetId, setPresetId] =
    useState<Phase10ExamplePresetId>('mixed-table');
  const sessionRef = useRef<LocalGameSession<
    Phase10State,
    Phase10Move,
    Phase10PlayerView
  > | null>(null);
  const [snapshot, setSnapshot] = useState(() =>
    createSession('mixed-table').getSnapshot(),
  );

  useEffect(() => {
    const session = createSession(presetId);
    sessionRef.current = session;
    const unsubscribe = session.subscribe((nextSnapshot) => {
      startTransition(() => {
        setSnapshot(nextSnapshot);
      });
    });

    setSnapshot(session.getSnapshot());
    return unsubscribe;
  }, [presetId]);

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
              Starter implementation for phase 1 only: draw, lay two sets of
              three, hit laid sets, discard, and skip.
            </ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>
              Catalog route: {catalogEntry?.metadata?.route}
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
                    setPresetId(preset.id);
                  }}
                  style={({ pressed }) => [
                    styles.choiceButton,
                    {
                      borderColor,
                      backgroundColor:
                        preset.id === presetId ? accentSurface : 'transparent',
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <ThemedText type="defaultSemiBold">{preset.label}</ThemedText>
                </Pressable>
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
