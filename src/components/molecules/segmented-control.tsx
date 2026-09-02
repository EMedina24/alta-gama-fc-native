/**
 * A generic segmented control — the track-and-segments pattern `EventTabs`
 * draws for match events, freed of its counts and its `EventGroup` typing so a
 * form can switch modes with it (ADR 0103: Entrar / Crear cuenta).
 *
 * ⚠ No animation, matching `EventTabs`: ADR 0045 rejected animating controls
 * like this for consistency, so the selection moves by re-render.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Colors, Radius, Spacing } from '@/constants/theme';

export interface SegmentedControlProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** The control's accessible name; each segment reports as a tab. */
  accessibilityLabel?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.track} accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            // ⚠ The segment paints shorter than the 44pt minimum; the target
            // grows instead of the paint, same trade as `EventTabs`.
            hitSlop={{ top: 8, bottom: 8 }}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentActive,
              pressed && !selected && styles.segmentPressed,
            ]}>
            <Text variant="callout" color={selected ? 'text' : 'textMuted'} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: Spacing.one,
    backgroundColor: Colors.dark.glassFill,
    borderRadius: Radius.chip,
    padding: Spacing.one,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.seg,
  },
  segmentActive: { backgroundColor: Colors.dark.raisedAlt },
  segmentPressed: { opacity: 0.6 },
});
