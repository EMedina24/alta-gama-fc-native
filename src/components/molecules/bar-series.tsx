/**
 * A vertical bar chart: one column per entry, optionally two-tone (ADR 0142).
 * Goals per matchweek, split home and away; the player's goal timing bands.
 *
 * Plain `View`s rather than SVG — a bar is a rectangle, and a stack of them
 * lays out with flex for free. The atoms that ARE svg here are the two curved
 * things (`SparkArea`, `RingGauge`) and nothing else.
 *
 * ⚠ **Bars flex; they do not carry an intrinsic width** (trap 56). This chart
 * draws 4 columns in September and 42 in May for the same club, and a fixed
 * width that fits one fits neither.
 *
 * ⚠ **An all-zero series draws a flat row of stubs, not an empty box.** A club
 * that has scored nothing in six matchweeks is a real answer with a real shape.
 * Absent DATA is the caller's problem and is answered by not rendering the card
 * at all (ADR 0143) — the two must not be conflated here.
 */
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Colors, Radius, Spacing } from '@/constants/theme';

export interface BarEntry {
  /** The bar's total height. With `split`, this is the sum of both parts. */
  value: number;
  /** The lower part of a two-tone bar — home goals under away, say. */
  split?: number;
  /** Drawn under the column. Only some are shown; see `labelEvery`. */
  label?: string;
  /** Overrides the series colour for one bar — the design's final band. */
  color?: string;
}

export interface BarSeriesProps {
  entries: readonly BarEntry[];
  height: number;
  color?: string;
  splitColor?: string;
  /** Draw every Nth label, so 42 matchweeks do not become 42 overlapping ones. */
  labelEvery?: number;
  /**
   * Pad the plot out to this many columns, leaving the extra ones empty.
   *
   * ⚠ For a SEASON-shaped chart, pass the league's length. A club two
   * matchweeks in otherwise draws two half-card-wide bars, which reads as a
   * finished season rather than a starting one.
   */
  columns?: number | null;
}

export function BarSeries({
  entries,
  height,
  color = Colors.dark.accent,
  splitColor = Colors.dark.chartSeriesAlt,
  labelEvery = 1,
  columns,
}: BarSeriesProps) {
  // ⚠ The floor of 1 is what keeps an all-zero series from dividing by zero;
  // it makes every bar draw at its minimum, which is the honest picture.
  const max = Math.max(1, ...entries.map((e) => e.value));
  const slots = Math.max(entries.length, columns ?? 0);
  const pad = Array.from({ length: slots - entries.length });

  return (
    <View style={styles.wrap}>
      <View style={[styles.plot, { height }]}>
        {entries.map((entry, index) => {
          const total = (entry.value / max) * height;
          const lower = entry.split !== undefined ? (entry.split / max) * height : 0;
          return (
            <View key={index} style={styles.column}>
              <View style={[styles.bar, { height: Math.max(2, total) }]}>
                {/* The upper part paints the series colour; the lower part
                    overlays it, so a `split` of 0 needs no branch. */}
                <View
                  style={[
                    styles.fill,
                    { backgroundColor: entry.color ?? color },
                  ]}
                />
                {lower > 0 ? (
                  <View
                    style={[
                      styles.lower,
                      { height: lower, backgroundColor: splitColor },
                    ]}
                  />
                ) : null}
              </View>
            </View>
          );
        })}
        {pad.map((_, index) => (
          <View key={`pad-${index}`} style={styles.column} />
        ))}
      </View>
      <View style={styles.axis}>
        {entries.map((entry, index) => (
          <View key={index} style={styles.column}>
            {entry.label !== undefined && index % labelEvery === 0 ? (
              <Text variant="xiRailBadge" color="textFaint" tabular center numberOfLines={1}>
                {entry.label}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  plot: { flexDirection: 'row', alignItems: 'flex-end' },
  // ⚠ `maxWidth` matters at the OTHER end of the range: six timing bands across
  // a card would otherwise be 50pt slabs. The design's bars are ribbons.
  column: { flex: 1, paddingHorizontal: 1, maxWidth: 34 },
  bar: {
    width: '100%',
    borderRadius: Radius.rail + 1,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  lower: { width: '100%' },
  axis: { flexDirection: 'row' },
});
