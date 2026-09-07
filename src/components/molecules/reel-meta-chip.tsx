/**
 * `PUBLISHER · 3h` — the glass pill at a reel card's top (ADR 0129).
 *
 * ⚠ A FLAT translucent fill, never GlassView/BlurView: the chip sits over a
 * PHOTO, and anything layered behind liquid glass shows through it (trap 59).
 * The dc mock's `backdrop-filter: blur(14px)` is the recorded deviation — the
 * handoff's own RN reference made the same call.
 *
 * ⚠ Publisher on every card. Attribution is what makes an aggregator
 * defensible; it is not decoration to drop on a photo-first layout.
 */
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Colors, Size, Spacing } from '@/constants/theme';

export interface ReelMetaChipProps {
  publisher: string;
  /** Already derived — `3h`. */
  age: string;
}

export function ReelMetaChip({ publisher, age }: ReelMetaChipProps) {
  return (
    <View style={styles.chip}>
      <Text variant="eyebrowSm" numberOfLines={1} style={styles.publisher}>
        {publisher}
      </Text>
      <View style={styles.dot} />
      <Text variant="reelMeta" color="reelAgeInk">
        {age}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: Size.reelMetaChip,
    paddingHorizontal: Spacing.three,
    borderRadius: Size.reelMetaChip / 2,
    backgroundColor: Colors.dark.reelGlass,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.reelGlassLine,
    alignSelf: 'flex-start',
  },
  publisher: { flexShrink: 1, minWidth: 0 },
  /** The separator is artwork, like a glyph's internals — 3pt by the dc mock. */
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.dark.reelMetaDot },
});
