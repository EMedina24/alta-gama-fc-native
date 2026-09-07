/**
 * Saved stories (ADR 0129) — the reel's bookmarks, rendered entirely from
 * LOCAL SNAPSHOTS. Reached from the crown's bookmark circle on the reel.
 *
 * ⚠ Outside `(tabs)/`, like `/news`: it pushes over the tab bar.
 *
 * ⚠ Nothing here reads the feed. Articles are purged from the API 30 days
 * after publication, and a saved story must outlive that — every field on
 * screen comes off `SavedStory`, frozen at save time. Only the AGE is live:
 * computed against `now` at render, as everywhere else.
 *
 * ⚠ `NewsRow` survives its own screen's death for this list (0092's card, kept
 * by 0129): a saved story is a story card, not a reel.
 *
 * ⚠ The attribution line stands here too — third-party headlines live on this
 * screen indefinitely, which is exactly when the line matters most.
 */
import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookmarkGlyph, Eyebrow, MeshGround, Text } from '@/components/atoms';
import { NewsRow } from '@/components/molecules';
import { BottomTabInset, Colors, Size, Spacing } from '@/constants/theme';
import { openArticle } from '@/features/news/open';
import { newsAge } from '@/lib/cronogol/news';
import { useI18n } from '@/lib/i18n/use-i18n';
import { removeSavedStory, usePreferences, type SavedStory } from '@/store/preferences';

export default function NewsSavedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { copy, phrases } = useI18n();
  const { savedStories } = usePreferences();

  const now = new Date();

  const open = (story: SavedStory) => {
    if (story.isFirstParty) {
      void openArticle(story.url);
      return;
    }
    // ⚠ By `url`, the snapshot mode — the feed may have long forgotten this id.
    router.push({ pathname: '/(sheets)/news-link', params: { url: story.url } });
  };

  return (
    <View style={styles.screen}>
      <MeshGround />
      {/* No native header (ADR 0092): the lime back link names where it goes. */}
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.two, paddingBottom: BottomTabInset },
        ]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={copy.news.title}
          hitSlop={8}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}>
          <Text variant="bodyStrong" color="accent">
            {`‹  ${copy.news.title}`}
          </Text>
        </Pressable>

        <View style={styles.masthead}>
          <Text variant="largeTitle">{copy.news.savedTitle}</Text>
          {savedStories.length > 0 ? (
            <Eyebrow color="textFaint" style={styles.count}>
              {phrases.stories(savedStories.length)}
            </Eyebrow>
          ) : null}
        </View>

        {savedStories.length === 0 ? (
          <Text variant="body" color="textDim">
            {copy.news.savedEmpty}
          </Text>
        ) : (
          <View style={styles.rows}>
            {savedStories.map((story) => (
              <NewsRow
                key={story.url}
                title={story.title}
                imageUrl={story.imageUrl}
                topic={story.topic}
                publisher={story.publisher}
                age={newsAge(story.publishedAt, now)}
                onPress={() => open(story)}
                accessory={
                  <Pressable
                    onPress={() => removeSavedStory(story.url)}
                    accessibilityRole="button"
                    accessibilityLabel={copy.news.savedStory}
                    accessibilityState={{ selected: true }}
                    hitSlop={4}
                    style={({ pressed }) => [styles.unsave, pressed && { opacity: 0.7 }]}>
                    <BookmarkGlyph saved />
                  </Pressable>
                }
              />
            ))}
          </View>
        )}

        <Text variant="footnote" color="textFaint">
          {copy.news.attribution}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.background },
  content: { paddingHorizontal: Spacing.five, gap: Spacing.four },
  back: { alignSelf: 'flex-start' },
  masthead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  count: { paddingBottom: Spacing.one },
  rows: { gap: Spacing.three },
  unsave: {
    width: Size.reelAction,
    height: Size.reelAction,
    borderRadius: Size.reelAction / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.savedFill,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.accent,
  },
});
