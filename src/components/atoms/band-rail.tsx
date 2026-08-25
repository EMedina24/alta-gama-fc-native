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

const BAND: Record<ZoneKind, string> = {
  ucl: Colors.dark.bandUcl,
  uel: Colors.dark.bandUel,
  conf: Colors.dark.bandConf,
  rel: Colors.dark.bandRel,
};

export function BandRail({ zone }: { zone: ZoneKind | null }) {
  return (
    <View style={[styles.rail, { backgroundColor: zone ? BAND[zone] : 'transparent' }]} />
  );
}

const styles = StyleSheet.create({
  rail: { width: 3, alignSelf: 'stretch', borderRadius: Radius.rail },
});
