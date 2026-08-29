/**
 * `TOPIC · PUBLISHER 3h` — the attribution line under every headline.
 *
 * ⚠ Topic is OPTIONAL and a null draws NO chip: every SPORT story files under
 * none, and the publisher then leads the line. Never a dash — it reads as a
 * value that failed to load (handoff rule, same as the widget).
 *
 * ⚠ Publisher on every row. Attribution is what makes an aggregator
 * defensible; it is not decoration to drop on a tight row.
 */
import { StyleSheet, View } from 'react-native';

import { Eyebrow, Pill, Text } from '@/components/atoms';
import { Spacing } from '@/constants/theme';

export interface NewsMetaProps {
  topic: string | null;
  publisher: string;
  /** Already derived — `3h`. */
  age: string;
}

export function NewsMeta({ topic, publisher, age }: NewsMetaProps) {
  return (
    <View style={styles.row}>
      {topic ? <Pill label={topic} tone="accent" /> : null}
      <Eyebrow numberOfLines={1} style={styles.publisher}>
        {publisher}
      </Eyebrow>
      <Text variant="eyebrowSm" color="textFaint">
        {age}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minWidth: 0 },
  publisher: { flexShrink: 1, minWidth: 0 },
});
