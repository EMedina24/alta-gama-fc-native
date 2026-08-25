/** A shimmering placeholder block for list and table loading states. */
import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Radius, Spacing } from '@/constants/theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
}

export function Skeleton({ width = '100%', height = 14, radius = Radius.chipSm }: SkeletonProps) {
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(0.85, { duration: 900 }), -1, true);
  }, [pulse]);

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
  block: { backgroundColor: Colors.dark.raised },
  rows: { gap: Spacing.two },
});
