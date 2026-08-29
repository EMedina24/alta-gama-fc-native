/**
 * One story on the News screen: thumbnail, a three-line headline, attribution.
 *
 * ⚠ The headline is a QUOTE in the publisher's language — clamped, never
 * trimmed or re-cased here. `numberOfLines` is the only cut it gets.
 *
 * ⚠ Takes flat scalars, never an article (ADR 0013). The screen derives the
 * topic, the age and the publisher name before this paints.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

import { NewsMeta } from './news-meta';
import { NewsThumb } from './news-thumb';

export interface NewsRowProps {
  title: string;
  imageUrl: string | null;
  topic: string | null;
  publisher: string;
  age: string;
  onPress: () => void;
}

export function NewsRow({ title, imageUrl, topic, publisher, age, onPress }: NewsRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${publisher}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <NewsThumb src={imageUrl} size={Size.newsThumb} />
      <View style={styles.body}>
        <Text variant="callout" numberOfLines={3}>
          {title}
        </Text>
        <NewsMeta topic={topic} publisher={publisher} age={age} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: Spacing.three,
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.card,
    padding: Spacing.three,
  },
  pressed: { backgroundColor: Colors.dark.rowActive },
  body: { flex: 1, minWidth: 0, gap: Spacing.two, justifyContent: 'center' },
});
