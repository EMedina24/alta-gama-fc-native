/**
 * The 3px qualification-zone rail down the left of a standings row.
 *
 * ⚠ Renders TRANSPARENT rather than nothing when there is no zone, so a banded
 * and an unbanded table put the position column in exactly the same place.
 *
 * ⚠ The colour comes from CONFIG — `League.zones` for a domestic table,
 * `Competition.bands` for the Champions League league phase — never from
 * position arithmetic written at a call site. Callers must gate on
 * `bandsApply` / `cupBandsApply`. See `leagues.ts` and `competitions.ts`.
 */
import { StyleSheet, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import type { CupBandKind } from '@/lib/cronogol/competitions';
import type { ZoneKind } from '@/lib/cronogol/leagues';

/**
 * Every band this rail can paint — domestic qualification zones and the
 * Champions League league phase's positional slices (ADR 0151).
 *
 * ⚠ **The KEY is widened here; `ZoneKind` itself is NOT.** `ZoneKind` is
 * `League.zones`' element type, and widening it would let a domestic league
 * declare `{ kind: 'r16' }`, let `zoneFor` return `'r16'`, and oblige
 * `copy.table.zoneLabels` to carry strings for three kinds no domestic legend
 * can ever show. One map, two closed unions feeding it.
 */
export type BandKind = ZoneKind | CupBandKind;

/**
 * The band colours, keyed by kind.
 *
 * ⚠ Exported because the Clubs rail's rank badge inks its number with the same
 * map (ADR 0082) and the `Legend` swatches read it too. A second copy would let
 * a band recolour repaint the table and not the rail — the two would then
 * disagree about what `#5` means. `legend.tsx` held exactly such a copy until
 * ADR 0151 deleted it.
 *
 * ⚠ Reading this does NOT license painting a band: the caller still has to have
 * asked `bandsApply` (domestic) or `cupBandsApply` (the league phase) first.
 * See the header.
 *
 * ⚠ `r16` and `ucl` are the same hex and mean different things — see the token
 * comments in `theme.ts`.
 */
export const BAND_COLOR: Record<BandKind, string> = {
  ucl: Colors.dark.bandUcl,
  uel: Colors.dark.bandUel,
  conf: Colors.dark.bandConf,
  rel: Colors.dark.bandRel,
  r16: Colors.dark.bandR16,
  playoff: Colors.dark.bandPlayoff,
  out: Colors.dark.bandOut,
};

export function BandRail({ zone }: { zone: BandKind | null }) {
  return (
    <View style={[styles.rail, { backgroundColor: zone ? BAND_COLOR[zone] : 'transparent' }]} />
  );
}

const styles = StyleSheet.create({
  /**
   * ⚠ Inset vertically rather than stretched to the row.
   *
   * A full-height rail makes consecutive rows in the SAME zone merge into one
   * unbroken bar — five Champions League places read as a single block and the
   * row boundaries vanish. ⚠ The league-phase table makes this sharper still:
   * its play-off band runs SIXTEEN consecutive rows. The design draws a short segment per row; the margin
   * is what keeps them countable.
   */
  rail: { width: 3, alignSelf: 'stretch', marginVertical: 7, borderRadius: Radius.rail },
});
