/**
 * The link-out sheet for a third-party headline. Reached from a News card, or
 * from a SAVED story.
 *
 * ⚠ **This fetches nothing.** By `id`, the article is looked up in the SAME
 * queries the reel rendered from — a cache read, the player-sheet pattern.
 * Nothing is serialised through the router, and the id is never persisted:
 * it is purged at 30 days and only ever lives as long as this navigation.
 *
 * ⚠ By `url` — the Saved screen's door (ADR 0129) — the "article" is the
 * reader's own `SavedStory` SNAPSHOT: the feed may have purged the row weeks
 * ago, and the sheet must still attribute and open it. `url` wins over `id`
 * when both arrive (no caller sends both today).
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
import {
  articleExcerpt,
  articleTopic,
  mergeNewsPages,
  newsAge,
  plainText,
} from '@/lib/cronogol/news';
import { formatFiled } from '@/lib/format';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useNews, useNewsByLeague } from '@/queries/use-news';
import { useNewsReel } from '@/queries/use-news-reel';
import { usePreferences, useZone } from '@/store/preferences';

export default function NewsLinkSheetRoute() {
  const { id, league, url } = useLocalSearchParams<{
    id?: string;
    league?: string;
    url?: string;
  }>();
  const router = useRouter();
  const { copy, phrases } = useI18n();
  const zone = useZone();
  const { savedStories, clock } = usePreferences();

  const global = useNews();
  const byLeague = useNewsByLeague(league ? league : null);
  // ⚠ The REEL cache first (ADR 0129): the screen that opened this sheet pages
  // by keyset, and a story swiped to on page three exists in no other query.
  // The single-page feeds stay as the fallback for any older caller.
  const reel = useNewsReel(league ? league : null);
  const feed = league ? byLeague : global;
  const saved = url ? savedStories.find((entry) => entry.url === url) : undefined;
  const article = saved
    ? {
        title: saved.title,
        url: saved.url,
        publishedAt: saved.publishedAt,
        publisherName: saved.publisher,
        topic: saved.topic,
        // `?? null` — rows saved before the snapshot carried these fields.
        excerpt: saved.excerpt ?? null,
        author: saved.author ?? null,
      }
    : fromFeed();
  const close = () => router.back();

  function fromFeed() {
    const hit =
      mergeNewsPages(reel.data?.pages ?? []).find((entry) => entry.id === id) ??
      feed.data?.articles.find((entry) => entry.id === id);
    if (!hit) return undefined;
    return {
      title: hit.title,
      url: hit.url,
      publishedAt: hit.publishedAt,
      publisherName: hit.publisher.name,
      topic: articleTopic(hit),
      excerpt: articleExcerpt(hit),
      author: hit.author ? plainText(hit.author) : null,
    };
  }

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
  // Who to credit: the author, or the publisher when the wire has none
  // (every LALIGA article) — attribution is what makes an aggregator
  // defensible. The publisher is named ONCE: beside a real author, never
  // doubled after its own fallback.
  const bylineName = article.author ?? article.publisherName;
  const byline = [
    copy.news.byline(bylineName),
    article.author ? article.publisherName : null,
    formatFiled(article.publishedAt, zone, phrases, clock),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <NewsLinkSheet
      title={title}
      topic={article.topic}
      publisher={article.publisherName}
      age={newsAge(article.publishedAt, new Date())}
      excerpt={article.excerpt}
      byline={byline}
      initial={bylineName.charAt(0).toUpperCase()}
      note={copy.news.noteExternal(article.publisherName)}
      openLabel={copy.news.openAt(article.publisherName)}
      shareLabel={copy.news.share}
      cancelLabel={copy.sheets.close}
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
