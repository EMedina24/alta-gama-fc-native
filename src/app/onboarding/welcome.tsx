/**
 * Step 0 — the welcome. One brand moment before the reader is asked anything
 * (ADR 0076): the mark under a floodlight, one headline, one button.
 *
 * ⚠ Skipping here is the same skip as the picker's: `onboarded` flips and the
 * reader lands on Today with nothing followed. Nothing is asked of iOS.
 */
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Eyebrow, Glow, Mark, Text } from '@/components/atoms';
import { StepDots } from '@/components/molecules';
import { Colors, Size, Spacing } from '@/constants/theme';
import { useI18n } from '@/lib/i18n/use-i18n';
import { setOnboarded } from '@/store/preferences';

export default function OnboardingWelcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { copy } = useI18n();
  const reduceMotion = useReducedMotion();

  const skip = () => {
    setOnboarded(true);
    router.replace('/');
  };

  return (
    <View style={styles.screen}>
      <Glow opacity={0.22} cx={0.5} cy={0.42} r={0.55} />

      <Animated.View
        entering={reduceMotion ? undefined : FadeInDown.duration(360)}
        style={styles.hero}>
        <Mark width={Size.markWelcome} />
        <View style={styles.words}>
          <Eyebrow color="accent">Alta Gama FC</Eyebrow>
          <Text variant="largeTitle" center style={styles.title}>
            {copy.onboarding.welcomeTitle}
          </Text>
          <Text variant="body" color="textSecondary" center style={styles.body}>
            {copy.onboarding.welcomeBody}
          </Text>
        </View>
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.four }]}>
        <View style={styles.dots}>
          <StepDots count={3} active={0} />
        </View>
        <Button label={copy.onboarding.welcomeCta} onPress={() => router.replace('/onboarding/clubs')} tall />
        <Button label={copy.onboarding.welcomeSkip} tone="quiet" onPress={skip} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.background },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.seven,
    gap: Spacing.six + Spacing.one,
  },
  words: { alignItems: 'center', gap: Spacing.three },
  title: { lineHeight: 37 },
  body: { lineHeight: 21, maxWidth: 300 },
  footer: { paddingHorizontal: Spacing.five, paddingTop: Spacing.three, gap: Spacing.two },
  dots: { alignItems: 'center', paddingBottom: Spacing.three },
});
