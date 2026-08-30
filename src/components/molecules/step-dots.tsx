/**
 * Onboarding's progress — one bar for the current step, a dot for each other
 * (ADR 0076). Decorative: the eyebrow beside it says `STEP 1 OF 2` in words.
 */
import { StyleSheet, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

export interface StepDotsProps {
  count: number;
  /** Zero-based. */
  active: number;
}

export function StepDots({ count, active }: StepDotsProps) {
  return (
    <View style={styles.row} accessible={false}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.dot, i === active && styles.bar]} />
      ))}
    </View>
  );
}

const DOT = 4;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one + 2 },
  dot: { width: DOT, height: DOT, borderRadius: Radius.rail, backgroundColor: Colors.dark.hairlineStrong },
  bar: { width: DOT * 4.5, backgroundColor: Colors.dark.accent },
});
