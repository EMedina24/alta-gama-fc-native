/**
 * A counted shortcut — a number, a label, and somewhere to go (SPEC §3.1 item 4).
 *
 * ⚠ Pure and prop-driven, like every molecule: it is told the number, it does
 * not know where the number came from (ADR 0013).
 *
 * ⚠ The number is `tabular`. Two tiles side by side with proportional digits sit
 * at visibly different widths as the counts change, and the pair reads as
 * misaligned rather than as two of the same thing.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Radius, Size, Spacing, Surfaces } from '@/constants/theme';

export interface StatTileProps {
  value: number;
  label: string;
  /** ⚠ Spoken instead of the two visible strings — "3" then "Clubs" reads as
   *  two unrelated fragments to a screen reader. */
  accessibilityLabel: string;
  onPress: () => void;
}

export function StatTile({ value, label, accessibilityLabel, onPress }: StatTileProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
      <View style={styles.body}>
        <Text variant="title3" tabular>
          {value}
        </Text>
        <Text variant="eyebrowSm" color="textFaint">
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // ⚠ `flex: 1` on both, so the pair splits the row evenly whatever the labels
  // are. Sizing to content would move the divide between them per language.
  tile: {
    flex: 1,
    minHeight: Size.minTouch,
    ...Surfaces.glass,
    borderRadius: Radius.tile,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  pressed: { opacity: 0.75 },
  body: { gap: Spacing.half },
});
