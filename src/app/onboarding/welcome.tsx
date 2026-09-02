/**
 * Step 0 — the welcome. One brand moment before the reader is asked anything
 * (ADR 0076): the mark, one headline, one button — now on the app's own
 * crown + aurora shell (ADR 0099, reversing the repaint's floodlight
 * carve-out): the mesh behind everything, and the crown's gradient head with
 * NO title in it — the brand moment below carries the words.
 *
 * ⚠ No skip here, or on the picker (ADR 0077): a followed club is the
 * precondition for everything the app does. The only skip in the flow is the
 * alert primer's `Not now`.
 *
 * ⚠ The status bar is statically DARK: this screen does not scroll, so the
 * crown's bright band never leaves the top (ADR 0094's flip, degenerate case).
 *
 * The line under the button is the language override, written in the OTHER
 * language — a Spanish reader on an English phone sees `¿Prefieres español?`,
 * and nobody else can read it. It swaps the copy in place; nothing navigates.
 */
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Button, Eyebrow, GlobeGlyph, Mark, MeshGround, Text } from '@/components/atoms';
import { StepDots } from '@/components/molecules';
import { Crown } from '@/components/templates/crown';
import { Colors, Size, Spacing } from '@/constants/theme';
import { useI18n } from '@/lib/i18n/use-i18n';
import { setLanguage } from '@/store/preferences';

export default function OnboardingWelcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { copy, locale } = useI18n();
  const reduceMotion = useReducedMotion();

  const swap = copy.onboarding.switchLanguage;
  const switchLanguage = () => setLanguage(locale === 'en' ? 'es' : 'en');

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <MeshGround />
      {/* The gradient head alone — its fixed layer runs on behind the hero. */}
      <Crown topInset={insets.top} padBottom={0} />

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
        <Pressable
          onPress={switchLanguage}
          accessibilityRole="button"
          accessibilityLabel={`${swap.lead}${swap.word}${swap.tail}`}
          hitSlop={Spacing.two}
          style={({ pressed }) => [styles.language, pressed && styles.pressed]}>
          <GlobeGlyph />
          <Text variant="footnote" color="textFaint">
            {swap.lead}
            <Text variant="footnote" color="textSecondary" style={styles.languageWord}>
              {swap.word}
            </Text>
            {swap.tail}
          </Text>
        </Pressable>
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
  // 32pt visual, 44 with the hitSlop.
  language: {
    minHeight: Spacing.seven,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  languageWord: {
    fontWeight: '600',
    textDecorationLine: 'underline',
    textDecorationColor: Colors.dark.hairlineStrong,
  },
  pressed: { opacity: 0.6 },
});
