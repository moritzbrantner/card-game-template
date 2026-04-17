import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

const communicationSections = [
  {
    title: 'Websockets',
    description:
      'Websockets keep a persistent connection open so clients can receive low-latency updates like chat messages, presence, and shared cursor movement.',
    bullets: [
      'Use them when the product needs fast bidirectional events.',
      'The mobile client usually needs reconnect, heartbeat, and auth refresh logic.',
      'Small event payloads are easier to merge into visible state on constrained networks.',
    ],
  },
  {
    title: 'CRDTs',
    description:
      'CRDTs allow multiple devices to update shared state concurrently and still converge without server-enforced locking.',
    bullets: [
      'Useful when collaboration must continue during offline or unstable periods.',
      'The app usually persists local operations first, then syncs them later.',
      'Merge behavior lives in the data model instead of being scattered across UI code.',
    ],
  },
];

export default function CommunicationScreen() {
  const borderColor = useThemeColor({}, 'border');
  const mutedTextColor = useThemeColor({}, 'mutedText');

  return (
    <ThemedView style={styles.page}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedView style={styles.header}>
            <ThemedText type="title">Communication</ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>
              This category groups the main primitives behind realtime collaboration on web,
              desktop, and mobile.
            </ThemedText>
          </ThemedView>

          {communicationSections.map((section) => (
            <ThemedView
              key={section.title}
              style={[styles.card, { borderColor }]}
              lightColor={Colors.light.surface}
              darkColor={Colors.dark.surface}>
              <ThemedText style={[styles.eyebrow, { color: mutedTextColor }]}>
                Communication topic
              </ThemedText>
              <ThemedText type="subtitle">{section.title}</ThemedText>
              <ThemedText style={{ color: mutedTextColor }}>{section.description}</ThemedText>
              {section.bullets.map((bullet) => (
                <ThemedText key={bullet} style={{ color: mutedTextColor }}>
                  • {bullet}
                </ThemedText>
              ))}
            </ThemedView>
          ))}
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
    gap: 20,
  },
  header: {
    gap: 10,
  },
  card: {
    gap: 10,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: 12,
  },
});
