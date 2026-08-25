/**
 * One league's published matchday.
 *
 * ⚠ The three things this screen must not get wrong, each documented at the
 * function it calls:
 *
 * 1. The strip is sized from `totalMatchweeks`, never a literal — 34 in the
 *    Bundesliga, 42 in segunda.
 * 2. The opening round comes from `currentMatchweek`, which sorts on
 *    `firstKickoffUtc` because the API's order is by NUMBER and matchweek 6 can
 *    kick off before matchweek 5.
 * 3. Switching league **clamps** the round to that league's count, or a reader
 *    on LaLiga round 38 lands on a Bundesliga round that does not exist.
 *
 * ⚠ `kickoffsConfirmed: false` is NORMAL, not an ingest gap — most of the season
 * on most leagues. It renders as one calm sentence, never a banner or a spinner.
 */
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/atoms';
import { LeagueSwitch, MatchdayStrip, type LeagueOption } from '@/components/molecules';
import { FixtureList } from '@/components/organisms/fixture-list';
import { ScreenScaffold } from '@/components/templates/screen-scaffold';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { currentMatchweek, isIda, isMidweek } from '@/lib/cronogol/jornada';
import { LEAGUES, SEASON, seasonLabel } from '@/lib/cronogol/leagues';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useJornada, useSeasonJornadas } from '@/queries/use-jornada';
import { useLeagueArtwork } from '@/queries/use-leagues';
import { useZone, usePreferences } from '@/store/preferences';

export default function MatchdaysScreen() {
  const router = useRouter();
  const { copy, phrases } = useI18n();
  const zone = useZone();
  const { clock } = usePreferences();

  const [leagueSlug, setLeagueSlug] = useState(LEAGUES[0].slug);
  const league = LEAGUES.find((l) => l.slug === leagueSlug) ?? LEAGUES[0];

  const artwork = useLeagueArtwork();
  const index = useSeasonJornadas(league);
  const [matchweek, setMatchweek] = useState<number | null>(null);

  const total = index.data?.totalMatchweeks ?? null;

  // Open on the live round once the index lands, and clamp on every league switch.
  useEffect(() => {
    if (!index.data) return;
    const fallback = currentMatchweek(index.data.matchweeks, new Date())?.matchweek ?? 1;
    setMatchweek((previous) => {
      if (previous === null) return fallback;
      const cap = index.data.totalMatchweeks;
      return cap !== null ? Math.min(previous, cap) : previous;
    });
  }, [index.data]);

  const jornada = useJornada(league, matchweek);

  /** Rounds whose last kickoff has passed, for the strip's played styling. */
  const played = useMemo(() => {
    const now = Date.now();
    const done = new Set(
      (index.data?.matchweeks ?? [])
        .filter((w) => w.lastKickoffUtc !== null && Date.parse(w.lastKickoffUtc) < now)
        .map((w) => w.matchweek),
    );
    return (n: number) => done.has(n);
  }, [index.data]);

  const options: LeagueOption[] = LEAGUES.map((l) => {
    const art = artwork.data?.[l.apiSlug];
    return {
      slug: l.slug,
      name: l.name,
      logoUrl: art?.logoUrls?.primary ?? art?.logoUrl ?? null,
      // Only LaLiga and the Premier League ship artwork carrying their own name.
      hasWordmark: l.slug === 'la-liga' || l.slug === 'premier-league',
    };
  });

  const summary = index.data?.matchweeks.find((w) => w.matchweek === matchweek) ?? null;
  const half = league.hasHalves && matchweek !== null
    ? isIda(matchweek, total)
      ? copy.matchdays.firstHalf
      : copy.matchdays.secondHalf
    : null;

  const midweek = summary
    ? isMidweek(summary.firstKickoffUtc, summary.kickoffsConfirmed, league.apiSlug)
    : false;

  const data = jornada.data;
  const missing =
    data && !data.complete && data.expectedCount !== null && data.count < data.expectedCount
      ? data.expectedCount - data.count
      : null;

  return (
    <ScreenScaffold
      title={matchweek === null ? '' : copy.matchdays.title(matchweek)}
      eyebrow={copy.matchdays.eyebrow(league.name, seasonLabel(SEASON), half)}
      onRefresh={() => void jornada.refetch()}
      refreshing={jornada.isRefetching}
      sticky={
        <View style={styles.controls}>
          <LeagueSwitch leagues={options} active={league.slug} onSelect={setLeagueSlug} />
          {total !== null && matchweek !== null ? (
            <MatchdayStrip
              total={total}
              current={matchweek}
              played={played}
              onSelect={setMatchweek}
            />
          ) : null}
        </View>
      }>
      {midweek ? (
        <Text variant="eyebrowSm" color="accent">
          {copy.matchdays.midweek}
        </Text>
      ) : null}

      {jornada.isError ? (
        <View style={styles.state}>
          <Text color="textSecondary">{copy.matchdays.error}</Text>
          <Button label={copy.matchdays.retry} tone="secondary" onPress={() => void jornada.refetch()} />
        </View>
      ) : jornada.isPending || matchweek === null ? (
        <Text color="textFaint">…</Text>
      ) : data && data.fixtures.length === 0 ? (
        <Text color="textSecondary">{copy.matchdays.empty}</Text>
      ) : data ? (
        <>
          <View style={styles.addAll}>
            <Button
              label={copy.matchdays.addAll(data.count)}
              tone="outline"
              onPress={() =>
                router.push({
                  pathname: '/(sheets)/calendar-jornada',
                  params: { league: league.apiSlug, matchweek: String(matchweek) },
                })
              }
            />
          </View>

          {!data.kickoffsConfirmed ? (
            <Text variant="footnote" color="textFaint">
              {copy.matchdays.timesPending}
            </Text>
          ) : null}

          {missing !== null ? (
            <Text variant="footnote" color="textFaint">
              {copy.matchdays.missing(missing)}
            </Text>
          ) : null}

          <FixtureList
            fixtures={data.fixtures}
            zone={zone}
            clock={clock}
            phrases={phrases}
            finishedLabel={copy.matchdays.finished}
          />
        </>
      ) : null}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  controls: { gap: Spacing.three },
  addAll: { borderRadius: Radius.control, borderColor: Colors.dark.accentRing },
  state: { gap: Spacing.four, paddingVertical: Spacing.six },
});
