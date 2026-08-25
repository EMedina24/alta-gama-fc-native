/**
 * The W D L GF GA GD row inside an expanded standings row.
 *
 * ⚠ GD is signed and rendered in accent when positive (`signedGoalDifference`
 * gives `+7` / `-3` / a bare `0`). Every cell is tabular — six numbers that do
 * not line up read as a broken table.
 */
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Spacing } from '@/constants/theme';
import { signedGoalDifference } from '@/lib/cronogol/standings';
import type { StandingsRowView } from '@/lib/cronogol/types';

export interface StatRowProps {
  row: Pick<StandingsRowView, 'won' | 'drawn' | 'lost' | 'goalsFor' | 'goalsAgainst' | 'goalDifference'>;
  /** Column heads, localised by the caller. */
  labels: readonly [string, string, string, string, string, string];
}

export function StatRow({ row, labels }: StatRowProps) {
  const values = [row.won, row.drawn, row.lost, row.goalsFor, row.goalsAgainst];

  return (
    <View style={styles.row}>
      {values.map((value, i) => (
        <View key={labels[i]} style={styles.cell}>
          <Text variant="eyebrowSm" color="textFaint">
            {labels[i]}
          </Text>
          <Text variant="title3" tabular>
            {value}
          </Text>
        </View>
      ))}
      <View style={styles.cell}>
        <Text variant="eyebrowSm" color="textFaint">
          {labels[5]}
        </Text>
        <Text variant="title3" tabular color={row.goalDifference > 0 ? 'accent' : 'text'}>
          {signedGoalDifference(row.goalDifference)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  cell: { alignItems: 'flex-start', gap: Spacing.half },
});
