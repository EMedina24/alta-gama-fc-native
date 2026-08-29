/**
 * The news card on the Today board (ADR 0064, handoff design 1A).
 *
 * ⚠ A DOORWAY, not a feed: one story with its picture, two more as two-line
 * rows with their own thumbnails, `All news` at the foot. Three, hard — a fourth row pushes the rest of
 * the round off the first screen, and scores come first on that board. The
 * whole card is one tap target that pushes the News screen; individual rows
 * are not links, so the reader is never dropped into Safari from the board.
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
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

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
        <View style={styles.lead}>
          <NewsThumb src={lead.imageUrl} size={Size.newsLead} />
          <View style={styles.leadBody}>
            <NewsMeta topic={lead.topic} publisher={lead.publisher} age={lead.age} />
            <Text variant="callout" numberOfLines={3}>
              {lead.title}
            </Text>
          </View>
        </View>

        {rows.map((row, i) => (
          <View key={i}>
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

        <Hairline />
        <View style={styles.foot}>
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
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.card,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  pressed: { backgroundColor: Colors.dark.rowActive },
  lead: { flexDirection: 'row', gap: Spacing.three, paddingBottom: Spacing.three },
  leadBody: { flex: 1, minWidth: 0, gap: Spacing.two },
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
