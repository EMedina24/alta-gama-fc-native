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
 */
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/atoms';
import { NewsList, type NewsGroup } from '@/components/organisms/news-list';
import { BottomTabInset, Colors, Spacing } from '@/constants/theme';
import { openArticle } from '@/features/news/open';
import { findLeagueByApiSlug } from '@/lib/cronogol/leagues';
import {
  articleTopic,
  groupNewsByDay,
  isOurs,
  newsAge,
  plainText,
  selectNewsItems,
} from '@/lib/cronogol/news';
import type { NewsArticleView, NewsLeagueView } from '@/lib/cronogol/types';
import { formatFixtureDate, zonedDayKey } from '@/lib/format';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useNews, useNewsByLeague, useNewsLeagues } from '@/queries/use-news';
import { setNewsSeenAt, useZone } from '@/store/preferences';

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

  const groups: NewsGroup[] = groupNewsByDay(items, now, (iso) => zonedDayKey(iso, zone)).map(
    (group) => ({
      label:
        group.kind === 'today'
          ? copy.news.today
          : group.kind === 'yesterday'
            ? copy.news.yesterday
            : formatFixtureDate(group.items[0].publishedAt, zone, phrases),
      count: phrases.stories(group.items.length),
      rows: group.items.map((article) => ({
        key: article.id,
        title: plainText(article.title),
        imageUrl: article.imageUrl,
        topic: articleTopic(article),
        publisher: article.publisher.name,
        age: newsAge(article.publishedAt, now),
        onPress: () => open(article),
      })),
    }),
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '',
          headerTransparent: true,
          headerTintColor: Colors.dark.accent,
          // ⚠ Chevron only — the inherited label would print "(tabs)".
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 44, paddingBottom: BottomTabInset },
        ]}>
        <Text variant="largeTitle">{copy.news.title}</Text>
        <NewsList
          chips={chips}
          activeChip={filter}
          onChip={setFilter}
          groups={groups}
          loading={feed.isPending}
          copy={copy.news}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.background },
  content: { paddingHorizontal: Spacing.five, gap: Spacing.four },
});
