/**
 * The cumulative-goals chart with its axes — `SparkArea` plus the labels an
 * atom may not draw (ADR 0013: an atom imports no other component).
 *
 * ⚠ The y labels are placed with `sparkY`, the same function the atom rules its
 * gridlines with, so the number and the line it names cannot drift apart. A
 * transcribed padding rule would have drifted the first time either changed,
 * and a mislabelled axis is worse than no axis.
 *
 * ⚠ The x labels come from the CALLER, already chosen — this molecule has no
 * idea that the points are matchweeks, and must not, because the axis is the
 * timeline's array index and `mw` is only a label on it.
 */
import { StyleSheet, View } from 'react-native';

import { SparkArea, Text, sparkY } from '@/components/atoms';
import { Spacing } from '@/constants/theme';

export interface GoalsLineProps {
  values: readonly number[];
  height: number;
  /** Ruled and labelled. The caller picks them off its own scale. */
  ticks: readonly number[];
  /**
   * Drawn along the bottom, each PLACED at its own fraction of the plot
   * (`at`, 0–1) rather than spread evenly.
   *
   * ⚠ Even spreading is wrong here and looked it: the points are fixtures in
   * kickoff order, so the label for the third fixture belongs at three-fifths
   * of the way across, not at the third of five equal slots. Spreading also
   * duplicated labels whenever two slots rounded to the same fixture.
   */
  xLabels: readonly { label: string; at: number }[];
  /** Room for the y labels to sit in, left of the plot. */
  gutter?: number;
}

export function GoalsLine({ values, height, ticks, xLabels, gutter = 30 }: GoalsLineProps) {
  const max = Math.max(...values, 1);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={[styles.gutter, { width: gutter, height }]}>
          {ticks.map((tick) => (
            <Text
              key={tick}
              variant="xiRailBadge"
              color="textFaint"
              tabular
              style={[
                styles.tick,
                // Half a line-height up, so the number straddles its rule
                // instead of hanging under it.
                { top: sparkY(tick, max, height) - 5 },
              ]}>
              {`${tick}`}
            </Text>
          ))}
        </View>
        <View style={styles.plot}>
          <SparkArea values={values} height={height} gridLines={ticks} />
        </View>
      </View>
      <View style={[styles.axis, { marginLeft: gutter }]}>
        {xLabels.map(({ label, at }, index) => {
          // ⚠ The two edge labels anchor to their edge instead of centring:
          // a centred label at 0 % or 100 % hangs half outside the card.
          const edge = at <= 0.001 ? 'start' : at >= 0.999 ? 'end' : 'mid';
          return (
            <Text
              key={`${label}-${index}`}
              variant="xiRailBadge"
              color="textFaint"
              tabular
              numberOfLines={1}
              style={[
                styles.xLabel,
                edge === 'start'
                  ? { left: 0 }
                  : edge === 'end'
                    ? { right: 0 }
                    : { left: `${at * 100}%`, transform: [{ translateX: '-50%' }] },
              ]}>
              {label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  gutter: { position: 'relative' },
  tick: { position: 'absolute', right: Spacing.two, textAlign: 'right' },
  plot: { flex: 1 },
  // ⚠ A relative box with a real height: the labels inside it are absolutely
  // positioned, so it would otherwise collapse and the card would close over
  // them.
  axis: { position: 'relative', height: 12 },
  xLabel: { position: 'absolute', top: 0 },
});
