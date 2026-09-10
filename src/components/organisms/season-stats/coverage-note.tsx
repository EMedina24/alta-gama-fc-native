/**
 * The line that explains an absent half of the screen (ADR 0143).
 *
 * ⚠⚠ **This is not decoration and it is not optional.** When
 * `coverage.sufficient` is false every event-derived field goes null together,
 * so three of the Club view's six cards simply are not drawn — on the
 * Bundesliga, always, because that source writes no events at all. A screen
 * that drops three cards and says nothing looks broken; one that says why looks
 * honest. The alternative the contract explicitly forbids is worse: rendering
 * those nulls as zeroes would state, as fact, that a club has conceded no late
 * goals and been shown no cards.
 */
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Colors, Radius, Spacing } from '@/constants/theme';

export function CoverageNote({ text }: { text: string }) {
  return (
    <View style={styles.wrap}>
      <Text variant="micro" color="textDim" style={styles.text}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.dark.glassFillDim,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  text: { fontWeight: '400' },
});
