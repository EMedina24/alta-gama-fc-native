/**
 * The cumulative-goals line: a stroked path over a gradient fill (ADR 0142).
 *
 * Takes a plain series and its own box; it knows nothing about seasons,
 * matchweeks or goals — the caller has already decided what the axis means.
 *
 * ⚠⚠ **The x axis is the ARRAY INDEX and this atom cannot be told otherwise.**
 * That is deliberate: `timeline` is in kickoff order and `mw` is a label, so a
 * component that accepted x values would let a caller plot on matchweeks —
 * which are not chronological (a postponement puts matchweek 2 before matchweek
 * 1, live on Barcelona today) and would disagree with the scoring run drawn on
 * the same card. See `cumulativeGoals` in `lib/cronogol/stats`.
 *
 * ⚠ **The fill's translucency is `stopOpacity`, never an `rgba()` stop colour**
 * — `react-native-svg` drops the alpha channel of a `stopColor` and paints it
 * opaque (trap 42). It is spelled out here rather than delegated to
 * `WashGradient` because that atom fills a `<Rect>` behind its parent, and this
 * fill must be clipped to the curve.
 *
 * ⚠ The gradient `id` comes from `useId()` with the colons stripped, not a
 * literal (trap 40): two of these on one screen would otherwise both resolve
 * `url(#…)` to whichever mounted first.
 *
 * ⚠ The box is MEASURED, not a percentage (trap 65 / ADR 0138): these cards
 * change height when the segmented control switches views, and a `100%` viewport
 * would keep the width it first laid out at.
 */
import { useId, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { Colors } from '@/constants/theme';

export interface SparkAreaProps {
  /** One y value per point, in order. Fewer than two points draws nothing. */
  values: readonly number[];
  height: number;
  color?: string;
  strokeWidth?: number;
  /** Where the fill fades out, 0–1 of its own height. */
  fadeTo?: number;
  /**
   * Values to rule a horizontal line at. The caller labels them — this atom
   * draws no text, because an atom imports no other component (ADR 0013), and
   * the two must agree on one scale. `yFor` below is that agreement.
   */
  gridLines?: readonly number[];
}

/**
 * Where a value sits vertically, given the same box the chart was drawn in.
 *
 * ⚠ Exported so a caller can place an axis LABEL against a rule this atom drew
 * without transcribing the padding rule — the two would drift the first time
 * either changed, and a mislabelled axis is worse than none.
 */
export function sparkY(value: number, max: number, height: number, strokeWidth = 2.5): number {
  const pad = strokeWidth / 2;
  const usable = Math.max(1, height - strokeWidth);
  return pad + usable - (value / Math.max(max, 1)) * usable;
}

export function SparkArea({
  values,
  height,
  color = Colors.dark.accent,
  strokeWidth = 2.5,
  fadeTo = 0.85,
  gridLines,
}: SparkAreaProps) {
  const id = `spark-${useId().replace(/:/g, '')}`;
  const [width, setWidth] = useState(0);

  const onLayout = ({ nativeEvent: { layout } }: LayoutChangeEvent) =>
    setWidth((prev) => (prev === layout.width ? prev : layout.width));

  // ⚠ A single point is a dot, not a line, and week one of a season really does
  // serve one. Drawing nothing is honest; drawing a flat rule across the card
  // would claim a shape that has not happened yet.
  const drawable = width > 0 && values.length > 1;

  // Half the stroke inset top and bottom, so a peak at the maximum is not
  // clipped in half by its own line width.
  const max = Math.max(...values, 1);

  const x = (index: number) => (index / (values.length - 1)) * width;
  const y = (value: number) => sparkY(value, max, height, strokeWidth);

  const line = drawable
    ? values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ')
    : '';
  const area = drawable
    ? `${line} L${width},${height} L0,${height} Z`
    : '';

  return (
    <View style={[styles.box, { height }]} onLayout={onLayout}>
      {drawable ? (
        <Svg width={width} height={height} accessible={false}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <Stop offset={0} stopColor={color} stopOpacity={0.28} />
              <Stop offset={fadeTo} stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {/* Rules first, so the line and its fill sit over them. */}
          {(gridLines ?? []).map((value) => (
            <Line
              key={value}
              x1={0}
              x2={width}
              y1={y(value)}
              y2={y(value)}
              stroke={Colors.dark.chartGrid}
              strokeWidth={1}
            />
          ))}
          <Path d={area} fill={`url(#${id})`} />
          <Path
            d={line}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', overflow: 'hidden' },
});
