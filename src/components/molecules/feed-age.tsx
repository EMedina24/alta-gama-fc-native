/**
 * "Score last checked 2h ago · updates roughly every 4h".
 *
 * ⚠ **This line is required wherever a score from `/cronogol/scores` appears**,
 * and the handoff says so twice: "Do not remove those lines to make the screen
 * look cleaner — they are the difference between honest and broken."
 *
 * ⚠ The age is computed from `lastUpdateAt`, which is when the SOURCE moved the
 * row, not when we read it. That can OVERSTATE how old our copy is. It cannot
 * understate it — which is the direction an honesty signal has to err in.
 */
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Spacing } from '@/constants/theme';

export interface FeedAgeProps {
  /** `lastUpdateAt` from the scoreboard payload. */
  lastUpdateAt: string | null;
  now?: number;
  /** Receives whole hours; the caller owns the wording and the language. */
  render: (hoursAgo: number | null) => string;
}

export function FeedAge({ lastUpdateAt, now = Date.now(), render }: FeedAgeProps) {
  const parsed = lastUpdateAt ? Date.parse(lastUpdateAt) : NaN;
  const hours = Number.isNaN(parsed) ? null : Math.max(0, Math.floor((now - parsed) / 3_600_000));

  return (
    <View style={styles.row}>
      <View style={styles.glyph} />
      <Text variant="footnote" color="textDim" style={styles.copy}>
        {render(hours)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  // Stands in for the clock glyph until the icon set lands.
  glyph: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.4,
    borderColor: '#7c858b',
    marginTop: 3,
  },
  copy: { flex: 1 },
});
