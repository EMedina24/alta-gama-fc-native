/**
 * A sheet's ✕ — the Medina kit's 40pt quiet circle (ADR 0214, the Starting XI
 * sheets). Swipe-down is an invisible affordance, and on a small phone the
 * sheet's last button can sit below the fold, so every one of these sheets
 * carries a visible way out in its head.
 *
 * ⚠ A glyph is not a name: `accessibilityLabel` is required.
 */
import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/atoms';
import { Colors, Radius, Size, Spacing, Xi } from '@/constants/theme';

export interface SheetCloseProps {
  onPress: () => void;
  accessibilityLabel: string;
}

const SIZE = Xi.sheetClose;

export function SheetClose({ onPress, accessibilityLabel }: SheetCloseProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={(Size.minTouch - SIZE) / 2 + Spacing.one}
      style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
      <Text variant="bodyStrong" color="textSecondary">
        ✕
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  close: {
    width: SIZE,
    height: SIZE,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.xiControl,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.hairlineStrong,
  },
  pressed: { backgroundColor: Colors.dark.raisedAlt },
});
