/**
 * The goal flow: each side's running score as a step line across the match's
 * minutes, drawn in left to right (ADR 0190).
 *
 * ⚠ **The x axis is MINUTES, not an index** — the opposite of `SparkArea`, and
 * deliberately so: here the reader wants to see that two goals came a minute
 * apart and the third an hour later. `goalFlow` in `lib/cronogol/match-stats`
 * has already placed each goal (and owns the `45+2` → 45 rule).
 *
 * ⚠ **The draw-in is a CLIP, not a path morph.** An animated `Rect` inside a
 * `ClipPath` widens with `progress`, revealing lines, fills and dots together on
 * the UI thread — the screen re-renders zero times while it plays, the same
 * reason `AnimatedNumber` exists. Reduce Motion needs no branch (trap 63):
 * Reanimated skips the timing and the clip opens at full width.
 *
 * ⚠ Fill translucency is `stopOpacity`, never an `rgba()` stop (trap 42); the
 * gradient and clip ids come from `useId()` with colons stripped (trap 40); the
 * box is MEASURED, not a percentage (trap 65).
 *
 * ⚠ Axis labels are `Text` atoms laid over the plot, not SVG text — SVG text
 * would bypass `Type` and the Dynamic-Type-free token sizes (the `GoalsLine`
 * precedent).
 */
import { useId, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { Text } from '@/components/atoms';
import { Colors, MatchStats, Spacing } from '@/constants/theme';
import type { FlowGoal } from '@/lib/cronogol/match-stats';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export interface FlowSeries {
  goals: readonly FlowGoal[];
  color: string;
}

export interface GoalFlowChartProps {
  /**
   * Drawn in this order — the LAST series paints on top. The caller puts the
   * club it is about last, so a shared 0-line shows the club's colour.
   */
  series: readonly FlowSeries[];
  /** The axis's right end in minutes — 90, or later with stoppage. */
  end: number;
  /** 0→1, the sheet's one clock. */
  progress: SharedValue<number>;
  /** `HT` — the half-time rule's label. */
  halfTimeLabel: string;
}

const HALF_TIME = 45;

export function GoalFlowChart({ series, end, progress, halfTimeLabel }: GoalFlowChartProps) {
  const rawId = useId().replace(/:/g, '');
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const height = MatchStats.flowHeight;
  const plotW = Math.max(0, width - MatchStats.flowGutter);
  /** At least 1, so a goalless side and a 0-0 still get a scale. */
  const max = Math.max(1, ...series.map((s) => s.goals.length));
  /** Every integer up to 4 goals; every other one beyond, or the gutter crowds. */
  const step = max > 4 ? 2 : 1;
  const ticks = Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step);

  /** Inset by the dot's radius so a goal at the top or at 90′ is not cut in half. */
  const pad = MatchStats.flowDot + 1;
  const x = (minute: number) => pad + (minute / end) * (plotW - pad * 2);
  const y = (goals: number) => height - pad - (goals / max) * (height - pad * 2);

  const clip = useAnimatedProps(() => ({ width: progress.value * plotW }));

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={[styles.gutter, { width: MatchStats.flowGutter, height }]}>
          {ticks.map((tick) => (
            <Text
              key={tick}
              variant="xiRailBadge"
              color="textFaint"
              tabular
              // Half a line up, so the number straddles its rule.
              style={[styles.tick, { top: y(tick) - 5 }]}>
              {`${tick}`}
            </Text>
          ))}
        </View>

        <View style={styles.plot} onLayout={onLayout}>
          {plotW > 0 ? (
            <Svg width={plotW} height={height}>
              <Defs>
                <ClipPath id={`${rawId}clip`}>
                  <AnimatedRect x={0} y={0} height={height} animatedProps={clip} />
                </ClipPath>
                {series.map((s, i) => (
                  <LinearGradient key={i} id={`${rawId}fill${i}`} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={s.color} stopOpacity={0.22} />
                    <Stop offset="1" stopColor={s.color} stopOpacity={0} />
                  </LinearGradient>
                ))}
              </Defs>

              {ticks.map((tick) => (
                <Line
                  key={tick}
                  x1={0}
                  x2={plotW}
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke={Colors.dark.chartGrid}
                  strokeWidth={1}
                />
              ))}
              <Line
                x1={x(HALF_TIME)}
                x2={x(HALF_TIME)}
                y1={0}
                y2={height}
                stroke={Colors.dark.hairlineStrong}
                strokeWidth={1}
                strokeDasharray="3 4"
              />

              <G clipPath={`url(#${rawId}clip)`}>
                {series.map((s, i) => {
                  const line = stepPath(s.goals, x, y, end);
                  const area = `${line} L${x(end)},${height} L${x(0)},${height} Z`;
                  return (
                    <G key={i}>
                      <Path d={area} fill={`url(#${rawId}fill${i})`} />
                      <Path
                        d={line}
                        stroke={s.color}
                        strokeWidth={MatchStats.flowStroke}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        fill="none"
                      />
                      {s.goals.map((g, j) => (
                        <Circle
                          key={j}
                          cx={x(g.x)}
                          cy={y(g.total)}
                          r={MatchStats.flowDot}
                          fill={s.color}
                          stroke={Colors.dark.sheetGround}
                          strokeWidth={1.5}
                        />
                      ))}
                    </G>
                  );
                })}
              </G>
            </Svg>
          ) : (
            <View style={{ height }} />
          )}
        </View>
      </View>

      {/* The minute axis: kick-off, the half-time rule, the end. */}
      <View style={[styles.xAxis, { marginLeft: MatchStats.flowGutter }]}>
        <Text variant="xiRailBadge" color="textFaint" tabular>
          0′
        </Text>
        <Text
          variant="xiRailBadge"
          color="textMuted"
          style={[styles.htLabel, { left: x(HALF_TIME) - 12 }]}>
          {halfTimeLabel}
        </Text>
        <Text variant="xiRailBadge" color="textFaint" tabular>
          {`${end}′`}
        </Text>
      </View>
    </View>
  );
}

/**
 * A step line from kick-off at 0 to the end of the match: flat, then straight
 * up at each goal's minute.
 *
 * ⚠ Two goals in one minute rise twice at the same x, which draws as one taller
 * riser — correct: the score did jump by two at that minute.
 */
function stepPath(
  goals: readonly FlowGoal[],
  x: (minute: number) => number,
  y: (goals: number) => number,
  end: number,
): string {
  let d = `M${x(0)},${y(0)}`;
  for (const g of goals) {
    d += ` H${x(g.x)} V${y(g.total)}`;
  }
  return `${d} H${x(end)}`;
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  row: { flexDirection: 'row' },
  gutter: { position: 'relative' },
  tick: { position: 'absolute', left: 0 },
  plot: { flex: 1, minWidth: 0 },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', position: 'relative' },
  htLabel: { position: 'absolute', width: 24, textAlign: 'center' },
});
