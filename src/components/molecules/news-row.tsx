/**
 * One story on the News screen: a 64pt thumbnail, a three-line headline and
 * its attribution, on a GLASS CARD (ADR 0092).
 *
 * ⚠ A card again, reversing 0070's hairline row — but not 0064's card either.
 * 0070 dropped the chrome because thirty cards of EQUAL weight left nothing
 * leading; 0092 removes the thing they were competing with (the front page) and
 * makes every story one card of one weight, which is a list rather than a
 * hierarchy.
 *
 * ⚠ The headline is a QUOTE in the publisher's language — clamped, never
 * trimmed or re-cased here. `numberOfLines` is the only cut it gets.
 *
 * ⚠ Takes flat scalars, never an article (ADR 0013). The screen derives the
 * topic, the age and the publisher name before this paints.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Radius, Size, Spacing, Surfaces } from '@/constants/theme';

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
      <NewsThumb src={imageUrl} size={Size.newsStoryThumb} />
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
    ...Surfaces.glass,
    borderRadius: Radius.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  pressed: { opacity: 0.75 },
  body: { flex: 1, minWidth: 0, gap: Spacing.two, justifyContent: 'center' },
});
