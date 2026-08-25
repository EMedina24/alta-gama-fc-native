/**
 * The `+ FOLLOW` chip, and filter chips.
 *
 * ⚠ 44pt minimum hit target even though the chip draws smaller — nothing
 * interactive goes below it (SPEC §2). `hitSlop` is what buys that without
 * changing the drawn size.
 */
import { Pressable, StyleSheet } from 'react-native';

import { Text } from './text';
import { Colors, Radius, Spacing } from '@/constants/theme';

export interface ChipButtonProps {
  label: string;
  onPress: () => void;
  /** Selected/subscribed state — accent wash and ring. */
  active?: boolean;
  disabled?: boolean;
}

export function ChipButton({ label, onPress, active = false, disabled = false }: ChipButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      hitSlop={10}
      style={({ pressed }) => [
        styles.chip,
        active && styles.active,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Text variant="eyebrowSm" color={active ? 'onAccent' : 'accent'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.accentRing,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: { backgroundColor: Colors.dark.accent, borderColor: Colors.dark.accent },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
});
