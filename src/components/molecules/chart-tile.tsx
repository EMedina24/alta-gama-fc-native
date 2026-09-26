/**
 * A season figure as a tile (ADR 0203/0204): the label on top, the figure's
 * graphic in the middle (a sweeping ring with the number in its hole), and a
 * caption that puts it in proportion at the foot ("2.1 per match").
 *
 * ⚠ Presentational (ADR 0013). The caller builds the graphic on its own clock,
 * so every tile in a row moves as one gesture.
 *
 * ⚠ The row stretches its tiles to one height and the body SPREADS, so the
 * rings and captions of a row sit on one line even when one label wraps to
 * two ("PORTERÍAS A CERO").
 *
 * ⚠ One VoiceOver stop, spoken by the caller's `accessibilityLabel`.
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export interface ChartTileProps {
  label: string;
  /** The graphic, centred — the ring with its number. */
  children: ReactNode;
  caption: string | null;
  accessibilityLabel: string;
  onPress?: () => void;
}

export function ChartTile({ label, children, caption, accessibilityLabel, onPress }: ChartTileProps) {
  const body = (
    <View style={styles.body}>
      <Text variant="eyebrowSm" color="textMuted" numberOfLines={2}>
        {label}
      </Text>
      <View style={styles.graphic}>{children}</View>
      {/* ⚠ Shrinks to fit rather than truncating: "43% de partidos" is a hair
          wider than a third-width tile (sim, ES). The tile's box bounds the
          shrink — trap 77: Fabric's floor is 4pt, so the box is the limit. */}
      {caption ? (
        <Text variant="micro" color="textSecondary" numberOfLines={1} adjustsFontSizeToFit center>
          {caption}
        </Text>
      ) : null}
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
  tile: {
    flex: 1,
    backgroundColor: Colors.dark.card,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.hairlineMid,
    borderRadius: Radius.tile,
    padding: Spacing.three,
  },
  pressed: { opacity: 0.75 },
  body: { flex: 1, gap: Spacing.three, justifyContent: 'space-between' },
  graphic: { alignItems: 'center' },
});
