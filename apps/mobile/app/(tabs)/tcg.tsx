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
  createTcgAdapter,
  createTcgBots,
  getTcgExamplePreset,
  projectTcgPlayerView,
  tcgExamplePresets,
  type TcgExamplePresetId,
  type TcgMove,
  type TcgPlayerView,
  type TcgState,
} from '@repo/game-tcg';

function createSession(presetId: TcgExamplePresetId): LocalGameSession<TcgState, TcgMove, TcgPlayerView> {
  const preset = getTcgExamplePreset(presetId);
  const seed = `mobile-tcg:${presetId}`;

  return createLocalGameSession({
    adapter: createTcgAdapter(),
    bots: createTcgBots(preset.seats),
    hotseat: preset.hotseat,
    matchId: `mobile-tcg:${presetId}`,
    participants: preset.seats,
    projectView: projectTcgPlayerView,
    setup: {
      seed,
    },
  });
}

export default function TcgScreen() {
  const borderColor = useThemeColor({}, 'border');
  const mutedTextColor = useThemeColor({}, 'mutedText');
  const accentSurface = useThemeColor({}, 'accentSurface');
  const tintColor = useThemeColor({}, 'tint');
  const catalogEntry = defaultGameCatalog.get('arcane-duel');
  const [presetId, setPresetId] = useState<TcgExamplePresetId>('duel');
  const sessionRef = useRef<LocalGameSession<TcgState, TcgMove, TcgPlayerView> | null>(null);
  const [snapshot, setSnapshot] = useState(() => {
    const session = createSession('duel');
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
            <ThemedText type="title">Arcane Duel</ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>
              MVP trading card game with mana growth, creatures, spells, combat, graveyards, and bots.
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
              <ThemedText style={styles.primaryButtonText}>Restart duel</ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText type="subtitle">Duel presets</ThemedText>
            <ThemedView style={styles.buttonRow}>
              {tcgExamplePresets.map((preset) => (
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
            <ThemedText type="subtitle">Duel status</ThemedText>
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
                <ThemedText style={styles.primaryButtonText}>Reveal next hand</ThemedText>
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
                darkColor={Colors.dark.surface}>
                <ThemedText type="defaultSemiBold">
                  {player.displayName} · {player.controller}
                </ThemedText>
                <ThemedText style={{ color: mutedTextColor }}>
                  Life {player.life} · Mana {player.mana}/{player.maxMana} · Deck {player.deckCount} ·{' '}
                  {player.handCount} cards
                </ThemedText>
                <ThemedView style={styles.handRow}>
                  {player.battlefield.length > 0 ? (
                    player.battlefield.map((unit) => (
                      <ThemedView
                        key={unit.id}
                        style={[styles.handCard, { borderColor }]}
                        lightColor={Colors.light.background}
                        darkColor={Colors.dark.background}>
                        <ThemedText>{unit.card.label}</ThemedText>
                        <ThemedText style={{ color: mutedTextColor }}>
                          {unit.card.attack}/{(unit.card.health ?? 0) - unit.damage}
                        </ThemedText>
                      </ThemedView>
                    ))
                  ) : (
                    <ThemedText style={{ color: mutedTextColor }}>No creatures in play.</ThemedText>
                  )}
                </ThemedView>
                {player.visibleHand.length > 0 ? (
                  <ThemedText style={{ color: mutedTextColor }}>
                    Hand: {player.visibleHand.map((card) => card.label).join(', ')}
                  </ThemedText>
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
