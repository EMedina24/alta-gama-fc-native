/**
 * One league's full table. No sorting, no filtering, no pagination.
 *
 * ⚠ **Bands and legend are gated together on `bandsApply(table, league)`** —
 * `table.clubs === league.clubCount && table.matchesPlayed > 0`. Both clauses
 * earn their place:
 *
 * - `clubs` under-reports exactly when coverage is worst, because a match
 *   between two untracked clubs is fetched by nobody. Ranks computed over a
 *   short table are positions in a different league from the one whose bands we
 *   hold.
 * - Before a ball is kicked everyone is on zero and ties break on club SLUG, so
 *   banding a zero-point table painted Sevilla, Valencia and Villarreal into
 *   relegation and left Real Madrid 16th. Every number was right and the colour
 *   was a lie.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Colors, Spacing } from '@/constants/theme';
import type { League, ZoneKind } from '@/lib/cronogol/leagues';
import { bandsApply, usedZones, zoneFor } from '@/lib/cronogol/standings';
import type { FormResult, StandingsTableView } from '@/lib/cronogol/types';
import { ExpandedRow } from './standings-table/expanded-row';
import { Legend } from './standings-table/legend';
import { StandingsRow } from './standings-table/standings-row';

export interface StandingsTableProps {
  table: StandingsTableView;
  league: League;
  followed: readonly string[];
  onOpenClub: (slug: string) => void;
  copy: {
    pos: string;
    club: string;
    played: string;
    points: string;
    statLabels: readonly [string, string, string, string, string, string];
    formLabel: (n: number) => string;
    openClub: (name: string) => string;
    zoneLabels: Record<ZoneKind, string>;
    formLetters: Record<FormResult, string>;
  };
}

export function StandingsTable({
  table,
  league,
  followed,
  onOpenClub,
  copy,
}: StandingsTableProps) {
  // ⚠ One row open at a time — the design expands in place, not accordion-style.
  const [openRank, setOpenRank] = useState<number | null>(null);

  const banded = bandsApply(table, league);
  const zones = banded ? usedZones(table.rows, league) : [];

  return (
    <View style={styles.wrap}>
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

      {table.rows.map((row) => (
        <View key={row.team.slug}>
          <StandingsRow
            row={row}
            zone={banded ? zoneFor(row.rank, league) : null}
            followed={followed.includes(row.team.slug)}
            expanded={openRank === row.rank}
            onPress={() => setOpenRank(openRank === row.rank ? null : row.rank)}
          />
          {openRank === row.rank ? (
            <ExpandedRow
              row={row}
              statLabels={copy.statLabels}
              formLetters={copy.formLetters}
              formLabel={copy.formLabel(Math.min(row.form.length, 5))}
              openLabel={copy.openClub(row.team.name)}
              onOpen={() => onOpenClub(row.team.slug)}
            />
          ) : null}
        </View>
      ))}

      <Legend zones={zones} labels={copy.zoneLabels} />
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
