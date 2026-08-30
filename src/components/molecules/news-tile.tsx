/**
 * A front-page tile (ADR 0070): the picture on top at 16:10, a three-line
 * headline and the attribution line under it. Two sit side by side under the
 * lead; a lone one is drawn `wide`.
 *
 * ⚠ No topic pill — at half width it fought the headline for the line, and the
 * lead above already names the day's topic. Publisher stays; attribution is
 * never trimmed for space.
 *
 * ⚠ Takes flat scalars, never an article (ADR 0013).
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

import { NewsMeta } from './news-meta';
import { NewsThumb } from './news-thumb';

export interface NewsTileProps {
  title: string;
  imageUrl: string | null;
  publisher: string;
  age: string;
  onPress: () => void;
  /** The only tile in its row takes the full width. */
  wide?: boolean;
}

export function NewsTile({ title, imageUrl, publisher, age, onPress, wide = false }: NewsTileProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${publisher}`}
      style={({ pressed }) => [styles.tile, wide ? styles.wide : styles.half, pressed && styles.pressed]}>
      <NewsThumb src={imageUrl} size={0} aspectRatio={Size.newsTileRatio} />
      <View style={styles.body}>
        <Text variant="callout" numberOfLines={3}>
          {title}
        </Text>
        <NewsMeta topic={null} publisher={publisher} age={age} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.tile,
    overflow: 'hidden',
  },
  half: { flex: 1, minWidth: 0 },
  wide: { alignSelf: 'stretch' },
  pressed: { opacity: 0.85 },
  body: { padding: Spacing.three, gap: Spacing.two },
});
