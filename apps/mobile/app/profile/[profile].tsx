import { Link, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { getProfileFromSegment } from '@/data/profiles';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function ProfileScreen() {
  const borderColor = useThemeColor({}, 'border');
  const mutedTextColor = useThemeColor({}, 'mutedText');
  const { profile } = useLocalSearchParams<{ profile?: string | string[] }>();
  const profileSegment = Array.isArray(profile) ? profile[0] : profile;
  const user = profileSegment ? getProfileFromSegment(profileSegment) : null;

  return (
    <ThemedView style={styles.page}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          {user ? (
            <>
              <ThemedView
                style={[styles.hero, { borderColor }]}
                lightColor={Colors.light.surface}
                darkColor={Colors.dark.surface}>
                <ThemedText style={[styles.eyebrow, { color: mutedTextColor }]}>
                  Mobile profile
                </ThemedText>
                <ThemedText type="title">{user.name}</ThemedText>
                <ThemedText style={[styles.handle, { color: mutedTextColor }]}>
                  @{user.username}
                </ThemedText>
                <ThemedText style={styles.bio}>{user.bio}</ThemedText>
              </ThemedView>

              <ThemedView
                style={[styles.card, { borderColor }]}
                lightColor={Colors.light.surface}
                darkColor={Colors.dark.surface}>
                <ThemedText type="subtitle">Overview</ThemedText>
                <ThemedText>{user.role}</ThemedText>
                <ThemedText style={{ color: mutedTextColor }}>{user.location}</ThemedText>
                <ThemedText style={styles.about}>{user.about}</ThemedText>
              </ThemedView>

              <ThemedView
                style={[styles.card, { borderColor }]}
                lightColor={Colors.light.surface}
                darkColor={Colors.dark.surface}>
                <ThemedText type="subtitle">Focus areas</ThemedText>
                <ThemedView style={styles.interests}>
                  {user.interests.map((interest) => (
                    <ThemedView
                      key={interest}
                      style={[styles.interestPill, { borderColor }]}
                      lightColor={Colors.light.surface}
                      darkColor={Colors.dark.surface}>
                      <ThemedText>{interest}</ThemedText>
                    </ThemedView>
                  ))}
                </ThemedView>
              </ThemedView>
            </>
          ) : (
            <ThemedView
              style={[styles.card, { borderColor }]}
              lightColor={Colors.light.surface}
              darkColor={Colors.dark.surface}>
              <ThemedText type="subtitle">Profile not found</ThemedText>
              <ThemedText>
                This mobile route only resolves handles that look like /profile/@username.
              </ThemedText>
            </ThemedView>
          )}

          <Link href="/" style={[styles.backLink, { borderColor }]}>
            <ThemedText type="defaultSemiBold">Back home</ThemedText>
          </Link>
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
  hero: {
    gap: 10,
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    fontSize: 12,
  },
  handle: {
    fontSize: 16,
  },
  bio: {
    lineHeight: 24,
  },
  card: {
    gap: 12,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  about: {
    lineHeight: 22,
  },
  interests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  interestPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backLink: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
});
