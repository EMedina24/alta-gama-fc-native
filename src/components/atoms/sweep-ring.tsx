/**
 * A ring that SWEEPS to its share (ADR 0204) — `RingGauge`'s look (track,
 * rounded arc from twelve o'clock, the Season stats "cutout 78%"), animated:
 * the arc draws on the caller's `progress`, the one clock the number in its
 * centre counts on, so the two land together.
 *
 * ⚠ Why an animated SVG prop here when `RingGauge` refuses one: that atom's
 * rule is about full-screen charts re-laying out a big sheet. This is a tile
 * ring — one `Circle`, three to a screen, animated for `SeasonStats.count` and
 * then still. `useAnimatedProps` keeps it on the UI thread.
 *
 * ⚠ At a zero length a ROUND cap still paints a dot at twelve o'clock, which
 * would read as "a little"; the arc's opacity is 0 until it has length.
 * Reduce Motion needs no branch (trap 63): the caller's `withTiming` is
 * skipped and the arc renders final.
 */
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { Colors } from '@/constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface SweepRingProps {
  size: number;
  thickness: number;
  /** 0–1: how much of the ring the arc takes at rest. */
  share: number;
  color: string;
  track?: string;
  progress: SharedValue<number>;
  /** Drawn in the ring's hole — the number and its total. */
  children?: ReactNode;
}

export function SweepRing({
  size,
  thickness,
  share,
  color,
  track = Colors.dark.chartTrack,
  progress,
  children,
}: SweepRingProps) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const centre = size / 2;
  const full = Math.max(0, Math.min(1, share)) * circumference;

  const arc = useAnimatedProps(() => {
    const length = full * progress.value;
    return {
      strokeDasharray: `${length} ${circumference}`,
      strokeOpacity: length > 0.5 ? 1 : 0,
    };
  });

  return (
    <View style={{ width: size, height: size }}>
      {/* ⚠ `-90°` on the whole drawing puts 0 at twelve o'clock (RingGauge's rule). */}
      <Svg width={size} height={size} accessible={false} style={styles.svg}>
        <Circle cx={centre} cy={centre} r={radius} stroke={track} strokeWidth={thickness} fill="none" />
        <AnimatedCircle
          cx={centre}
          cy={centre}
          r={radius}
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
          animatedProps={arc}
        />
      </Svg>
      {children ? <View style={styles.centre}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  svg: { position: 'absolute', top: 0, left: 0, transform: [{ rotate: '-90deg' }] },
  centre: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
