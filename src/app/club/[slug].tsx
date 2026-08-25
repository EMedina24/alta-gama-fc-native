/**
 * The club page. Placeholder — built out in Phase 2e (crest + identity, the
 * subscribe block, the season spine, and the Players tab).
 *
 * ⚠ Sits OUTSIDE `(tabs)/` so it pushes over the tab bar, which is the whole
 * reason the root layout is a `Stack` wrapping the tab group (ADR 0020).
 */
import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Colors, Spacing } from '@/constants/theme';

export default function ClubScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, headerTitle: '', headerTransparent: true, headerTintColor: Colors.dark.accent }} />
      <Text variant="title">{slug}</Text>
      <Text variant="footnote" color="textFaint">
        Club page — Phase 2e
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
});
