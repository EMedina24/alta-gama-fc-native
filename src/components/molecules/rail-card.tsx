/**
 * One squad player on the rail under the pitch (ADR 0065): his portrait (or
 * shirt tile) and a short name. Tapping places him — in the selected slot, or
 * the first empty slot of his line.
 *
 * ⚠ A null shirt shows initials in the tile, never `0` or `—`. The tile is
 * `raised` on a `card` ground with the number in accent — the same recipe
 * as the toolbar's icon tiles, so the rail and the toolbar read as one strip.
 *
 * ⚠ With a `photo` (ADR 0072) the tile is the portrait and the number drops
 * to a small lime badge on its corner — the same shape as the pitch token, so
 * the rail and the pitch read as one squad. A failed portrait falls back to
 * the number tile.
 */
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Colors, Radius, Size, Spacing, Type } from '@/constants/theme';

export interface RailCardProps {
  /** Shirt number, or initials for a null shirt. */
  tile: string;
  name: string;
  photo?: string | null;
  onPress: () => void;
  accessibilityLabel: string;
}

export function RailCard({ tile, name, photo = null, onPress, accessibilityLabel }: RailCardProps) {
  const [failed, setFailed] = useState(false);
  const pictured = !!photo && !failed;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.tileBox}>
        <View style={[styles.tile, pictured && styles.tilePictured]}>
          {pictured ? (
            <Image
              source={{ uri: photo }}
              style={styles.photo}
              contentFit="cover"
              contentPosition="top center"
              transition={0}
              cachePolicy="memory-disk"
              onError={() => setFailed(true)}
              accessible={false}
            />
          ) : (
            <Text
              variant="callout"
              color="accent"
              tabular
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}>
              {tile}
            </Text>
          )}
        </View>
        {pictured ? (
          <View style={styles.badge}>
            <Text
              variant="micro"
              color="onAccent"
              tabular
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              style={styles.badgeText}>
              {tile}
            </Text>
          </View>
        ) : null}
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
  /** The tile's footprint without clipping, so the badge can sit on its corner. */
  tileBox: { width: Size.xiRailNum, height: Size.xiRailNum },
  tile: {
    width: Size.xiRailNum,
    height: Size.xiRailNum,
    borderRadius: Size.xiRailNum / 2,
    backgroundColor: Colors.dark.raised,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tilePictured: { backgroundColor: Colors.dark.raisedAlt },
  photo: { width: Size.xiRailNum, height: Size.xiRailNum },
  badge: {
    position: 'absolute',
    right: -Spacing.half,
    bottom: -Spacing.half,
    width: Size.xiRailBadge,
    height: Size.xiRailBadge,
    borderRadius: Size.xiRailBadge / 2,
    backgroundColor: Colors.dark.accent,
    borderWidth: 1,
    borderColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: Type.xiRailBadge.fontSize, fontWeight: Type.xiRailBadge.fontWeight },
  name: { maxWidth: Size.xiCaption, textAlign: 'center', fontWeight: '600' },
});
