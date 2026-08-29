/**
 * One squad player on the rail under the pitch (ADR 0065): shirt tile and a
 * short name. Tapping places him — in the selected slot, or the first empty
 * slot of his line.
 *
 * ⚠ A null shirt shows initials in the tile, never `0` or `—`. The tile is
 * `raised` on a `card` ground with the number in accent — the same recipe
 * as the toolbar's icon tiles, so the rail and the toolbar read as one strip.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export interface RailCardProps {
  /** Shirt number, or initials for a null shirt. */
  tile: string;
  name: string;
  onPress: () => void;
  accessibilityLabel: string;
}

export function RailCard({ tile, name, onPress, accessibilityLabel }: RailCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.tile}>
        <Text
          variant="callout"
          color="accent"
          tabular
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}>
          {tile}
        </Text>
      </View>
      <Text variant="micro" numberOfLines={1} style={styles.name}>
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: Size.xiRailCard,
    paddingTop: Spacing.two + Spacing.half,
    paddingBottom: Spacing.two,
    paddingHorizontal: Spacing.one + Spacing.half,
    borderRadius: Radius.tile - 2,
    backgroundColor: Colors.dark.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.hairlineMid,
    alignItems: 'center',
    gap: Spacing.one + Spacing.half,
  },
  pressed: { backgroundColor: Colors.dark.rowActive },
  tile: {
    width: Size.xiRailNum,
    height: Size.xiRailNum,
    borderRadius: Size.xiRailNum / 2,
    backgroundColor: Colors.dark.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { maxWidth: Size.xiCaption, textAlign: 'center', fontWeight: '600' },
});
