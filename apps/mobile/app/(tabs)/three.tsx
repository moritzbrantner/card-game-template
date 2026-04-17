import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function ThreeScreen() {
  const borderColor = useThemeColor({}, 'border');
  const accentColor = useThemeColor({}, 'accent');
  const accentSurface = useThemeColor({}, 'accentSurface');
  const mutedTextColor = useThemeColor({}, 'mutedText');

  return (
    <ThemedView style={styles.page}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedView style={styles.header}>
            <ThemedText type="title">Three.js</ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>
              A dedicated mobile destination for 3D ideas, visual prototypes, and future scene
              work.
            </ThemedText>
          </ThemedView>

          <ThemedView
            style={[styles.stage, { borderColor }]}
            lightColor={Colors.light.surface}
            darkColor={Colors.dark.surface}>
            <View style={[styles.layer, styles.layerBack, { borderColor, backgroundColor: accentSurface }]} />
            <View style={[styles.layer, styles.layerMid, { borderColor, backgroundColor: accentSurface }]} />
            <View style={[styles.layer, styles.layerFront, { borderColor, backgroundColor: accentColor }]} />
          </ThemedView>

          <ThemedView
            style={[styles.card, { borderColor }]}
            lightColor={Colors.light.surface}
            darkColor={Colors.dark.surface}>
            <ThemedText type="subtitle">Why it is here</ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>
              Users can now open a dedicated Three.js screen directly from the navigation menu.
            </ThemedText>
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
  stage: {
    minHeight: 260,
    borderWidth: 1,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  layer: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderWidth: 1,
    borderRadius: 24,
  },
  layerBack: {
    transform: [{ rotate: '-18deg' }, { translateX: -34 }, { translateY: -30 }, { scale: 0.92 }],
    opacity: 0.48,
  },
  layerMid: {
    transform: [{ rotate: '12deg' }, { translateX: 26 }, { translateY: -10 }],
    opacity: 0.72,
  },
  layerFront: {
    transform: [{ rotate: '-6deg' }, { translateY: 26 }],
    opacity: 0.94,
  },
  card: {
    gap: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
});
