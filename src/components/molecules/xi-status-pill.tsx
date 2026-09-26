/**
 * The pitch card's status: how many of eleven are placed, "Ready" when Save
 * would take the XI, or "No goalkeeper" when eleven are placed but the GK slot
 * holds an outfielder (ADR 0213). The handoff's three states, and nothing
 * else — a pill that could say more would say it louder than Save does.
 */
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Colors, Radius, Spacing, Xi } from '@/constants/theme';

export type XiStatusTone = 'count' | 'ready' | 'noGk';

export interface XiStatusPillProps {
  tone: XiStatusTone;
  label: string;
}

const TONE = {
  count: { fill: Colors.dark.xiStatus, ink: 'text' },
  ready: { fill: Colors.dark.accentWash, ink: 'accent' },
  noGk: { fill: Colors.dark.liveWash, ink: 'live' },
} as const;

export function XiStatusPill({ tone, label }: XiStatusPillProps) {
  const t = TONE[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.fill }]} accessibilityRole="text" accessibilityLabel={label}>
      <View style={[styles.dot, { backgroundColor: Colors.dark[t.ink] }]} />
      <Text variant="caption" color={t.ink} numberOfLines={1} tabular>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: Xi.barH,
    borderRadius: Xi.barH / 2,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two - 2,
  },
  dot: { width: 6, height: 6, borderRadius: Radius.pill },
});
