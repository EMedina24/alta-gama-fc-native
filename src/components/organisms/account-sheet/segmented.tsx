/**
 * The account sheet's two-option preference control — language and clock
 * (ADR 0081). The selection is a thumb that SLIDES rather than a background
 * that repaints.
 *
 * ⚠ This does not reopen ADR 0045's "no animation" call on `event-tabs`, and
 * that control is deliberately left alone. The events panel's tabs are a dense
 * four-up inside an already-nested expansion, where a moving thumb competes
 * with the timeline under it; this is a two-up in a settings row, where the
 * slide IS the feedback that a preference took.
 *
 * ⚠ Options are a FIXED `Size.segOption` wide, never `flex: 1`. See that
 * token's warning: a flexible track eats the whole row and pushes the row's
 * own label off it. The fixed width is also what lets the thumb's position be
 * arithmetic — nothing is measured, so it is right on the first frame rather
 * than sliding in from the left every time the sheet opens.
 */
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/atoms';
import { Colors, Motion, Radius, Size, Spacing } from '@/constants/theme';

export interface SegmentedProps<T extends string> {
  options: readonly { key: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}

/** The track's inset. The thumb sits inside it on all four sides. */
const PAD = 2;

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  const reduceMotion = useReducedMotion();
  const index = Math.max(
    0,
    options.findIndex((option) => option.key === value),
  );

  /** Whether the thumb has been placed once. The first placement is assigned. */
  const placed = useRef(false);
  const x = useSharedValue(index * Size.segOption);

  useEffect(() => {
    const target = index * Size.segOption;
    if (!placed.current || reduceMotion) {
      x.value = target;
      placed.current = true;
      return;
    }
    x.value = withTiming(target, { duration: Motion.quick });
  }, [index, reduceMotion, x]);

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={styles.track}>
      <Animated.View pointerEvents="none" style={[styles.thumb, thumbStyle]} />
      {options.map((option) => (
        <Pressable
          key={option.key}
          onPress={() => onChange(option.key)}
          accessibilityRole="radio"
          accessibilityState={{ selected: option.key === value }}
          accessibilityLabel={option.label}
          hitSlop={{ top: Spacing.two, bottom: Spacing.two }}
          style={styles.segment}>
          <Text
            variant="callout"
            color={option.key === value ? 'onAccent' : 'textSecondary'}
            tabular>
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    // ⚠ Never grows. The row's label owns the space this does not take.
    flexShrink: 0,
    alignSelf: 'center',
    backgroundColor: Colors.dark.raisedAlt,
    borderRadius: Radius.seg,
    padding: PAD,
  },
  thumb: {
    position: 'absolute',
    left: PAD,
    top: PAD,
    bottom: PAD,
    width: Size.segOption,
    borderRadius: Radius.chipSm,
    backgroundColor: Colors.dark.accent,
  },
  segment: {
    width: Size.segOption,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
  },
});
