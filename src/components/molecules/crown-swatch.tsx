/**
 * A crown theme in miniature (ADR 0175) — the small rounded rect the Board's
 * background picker uses to show what a choice paints. The OPAQUE head of the
 * ramp only: the real crown's tail fades into the page, and a chip that is
 * half transparent reads as a rendering fault at this size, so the stops are
 * renormalised to the opaque span and drawn at full opacity.
 */
import { StyleSheet, View } from 'react-native';

import { WashGradient } from '@/components/atoms';
import { BoardBg, Colors, Radius, Size } from '@/constants/theme';
import type { CrownStop } from '@/lib/cronogol/league-theme';

export interface CrownSwatchProps {
  /** A `CrownTheme`'s stops — brand or deep, either renders honestly. */
  stops: readonly CrownStop[];
  width?: number;
  height?: number;
}

export function CrownSwatch({
  stops,
  width = BoardBg.swatchW,
  height = BoardBg.swatchH,
}: CrownSwatchProps) {
  /**
   * The stops through the LAST fully-opaque one, offsets rescaled to [0, 1].
   * Every ramp in the app opens opaque (`CrownGrad` and `CrownDeep` both hold
   * opacity 1 through their first three stops), so `span` is never 0 — but a
   * degenerate input still draws its first colour rather than throwing.
   */
  let lastOpaque = 0;
  stops.forEach((stop, i) => {
    if (stop.opacity === 1) lastOpaque = i;
  });
  const span = stops[lastOpaque].offset;
  const opaque = stops.slice(0, lastOpaque + 1).map((stop) => ({
    offset: span > 0 ? stop.offset / span : 0,
    color: stop.color,
  }));

  return (
    <View style={[styles.frame, { width, height }]} pointerEvents="none">
      <WashGradient stops={opaque} angle="vertical" />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    // `WashGradient`'s parent contract: relative, and clipped or the fill
    // squares the corners off.
    position: 'relative',
    overflow: 'hidden',
    borderRadius: Radius.chipSm,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.glassLine,
  },
});
