/**
 * The league table.
 *
 * ⚠ Three things this screen gets right that the obvious implementation gets
 * wrong, all of them documented at the function they call:
 *
 * 1. `tables` is ordered by league SLUG, not editorially. We sort by
 *    `League.order` so LaLiga leads (Spain is the market).
 * 2. The caption uses `completedMatchweek(matchweeks, table.lastMatchUtc)` —
 *    measured against the TABLE'S OWN last kickoff, not the wall clock — over
 *    `roundCount(league)`, never the payload's `matchesTotal` (380 vs 38).
 * 3. **The caption can legitimately be `null`**, and is on live data right now:
 *    LaLiga matchday 1 has a deferred fixture after matchday 2 has finished, so
 *    no matchday is complete. The header degrades to the club count rather than
 *    inventing a number — see `completedMatchweek`'s own comment.
 */
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, SkeletonRows, Text } from '@/components/atoms';
import { LeagueSwitch, type LeagueOption } from '@/components/molecules';
import { StandingsTable } from '@/components/organisms/standings-table';
import { ScreenScaffold } from '@/components/templates/screen-scaffold';
import { Size, Spacing } from '@/constants/theme';
import { LEAGUES, byEditorialOrder, findLeagueByApiSlug, roundCount } from '@/lib/cronogol/leagues';
import { completedMatchweek } from '@/lib/cronogol/standings';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useAllSeasonJornadas, useStandings } from '@/queries/use-standings';
import { usePreferences } from '@/store/preferences';

export default function TableScreen() {
  const router = useRouter();
  const { copy, phrases } = useI18n();
  const { followed } = usePreferences();
  const standings = useStandings();
  const jornadas = useAllSeasonJornadas();

  const [activeSlug, setActiveSlug] = useState(LEAGUES[0].slug);
  const league = LEAGUES.find((l) => l.slug === activeSlug) ?? LEAGUES[0];

  /**
   * ⚠ Filtered to leagues we hold config for, and sorted editorially. The API
   * returns five tables including `segunda`, which has no `League` entry — and a
   * table with no config cannot be banded, so showing it would be a tab whose
   * rails silently never appear.
   */
  const tables = useMemo(() => {
    const rows = standings.data?.tables ?? [];
    return rows
      .map((table) => ({ table, league: findLeagueByApiSlug(table.league.slug) }))
      .filter((entry): entry is { table: (typeof rows)[number]; league: typeof league } =>
        Boolean(entry.league),
      )
      .sort((a, b) => byEditorialOrder(a.league, b.league));
  }, [standings.data]);

  const current = tables.find((entry) => entry.league.slug === league.slug);

  const options: LeagueOption[] = tables.map(({ table, league: l }) => ({
    slug: l.slug,
    name: l.name,
    // ⚠ `icon` is the icon-only cut and is LaLiga's alone today; `primary`
    // is the full lockup. The tiles carry no text label (ADR 0031).
    logoUrl: table.league.logoUrls?.icon ?? table.league.logoUrls?.primary ?? table.league.logoUrl ?? null,
  }));

  const eyebrow = useMemo(() => {
    if (!current) return undefined;
    const index = jornadas.byLeague[current.league.apiSlug];
    const done = index ? completedMatchweek(index.matchweeks, current.table.lastMatchUtc) : null;
    const clubs = copy.table.clubCount(current.table.clubs);
    return done === null
      ? clubs
      : `${copy.table.afterMatchday(done, roundCount(current.league))} · ${clubs}`;
  }, [current, jornadas.byLeague, copy]);

  return (
    <ScreenScaffold
      title={copy.table.title}
      eyebrow={eyebrow}
      onRefresh={() => void standings.refetch()}
      refreshing={standings.isRefetching}
      sticky={
        options.length > 0 ? (
          <LeagueSwitch leagues={options} active={league.slug} onSelect={setActiveSlug} />
        ) : null
      }>
      {standings.isPending ? (
        <SkeletonRows count={10} height={Size.rowSkeleton} />
      ) : standings.isError ? (
        <View style={styles.state}>
          <Text color="textSecondary">{copy.table.error}</Text>
          <Button label={copy.table.retry} tone="secondary" onPress={() => void standings.refetch()} />
        </View>
      ) : !current ? (
        <Text color="textSecondary">{copy.table.empty}</Text>
      ) : (
        <>
          <StandingsTable
            table={current.table}
            league={current.league}
            followed={followed}
            // ⚠ Object form, not a template string: typed routes validate the
            // pathname against the route tree and the params separately.
            onOpenClub={(slug) => router.push({ pathname: '/club/[slug]', params: { slug } })}
            copy={{
              pos: copy.table.pos,
              club: copy.table.club,
              played: copy.table.played,
              points: copy.table.points,
              statLabels: copy.table.statLabels,
              formLabel: copy.table.formLabel,
              openClub: copy.table.openClub,
              zoneLabels: copy.table.zoneLabels,
              formLetters: phrases.formLetters,
            }}
          />
          <Text variant="footnote" color="textFaint">
            {copy.table.footnote}
          </Text>
        </>
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  state: { gap: Spacing.four, paddingVertical: Spacing.six },
});
