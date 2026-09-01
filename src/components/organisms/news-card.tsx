/**
 * The news card on the Today board (ADR 0064, handoff design 1A; lead picture
 * ADR 0071).
 *
 * ⚠ A DOORWAY, not a feed: one story on a big 96pt thumb, two more as
 * two-line rows on 56pt thumbs, `All news` at the foot. Three, hard — a fourth
 * row pushes the rest of the round off the first screen, and scores come first
 * on that board. The whole card is one tap target that pushes the News screen;
 * individual rows are not links, so the reader is never dropped into Safari
 * from the board.
 *
 * ⚠ The full-bleed lead PICTURE is gone (0071 reversed by 0092): the lead is a
 * row with a bigger thumbnail now, so the card is one shape at two weights and
 * carries its own padding throughout.
 *
 * ⚠ Header is NEWS, not AROUND YOUR CLUBS: phase 1 reads the GLOBAL feed, and
 * a label claiming otherwise would be false (ADR 0064).
 *
 * ⚠ Props are flat and pre-derived (ADR 0013): topic, age and publisher are
 * resolved by the screen, and the headline arrives verbatim.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Chevron, Hairline, Text } from '@/components/atoms';
import { NewsMeta, NewsThumb, SectionHeader } from '@/components/molecules';
import { Colors, Radius, Size, Spacing, Surfaces } from '@/constants/theme';

export interface NewsCardStory {
  title: string;
  imageUrl: string | null;
  topic: string | null;
  publisher: string;
  age: string;
}

export interface NewsCardProps {
  lead: NewsCardStory;
  /** Up to two. */
  rows: readonly NewsCardStory[];
  /** `4 NEW`, already formed; null hides the meta. */
  newLabel: string | null;
  title: string;
  allNews: string;
  onPress: () => void;
}

export function NewsCard({ lead, rows, newLabel, title, allNews, onPress }: NewsCardProps) {
  return (
    <View style={styles.section}>
      <SectionHeader title={title} meta={newLabel} tone={newLabel ? 'accent' : 'default'} />
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${lead.title}. ${allNews}`}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.inset}>
          <View style={styles.row}>
            <NewsThumb src={lead.imageUrl} size={Size.newsCardLead} />
            <View style={styles.rowBody}>
              <Text variant="bodyStrong" numberOfLines={3}>
                {lead.title}
              </Text>
              <NewsMeta topic={lead.topic} publisher={lead.publisher} age={lead.age} />
            </View>
          </View>
        </View>

        {rows.map((row, i) => (
          <View key={i} style={styles.inset}>
            <Hairline />
            <View style={styles.row}>
              <NewsThumb src={row.imageUrl} size={Size.newsCardRow} />
              <View style={styles.rowBody}>
                <Text variant="footnote" numberOfLines={2}>
                  {row.title}
                </Text>
                <NewsMeta topic={row.topic} publisher={row.publisher} age={row.age} />
              </View>
            </View>
          </View>
        ))}

        <View style={styles.inset}>
          <Hairline />
        </View>
        <View style={[styles.inset, styles.foot]}>
          <Text variant="callout" color="accent">
            {allNews}
          </Text>
          <View style={styles.chevron}>
            <Chevron color="accent" />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.four },
  card: {
    ...Surfaces.glass,
    borderRadius: Radius.card,
    overflow: 'hidden',
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  pressed: { backgroundColor: Colors.dark.rowActive },
  inset: { paddingHorizontal: Spacing.four },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  rowBody: { flex: 1, minWidth: 0, gap: Spacing.one },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
  },
  // The chevron atom points down; a doorway points right.
  chevron: { transform: [{ rotate: '-90deg' }] },
});
