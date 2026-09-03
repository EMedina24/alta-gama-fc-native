/**
 * The club page's four-column standing strip (ADR 0091): position, points,
 * goal difference, and the last-five form — in a `Tray`.
 *
 * ⚠ **The screen decides whether this may be drawn at all.** It needs the
 * club's row from a table that passes `bandsApply`; absent, the screen renders
 * nothing rather than a strip of dashes (0082's rule, unchanged).
 *
 * ⚠ The position's ink is the qualification band's, resolved by `zoneFor`
 * against `League.zones` — never position arithmetic (trap 20).
 *
 * ⚠ GD carries its sign through `signedGoalDifference` and goes lime only when
 * POSITIVE: a green `-4` would read as a good number.
 *
 * ⚠ The form column is sized by its CHIPS, not by a share of the row — see
 * `styles.wide`. Five chips are a fixed width and a fraction of the screen is
 * not.
 */
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { FormStrip } from './form-strip';
import { Tray } from './tray';
import { Colors, Spacing } from '@/constants/theme';
import { signedGoalDifference } from '@/lib/cronogol/standings';
import type { FormResult } from '@/lib/cronogol/types';
import type { Phrases } from '@/lib/i18n/phrases';

export interface ClubStatsStripProps {
  rank: number;
  /** The band's ink for the position, or null when the table is unbanded. */
  rankColor: string | null;
  points: number;
  goalDifference: number;
  /** As the API sends it: newest first. `FormStrip` reverses it. */
  form: readonly FormResult[];
  phrases: Phrases;
  labels: {
    /** `copy.table.pos` / `.points`, and `statLabels[5]` for GD. */
    pos: string;
    points: string;
    goalDifference: string;
    form: string;
  };
}

export function ClubStatsStrip({
  rank,
  rankColor,
  points,
  goalDifference,
  form,
  phrases,
  labels,
}: ClubStatsStripProps) {
  return (
    <Tray>
      <View style={styles.row}>
        <Cell label={labels.pos}>
          <Text variant="title3" tabular style={rankColor ? { color: rankColor } : undefined}>
            {String(rank)}
          </Text>
        </Cell>
        <Cell label={labels.points} ruled>
          <Text variant="title3" tabular>
            {String(points)}
          </Text>
        </Cell>
        <Cell label={labels.goalDifference} ruled>
          <Text variant="title3" tabular color={goalDifference > 0 ? 'accent' : 'text'}>
            {signedGoalDifference(goalDifference)}
          </Text>
        </Cell>
        <Cell label={labels.form} ruled wide>
          <FormStrip form={form} letters={phrases.formLetters} />
        </Cell>
      </View>
    </Tray>
  );
}

function Cell({
  label,
  children,
  ruled = false,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  ruled?: boolean;
  wide?: boolean;
}) {
  return (
    <View style={[styles.cell, ruled && styles.ruled, wide && styles.wide]}>
      <Text variant="eyebrowSm" color="textFaint">
        {label}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingVertical: Spacing.three },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  /** The mock's dividers: a left rule on every cell but the first. */
  ruled: { borderLeftWidth: 1, borderLeftColor: Colors.dark.trayLine },
  /**
   * The form column sizes to ITS CHIPS, and the three number cells share what
   * is left.
   *
   * ⚠ **Not a flex share.** It was `flex: 1.45`, which is a fraction of the
   * screen — but five 22pt chips plus their gaps and padding are a FIXED 142pt,
   * and at 402pt wide that share is only 115. The chips ran out of the tray's
   * right edge. It was invisible for as long as it shipped because no league
   * had served five results yet: every European table was three games old, and
   * Puerto Rico's completed season was the first full `form` array to reach it.
   *
   * ⚠ A bigger fraction is not the fix — 2.03 fits a 402pt screen and still
   * overflows a 375pt one. `flex: 0` (grow 0, shrink 0, basis auto) cannot
   * overflow at any width or any form length, and a short array simply hands
   * the numbers more room.
   */
  wide: { flex: 0 },
});
