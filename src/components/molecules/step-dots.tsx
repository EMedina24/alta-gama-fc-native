/**
 * Onboarding's progress — one bar for the current step, a dot for each other
 * (ADR 0076). Decorative: the eyebrow beside it says `STEP 1 OF 2` in words.
 *
 * `variant="dot"` (ADR 0113) is the NEXT UP deck's counter: the active step is
 * a slightly larger accent DOT rather than a bar — under a card stack the bar
 * read as a control, and equal dots are the deck idiom. Same decorative rule:
 * the deck's own accessibility label says "match 1 of 3" in words.
 */
import { StyleSheet, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

export interface StepDotsProps {
  count: number;
  /** Zero-based. */
  active: number;
  variant?: 'bar' | 'dot';
}

export function StepDots({ count, active, variant = 'bar' }: StepDotsProps) {
  return (
    <View style={styles.row} accessible={false}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === active && (variant === 'bar' ? styles.bar : styles.dotOn),
          ]}
        />
      ))}
    </View>
  );
}

const DOT = 4;
/** The active round dot — a step up, not a bar. */
const DOT_ON = 6;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one + 2 },
  dot: { width: DOT, height: DOT, borderRadius: Radius.rail, backgroundColor: Colors.dark.hairlineStrong },
  bar: { width: DOT * 4.5, backgroundColor: Colors.dark.accent },
  dotOn: {
    width: DOT_ON,
    height: DOT_ON,
    borderRadius: DOT_ON / 2,
    backgroundColor: Colors.dark.accent,
  },
});
