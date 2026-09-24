/**
 * An uppercase micro label: FOLLOWING, VERIFIED, ON, FT, LIVE.
 *
 * ⚠ `plate` is `quiet`'s chrome with one notch more ink — for a pill on a
 * dark PLATE (`plateDark`/`plateBody`), where `textFaint` measures ≤ 2.2
 * (ADR 0186). Named for its ground, like the `onCrown*` inks: it says where
 * it is legal, and it is not a general "brighter quiet".
 */
import { StyleSheet, View } from 'react-native';

import { Text } from './text';
import { Colors, Radius, Spacing, type ThemeColor } from '@/constants/theme';

export type PillTone = 'accent' | 'live' | 'quiet' | 'plate';

export interface PillProps {
  label: string;
  tone?: PillTone;
}

const INK: Record<PillTone, ThemeColor> = {
  accent: 'accent',
  live: 'live',
  quiet: 'textFaint',
  plate: 'textSecondary',
};

export function Pill({ label, tone = 'quiet' }: PillProps) {
  return (
    <View style={[styles.pill, tone === 'accent' && styles.accent, tone === 'live' && styles.live]}>
      <Text variant="eyebrowSm" color={INK[tone]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.hairlineStrong,
    alignSelf: 'flex-start',
  },
  accent: { borderColor: Colors.dark.accentRing, backgroundColor: Colors.dark.accentWash },
  live: { borderColor: Colors.dark.live, backgroundColor: Colors.dark.liveWash },
});
