/**
 * One key player on the club page (ADR 0202) — the Medina kit's `PlayerRow`:
 * the player's PORTRAIT with the shirt number badged on its corner (ADR 0205,
 * Ed: *"these should have player pictures"*), the name over the position, and
 * ONE season figure on the right in Saira with what it counts under it.
 *
 * ⚠ Presentational (ADR 0013): the caller has already picked the player and
 * the figure (`features/club/key-players`).
 *
 * ⚠ A null photo draws `PlayerPhoto`'s silhouette — part of the design, not a
 * failure (one in two Premier League players has none). A null shirt draws
 * NO badge rather than `0` or `–`: inventing a number would be a claim.
 *
 * ⚠ One VoiceOver stop per row: "R. Lewandowski, Forward, 21 goals".
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { PlayerPhoto, Text } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export interface PlayerStatRowProps {
  photo: string | null;
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

export function PlayerStatRow({ photo, shirt, name, meta, value, label, divider = true, onPress }: PlayerStatRowProps) {
  const spoken = [name, meta, `${value} ${label.toLowerCase()}`].filter(Boolean).join(', ');
  const body = (
    <>
      <View>
        <PlayerPhoto src={photo} variant="key" />
        {shirt !== null ? (
          <View style={styles.badge}>
            <Text variant="xiBadge" tabular color="text">
              {shirt}
            </Text>
          </View>
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
  // The shirt number, badged on the portrait's corner — the XI tokens' idiom
  // (ADR 0072). Ringed in the card's own ground so it reads as cut out of it.
  badge: {
    position: 'absolute',
    right: -Spacing.one,
    bottom: -Spacing.one,
    minWidth: Size.xiBadge,
    height: Size.xiBadge,
    paddingHorizontal: Spacing.one,
    borderRadius: Radius.pill,
    backgroundColor: Colors.dark.raised,
    borderWidth: Size.glassBorder * 3,
    borderColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ⚠ The only elastic column (trap 56): the disc and the figure are intrinsic.
  words: { flex: 1, minWidth: 0, gap: Spacing.half },
  figure: { alignItems: 'flex-end', gap: Spacing.half },
});
