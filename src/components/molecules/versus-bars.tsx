/**
 * Head-to-head rows: the home count on the left, the label in the middle, the
 * away count on the right, and under them two bars growing OUT from the centre
 * (ADR 0190).
 *
 * ⚠ **The leader of a row fills its half; the other side is scaled to it.** A
 * share-of-total bar would draw a 1-0 booking count as a full bar against an
 * empty one AND a 5-5 substitution count as two half bars — the same visual
 * weight for "level" and "one-sided" in different rows. Scaling to the row's
 * leader keeps "level" reading as two equal full bars.
 *
 * ⚠ **A 0-0 row draws two empty tracks, never nothing.** No red cards is an
 * answer (the `groupCounts` rule: a zero is information).
 *
 * ⚠ Built so the sheet can add POSSESSION or SHOTS as more rows the day the
 * backend serves team stats (ADR 0190) — a row is just a label and two numbers.
 *
 * ⚠ Widths animate on the caller's shared `progress` via `useAnimatedStyle` —
 * one clock for the whole sheet, zero re-renders while it plays. Reduce Motion
 * needs no branch (trap 63).
 */
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { AnimatedNumber, Text } from '@/components/atoms';
import { Colors, MatchStats, Radius, Spacing } from '@/constants/theme';

export interface VersusRow {
  label: string;
  home: number;
  away: number;
}

export interface VersusBarsProps {
  rows: readonly VersusRow[];
  homeColor: string;
  awayColor: string;
  progress: SharedValue<number>;
}

export function VersusBars({ rows, homeColor, awayColor, progress }: VersusBarsProps) {
  return (
    <View style={styles.list}>
      {rows.map((row) => (
        <VersusRowView
          key={row.label}
          row={row}
          homeColor={homeColor}
          awayColor={awayColor}
          progress={progress}
        />
      ))}
    </View>
  );
}

function VersusRowView({
  row,
  homeColor,
  awayColor,
  progress,
}: {
  row: VersusRow;
  homeColor: string;
  awayColor: string;
  progress: SharedValue<number>;
}) {
  const lead = Math.max(1, row.home, row.away);
  const homeShare = row.home / lead;
  const awayShare = row.away / lead;

  const homeBar = useAnimatedStyle(() => ({ width: `${homeShare * progress.value * 100}%` }));
  const awayBar = useAnimatedStyle(() => ({ width: `${awayShare * progress.value * 100}%` }));

  return (
    <View
      style={styles.row}
      accessible
      // One stop per row: "Yellow cards, 2 to 3".
      accessibilityLabel={`${row.label}, ${row.home}–${row.away}`}>
      <View style={styles.numbers}>
        <View style={styles.side}>
          <AnimatedNumber
            value={row.home}
            progress={progress}
            variant="numeralLg"
            color={row.home >= row.away ? 'text' : 'textDim'}
          />
        </View>
        <Text variant="eyebrowSm" color="textMuted">
          {row.label}
        </Text>
        <View style={[styles.side, styles.sideRight]}>
          <AnimatedNumber
            value={row.away}
            progress={progress}
            variant="numeralLg"
            align="right"
            color={row.away >= row.home ? 'text' : 'textDim'}
          />
        </View>
      </View>

      <View style={styles.bars}>
        {/* The home half grows LEFTWARD from the centre, so it is right-aligned. */}
        <View style={[styles.track, styles.trackHome]}>
          <Animated.View style={[styles.bar, { backgroundColor: homeColor }, homeBar]} />
        </View>
        <View style={styles.track}>
          <Animated.View style={[styles.bar, { backgroundColor: awayColor }, awayBar]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.four },
  row: { gap: Spacing.two },
  numbers: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { flex: 1 },
  sideRight: { alignItems: 'flex-end' },
  bars: { flexDirection: 'row', gap: Spacing.one },
  track: {
    flex: 1,
    height: MatchStats.barHeight,
    borderRadius: Radius.pill,
    backgroundColor: Colors.dark.chartGrid,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  trackHome: { justifyContent: 'flex-end' },
  bar: { height: '100%', borderRadius: Radius.pill },
});
