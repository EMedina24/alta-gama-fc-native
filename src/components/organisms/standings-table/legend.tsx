/**
 * The band legend — one row above the table (ADR 0155).
 *
 * ⚠ **It sits ABOVE the rows, not under them** (reversing its original
 * placement). The rails start at row 1 and the key was arriving after
 * thirty-six of them; on the Champions League table that meant the reader had
 * to reach the bottom to learn what the colour beside the leaders meant.
 *
 * ⚠ Shows only the bands actually PRESENT in this table (`usedZones` /
 * `usedCupBands`), so it can never caption a colour nobody can see — and the
 * screen passes an empty array, suppressing it entirely, when the table may not
 * be banded at all.
 *
 * ⚠ **The RANGE comes from config, the WORDS come from copy.** Carrying `1–8`
 * inside a translated string would let the words and the rails drift apart the
 * day a format changes, silently and in one language only. See
 * `bandRangeLabel`.
 *
 * ⚠ **The colours come from `BAND_COLOR`, never a local copy.** This file held
 * its own duplicate of that map until ADR 0151; `band-rail.tsx`'s header had
 * warned against exactly that ("the two would then disagree about what `#5`
 * means").
 *
 * ⚠ The swatch stays **3pt wide, the row rail's own width** — that exact match
 * is the whole mechanism by which a reader connects the key to a row. Widening
 * it for presence would weaken the one thing the legend is for; the visibility
 * is bought with the track, the ink and the size instead.
 */
import { StyleSheet, View } from 'react-native';

import { BAND_COLOR, Text, type BandKind } from '@/components/atoms';
import { Colors, Radius, Spacing } from '@/constants/theme';

export interface LegendItem {
  kind: BandKind;
  /** From copy — the band's name, never its numbers. */
  label: string;
  /** From config, via `bandRangeLabel` — `1–8`, `6`, `25–36`. */
  range: string;
}

export function Legend({ items }: { items: readonly LegendItem[] }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.track}>
      {items.map((item) => (
        <View key={item.kind} style={styles.item}>
          <View style={[styles.swatch, { backgroundColor: BAND_COLOR[item.kind] }]} />
          {/*
            ⚠ The range takes the BAND'S OWN colour, so the colour appears twice
            in one item — once as the shape that matches the rail, once as type.
            Measured against this ground before it was chosen: the weakest of
            the three, coral `bandOut`, is 7.4:1. The backend poster needs a
            lighter coral ink for the same treatment because its field is BLUE;
            ours is near-black, so that constraint does not travel (ADR 0155).
          */}
          <Text variant="micro" tabular style={{ color: BAND_COLOR[item.kind] }}>
            {item.range}
          </Text>
          <Text variant="micro" color="textSecondary">
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * ⚠ Wraps rather than scrolls, and is NOT `space-between`. The cup's three
   * short items land on one row with room to spare in both languages; a
   * domestic table carries up to four proper nouns and legitimately takes two.
   * Justifying a wrapped row spreads its last line to both edges, which reads
   * as a broken grid rather than a key.
   */
  track: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: Spacing.three,
    rowGap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.three,
    backgroundColor: Colors.dark.recess,
    borderRadius: Radius.control,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  swatch: { width: 3, height: 14, borderRadius: Radius.rail },
});
