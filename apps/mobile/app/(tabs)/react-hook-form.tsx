import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

const overviewItems = [
  {
    title: 'useForm',
    description:
      'Creates the form API, default values, validation mode, and the shared form state.',
  },
  {
    title: 'register',
    description:
      'Connects inputs and attaches rules like required without extra wrappers for simple fields.',
  },
  {
    title: 'Controller',
    description:
      'Wraps controlled components so they still participate in errors, dirty state, and validity.',
  },
  {
    title: 'reset',
    description:
      'Restores defaults, clears errors, and can re-baseline dirty tracking with new reset values.',
  },
];

const interactionItems = [
  'Required rules are attached at registration time and begin showing errors when validation runs.',
  'Dirty state becomes true when a field differs from its default value.',
  'Validity reflects the current error map and the configured validation mode.',
  'reset() restores the clean baseline, while reset(newValues) creates a new one.',
];

export default function ReactHookFormScreen() {
  const borderColor = useThemeColor({}, 'border');
  const mutedTextColor = useThemeColor({}, 'mutedText');

  return (
    <ThemedView style={styles.page}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedView style={styles.header}>
            <ThemedText type="title">React Hook Form</ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>
              An overview of the main pieces of React Hook Form and how they interact with
              required validation, dirty state, validity, and reset.
            </ThemedText>
          </ThemedView>

          {overviewItems.map((item) => (
            <ThemedView
              key={item.title}
              style={[styles.card, { borderColor }]}
              lightColor={Colors.light.surface}
              darkColor={Colors.dark.surface}>
              <ThemedText type="subtitle">{item.title}</ThemedText>
              <ThemedText style={{ color: mutedTextColor }}>{item.description}</ThemedText>
            </ThemedView>
          ))}

          <ThemedView
            style={[styles.card, { borderColor }]}
            lightColor={Colors.light.surface}
            darkColor={Colors.dark.surface}>
            <ThemedText type="subtitle">State interactions</ThemedText>
            {interactionItems.map((item) => (
              <ThemedText key={item} style={{ color: mutedTextColor }}>
                • {item}
              </ThemedText>
            ))}
          </ThemedView>
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
});
