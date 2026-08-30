/**
 * The link-out sheet for a third-party headline. Reached from a News row.
 *
 * ⚠ **This fetches nothing.** The article is looked up by `id` in the SAME
 * query the screen rendered from — a cache read, the player-sheet pattern.
 * Nothing is serialised through the router, and the id is never persisted:
 * it is purged at 30 days and only ever lives as long as this navigation.
 *
 * ⚠ `league` is `''` for the global feed. The sheet must read the same cache
 * entry the screen did, or a league-filtered row would miss in `all`.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Share, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/atoms';
import { NewsLinkSheet } from '@/components/organisms/news-link-sheet';
import { Spacing } from '@/constants/theme';
import { openArticle } from '@/features/news/open';
import { articleTopic, newsAge, plainText } from '@/lib/cronogol/news';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useNews, useNewsByLeague } from '@/queries/use-news';

export default function NewsLinkSheetRoute() {
  const { id, league } = useLocalSearchParams<{ id: string; league?: string }>();
  const router = useRouter();
  const { copy } = useI18n();

  const global = useNews();
  const byLeague = useNewsByLeague(league ? league : null);
  const feed = league ? byLeague : global;
  const article = feed.data?.articles.find((entry) => entry.id === id);
  const close = () => router.back();

  if (!article) {
    return (
      <View style={styles.state}>
        <Text variant="body" color="textSecondary">
          {copy.news.gone}
        </Text>
        <Button label={copy.news.cancel} tone="secondary" onPress={close} />
      </View>
    );
  }

  const title = plainText(article.title);

  return (
    <NewsLinkSheet
      title={title}
      topic={articleTopic(article)}
      publisher={article.publisher.name}
      age={newsAge(article.publishedAt, new Date())}
      note={copy.news.noteExternal(article.publisher.name)}
      openLabel={copy.news.openAt(article.publisher.name)}
      shareLabel={copy.news.share}
      cancelLabel={copy.news.cancel}
      // ⚠ Browser FIRST, sheet after: `close()` before `openArticle` attaches
      // the browser to a sheet that is mid-dismissal, and iOS tears it down
      // with the sheet. `openArticle` resolves when the reader dismisses the
      // browser — only then does this sheet go.
      onOpen={() => {
        void openArticle(article.url).finally(close);
      }}
      // ⚠ The URL, never the id — a share must outlive the 30-day purge.
      onShare={() => void Share.share({ message: title, url: article.url })}
      onCancel={close}
    />
  );
}

const styles = StyleSheet.create({
  state: { padding: Spacing.five, gap: Spacing.four },
});
