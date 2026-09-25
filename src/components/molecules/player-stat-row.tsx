/**
 * One key player on the club page (ADR 0202) — the Medina kit's `PlayerRow`:
 * the shirt number in a disc, the name over the position, and ONE season
 * figure on the right in Saira with what it counts under it.
 *
 * ⚠ Presentational (ADR 0013): the caller has already picked the player and
 * the figure (`features/club/key-players`).
 *
 * ⚠ A null shirt draws an empty disc rather than `0` or `–` — a Premier League
 * row the squad could not be joined to has no number, and inventing one
 * would be a claim.
 *
 * ⚠ One VoiceOver stop per row: "R. Lewandowski, Forward, 21 goals".
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export interface PlayerStatRowProps {
  shirt: number | null;
  name: string;
  /** The position, already localised. Null draws no second line. */
  meta: string | null;
  value: number;
  /** What `value` counts — `GOALS`, `ASSISTS`. */
  label: string;
  /** Draws the hairline under the row; the group's last row passes false. */
  divider?: boolean;
  onPress?: () => void;
}

export function PlayerStatRow({ shirt, name, meta, value, label, divider = true, onPress }: PlayerStatRowProps) {
  const spoken = [name, meta, `${value} ${label.toLowerCase()}`].filter(Boolean).join(', ');
  const body = (
    <>
      <View style={styles.disc}>
        {shirt !== null ? (
          <Text variant="tablePos" color="textSecondary">
            {shirt}
          </Text>
        ) : null}
      </View>
      <View style={styles.words}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {name}
        </Text>
        {meta ? (
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      <View style={styles.figure}>
        <Text variant="statSm">{value}</Text>
        <Text variant="eyebrowSm" color="textMuted">
          {label}
        </Text>
      </View>
    </>
  );
  const style = [styles.row, divider && styles.divider];
  return onPress ? (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={spoken}
      style={({ pressed }) => [...style, pressed && styles.pressed]}>
      {body}
    </Pressable>
  ) : (
    <View style={style} accessible accessibilityLabel={spoken}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three + 2,
  },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.dark.hairlineMid },
  pressed: { backgroundColor: Colors.dark.rowActive },
  disc: {
    width: Size.shirtDisc,
    height: Size.shirtDisc,
    borderRadius: Radius.pill,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.glassLine,
    backgroundColor: Colors.dark.glassFillDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ⚠ The only elastic column (trap 56): the disc and the figure are intrinsic.
  words: { flex: 1, minWidth: 0, gap: Spacing.half },
  figure: { alignItems: 'flex-end', gap: Spacing.half },
});
