/**
 * The News screen — pushed from the Today card (ADR 0064).
 *
 * ⚠ Sits outside `(tabs)/` so it pushes over the tab bar, like `club/[slug]`.
 * The handoff drew the tab bar still visible; keeping it would mean nesting a
 * Stack inside the Today tab under `NativeTabs`, which nothing else in the app
 * does. Recorded as a deliberate deviation.
 *
 * ⚠ ONE feed, three consumers. `useNews()` is the query the widget writer and
 * the Today card already hold — opening this screen is a cache read. Only a
 * league chip spends a request, and only while it is active.
 *
 * ⚠ Age and day groups are computed against `now` at RENDER, never at fetch:
 * a list opened at 00:05 re-buckets last night's stories into YESTERDAY
 * without a refetch. One `now` per render, as the Today board does.
 *
 * ⚠ `newsSeenAt` is written on MOUNT — opening the screen is what clears the
 * card's NEW count. It is an effect with no setState, so it is not the lint
 * error this repo already carries six of.
 *
 * ⚠⚠ **The `N NEW` pill reads the stamp CAPTURED AT OPEN, never the live
 * preference** (ADR 0070). The mount effect above overwrites `newsSeenAt`
 * within the first frame; a pill computed from the store would say `6 NEW`
 * for one render and `0` for the rest. `seenAtOpen` is a lazy `useState`
 * initialiser and does not change while the screen is up.
 *
 * ⚠ Every group is a flat list of story CARDS (ADR 0092). The front page —
 * one lead and two tiles on the first group — is gone, and with it the last
 * consumer of `frontPagePick`.
 */
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Eyebrow, MeshGround, Text } from '@/components/atoms';
import { NewsList, type NewsGroup } from '@/components/organisms/news-list';
import { BottomTabInset, Colors, Spacing } from '@/constants/theme';
import { openArticle } from '@/features/news/open';
import { findLeagueByApiSlug } from '@/lib/cronogol/leagues';
import {
  articleTopic,
  groupNewsByDay,
  isOurs,
  newsAge,
  newsCardPick,
  plainText,
  selectNewsItems,
} from '@/lib/cronogol/news';
import type { NewsArticleView, NewsLeagueView } from '@/lib/cronogol/types';
import { formatFixtureDate, zonedDayKey } from '@/lib/format';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useNews, useNewsByLeague, useNewsLeagues } from '@/queries/use-news';
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
  const { copy, phrases } = useI18n();
  const zone = useZone();

  const [filter, setFilter] = useState<string>(ALL);
  const { newsSeenAt } = usePreferences();
  // ⚠ Captured once — see the docblock. Not `newsSeenAt` itself.
  const [seenAtOpen] = useState(() => newsSeenAt);

  const global = useNews();
  const byLeague = useNewsByLeague(filter === ALL ? null : filter);
  const leagues = useNewsLeagues();

  useEffect(() => {
    setNewsSeenAt(new Date().toISOString());
  }, []);

  const feed = filter === ALL ? global : byLeague;
  const now = new Date();

  const chips = useMemo(
    () => [{ id: ALL, label: copy.news.all }, ...leagueChips(leagues.data ?? [])],
    [leagues.data, copy.news.all],
  );

  /**
   * ⚠ Through `selectNewsItems` with the feed's own length as the budget: the
   * 48h cutoff and the unprintable-row filter are the widget's rules and this
   * screen's too — a story with no parseable date has no honest age to print.
   */
  const articles = feed.data?.articles ?? [];
  const items = selectNewsItems(articles, now, articles.length);
  /** Over the WHOLE selected feed, not the Today card's three. */
  const newCount = newsCardPick(items, seenAtOpen).newCount;

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

  const row = (article: NewsArticleView) => ({
    key: article.id,
    title: plainText(article.title),
    imageUrl: article.imageUrl,
    topic: articleTopic(article),
    publisher: article.publisher.name,
    age: newsAge(article.publishedAt, now),
    onPress: () => open(article),
  });

  /**
   * ⚠ EVERY story in the group is a row now (ADR 0092): the front-page split
   * — `frontPagePick`'s lead and tiles — is gone, and the whole group maps
   * straight to cards. Nothing may be dropped here; a story that is neither
   * lead nor row simply vanishes from the screen, which is what a partial
   * migration would have done.
   */
  const groups: NewsGroup[] = groupNewsByDay(items, now, (iso) => zonedDayKey(iso, zone)).map(
    (group) => ({
      label:
        group.kind === 'today'
          ? copy.news.today
          : group.kind === 'yesterday'
            ? copy.news.yesterday
            : formatFixtureDate(group.items[0].publishedAt, zone, phrases),
      count: phrases.stories(group.items.length),
      rows: group.items.map(row),
    }),
  );

  return (
    <View style={styles.screen}>
      <MeshGround />
      {/* ⚠ No native header (ADR 0092, as the club page did in 0091): the
          screen draws its own lime back link, which can NAME where it goes —
          the native button's inherited label printed the route group. */}
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.two, paddingBottom: BottomTabInset },
        ]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={copy.today.title}
          hitSlop={8}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}>
          <Text variant="bodyStrong" color="accent">
            {`‹  ${copy.today.title}`}
          </Text>
        </Pressable>
        <View style={styles.masthead}>
          <Text variant="largeTitle">{copy.news.title}</Text>
          {/* The reader's own day, in their zone — the same formatter every
              date on the app uses, so the two never disagree. */}
          <Eyebrow color="textFaint" style={styles.date}>
            {formatFixtureDate(now.toISOString(), zone, phrases)}
          </Eyebrow>
        </View>
        <NewsList
          chips={chips}
          activeChip={filter}
          onChip={setFilter}
          groups={groups}
          loading={feed.isPending}
          newLabel={newCount > 0 ? copy.news.newCount(newCount) : null}
          copy={copy.news}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.background },
  content: { paddingHorizontal: Spacing.five, gap: Spacing.four },
  back: { alignSelf: 'flex-start' },
  masthead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  date: { paddingBottom: Spacing.one },
});
