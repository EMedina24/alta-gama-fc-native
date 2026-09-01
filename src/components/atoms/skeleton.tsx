/**
 * A shimmering placeholder block for list and table loading states.
 *
 * ⚠ The only always-on animation in the app, so it is the one that has to
 * honour Reduce Motion: with it set the block sits at a steady mid opacity.
 * The design's motion budget is platform defaults plus the accent ring.
 */
import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Radius, Spacing } from '@/constants/theme';

/** The resting opacity under Reduce Motion — between the pulse's two ends. */
const STEADY = 0.6;

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
}

export function Skeleton({ width = '100%', height = 14, radius = Radius.chipSm }: SkeletonProps) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(reduceMotion ? STEADY : 0.4);

  useEffect(() => {
    if (reduceMotion) {
      pulse.value = STEADY;
      return;
    }
    pulse.value = withRepeat(withTiming(0.85, { duration: 900 }), -1, true);
  }, [pulse, reduceMotion]);

  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View style={[styles.block, { width, height, borderRadius: radius }, animated]} />
  );
}

/** Convenience: n stacked rows, for a list placeholder. */
export function SkeletonRows({ count = 6, height = 44 }: { count?: number; height?: number }) {
  return (
    <View style={styles.rows}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Glass, not `raised` (ADR 0087): the rows now pulse on the mesh and on
  // glass cards, where an opaque charcoal block reads as a hole.
  block: { backgroundColor: Colors.dark.glassFill },
  rows: { gap: Spacing.two },
});
