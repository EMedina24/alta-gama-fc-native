/**
 * `TOPIC · PUBLISHER 3h` — the attribution line under a headline.
 *
 * ⚠ Since ADR 0130 the topic is lime TEXT, not a pill — the mock reserves the
 * one pill per screen for the lead card (`NewsLeadCard` draws its own). A
 * null topic draws NOTHING and the publisher leads the line. Never a dash —
 * it reads as a value that failed to load (handoff rule, same as the widget).
 *
 * ⚠ Publisher on every row. Attribution is what makes an aggregator
 * defensible; it is not decoration to drop on a tight row.
 */
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Colors, Spacing } from '@/constants/theme';

export interface NewsMetaProps {
  topic: string | null;
  publisher: string;
  /** Already derived — `3h`. */
  age: string;
}

export function NewsMeta({ topic, publisher, age }: NewsMetaProps) {
  return (
    <View style={styles.row}>
      {topic ? (
        <>
          <Text variant="eyebrowSm" color="accent" numberOfLines={1} style={styles.topic}>
            {topic}
          </Text>
          <View style={styles.dot} />
        </>
      ) : null}
      <Text variant="eyebrowSm" color="textSecondary" numberOfLines={1} style={styles.publisher}>
        {publisher}
      </Text>
      <Text variant="eyebrowSm" color="textFaint">
        {age}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minWidth: 0 },
  topic: { flexShrink: 1, minWidth: 0 },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.dark.newsMetaDot },
  publisher: { flexShrink: 1, minWidth: 0 },
});
