/**
 * A horizontal fill against a track — the home/away goal meters, the penalty
 * conversion bar, the first/second-half split.
 *
 * Plain `View`s, not SVG: it is two rectangles, and a `View` animates its width
 * on the UI thread without re-laying out an SVG sheet (ADR 0142).
 *
 * ⚠ `share` is 0–1 and is CLAMPED, never asserted. Every caller here divides
 * two wire numbers, and the API's own note is that a backfill can revise
 * totals retroactively — a 1.02 arriving for one refresh should paint a full
 * bar, not overflow the card.
 */
import { StyleSheet, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

export interface MeterBarProps {
  /** 0–1. */
  share: number;
  color?: string;
  track?: string;
  height?: number;
}

export function MeterBar({
  share,
  color = Colors.dark.accent,
  track = Colors.dark.chartTrack,
  height = 6,
}: MeterBarProps) {
  const width = `${Math.max(0, Math.min(1, share)) * 100}%` as const;
  return (
    <View style={[styles.track, { backgroundColor: track, height }]}>
      <View style={[styles.fill, { backgroundColor: color, width }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', borderRadius: Radius.rail, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.rail },
});
