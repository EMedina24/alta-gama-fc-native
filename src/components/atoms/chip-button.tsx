/**
 * The follow chip, and filter chips.
 *
 * ⚠ 44pt minimum hit target even though the chip draws smaller — nothing
 * interactive goes below it (SPEC §2). `hitSlop` is what buys that without
 * changing the drawn size.
 *
 * ⚠ `shape="pill"` plus `trailing` is the Clubs screen's follow control
 * (ADR 0082): a fixed-height pill with the label, then the `+` in its own disc
 * flush with the pill's right inner padding. It is this chip rather than a
 * second component because the two differ in geometry alone — same accent
 * rules, same hit target, same pressed state — and a near-duplicate would drift.
 */
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from './text';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export interface ChipButtonProps {
  label: string;
  onPress: () => void;
  /** Selected/subscribed state — accent wash and ring. */
  active?: boolean;
  disabled?: boolean;
  /** `pill` is the fixed-height follow control; `control` is the default chip. */
  shape?: 'control' | 'pill';
  /**
   * Drawn after the label, inside the chip. ⚠ Decorative only — it shares the
   * chip's single press target and must never be a control of its own.
   */
  trailing?: ReactNode;
  /** Overrides the label for VoiceOver, which cannot read the trailing glyph. */
  accessibilityLabel?: string;
}

export function ChipButton({
  label,
  onPress,
  active = false,
  disabled = false,
  shape = 'control',
  trailing,
  accessibilityLabel,
}: ChipButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active, disabled }}
      hitSlop={10}
      style={({ pressed }) => [
        styles.chip,
        shape === 'pill' ? styles.pill : styles.control,
        active && styles.active,
        pressed && !disabled && (shape === 'pill' ? styles.pressedPill : styles.pressed),
        disabled && styles.disabled,
      ]}>
      <Text variant="eyebrowSm" color={active ? 'onAccent' : 'accent'}>
        {label}
      </Text>
      {trailing ? <View style={styles.disc}>{trailing}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.accentRing,
  },
  control: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.control,
  },
  pill: {
    height: Size.followPillH,
    // Asymmetric: the disc carries its own visual weight on the right, so the
    // label needs the padding and the disc does not.
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one + 1,
    gap: Spacing.two,
    borderRadius: Radius.pill,
  },
  disc: {
    width: Size.followPillDisc,
    height: Size.followPillDisc,
    borderRadius: Radius.pill,
    backgroundColor: Colors.dark.accentWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: { backgroundColor: Colors.dark.accent, borderColor: Colors.dark.accent },
  pressed: { opacity: 0.7 },
  /**
   * ⚠ The pill presses by SCALE, not opacity — it is the only control on a
   * 20-row list and a fade at that density reads as the row disabling itself.
   */
  pressedPill: { transform: [{ scale: 0.95 }] },
  disabled: { opacity: 0.4 },
});
