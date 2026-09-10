/**
 * A horizontal labelled bar chart — conceded by minute, and any other
 * "label, then a bar" list (ADR 0142).
 *
 * ⚠ The labels sit in a fixed column and the bars take the rest, which is the
 * one place on this screen where a fixed width is right: the labels are minute
 * bands (`76-90+`) whose longest form is known, and letting them flex would
 * ragged-edge every bar's start.
 */
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Colors, Radius, Spacing } from '@/constants/theme';

export interface BandEntry {
  label: string;
  value: number;
  /** Overrides the series colour — the design's final, red band. */
  color?: string;
}

export interface BandBarsProps {
  entries: readonly BandEntry[];
  color?: string;
  /** Bar thickness. */
  thickness?: number;
  labelWidth?: number;
}

export function BandBars({
  entries,
  color = Colors.dark.chartMuted,
  thickness = 10,
  labelWidth = 48,
}: BandBarsProps) {
  const max = Math.max(1, ...entries.map((e) => e.value));

  return (
    <View style={styles.wrap}>
      {entries.map((entry, index) => (
        <View key={index} style={styles.row}>
          <Text
            variant="xiRailBadge"
            color="textFaint"
            tabular
            numberOfLines={1}
            style={[styles.label, { width: labelWidth }]}>
            {entry.label}
          </Text>
          <View style={styles.track}>
            <View
              style={[
                styles.bar,
                {
                  height: thickness,
                  borderRadius: Radius.chipSm - 2,
                  backgroundColor: entry.color ?? color,
                  // ⚠ A zero band still draws a hairline stub rather than
                  // nothing: an empty row beside five filled ones reads as a
                  // missing band, where a stub reads as "none in this window".
                  width: `${Math.max(1.5, (entry.value / max) * 100)}%`,
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  label: { textAlign: 'right' },
  track: { flex: 1 },
  bar: {},
});
