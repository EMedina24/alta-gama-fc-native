/**
 * The 3px qualification-zone rail down the left of a standings row.
 *
 * ⚠ Renders TRANSPARENT rather than nothing when there is no zone, so a banded
 * and an unbanded table put the position column in exactly the same place.
 *
 * ⚠ The colour comes from per-league CONFIG (`League.zones`), never from
 * position arithmetic — see `leagues.ts`. Callers must gate on `bandsApply`.
 */
import { StyleSheet, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import type { ZoneKind } from '@/lib/cronogol/leagues';

/**
 * The four band colours, keyed by zone.
 *
 * ⚠ Exported because the Clubs rail's rank badge inks its number with the same
 * map (ADR 0082). A second copy would let a band recolour repaint the table and
 * not the rail — the two would then disagree about what `#5` means.
 *
 * ⚠ Reading this does NOT license painting a band: the caller still has to have
 * asked `bandsApply` first. See the header.
 */
export const BAND_COLOR: Record<ZoneKind, string> = {
  ucl: Colors.dark.bandUcl,
  uel: Colors.dark.bandUel,
  conf: Colors.dark.bandConf,
  rel: Colors.dark.bandRel,
};

export function BandRail({ zone }: { zone: ZoneKind | null }) {
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
   * row boundaries vanish. The design draws a short segment per row; the margin
   * is what keeps them countable.
   */
  rail: { width: 3, alignSelf: 'stretch', marginVertical: 7, borderRadius: Radius.rail },
});
