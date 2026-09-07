/**
 * The News screen — a full-screen vertical snap reel (ADR 0129), pushed from
 * the Today card (ADR 0064).
 *
 * ⚠ Sits outside `(tabs)/` so it pushes over the tab bar, like `club/[slug]`.
 * The reel handoff drew the tab bar still visible; keeping it would mean
 * nesting a Stack inside the Today tab under `NativeTabs`, which nothing else
 * in the app does. Recorded as a deliberate deviation (0129) — the cards get
 * the WHOLE window instead, measured by `onLayout`, and the first render waits
 * for that measure so `snapToInterval` and the card heights never disagree.
 *
 * ⚠ ONE feed, three consumers — and now a fourth. `useNewsReel` pages by
 * keyset but SEEDS page one from the `useNews()` cache the widget writer and
 * the Today card already hold, so opening this screen is still a cache read.
 * Only swiping past page one, or a league chip, spends a request.
 *
 * ⚠ Ages are computed against `now` at RENDER, never at fetch — one `now` per
 * render, as the Today board does.
 *
 * ⚠ `newsSeenAt` is written on MOUNT — opening the screen is what clears the
 * Today card's NEW count. The reel itself prints no NEW pill (the crown
 * carries a story count instead), so 0070's frozen-at-open capture has no
 * reader here any more; if a NEW eyebrow ever returns, it must read a stamp
 * captured at open, never the live preference (trap 41).
 *
 * ⚠ Saves are SNAPSHOTS keyed by `url` (never `id` — purged at 30 days), and
 * the haptic fires on save ON only. Share is the native sheet with the URL,
 * the same call the link-out sheet makes.
 */
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/atoms';
import { NewsReel } from '@/components/organisms/news-reel';
import { ReelCrown } from '@/components/organisms/reel-crown';
import { ReelFilterPanel } from '@/components/organisms/reel-filter-panel';
import { Colors, Size, Spacing } from '@/constants/theme';
import { openArticle } from '@/features/news/open';
import { hapticSaveStory } from '@/lib/haptics';
import { findLeagueByApiSlug } from '@/lib/cronogol/leagues';
import {
  articleExcerpt,
  articleTopic,
  isOurs,
  mergeNewsPages,
  newsAge,
  plainText,
  selectReelItems,
} from '@/lib/cronogol/news';
import type { NewsArticleView, NewsLeagueView } from '@/lib/cronogol/types';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useNewsLeagues } from '@/queries/use-news';
import { useNewsReel } from '@/queries/use-news-reel';
import { setNewsSeenAt, toggleSavedStory, usePreferences } from '@/store/preferences';

const ALL = 'all';

/**
 * The chip set: the server's league list, KEPT TO the leagues we hold clubs
 * for, in the SERVER's order, named with our own `League.name`.
 *
 * ⚠ Not hardcoded — the contract forbids it — and not re-sorted, which it
 * forbids twice. The intersection is ours: the registry answers nine leagues,
 * seven of which no reader here follows a club in, and a nine-chip panel is a
 * worse filter than a four-chip one.
 */
function leagueChips(leagues: readonly NewsLeagueView[]) {
  return leagues.flatMap((entry) => {
    const league = findLeagueByApiSlug(entry.id);
    return league ? [{ id: entry.id, label: league.name }] : [];
  });
}

export default function NewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { copy, phrases } = useI18n();

  const [filter, setFilter] = useState<string>(ALL);
  const [filterOpen, setFilterOpen] = useState(false);
  /** The measured scroll area — 0 until `onLayout`, which gates the list. */
  const [cardHeight, setCardHeight] = useState(0);

  const { savedStories } = usePreferences();

  const reel = useNewsReel(filter === ALL ? null : filter);
  const leagues = useNewsLeagues();

  useEffect(() => {
    setNewsSeenAt(new Date().toISOString());
  }, []);

  const now = new Date();

  const chips = useMemo(
    () => [{ id: ALL, label: copy.news.all }, ...leagueChips(leagues.data ?? [])],
    [leagues.data, copy.news.all],
  );

  const articles = useMemo(
    () => selectReelItems(mergeNewsPages(reel.data?.pages ?? [])),
    [reel.data],
  );

  const savedUrls = useMemo(
    () => new Set(savedStories.map((story) => story.url)),
    [savedStories],
  );

  const byId = (id: string) => articles.find((article) => article.id === id);

  const open = (article: NewsArticleView) => {
    if (isOurs(article)) {
      void openArticle(article.url);
      return;
    }
    router.push({
      pathname: '/(sheets)/news-link',
      params: { id: article.id, league: filter === ALL ? '' : filter },
    });
  };

  const toggleSave = (article: NewsArticleView) => {
    // Haptic on save ON only — un-saving changed the reader's mind, not the world.
    if (!savedUrls.has(article.url)) void hapticSaveStory();
    toggleSavedStory({
      url: article.url,
      title: plainText(article.title),
      publisher: article.publisher.name,
      isFirstParty: article.publisher.isFirstParty,
      imageUrl: article.imageUrl,
      publishedAt: article.publishedAt,
      topic: articleTopic(article),
      excerpt: articleExcerpt(article),
      author: article.author ? plainText(article.author) : null,
      savedAt: new Date().toISOString(),
    });
  };

  const items = articles.map((article) => ({
    id: article.id,
    title: plainText(article.title),
    imageUrl: article.imageUrl,
    publisher: article.publisher.name,
    age: newsAge(article.publishedAt, now),
    saved: savedUrls.has(article.url),
  }));

  const quiet = !reel.isPending && items.length === 0;
  const filterLabel = chips.find((chip) => chip.id === filter)?.label ?? copy.news.all;

  return (
    <View
      style={styles.screen}
      onLayout={(event) => setCardHeight(event.nativeEvent.layout.height)}>
      {/* ⚠ No native header (ADR 0092, kept by 0129): the crown draws its own
          lime back link, which can NAME where it goes. */}
      <Stack.Screen options={{ headerShown: false }} />

      {cardHeight > 0 ? (
        <NewsReel
          items={items}
          cardHeight={cardHeight}
          hasMore={reel.hasNextPage}
          onEndReached={() => {
            if (reel.hasNextPage && !reel.isFetchingNextPage) void reel.fetchNextPage();
          }}
          endTitle={copy.news.caughtUp}
          hint={copy.news.reelRead}
          saveLabel={copy.news.saveStory}
          savedLabel={copy.news.savedStory}
          shareLabel={copy.news.share}
          topInset={insets.top}
          bottomInset={insets.bottom}
          onOpen={(id) => {
            const article = byId(id);
            if (article) open(article);
          }}
          onToggleSave={(id) => {
            const article = byId(id);
            if (article) toggleSave(article);
          }}
          onShare={(id) => {
            const article = byId(id);
            // ⚠ The URL, never the id — a share must outlive the 30-day purge.
            if (article) void Share.share({ message: plainText(article.title), url: article.url });
          }}
        />
      ) : null}

      {quiet ? (
        // ⚠ The crown and its filter pill stay interactive over an empty feed:
        // a reader who picked a quiet league must be able to pick another.
        <View pointerEvents="none" style={[styles.quiet, { top: Size.reelQuietTop + insets.top }]}>
          <Text variant="body" color="textDim" center>
            {copy.news.quiet}
          </Text>
        </View>
      ) : null}

      <ReelCrown
        backLabel={copy.today.title}
        title={copy.news.title}
        count={phrases.stories(items.length)}
        filterLabel={filterLabel}
        filterOpen={filterOpen}
        savedLabel={copy.news.savedTitle}
        topInset={insets.top}
        onBack={() => router.back()}
        onToggleFilter={() => setFilterOpen((openNow) => !openNow)}
        onSaved={() => router.push('/news-saved')}
      />

      {filterOpen ? (
        <ReelFilterPanel
          chips={chips}
          activeChip={filter}
          onChip={(id) => {
            setFilter(id);
            setFilterOpen(false);
          }}
          onClose={() => setFilterOpen(false)}
          eyebrow={copy.news.leagueFilter}
          attribution={copy.news.attribution}
          topInset={insets.top}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.reelGround },
  quiet: { position: 'absolute', left: 0, right: 0, paddingHorizontal: Spacing.six },
});
