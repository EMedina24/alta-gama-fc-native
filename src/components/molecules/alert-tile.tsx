/**
 * An alert type's glyph on its tinted tile — the onboarding primer's device
 * (ADR 0076), promoted to a molecule when the account sheet's rows wanted it
 * too (ADR 0081). Two consumers is what makes it shared rather than private.
 *
 * ⚠ The tones are NOT decoration. `moved` and `postponed` are the hues those
 * two alert types already own in `theme.ts`, and they are the same ones the
 * lock-screen eyebrow uses — so the tile a reader taps to turn an alert on is
 * the colour of the notification it turns on. The other two types have no
 * designed hue, and `neutral` is the honest answer rather than an invented one.
 *
 * ⚠ Which is also why `reminder` is neutral HERE but `accent` on the primer:
 * the primer is a screen whose one lime thing is its CTA, and its three rows
 * are all lime because none of them is a control. The account sheet's rows are
 * controls, so lime is spent on the switch that is on (SPEC §2).
 */
import { StyleSheet, View } from 'react-native';

import { AlertGlyph, type AlertKind } from '@/components/atoms';
import { Colors, Radius, Size, type ThemeColor } from '@/constants/theme';

export type AlertTileTone = 'neutral' | 'accent' | 'moved' | 'postponed';

export interface AlertTileProps {
  kind: AlertKind;
  tone?: AlertTileTone;
}

const INK: Record<AlertTileTone, ThemeColor> = {
  neutral: 'textSecondary',
  accent: 'accent',
  moved: 'moved',
  postponed: 'postponed',
};

export function AlertTile({ kind, tone = 'accent' }: AlertTileProps) {
  return (
    <View style={[styles.tile, styles[tone]]}>
      <AlertGlyph kind={kind} color={INK[tone]} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: Size.alertGlyphTile,
    height: Size.alertGlyphTile,
    // ⚠ `Radius.seg + 1` is the primer's own value, carried over verbatim so the
    // two surfaces cannot drift. It is a squircle-ish 10 on a 34pt tile.
    borderRadius: Radius.seg + 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  neutral: { backgroundColor: Colors.dark.glassFill },
  accent: { backgroundColor: Colors.dark.accentWash },
  moved: { backgroundColor: Colors.dark.movedWash },
  postponed: { backgroundColor: Colors.dark.postponedWash },
});
