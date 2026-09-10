/**
 * A doughnut ring: one value against a total, or two segments against each
 * other (ADR 0142). The clean-sheet and failed-to-score rings, and the player's
 * penalty split.
 *
 * ⚠ Drawn as a stroked `<Circle>` with `strokeDasharray`, which is the same
 * shape `avatar.tsx`'s attention arc already uses — not a wedge `<Path>`. A
 * dasharray ring is one element per segment with no arc-flag arithmetic, and it
 * cannot draw the 359°-vs-1° wedge inversion that catches hand-rolled arcs.
 *
 * ⚠ **The sweep is animated by ROTATING the wrapper, not by animating
 * `strokeDashoffset`.** Same call `avatar.tsx` makes: a transform runs on the
 * UI thread without touching the SVG tree, where an animated SVG prop re-lays
 * the sheet out every frame. The caller wraps this in its own `Animated.View`.
 *
 * ⚠ No gradient here on purpose, so none of trap 40/42/65 applies: a ring is a
 * flat stroke. If one ever needs a gradient it goes through `WashGradient`, and
 * the `overflow: 'hidden'` + measured-box rules come with it.
 */
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Colors } from '@/constants/theme';

export interface RingSegment {
  /** A share of the whole ring, 0–1. Segments are drawn in order. */
  share: number;
  color: string;
}

export interface RingGaugeProps {
  size: number;
  /** Ring thickness. The design's "cutout 78%" is `size * (1 - 0.78) / 2`. */
  thickness: number;
  segments: readonly RingSegment[];
  /** The unfilled remainder. */
  track?: string;
  /** Rounded segment ends — the design's `borderRadius: 6` rings. */
  rounded?: boolean;
  children?: React.ReactNode;
}

export function RingGauge({
  size,
  thickness,
  segments,
  track = Colors.dark.chartTrack,
  rounded = false,
  children,
}: RingGaugeProps) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const centre = size / 2;

  /**
   * Each segment's start, as a length already consumed by the ones before it.
   *
   * ⚠ Computed up front rather than accumulated inside `map`: a `let` reassigned
   * while rendering is exactly what the React Compiler's immutability rule
   * rejects, and it would be a real bug the moment the list rendered twice.
   * Negative offsets because SVG advances the dash pattern anticlockwise from
   * the start point.
   */
  const clamped = segments.map((s) => Math.max(0, Math.min(1, s.share)) * circumference);
  const starts = clamped.reduce<number[]>(
    (acc, length, index) => [...acc, (acc[index - 1] ?? 0) + (clamped[index - 1] ?? 0)],
    [],
  );

  return (
    <View style={{ width: size, height: size }}>
      {/* ⚠ `-90°` puts 0 at twelve o'clock. Without it every ring starts at
          three o'clock, which reads as a ring drawn wrong rather than a ring
          drawn from a different origin. */}
      <Svg width={size} height={size} accessible={false} style={styles.svg}>
        <Circle
          cx={centre}
          cy={centre}
          r={radius}
          stroke={track}
          strokeWidth={thickness}
          fill="none"
        />
        {segments.map((segment, index) => {
          const length = clamped[index];
          const offset = -starts[index];
          if (length <= 0) return null;
          return (
            <Circle
              key={index}
              cx={centre}
              cy={centre}
              r={radius}
              stroke={segment.color}
              strokeWidth={thickness}
              strokeLinecap={rounded ? 'round' : 'butt'}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={offset}
              fill="none"
              transform={`rotate(-90 ${centre} ${centre})`}
            />
          );
        })}
      </Svg>
      {children ? <View style={styles.centre}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  svg: { position: 'absolute', top: 0, left: 0 },
  centre: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
