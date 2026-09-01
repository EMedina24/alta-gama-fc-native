/**
 * The Starting XI entry on the club page (ADR 0065). Ported from
 * `handoff_squad-builder/ClubStartingXIRow.tsx`.
 *
 * Sits BETWEEN the subscribe block and the Fixtures / Players segmented
 * control — a club action, not a squad detail — and must not push the season
 * spine below the fold.
 *
 * ⚠ Needs a published squad. When there is none the row STAYS and goes inert
 * with the `squadEmpty` copy — a removed row reads as a missing feature, an
 * explained one reads as missing data. The caller decides `enabled` off the
 * squad itself (`players.length > 0`), NOT off the league: the backend serves
 * squads for LaLiga and the Premier League, and the handoff's "LaLiga only"
 * was stale when it was written.
 *
 * ⚠ Wrapped in the double-bezel `Tray` since ADR 0091 — the club page's rows
 * are all trays now, and this one sits directly under the alerts tray.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Chevron, PitchGlyph, Text } from '@/components/atoms';
import { Tray } from './tray';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export interface StartingXiRowProps {
  enabled: boolean;
  title: string;
  /** The promise when enabled, the `squadEmpty` explanation when not. */
  body: string;
  onPress: () => void;
}

export function StartingXiRow({ enabled, title, body, onPress }: StartingXiRowProps) {
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
          <PitchGlyph size={Size.xiRowGlyph} color={enabled ? 'accent' : 'textFaint'} />
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
  // The ground and radius are the Tray inner's now (ADR 0091).
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
