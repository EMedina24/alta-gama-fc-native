/**
 * A horizontal strip of `SceneTile`s that OPENS on the current pick (ADR 0199;
 * lifted out of the Board's edit panel in ADR 0208 so Settings' Appearance
 * group draws the very same strip).
 *
 * ⚠ The opening offset is read at MOUNT only, which is the point: a club chosen
 * from the full sheet can sit several tiles in, and a selection scrolled out of
 * sight is one the reader cannot see — but a tap mid-strip must not yank the
 * strip back under their finger.
 *
 * ⚠ `bleed` is the gutter the strip scrolls out to. The edit panel bleeds to
 * its panel's inner edge; a Settings group to its own rounded edge. Either way
 * a tile scrolls off an EDGE, not off a margin, so the row reads as a strip.
 */
import { ScrollView, StyleSheet } from 'react-native';

import { SceneTile, type SceneTileProps } from './scene-tile';
import { BoardEdit, Spacing } from '@/constants/theme';

export interface SceneTileStripItem extends SceneTileProps {
  key: string;
}

export interface SceneTileStripProps {
  tiles: readonly SceneTileStripItem[];
  /** How far the strip extends past its parent's padding, each side. */
  bleed?: number;
  /** The first tile's inset from the strip's own edge. */
  inset?: number;
}

export function SceneTileStrip({ tiles, bleed = 0, inset = Spacing.four }: SceneTileStripProps) {
  const picked = Math.max(0, tiles.findIndex((tile) => tile.selected));
  const pitch = BoardEdit.tileW + Spacing.three + Spacing.two;
  const openAt = Math.max(0, picked * pitch - Spacing.seven);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentOffset={{ x: openAt, y: 0 }}
      style={bleed ? { marginHorizontal: -bleed } : undefined}
      contentContainerStyle={[styles.tiles, { paddingHorizontal: inset }]}>
      {tiles.map(({ key, ...tile }) => (
        <SceneTile key={key} {...tile} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tiles: { gap: Spacing.two },
});
