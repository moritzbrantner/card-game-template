import { startTransition, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { defaultGameCatalog } from '@repo/game-catalog';
import { createLocalGameSession, type LocalGameSession } from '@repo/game-session';
import {
  createPokerAdapter,
  createPokerBots,
  defaultPokerRules,
  getPokerExamplePreset,
  pokerExamplePresets,
  projectPokerPlayerView,
  type PokerExamplePresetId,
  type PokerMove,
  type PokerPlayerView,
  type PokerState,
} from '@repo/game-poker';

function createSession(presetId: PokerExamplePresetId): LocalGameSession<PokerState, PokerMove, PokerPlayerView> {
  const preset = getPokerExamplePreset(presetId);
  const seed = `mobile-poker:${presetId}`;

  return createLocalGameSession({
    adapter: createPokerAdapter(),
    bots: createPokerBots(preset.seats, seed),
    hotseat: preset.hotseat,
    matchId: `mobile-poker:${presetId}`,
    participants: preset.seats,
    projectView: projectPokerPlayerView,
    setup: {
      rules: defaultPokerRules,
      seed,
    },
  });
}

export default function PokerScreen() {
  const borderColor = useThemeColor({}, 'border');
  const mutedTextColor = useThemeColor({}, 'mutedText');
  const accentSurface = useThemeColor({}, 'accentSurface');
  const tintColor = useThemeColor({}, 'tint');
  const catalogEntry = defaultGameCatalog.get('texas-holdem');
  const [presetId, setPresetId] = useState<PokerExamplePresetId>('heads-up');
  const sessionRef = useRef<LocalGameSession<PokerState, PokerMove, PokerPlayerView> | null>(null);
  const [snapshot, setSnapshot] = useState(() => {
    const session = createSession('heads-up');
    sessionRef.current = session;
    return session.getSnapshot();
  });

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
            darkColor={Colors.dark.surface}>
            <ThemedText type="title">Texas Hold&apos;em</ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>
              MVP poker table with deterministic deals, betting rounds, folding, and showdown scoring.
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
              ]}>
              <ThemedText style={styles.primaryButtonText}>Restart hand</ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText type="subtitle">Table presets</ThemedText>
            <ThemedView style={styles.buttonRow}>
              {pokerExamplePresets.map((preset) => (
                <Pressable
                  key={preset.id}
                  onPress={() => {
                    setPresetId(preset.id);
                  }}
                  style={({ pressed }) => [
                    styles.choiceButton,
                    {
                      borderColor,
                      backgroundColor: preset.id === presetId ? accentSurface : 'transparent',
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}>
                  <ThemedText type="defaultSemiBold">{preset.label}</ThemedText>
                </Pressable>
              ))}
            </ThemedView>
          </ThemedView>

          <ThemedView
            style={[styles.card, { borderColor }]}
            lightColor={Colors.light.surface}
            darkColor={Colors.dark.surface}>
            <ThemedText type="subtitle">Table status</ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>Phase: {snapshot.view.phase}</ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>Pot: {snapshot.view.pot}</ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>
              Board: {snapshot.view.communityCards.map((card) => card.label).join(', ') || 'No board cards'}
            </ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>{snapshot.view.status}</ThemedText>
            {snapshot.view.matchResultBanner ? (
              <ThemedText type="defaultSemiBold">{snapshot.view.matchResultBanner}</ThemedText>
            ) : null}
          </ThemedView>

          {snapshot.pendingHotseatPlayerId ? (
            <ThemedView
              style={[styles.card, { borderColor }]}
              lightColor={Colors.light.surface}
              darkColor={Colors.dark.surface}>
              <ThemedText type="subtitle">Hotseat handoff</ThemedText>
              <ThemedText style={{ color: mutedTextColor }}>
                Waiting for {snapshot.pendingHotseatPlayerId} to take over this device.
              </ThemedText>
              <Pressable
                onPress={() => {
                  sessionRef.current?.confirmHotseat();
                }}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: tintColor, opacity: pressed ? 0.82 : 1 },
                ]}>
                <ThemedText style={styles.primaryButtonText}>Reveal next seat</ThemedText>
              </Pressable>
            </ThemedView>
          ) : null}

          <ThemedView style={styles.section}>
            <ThemedText type="subtitle">Seats</ThemedText>
            {snapshot.view.players.map((player) => (
              <ThemedView
                key={player.playerId}
                style={[styles.card, { borderColor }]}
                lightColor={Colors.light.surface}
                darkColor={Colors.dark.surface}>
                <ThemedText type="defaultSemiBold">
                  {player.displayName} · {player.controller}
                </ThemedText>
                <ThemedText style={{ color: mutedTextColor }}>
                  Stack {player.stack} · {player.hasFolded ? 'Folded' : player.isActive ? 'Active' : 'Waiting'}
                </ThemedText>
                <ThemedView style={styles.handRow}>
                  {player.visibleCards.length > 0 ? (
                    player.visibleCards.map((card) => (
                      <ThemedView
                        key={card.id}
                        style={[styles.handCard, { borderColor }]}
                        lightColor={Colors.light.background}
                        darkColor={Colors.dark.background}>
                        <ThemedText>{card.label}</ThemedText>
                      </ThemedView>
                    ))
                  ) : (
                    <ThemedText style={{ color: mutedTextColor }}>Hole cards hidden.</ThemedText>
                  )}
                </ThemedView>
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
                        { borderColor, opacity: pressed ? 0.82 : 1 },
                      ]}>
                      <ThemedText type="defaultSemiBold">{action.label}</ThemedText>
                    </Pressable>
                  ))
                ) : (
                  <ThemedText style={{ color: mutedTextColor }}>No visible actions right now.</ThemedText>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 18,
  },
  hero: {
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  section: {
    gap: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  choiceButton: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  card: {
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  handRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  handCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
