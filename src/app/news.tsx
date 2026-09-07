/**
 * The News screen — a FRONT PAGE again (ADR 0130, retiring 0129's reel),
 * pushed from the Today card (ADR 0064).
 *
 * The newest story is the HERO: its photo bleeds from behind the status bar
 * with the white title over it, and the glass lead card overlaps the photo's
 * foot. Below: the neutral chip rail, then a FLAT, INFINITE run of story rows
 * — no day groups, no 48h cutoff; the keyset pager from the reel era stands.
 *
 * ⚠ Sits outside `(tabs)/` so it pushes over the tab bar, like `club/[slug]`.
 *
 * ⚠ ONE feed, four consumers. `useNewsFeed` pages by keyset but SEEDS page one
 * from the `useNews()` cache the widget writer and the Today card already
 * hold — opening this screen is a cache read. Only scrolling past page one,
 * or a league chip, spends a request.
 *
 * ⚠ Ages are computed against `now` at RENDER, never at fetch — one `now` per
 * render, as the Today board does.
 *
 * ⚠ `newsSeenAt` is written on MOUNT — opening the screen is what clears the
 * Today card's NEW count.
 *
 * ⚠⚠ **The `4 NEW` eyebrow reads the stamp CAPTURED AT OPEN, never the live
 * preference** (trap 41, ADR 0070's lesson): the mount effect overwrites
 * `newsSeenAt` within the first frame; a count computed from the store would
 * say `4 NEW` for one render and `0` for the rest. `seenAtOpen` is a lazy
 * `useState` initialiser and does not change while the screen is up.
 *
 * ⚠ Saving moved INTO the story sheet (0130) — nothing on this screen saves;
 * the bookmark circle by the date block is the Saved screen's doorway.
 */
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookmarkGlyph, ChipButton, MeshGround, SkeletonRows, Text, WashGradient } from '@/components/atoms';
import { NewsLeadCard, NewsRow } from '@/components/molecules';
import { BottomTabInset, Colors, NewsHero, Size, Spacing } from '@/constants/theme';
import { openArticle } from '@/features/news/open';
import { findLeagueByApiSlug } from '@/lib/cronogol/leagues';
import {
  articleTopic,
  isOurs,
  mergeNewsPages,
  newsAge,
  newsCardPick,
  plainText,
  selectFeedItems,
} from '@/lib/cronogol/news';
import type { NewsArticleView, NewsLeagueView } from '@/lib/cronogol/types';
import { formatWeekdayLong } from '@/lib/format';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useNewsLeagues } from '@/queries/use-news';
import { useNewsFeed } from '@/queries/use-news-feed';
import { setNewsSeenAt, usePreferences, useZone } from '@/store/preferences';

const ALL = 'all';

/**
 * The chip set: the server's league list, KEPT TO the leagues we hold clubs
 * for, in the SERVER's order, named with our own `League.name`.
 *
 * ⚠ Not hardcoded — the contract forbids it — and not re-sorted, which it
 * forbids twice. The intersection is ours: the registry answers nine leagues,
 * seven of which no reader here follows a club in, and a nine-chip rail is a
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
  const { height } = useWindowDimensions();
  const { copy, phrases } = useI18n();
  const zone = useZone();

  const [filter, setFilter] = useState<string>(ALL);
  const [heroFailed, setHeroFailed] = useState(false);

  const { newsSeenAt } = usePreferences();
  // ⚠ Captured once — see the docblock. Not `newsSeenAt` itself.
  const [seenAtOpen] = useState(() => newsSeenAt);

  const feed = useNewsFeed(filter === ALL ? null : filter);
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
    () => selectFeedItems(mergeNewsPages(feed.data?.pages ?? [])),
    [feed.data],
  );

  const newCount = newsCardPick(articles, seenAtOpen).newCount;
  const lead = articles.length > 0 ? articles[0] : null;
  const rows = articles.slice(1);

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

  const heroH = Math.round(height * NewsHero.height);
  const heroImage = lead?.imageUrl && !heroFailed ? lead.imageUrl : null;

  const header = (
    <View style={styles.header}>
      <View style={[styles.hero, { height: heroH }]}>
        {heroImage ? (
          <>
            <Image
              source={{ uri: heroImage }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={150}
              // The row/thumb rule at hero scale: a dead URL leaves the
              // ground, never a broken frame (`NewsThumb`'s pattern).
              onError={() => setHeroFailed(true)}
              accessible={false}
            />
            <View style={styles.heroDim} />
          </>
        ) : null}
        <View style={[styles.heroFade, { height: NewsHero.fadeH }]}>
          <WashGradient angle="vertical" stops={NewsHero.fade} />
        </View>

        <View style={[styles.heroContent, { paddingTop: insets.top + Spacing.two }]}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={copy.today.title}
            hitSlop={8}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Text variant="bodyStrong" color="accent">
              {`‹  ${copy.today.title}`}
            </Text>
          </Pressable>
          <View style={styles.masthead}>
            <Text variant="largeTitle">{copy.news.title}</Text>
            <View style={styles.dateBlock}>
              <Text variant="eyebrowSm" color="textSecondary">
                {formatWeekdayLong(now.toISOString(), zone, phrases)}
              </Text>
              {newCount > 0 ? (
                <Text variant="eyebrowSm" color="accent">
                  {copy.news.newCount(newCount)}
                </Text>
              ) : null}
              <Pressable
                onPress={() => router.push('/news-saved')}
                accessibilityRole="button"
                accessibilityLabel={copy.news.savedTitle}
                style={({ pressed }) => [styles.savedDoor, pressed && styles.pressed]}>
                <BookmarkGlyph />
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* The lead card rides UP over the hero's foot — the mock's overlap. */}
      <View style={styles.leadWrap}>
        {lead ? (
          <NewsLeadCard
            topic={articleTopic(lead)}
            publisher={lead.publisher.name}
            age={newsAge(lead.publishedAt, now)}
            title={plainText(lead.title)}
            ctaLabel={copy.news.leadCta}
            onPress={() => open(lead)}
          />
        ) : !feed.isPending ? (
          <Text variant="body" color="textDim">
            {copy.news.quiet}
          </Text>
        ) : null}
      </View>

      {/* ⚠ The chips stay visible over an EMPTY list: a reader who picked a
          quiet league must be able to pick another (handoff empty-state rule). */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.railWrap}
        contentContainerStyle={styles.rail}>
        {chips.map((chip) => (
          <ChipButton
            key={chip.id}
            label={chip.label}
            active={chip.id === filter}
            tone="neutral"
            onPress={() => {
              setHeroFailed(false);
              setFilter(chip.id);
            }}
          />
        ))}
      </ScrollView>

      {feed.isPending ? (
        <View style={styles.rowPad}>
          <SkeletonRows count={5} height={Size.newsStoryThumb + Spacing.three * 2} />
        </View>
      ) : null}
    </View>
  );

  const footer = (
    <View style={styles.footer}>
      {!feed.isPending && articles.length > 0 && !feed.hasNextPage ? (
        <Text variant="footnote" color="textDim" center>
          {copy.news.caughtUp}
        </Text>
      ) : null}
      {/* ⚠ Attribution is not a footnote to trim: it is what makes collecting
          third-party headlines defensible. */}
      <Text variant="footnote" color="textFaint">
        {copy.news.attribution}
      </Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <MeshGround />
      {/* ⚠ No native header (ADR 0092, kept by 0130): the screen draws its own
          lime back link, which can NAME where it goes. */}
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        data={rows}
        keyExtractor={(article) => article.id}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ItemSeparatorComponent={RowGap}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: BottomTabInset }}
        onEndReached={() => {
          if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        renderItem={({ item: article }) => (
          <View style={styles.rowPad}>
            <NewsRow
              title={plainText(article.title)}
              imageUrl={article.imageUrl}
              topic={articleTopic(article)}
              publisher={article.publisher.name}
              age={newsAge(article.publishedAt, now)}
              onPress={() => open(article)}
            />
          </View>
        )}
      />
    </View>
  );
}

function RowGap() {
  return <View style={styles.rowGap} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.background },
  header: { marginBottom: Spacing.four },
  hero: { position: 'relative', overflow: 'hidden' },
  heroDim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: NewsHero.dim,
  },
  heroFade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  heroContent: { flex: 1, paddingHorizontal: Spacing.five },
  back: { alignSelf: 'flex-start', marginBottom: Spacing.two },
  masthead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  dateBlock: { alignItems: 'flex-end', gap: Spacing.one, paddingTop: Spacing.two },
  savedDoor: {
    width: Size.newsAction,
    height: Size.newsAction,
    borderRadius: Size.newsAction / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.glassFill,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.glassLine,
    marginTop: Spacing.one,
  },
  leadWrap: { paddingHorizontal: Spacing.five, marginTop: -NewsHero.overlap },
  railWrap: { marginTop: Spacing.four },
  rail: { paddingHorizontal: Spacing.five, gap: Spacing.two },
  rowPad: { paddingHorizontal: Spacing.five },
  rowGap: { height: Spacing.three },
  footer: { paddingHorizontal: Spacing.five, paddingTop: Spacing.four, gap: Spacing.three },
  pressed: { opacity: 0.7 },
});
