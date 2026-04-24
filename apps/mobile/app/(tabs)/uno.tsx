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
  createUnoAdapter,
  createUnoBots,
  defaultUnoRules,
  getUnoExamplePreset,
  projectUnoPlayerView,
  unoExamplePresets,
  type UnoExamplePresetId,
  type UnoMove,
  type UnoPlayerView,
  type UnoRules,
  type UnoState,
} from '@repo/game-uno';

function createSession(
  presetId: UnoExamplePresetId,
  rules: UnoRules,
): LocalGameSession<UnoState, UnoMove, UnoPlayerView> {
  const preset = getUnoExamplePreset(presetId);
  const seed = `${presetId}:${JSON.stringify(rules)}`;

  return createLocalGameSession({
    adapter: createUnoAdapter(),
    bots: createUnoBots(preset.seats, seed),
    hotseat: preset.hotseat,
    matchId: `mobile-uno:${presetId}`,
    participants: preset.seats,
    projectView: projectUnoPlayerView,
    setup: {
      rules,
      seed,
    },
  });
}

export default function UnoScreen() {
  const borderColor = useThemeColor({}, 'border');
  const mutedTextColor = useThemeColor({}, 'mutedText');
  const accentSurface = useThemeColor({}, 'accentSurface');
  const tintColor = useThemeColor({}, 'tint');
  const catalogEntry = defaultGameCatalog.get('uno-style');
  const [presetId, setPresetId] = useState<UnoExamplePresetId>('mixed-table');
  const [rules, setRules] = useState<UnoRules>(defaultUnoRules);
  const sessionRef = useRef<LocalGameSession<
    UnoState,
    UnoMove,
    UnoPlayerView
  > | null>(null);
  const [snapshot, setSnapshot] = useState(() =>
    createSession('mixed-table', defaultUnoRules).getSnapshot(),
  );

  useEffect(() => {
    const session = createSession(presetId, rules);
    sessionRef.current = session;
    const unsubscribe = session.subscribe((nextSnapshot) => {
      startTransition(() => {
        setSnapshot(nextSnapshot);
      });
    });

    setSnapshot(session.getSnapshot());

    return unsubscribe;
  }, [presetId, rules]);

  return (
    <ThemedView style={styles.page}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedView
            style={[styles.hero, { borderColor }]}
            lightColor={Colors.light.surface}
            darkColor={Colors.dark.surface}
          >
            <ThemedText type="title">UNO-style</ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>
              Shared local play example with hotseat handoff, deterministic
              bots, and reusable rules.
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
                Restart match
              </ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText type="subtitle">Match presets</ThemedText>
            <ThemedView style={styles.buttonRow}>
              {unoExamplePresets.map((preset) => (
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

          <ThemedView style={styles.section}>
            <ThemedText type="subtitle">House rule toggles</ThemedText>
            <ThemedView style={styles.buttonRow}>
              {(
                [
                  ['drawStacking', 'Draw stacking'],
                  ['jumpIn', 'Jump-in'],
                  ['sevenZero', '7-0 swap'],
                  ['requireUnoCall', 'Require UNO call'],
                ] as const
              ).map(([key, label]) => (
                <Pressable
                  key={key}
                  onPress={() => {
                    setRules((currentRules) => ({
                      ...currentRules,
                      [key]: !currentRules[key],
                    }));
                  }}
                  style={({ pressed }) => [
                    styles.choiceButton,
                    {
                      borderColor,
                      backgroundColor: rules[key]
                        ? accentSurface
                        : 'transparent',
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <ThemedText type="defaultSemiBold">{label}</ThemedText>
                </Pressable>
              ))}
            </ThemedView>
          </ThemedView>

          <ThemedView
            style={[styles.card, { borderColor }]}
            lightColor={Colors.light.surface}
            darkColor={Colors.dark.surface}
          >
            <ThemedText type="subtitle">Table status</ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>
              Active color: {snapshot.view.activeColor}
            </ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>
              Pending draw: {snapshot.view.pendingDrawAmount}
            </ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>
              Draw pile: {snapshot.view.drawPileCount}
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

          {snapshot.view.pendingHotseatPlayerId ? (
            <ThemedView
              style={[styles.card, { borderColor }]}
              lightColor={Colors.light.surface}
              darkColor={Colors.dark.surface}
            >
              <ThemedText type="subtitle">Hotseat handoff</ThemedText>
              <ThemedText style={{ color: mutedTextColor }}>
                Waiting for {snapshot.view.pendingHotseatPlayerId} to take over
                this device.
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
            <ThemedText type="subtitle">Seats</ThemedText>
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
                  {player.isActive ? 'Active turn' : 'Waiting'}
                </ThemedText>
                <ThemedView style={styles.handRow}>
                  {player.visibleCards.length > 0 ? (
                    player.visibleCards.map((card) => (
                      <ThemedView
                        key={card.id}
                        style={[styles.handCard, { borderColor }]}
                        lightColor={Colors.light.background}
                        darkColor={Colors.dark.background}
                      >
                        <ThemedText>{card.label}</ThemedText>
                      </ThemedView>
                    ))
                  ) : (
                    <ThemedText style={{ color: mutedTextColor }}>
                      Hidden until you own this seat.
                    </ThemedText>
                  )}
                </ThemedView>
              </ThemedView>
            ))}
          </ThemedView>

          {!snapshot.view.pendingHotseatPlayerId ? (
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
                      ]}
                    >
                      <ThemedText type="defaultSemiBold">
                        {action.label}
                      </ThemedText>
                    </Pressable>
                  ))
                ) : (
                  <ThemedText style={{ color: mutedTextColor }}>
                    No visible actions right now.
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
