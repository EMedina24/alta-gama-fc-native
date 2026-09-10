/**
 * The scored-in strip: one cell per finished fixture, lit where the club
 * scored inside its longest run (ADR 0141).
 *
 * ⚠⚠ **It WRAPS, and the cap it must survive is 42, not the mock's 38.** The
 * design draws Barcelona's 38-match LaLiga season in two fixed rows; Segunda
 * plays 42 and the Champions League league phase plus knockouts is its own
 * length again. Trap 56 is exactly this shape — five form chips at a fixed 142pt
 * were given a flex share of 115 and nobody saw it for months because no league
 * had served five results yet. So the cells FLEX to fill the row instead of
 * carrying an intrinsic width, and the debug route draws the 42 case.
 *
 * ⚠ Cells are keyed by index, which is correct here and nowhere else: the strip
 * is a positional read of one array and its entries have no identity of their
 * own — the fixture ids stay in `timeline`.
 */
import { StyleSheet, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import type { RunCell } from '@/lib/cronogol/stats';

export interface RunStripProps {
  cells: readonly RunCell[];
  /**
   * The league's full season length, so the grid is sized to the SEASON and an
   * early one fills from the left.
   *
   * ⚠ Sizing to `cells.length` instead is what made a two-match Bundesliga club
   * draw two full-width slabs that read as progress bars. Null falls back to
   * what has been played, for a competition whose length we cannot state.
   */
  seasonLength?: number | null;
  accessibilityLabel: string;
}

export function RunStrip({ cells, seasonLength, accessibilityLabel }: RunStripProps) {
  // Two rows, as the design draws it.
  const slots = Math.max(cells.length, seasonLength ?? 0);
  const columns = Math.max(1, Math.ceil(slots / 2));
  const width = `${100 / columns}%` as const;

  return (
    <View style={styles.grid} accessibilityLabel={accessibilityLabel} accessible>
      {cells.map((cell, index) => (
        <View key={index} style={[styles.slot, { width }]}>
          <View
            style={[
              styles.cell,
              cell.inRun && cell.scored ? styles.inRun : null,
              !cell.inRun && cell.scored ? styles.scored : null,
            ]}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  // The gap lives on a wrapper so the cell itself can be a clean percentage —
  // a percentage width plus a `gap` overflows the row on the last column.
  // ⚠ Half the smallest step, not `Spacing.half`: at the 42-cell cap a 4pt gap
  // eats more of the row than the cells do.
  slot: { padding: Spacing.half / 2 },
  cell: {
    height: 16,
    borderRadius: Radius.rail + 1,
    backgroundColor: Colors.dark.chartTrack,
  },
  scored: { backgroundColor: Colors.dark.accentDim },
  inRun: { backgroundColor: Colors.dark.accent },
});
