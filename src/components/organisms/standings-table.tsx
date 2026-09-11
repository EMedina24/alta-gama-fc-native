/**
 * One competition's full table. No sorting, no filtering, no pagination.
 *
 * ⚠ **It takes BANDS, not a league** (ADR 0152). Until 2026-09-11 this organism
 * held `bandsApply`/`zoneFor`/`usedZones` and a `League`, which made it a
 * domestic-table component by construction — and the Champions League league
 * phase bands on a different rule, over a different payload, with a different
 * guard. "May this table be coloured?" is a question about the DATA and belongs
 * where the data is; drawing a table is not. So the screen decides and passes
 * `bandFor` + `bands` already resolved, and this file imports no catalogue at
 * all.
 *
 * ⚠ **The guards behind those props are load-bearing and both live upstream:**
 *
 * - Domestic — `bandsApply(table, league)`: `clubs` under-reports exactly when
 *   coverage is worst, because a match between two untracked clubs is fetched
 *   by nobody; and before a ball is kicked everyone is on zero and ties break
 *   on club SLUG, so banding a zero-point table painted Sevilla, Valencia and
 *   Villarreal into relegation. Every number was right and the colour was a lie.
 * - League phase — `cupBandsApply(view, competition)`: the same two failures,
 *   plus a third guard clause the API doc does not name. See `competitions.ts`.
 *
 * Pass `bands: []` and a `bandFor` returning null and the table renders
 * honestly with no rail and no legend — the rails still occupy their width, so
 * the position column does not move.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text, type BandKind } from '@/components/atoms';
import { Colors, Spacing } from '@/constants/theme';
import type { FormResult, StandingsTableRowView } from '@/lib/cronogol/types';
import { ExpandedRow } from './standings-table/expanded-row';
import { Legend, type LegendItem } from './standings-table/legend';
import { StandingsRow } from './standings-table/standings-row';

export interface StandingsTableProps {
  rows: readonly StandingsTableRowView[];
  /** Already gated by the caller — see the header. Return null for no rail. */
  bandFor: (rank: number) => BandKind | null;
  /**
   * The bands to caption, ABOVE the table (ADR 0155). `[]` suppresses the
   * legend entirely — which is what an unbandable table passes.
   */
  bands: readonly LegendItem[];
  followed: readonly string[];
  onOpenClub: (slug: string) => void;
  /**
   * Whether this club has a page worth opening (ADR 0154). Absent means "every
   * row does", which is true of every domestic table.
   */
  canOpenClub?: (slug: string) => boolean;
  copy: {
    pos: string;
    club: string;
    played: string;
    points: string;
    statLabels: readonly [string, string, string, string, string, string];
    formLabel: (n: number) => string;
    openClub: (name: string) => string;
    formLetters: Record<FormResult, string>;
  };
}

export function StandingsTable({
  rows,
  bandFor,
  bands,
  followed,
  onOpenClub,
  canOpenClub,
  copy,
}: StandingsTableProps) {
  // ⚠ One row open at a time — the design expands in place, not accordion-style.
  const [openRank, setOpenRank] = useState<number | null>(null);

  return (
    <View style={styles.wrap}>
      {/* ⚠ Above the head row, not under the last club (ADR 0155): the rails
          start at rank 1, so the key has to arrive before them. */}
      <Legend items={bands} />

      <View style={styles.head}>
        <Text variant="eyebrowSm" color="textFaint" style={styles.headPos}>
          {copy.pos}
        </Text>
        <Text variant="eyebrowSm" color="textFaint" style={styles.headClub}>
          {copy.club}
        </Text>
        <Text variant="eyebrowSm" color="textFaint" style={styles.headNum}>
          {copy.played}
        </Text>
        {/* PTS is the column that matters, so it alone gets full ink. */}
        <Text variant="eyebrowSm" color="text" style={styles.headNum}>
          {copy.points}
        </Text>
      </View>

      {rows.map((row) => (
        <View key={row.team.slug}>
          <StandingsRow
            row={row}
            zone={bandFor(row.rank)}
            followed={followed.includes(row.team.slug)}
            expanded={openRank === row.rank}
            onPress={() => setOpenRank(openRank === row.rank ? null : row.rank)}
          />
          {openRank === row.rank ? (
            <ExpandedRow
              row={row}
              statLabels={copy.statLabels}
              formLetters={copy.formLetters}
              // ⚠ Guarded HERE, not inside `ExpandedRow`: this is a prop
              // expression, so it is evaluated before the child ever mounts and
              // an unguarded `row.form.length` red-screens on a cup row.
              formLabel={row.form ? copy.formLabel(Math.min(row.form.length, 5)) : null}
              openLabel={copy.openClub(row.team.name)}
              onOpen={
                canOpenClub && !canOpenClub(row.team.slug)
                  ? null
                  : () => onOpenClub(row.team.slug)
              }
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 0 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: Spacing.two,
    paddingRight: Spacing.five,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.hairlineMid,
  },
  // 3 (rail) + gap aligns the head with the row beneath it.
  headPos: { width: 26 + 3 + Spacing.three, textAlign: 'center' },
  headClub: { flex: 1 },
  headNum: { width: 34, textAlign: 'right' },
});
