/**
 * The squad under the pitch (ADR 0065): a line filter and a horizontal rail
 * of the UNPLACED players. Placed players leave the rail — it is short enough
 * that removing them is the clearer signal, and the count chip carries
 * progress.
 *
 * ⚠ The registration caveat sits at the END of the rail, not in a footnote:
 * the reader looking for a missing player is looking at the rail.
 *
 * ⚠ Rows key on `id`, never the shirt (duplicate shirts in the Premier League).
 * Order is the squad's own — band, then shirt ascending with null last — the
 * same order `squad-list.tsx` uses, so the rail and the Players tab agree.
 */
import { FlatList, StyleSheet, View } from 'react-native';

import { ChipButton, Text } from '@/components/atoms';
import { RailCard } from '@/components/molecules';
import { Size, Spacing } from '@/constants/theme';
import { initials, tokenName } from '@/features/starting-xi/card-geometry';
import type { Line } from '@/features/starting-xi/formations';
import type { SquadPlayerView } from '@/lib/cronogol/types';

export type RailFilter = Line | 'all';

export interface SquadRailProps {
  players: readonly SquadPlayerView[];
  filter: RailFilter;
  onFilter: (filter: RailFilter) => void;
  onPick: (player: SquadPlayerView) => void;
  labels: { all: string; lines: Record<Line, string>; note: string };
}

const FILTERS: readonly RailFilter[] = ['all', 'gk', 'def', 'mid', 'fwd'];

export function SquadRail({ players, filter, onFilter, onPick, labels }: SquadRailProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <ChipButton
            key={f}
            label={f === 'all' ? labels.all : labels.lines[f]}
            active={filter === f}
            onPress={() => onFilter(f)}
          />
        ))}
      </View>
      <FlatList
        horizontal
        data={players}
        keyExtractor={(p) => p.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
        ItemSeparatorComponent={Gap}
        renderItem={({ item }) => (
          <RailCard
            tile={item.shirt === null ? initials(item.name) : String(item.shirt)}
            name={tokenName(item)}
            accessibilityLabel={item.shirt === null ? item.name : `${item.name}, ${item.shirt}`}
            onPress={() => onPick(item)}
          />
        )}
        ListFooterComponent={
          <View style={styles.note}>
            <Text variant="caption" color="textFaint">
              {labels.note}
            </Text>
          </View>
        }
      />
    </View>
  );
}

function Gap() {
  return <View style={styles.gap} />;
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  filters: { flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.five },
  rail: { paddingHorizontal: Spacing.five, alignItems: 'flex-start' },
  gap: { width: Spacing.two + 1 },
  note: {
    width: Size.xiRailCard * 2 + Spacing.four,
    marginLeft: Spacing.four,
    justifyContent: 'center',
    minHeight: Size.xiRailCard,
  },
});
