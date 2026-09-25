/**
 * A season or counted number, as a tile — the Medina kit's `StatTile` (ADR
 * 0202): the label on top as an eyebrow, the value below in Saira. Today's
 * counters (SPEC §3.1 item 4) and the club page's SEASON SO FAR share it.
 *
 * ⚠ Pure and prop-driven, like every molecule: it is told the number, it does
 * not know where the number came from (ADR 0013).
 *
 * ⚠ The number is `tabular` (the `statLg` token carries it). Tiles side by side
 * with proportional digits sit at visibly different widths as the counts
 * change, and the row reads as misaligned rather than as a set.
 *
 * ⚠ `onPress` is optional: a counter is a shortcut, a season figure is not —
 * and a tile that looks pressable but does nothing is worse than a plain one,
 * so an inert tile is a `View`, not a disabled `Pressable`.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export interface StatTileProps {
  value: number | string;
  label: string;
  /** ⚠ Spoken instead of the two visible strings — "3" then "Clubs" reads as
   *  two unrelated fragments to a screen reader. */
  accessibilityLabel: string;
  onPress?: () => void;
}

export function StatTile({ value, label, accessibilityLabel, onPress }: StatTileProps) {
  const body = (
    <View style={styles.body}>
      {/* ⚠ Two lines, not an ellipsis: "CLEAN SHEETS" / "PORTERÍAS A CERO" in a
          third-width tile truncated to "CLEAN SHE…" on the simulator. The
          body spreads, so every value in a row still sits on one baseline. */}
      <Text variant="eyebrowSm" color="textMuted" numberOfLines={2}>
        {label}
      </Text>
      <Text variant="statLg" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
  if (!onPress) {
    return (
      <View style={styles.tile} accessible accessibilityLabel={accessibilityLabel}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // ⚠ `flex: 1` on every tile, so a row splits evenly whatever the labels are.
  // Sizing to content would move the divides per language.
  tile: {
    flex: 1,
    minHeight: Size.minTouch,
    backgroundColor: Colors.dark.card,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.hairlineMid,
    borderRadius: Radius.tile,
    paddingHorizontal: Spacing.three + 2,
    paddingVertical: Spacing.three + 2,
  },
  pressed: { opacity: 0.75 },
  body: { flex: 1, gap: Spacing.two, justifyContent: 'space-between' },
});
