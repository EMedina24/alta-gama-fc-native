/**
 * The squad, grouped by position band.
 *
 * ⚠ **Identity fields only** — shirt, name, position. There are no statistics on
 * this endpoint and never will be.
 *
 * ⚠ Empty bands are DROPPED. "Goalkeepers 0" is a claim about the club rather
 * than about our coverage.
 *
 * ⚠ A null shirt number sorts LAST, not as zero — and an absent field renders as
 * an empty cell, never `—`, `0` or "Unknown".
 */
import { Fragment, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Hairline, Text } from '@/components/atoms';
import { SectionHeader } from '@/components/molecules';
import { Spacing } from '@/constants/theme';
import type { SquadPlayerView, SquadPosition } from '@/lib/cronogol/types';

const BANDS: readonly SquadPosition[] = ['GK', 'DEF', 'MID', 'FWD'];

export interface SquadListProps {
  players: readonly SquadPlayerView[];
  bandLabels: Record<SquadPosition, string>;
  emptyLabel: string;
}

export function SquadList({ players, bandLabels, emptyLabel }: SquadListProps) {
  const grouped = useMemo(
    () =>
      BANDS.map((band) => ({
        band,
        players: players
          .filter((p) => p.position === band)
          // ⚠ Null shirt last, not zero. Ties break on a plain code-unit
          // comparison, never `localeCompare` — a collator would order the same
          // squad differently in `es` and `en`.
          .sort((a, b) => {
            if (a.shirt === b.shirt) return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
            if (a.shirt === null) return 1;
            if (b.shirt === null) return -1;
            return a.shirt - b.shirt;
          }),
      })).filter((group) => group.players.length > 0),
    [players],
  );

  if (grouped.length === 0) {
    return (
      <Text variant="body" color="textSecondary">
        {emptyLabel}
      </Text>
    );
  }

  return (
    <View style={styles.wrap}>
      {grouped.map((group) => (
        <Fragment key={group.band}>
          <SectionHeader title={bandLabels[group.band]} meta={String(group.players.length)} />
          {group.players.map((player) => (
            <View key={player.id} style={styles.row}>
              <Text variant="numeral" tabular color="textFaint" style={styles.shirt}>
                {player.shirt ?? ''}
              </Text>
              <Text variant="bodyStrong" numberOfLines={1} style={styles.name}>
                {player.name}
              </Text>
            </View>
          ))}
          <Hairline />
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  shirt: { width: 28, textAlign: 'right' },
  name: { flex: 1 },
});
