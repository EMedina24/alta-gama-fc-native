/**
 * A club-page action row: a tile glyph, a title, an explaining line, a chevron
 * (ADR 0141).
 *
 * ⚠ **This was `StartingXiRow`, generalised when Season stats landed directly
 * under it** (ADR 0065 → 0141). Two adjacent rows that differ by two points of
 * tile size read as a bug rather than as two features, and a copy would have
 * drifted the moment either was touched — so there is one row and it takes its
 * glyph as a prop. `starting-xi-row.tsx` is now a thin wrapper over this and
 * exists only so the older call site keeps its name.
 *
 * ⚠ **`enabled: false` keeps the row and goes inert with an explaining body,
 * never removes it.** A removed row reads as a missing feature; an explained
 * one reads as missing data. The caller decides `enabled` off the DATA it
 * needs — the squad for Starting XI, a usable stats block for Season stats —
 * and never off the league, because coverage varies inside a league and the
 * handoffs' "LaLiga only" notes have both been stale before.
 *
 * ⚠ Press feedback is the row idiom (a ground change), not a transform. The
 * mocks for both rows ask for a scale; ADR 0117 rejected press-scale on the
 * league rail and nothing in this app animates a press.
 */
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Chevron, Text } from '@/components/atoms';
import { Tray } from './tray';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export interface ActionRowProps {
  enabled: boolean;
  title: string;
  /** The promise when enabled, the explanation when not. */
  body: string;
  /**
   * The tile's mark. A render prop rather than a glyph name so this molecule
   * keeps no register of atoms — the caller already imports the one it wants.
   */
  glyph: (color: 'accent' | 'textFaint', size: number) => ReactNode;
  onPress: () => void;
}

export function ActionRow({ enabled, title, body, glyph, onPress }: ActionRowProps) {
  return (
    <Tray>
      <Pressable
        disabled={!enabled}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={body}
        accessibilityState={{ disabled: !enabled }}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={[styles.tile, enabled ? styles.tileOn : styles.tileOff]}>
          {glyph(enabled ? 'accent' : 'textFaint', Size.xiRowGlyph)}
        </View>
        <View style={styles.text}>
          <Text variant="bodyStrong" color={enabled ? 'text' : 'textMuted'}>
            {title}
          </Text>
          <Text variant="caption" color="textMuted" style={styles.body}>
            {body}
          </Text>
        </View>
        <Chevron direction="right" color={enabled ? 'accent' : 'textFaint'} />
      </Pressable>
    </Tray>
  );
}

const styles = StyleSheet.create({
  // The ground and radius are the Tray inner's (ADR 0091).
  card: {
    paddingVertical: Spacing.four - 2,
    paddingHorizontal: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  pressed: { backgroundColor: Colors.dark.rowActive },
  tile: {
    width: Size.xiRowTile,
    height: Size.xiRowTile,
    borderRadius: Radius.thumb,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileOn: { backgroundColor: Colors.dark.accentWash },
  tileOff: { backgroundColor: Colors.dark.raised },
  text: { flex: 1, minWidth: 0 },
  body: { marginTop: Spacing.one, fontWeight: '400' },
});
