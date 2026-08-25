/** An uppercase micro label: FOLLOWING, VERIFIED, ON, FT, LIVE. */
import { StyleSheet, View } from 'react-native';

import { Text } from './text';
import { Colors, Radius, Spacing } from '@/constants/theme';

export interface PillProps {
  label: string;
  tone?: 'accent' | 'live' | 'quiet';
}

export function Pill({ label, tone = 'quiet' }: PillProps) {
  return (
    <View style={[styles.pill, tone === 'accent' && styles.accent, tone === 'live' && styles.live]}>
      <Text
        variant="eyebrowSm"
        color={tone === 'accent' ? 'accent' : tone === 'live' ? 'live' : 'textFaint'}>
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
