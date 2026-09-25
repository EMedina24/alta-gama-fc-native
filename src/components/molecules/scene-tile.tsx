/**
 * One Board background, as a tiny phone (ADR 0199) — the Medina kit's scene
 * tile for the edit panel: the pick's crown ramp over the page ground, its mark
 * as a watermark, and the name underneath.
 *
 * ⚠ Presentational (ADR 0013): the caller builds the ramp and the mark node —
 * the league marks live with the screen scaffold, a TEMPLATE, which a molecule
 * may not import.
 *
 * ⚠ The whole tile is ONE press target and ONE VoiceOver stop, `selected` when
 * it is the current pick. The label under it is part of the target, not a
 * second control.
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text, WashGradient } from '@/components/atoms';
import { BoardEdit, Colors, Size, Spacing } from '@/constants/theme';
import type { CrownStop } from '@/lib/cronogol/league-theme';

export interface SceneTileProps {
  label: string;
  /** The crown ramp to draw. Omitted for a tile that is not a pick ("More"). */
  stops?: readonly CrownStop[];
  /** The watermark, already sized — the club crest or the league's mark. */
  mark?: ReactNode;
  /** Which edge the mark bleeds off: clubs sit left, leagues right (the kit's). */
  markSide?: 'left' | 'right';
  /** Drawn centred on the tile instead of a scene — the "More" tile's glyph. */
  icon?: ReactNode;
  selected?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}

export function SceneTile({
  label,
  stops,
  mark,
  markSide = 'left',
  icon,
  selected = false,
  onPress,
  accessibilityLabel,
}: SceneTileProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
      <View style={[styles.frame, selected && styles.frameOn]}>
        {stops ? (
          <View style={styles.crown}>
            <WashGradient stops={stops} angle="vertical" />
          </View>
        ) : null}
        {mark ? (
          <View pointerEvents="none" style={[styles.mark, markSide === 'left' ? styles.markLeft : styles.markRight]}>
            {mark}
          </View>
        ) : null}
        {icon ? <View style={styles.icon}>{icon}</View> : null}
      </View>
      <Text
        variant="micro"
        color={selected ? 'text' : 'textSecondary'}
        numberOfLines={1}
        style={[styles.label, selected && styles.labelOn]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', gap: Spacing.two - 2, width: BoardEdit.tileW + Spacing.three },
  pressed: { opacity: 0.7 },
  frame: {
    width: BoardEdit.tileW,
    height: BoardEdit.tileH,
    borderRadius: BoardEdit.tileRadius,
    overflow: 'hidden',
    backgroundColor: Colors.dark.background,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.hairlineStrong,
  },
  frameOn: { borderWidth: BoardEdit.tileRing, borderColor: Colors.dark.text },
  // `WashGradient`'s parent contract: positioned and clipped (the frame clips).
  crown: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: BoardEdit.tileH * BoardEdit.tileCrown,
  },
  mark: { position: 'absolute', top: Spacing.two },
  markLeft: { left: -Spacing.three },
  markRight: { right: -Spacing.four },
  icon: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  label: { maxWidth: BoardEdit.tileW + Spacing.three, textAlign: 'center' },
  // ⚠ Weight, not colour alone, marks the pick — the kit's 700 against 500.
  labelOn: { fontWeight: '700' },
});
