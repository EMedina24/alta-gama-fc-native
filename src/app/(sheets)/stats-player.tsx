/**
 * The Season stats player picker (ADR 0141) — the "Change" chip's destination.
 *
 * ⚠ **This fetches nothing.** `useClubSquad(slug)` hits the same query key the
 * club page and the stats screen already filled, so opening the sheet is a
 * cache read. (If the cache was collected in between, React Query refetches;
 * that is the pending branch, not an error.)
 *
 * ⚠⚠ **The list is filtered to players who can actually be looked up**, via
 * `statsSlug` — the league must publish player stats at all, and the row must
 * carry a slug. A squad row with no slug has no `/cronogol/players/{slug}`
 * URL behind it, so offering it would open a screen that can only fail. Today
 * that filter empties the list for every league but LaLiga, which is why the
 * chip that opens this sheet is not rendered there either.
 *
 * ⚠ The selection travels back through `store/stats-player`, NOT a route param:
 * `router.setParams` after `router.back()` applies to whichever route is focused
 * when it runs, which is a race. The Starting XI sheets commit to a store for
 * the same reason. It travels as the SLUG, because that is what the stats route
 * takes — the one place in this app where a slug beats the person `id`.
 *
 * ⚠ Trap 19 — inside a `formSheet`, `flex: 1` collapses to zero. The list is a
 * `ScrollView` with a `stickyHeaderIndices` head, never a flexed sibling.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, PlayerPhoto, SkeletonRows, Text } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import { leagueOfClub } from '@/lib/cronogol/standings';
import { statsSlug } from '@/lib/cronogol/stats';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useClubSquad } from '@/queries/use-club';
import { useStandings } from '@/queries/use-standings';
import { chooseStatsPlayer, useStatsPlayer } from '@/store/stats-player';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

export default function StatsPlayerSheet() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { copy } = useI18n();
  const chosen = useStatsPlayer(slug);

  const squad = useClubSquad(slug);
  const standings = useStandings();
  const league = leagueOfClub(standings.data?.tables, slug);

  const players = (squad.data?.players ?? []).filter((p) => statsSlug(p, league) !== null);

  const choose = (playerSlug: string) => {
    chooseStatsPlayer(slug, playerSlug);
    router.back();
  };

  if (squad.isPending) {
    return (
      <View style={styles.state}>
        <SkeletonRows count={5} height={Size.rowSkeleton} />
      </View>
    );
  }

  if (players.length === 0) {
    return (
      <View style={styles.state}>
        <Text variant="body" color="textSecondary">
          {copy.club.squadEmpty}
        </Text>
        <Button label={copy.sheets.close} tone="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      stickyHeaderIndices={[0]}
      showsVerticalScrollIndicator={false}>
      <View style={styles.head}>
        <Text variant="headline">{copy.stats.choosePlayer}</Text>
      </View>
      {players.map((p) => {
        const selected = p.slug === chosen;
        return (
          <Pressable
            key={p.id}
            onPress={() => p.slug && choose(p.slug)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={p.shortName ?? p.name}
            style={({ pressed }) => [
              styles.row,
              selected && styles.rowSelected,
              pressed && styles.rowPressed,
            ]}>
            <Text variant="xiNumeral" color="textFaint" tabular style={styles.shirt}>
              {/* ⚠ A null shirt renders EMPTY, never 0 — a squad number nobody
                  has been given is not the number zero. */}
              {p.shirt === null ? '' : `${p.shirt}`}
            </Text>
            <PlayerPhoto src={p.photoUrl} variant="row" />
            <Text variant="bodyStrong" numberOfLines={1} style={styles.name}>
              {p.shortName ?? p.name}
            </Text>
            <Text variant="eyebrowSm" color="textDim">
              {p.position}
            </Text>
          </Pressable>
        );
      })}
      <Button label={copy.sheets.close} tone="secondary" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  state: { padding: Spacing.five, paddingTop: Spacing.six, gap: Spacing.four },
  content: { padding: Spacing.five, paddingTop: 0, gap: Spacing.one, paddingBottom: Spacing.six },
  head: {
    backgroundColor: Colors.dark.sheetGround,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.control,
    minHeight: Size.minTouch,
  },
  rowSelected: { backgroundColor: Colors.dark.accentWash },
  rowPressed: { backgroundColor: Colors.dark.rowActive },
  // ⚠ A fixed column so the portraits line up; two digits at `xiNumeral`.
  shirt: { width: 26, textAlign: 'center' },
  name: { flex: 1, minWidth: 0 },
});
