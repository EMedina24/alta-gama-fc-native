/**
 * The outcome of an action, as a panel the eye cannot miss (ADR 0074): a
 * tinted ground, a hairline in the same hue, a glyph and one line of
 * `bodyStrong`. Three kinds and three hues — `success` is lime, `error` is
 * the live red, `warning` the postponed amber — so a red panel can never be
 * read as "saved".
 *
 * ⚠ Enters with a short fade-down unless the reader has Reduce Motion on;
 * then it simply appears. Never loops, never pulses.
 */
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';

import { Check, Text } from '@/components/atoms';
import { Colors, Radius, Spacing, type ThemeColor } from '@/constants/theme';

export type StatusKind = 'success' | 'error' | 'warning';

export interface StatusBannerProps {
  kind: StatusKind;
  text: string;
}

const INK: Record<StatusKind, ThemeColor> = { success: 'accent', error: 'live', warning: 'postponed' };

export function StatusBanner({ kind, text }: StatusBannerProps) {
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.duration(220)}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.panel, styles[kind]]}>
      {kind === 'success' ? (
        <Check color="accent" />
      ) : (
        <View style={[styles.dot, { backgroundColor: Colors.dark[INK[kind]] }]} />
      )}
      <Text variant="bodyStrong" color={INK[kind]} style={styles.text}>
        {text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.control,
    borderWidth: 1,
  },
  success: { backgroundColor: Colors.dark.accentWash, borderColor: Colors.dark.accentRing },
  error: { backgroundColor: Colors.dark.liveWash, borderColor: Colors.dark.live },
  warning: { backgroundColor: Colors.dark.postponedWash, borderColor: Colors.dark.postponedRing },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { flex: 1, minWidth: 0 },
});
