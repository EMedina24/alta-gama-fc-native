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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Eyebrow, SkeletonRows, Text } from '@/components/atoms';
import {
  LeagueSwitch,
  MatchdayPager,
  MatchdayStrip,
  type LeagueOption,
} from '@/components/molecules';
import { FixtureList } from '@/components/organisms/fixture-list';
import { ScreenScaffold } from '@/components/templates/screen-scaffold';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import { currentMatchweek, isIda, isMidweek } from '@/lib/cronogol/jornada';
import { LEAGUES, SEASON, seasonLabel } from '@/lib/cronogol/leagues';
import { formatDateRange } from '@/lib/format';
import { zoneAbbreviation } from '@/lib/timezones';
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

  /**
   * ⚠ The ONE setter the strip and the pager share, clamped to this league's
   * count. A second state for the arrows is how they drift from the strip.
   */
  const goTo = useCallback(
    (n: number) => setMatchweek(total === null ? n : Math.min(Math.max(n, 1), total)),
    [total],
  );

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
      // ⚠ `icon` is the icon-only cut and is LaLiga's alone today; `primary`
      // is the full lockup. The tiles carry no text label (ADR 0031).
      logoUrl: art?.logoUrls?.icon ?? art?.logoUrls?.primary ?? art?.logoUrl ?? null,
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

  // ⚠ Gated on `kickoffsConfirmed`: provisional dates print a range that moves.
  // The zone goes with the range — an abbreviation for times that do not exist
  // yet says nothing — and is read AT the round's kickoff, so CET/CEST is right.
  const rangeConfirmed =
    summary !== null &&
    summary.kickoffsConfirmed &&
    summary.firstKickoffUtc !== null &&
    summary.lastKickoffUtc !== null;
  const rangeLabel =
    rangeConfirmed && summary.firstKickoffUtc && summary.lastKickoffUtc
      ? formatDateRange(summary.firstKickoffUtc, summary.lastKickoffUtc, zone, phrases)
      : copy.matchdays.datesPending;
  const rangeMeta = summary
    ? [
        phrases.matches(summary.count),
        rangeConfirmed && summary.firstKickoffUtc
          ? zoneAbbreviation(zone, new Date(summary.firstKickoffUtc))
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
        .toUpperCase()
    : '';

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
          {total !== null && matchweek !== null && summary ? (
            <MatchdayPager
              canPrev={matchweek > 1}
              canNext={matchweek < total}
              onPrev={() => goTo(matchweek - 1)}
              onNext={() => goTo(matchweek + 1)}
              prevLabel={copy.matchdays.previous}
              nextLabel={copy.matchdays.next}
              primary={rangeLabel}
              primaryTone={rangeConfirmed ? 'textSecondary' : 'textFaint'}
              secondary={rangeMeta}
            />
          ) : null}
          <LeagueSwitch leagues={options} active={league.slug} onSelect={setLeagueSlug} />
          {total !== null && matchweek !== null ? (
            <View style={styles.strip}>
              <Eyebrow small>{copy.matchdays.stripLabel}</Eyebrow>
              <MatchdayStrip
                total={total}
                current={matchweek}
                played={played}
                onSelect={goTo}
                label={copy.matchdays.title}
              />
            </View>
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
        <SkeletonRows count={6} height={Size.rowSkeleton} />
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
  strip: { gap: Spacing.two },
  addAll: { borderRadius: Radius.control, borderColor: Colors.dark.accentRing },
  state: { gap: Spacing.four, paddingVertical: Spacing.six },
});
