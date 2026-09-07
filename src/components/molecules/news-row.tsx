/**
 * One story row: a 64pt thumbnail, a TWO-line headline, then its attribution
 * (`NewsMeta`) beneath, on a GLASS CARD — ADR 0092's card in ADR 0130's
 * clothes (title first, meta below, per the front-page mock). Serves the News
 * screen's rows below the lead AND the Saved screen.
 *
 * ⚠ The headline is a QUOTE in the publisher's language — clamped, never
 * trimmed or re-cased here. `numberOfLines` is the only cut it gets.
 *
 * ⚠ Takes flat scalars, never an article (ADR 0013). The screen derives the
 * topic, the age and the publisher name before this paints.
 */
import { type ReactNode } from 'react';
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
  /**
   * A trailing CONTROL — the Saved screen's un-save button (ADR 0129).
   * ⚠ Unlike `SectionHeader.accessory` this is interactive: it sits inside the
   * row's Pressable and its own Pressable wins the touch. When set, the row is
   * `accessible={false}` piecewise so VoiceOver reaches both elements.
   */
  accessory?: ReactNode;
}

export function NewsRow({ title, imageUrl, topic, publisher, age, onPress, accessory }: NewsRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessible={accessory === undefined}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${publisher}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <NewsThumb src={imageUrl} size={Size.newsStoryThumb} />
      <View style={styles.body}>
        <Text
          variant="headline"
          numberOfLines={2}
          accessibilityRole={accessory === undefined ? undefined : 'button'}
          onPress={accessory === undefined ? undefined : onPress}>
          {title}
        </Text>
        <NewsMeta topic={topic} publisher={publisher} age={age} />
      </View>
      {accessory ?? null}
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
