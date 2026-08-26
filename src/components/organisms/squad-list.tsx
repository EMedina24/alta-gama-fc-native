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
 *
 * ⚠ Rows key and select on `player.id`, the stable PERSON id, never on the shirt:
 * a Premier League squad can carry two players wearing the same number (Arsenal
 * has two #39s), and its list runs 31–64 deep, academy included.
 */
import { Fragment, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Hairline, PlayerPhoto, Text } from '@/components/atoms';
import { SectionHeader } from '@/components/molecules';
import { Colors, Size, Spacing } from '@/constants/theme';
import type { SquadPlayerView, SquadPosition } from '@/lib/cronogol/types';

const BANDS: readonly SquadPosition[] = ['GK', 'DEF', 'MID', 'FWD'];

export interface SquadListProps {
  players: readonly SquadPlayerView[];
  bandLabels: Record<SquadPosition, string>;
  emptyLabel: string;
  /** ⚠ Receives the PERSON id, not the shirt. Omit to render inert rows. */
  onSelectPlayer?: (id: string) => void;
}

export function SquadList({ players, bandLabels, emptyLabel, onSelectPlayer }: SquadListProps) {
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
            <Row
              key={player.id}
              player={player}
              onPress={onSelectPlayer ? () => onSelectPlayer(player.id) : undefined}
            />
          ))}
          <Hairline />
        </Fragment>
      ))}
    </View>
  );
}

/**
 * ⚠ The portrait and the chevron are the only thing telling a reader the row
 * opens — a bare row with a press handler is an invisible affordance.
 *
 * ⚠ The accessibility label omits a null shirt rather than reading "null" or
 * "zero", the same rule the visible cell follows.
 */
function Row({ player, onPress }: { player: SquadPlayerView; onPress?: () => void }) {
  const body = (
    <>
      <Text variant="numeral" tabular color="textFaint" style={styles.shirt}>
        {player.shirt ?? ''}
      </Text>
      <PlayerPhoto src={player.photoUrl} variant="row" />
      <Text variant="bodyStrong" numberOfLines={1} style={styles.name}>
        {player.name}
      </Text>
      {onPress ? (
        <Text variant="body" color="textFaint" style={styles.chevron}>
          ›
        </Text>
      ) : null}
    </>
  );

  if (!onPress) return <View style={styles.row}>{body}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        player.shirt === null ? player.name : `${player.name}, ${player.shirt}`
      }
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: Size.minTouch,
  },
  rowPressed: { backgroundColor: Colors.dark.rowActive },
  shirt: { width: 28, textAlign: 'right' },
  name: { flex: 1 },
  chevron: { paddingLeft: Spacing.one },
});
