/**
 * The card a standings row expands into: W D L GF GA GD, the form strip, and a
 * link into the club.
 *
 * ⚠ **Form is OPTIONAL, and absent is not empty.** The Champions League route
 * omits the field entirely rather than serving `[]`, deliberately, "so nothing
 * has to guess what an empty array meant" — there is no cup form guide. The
 * strip is simply not drawn.
 *
 * ⚠ **Form is never re-derived from fixtures.** A `finished` fixture with null
 * goals is a real stored shape; the backend excludes it so the table
 * under-reports rather than crediting a phantom 0–0, while a client-side derive
 * scores it a draw — printing chips that disagree with the points column beside
 * them, from the same data.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Hairline, Text } from '@/components/atoms';
import { FormStrip, StatRow } from '@/components/molecules';
import { Radius, Spacing, Surfaces } from '@/constants/theme';
import type { FormResult, StandingsTableRowView } from '@/lib/cronogol/types';

export interface ExpandedRowProps {
  row: StandingsTableRowView;
  statLabels: readonly [string, string, string, string, string, string];
  formLetters: Record<FormResult, string>;
  /**
   * ⚠ `null` together with an absent `row.form` — the two travel as a pair, and
   * the caller computes the label because only it holds the copy functions.
   */
  formLabel: string | null;
  openLabel: string;
  /**
   * ⚠ **`null` hides the link entirely** (ADR 0154). Half the Champions League
   * field is not in `GET /cronogol/teams`: those clubs' routes answer `200` with
   * `lastSyncedAt: null`, which is trap 1 — a club page with no schedule, no
   * squad and no standing strip. The row still expands, because W/D/L/GF/GA/GD
   * is real for every club; only the promise of a page is withheld.
   */
  onOpen: (() => void) | null;
}

export function ExpandedRow({
  row,
  statLabels,
  formLetters,
  formLabel,
  openLabel,
  onOpen,
}: ExpandedRowProps) {
  return (
    <View style={styles.card}>
      <StatRow row={row} labels={statLabels} />

      {row.form && row.form.length > 0 && formLabel !== null ? (
        <>
          <Hairline />
          <View style={styles.formRow}>
            <Text variant="eyebrowSm" color="textFaint">
              {formLabel}
            </Text>
            <FormStrip form={[...row.form]} letters={formLetters} />
          </View>
        </>
      ) : null}

      {onOpen ? (
        <>
          <Hairline />
          <Pressable
            onPress={onOpen}
            accessibilityRole="link"
            style={({ pressed }) => [styles.open, pressed && { opacity: 0.7 }]}>
            <Text variant="bodyStrong" color="accent">
              {openLabel}
            </Text>
            <Text variant="bodyStrong" color="accent">
              ›
            </Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...Surfaces.glass,
    borderRadius: Radius.tile,
    padding: Spacing.four,
    marginHorizontal: Spacing.five,
    marginVertical: Spacing.two,
    gap: Spacing.three,
  },
  formRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  open: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
