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
 *
 * ⚠⚠ **The Champions League tab is a SECOND DATA PATH through the same chrome**
 * (ADR 0156). Its round list is a different route with a different shape, and
 * four of this screen's domestic assumptions do not hold on it:
 *
 *   - **No `totalMatchweeks`.** The league phase is Swiss, so `2 * (clubs - 1)`
 *     is nonsense (70 against a real 8). The pager sizes off the index's own
 *     `matchdays.length`.
 *   - **No `complete` and no `expectedCount`.** The cup route refuses the
 *     ambiguous word and hands over `finished` and `fixtures` instead, so the
 *     "missing matches" line has nothing to say and is not drawn.
 *   - **No `kickoffsConfirmed`.** There is a per-round `kickoffsTbd` COUNT,
 *     which is the same claim better stated.
 *   - **The events route is a different one**, keyed on a different id. See
 *     `eventsSource`.
 */
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Button,
  ChipButton,
  Eyebrow,
  SkeletonRows,
  Text,
  competitionMarkKind,
} from '@/components/atoms';
import {
  LeagueSwitch,
  MatchdayPager,
  MatchdayStrip,
  type LeagueOption,
} from '@/components/molecules';
import { FixtureList } from '@/components/organisms/fixture-list';
import { AvatarButton, ScreenScaffold } from '@/components/templates/screen-scaffold';
import { useIdentityInitials } from '@/features/auth/use-identity';
import { Size, Spacing } from '@/constants/theme';
import {
  UCL_LEAGUE_PHASE,
  uclFixtureRow,
  uclOpeningRound,
  uclRoundPlayed,
  type Competition,
} from '@/lib/cronogol/competitions';
import { currentMatchweek, isIda, isMidweek } from '@/lib/cronogol/jornada';
import {
  ROUND_LEAGUES,
  SEASON,
  leagueOptions,
  seasonLabel,
  type League,
} from '@/lib/cronogol/leagues';
import { formatDateRange } from '@/lib/format';
import { zoneAbbreviation } from '@/lib/timezones';
import { useI18n } from '@/lib/i18n/use-i18n';
import {
  useJornada,
  useSeasonJornadas,
  useUclJornada,
  useUclSeasonRounds,
} from '@/queries/use-jornada';
import { useLeagueArtwork } from '@/queries/use-leagues';
import { useZone, usePreferences } from '@/store/preferences';

export default function MatchdaysScreen() {
  const router = useRouter();
  const initials = useIdentityInitials();
  const { copy, phrases } = useI18n();
  const zone = useZone();
  const { clock } = usePreferences();

  /**
   * ⚠ `ROUND_LEAGUES` throughout this screen, never the whole catalogue. A
   * league without a matchweek index (Puerto Rico) does not 404 here — it
   * returns an empty index, which would draw a full pager of empty rounds.
   */
  const [leagueSlug, setLeagueSlug] = useState(ROUND_LEAGUES[0].slug);
  /**
   * ⚠ A union, for the reason ADR 0150 gives on the Table screen: the obvious
   * `ROUND_LEAGUES.find(...) ?? ROUND_LEAGUES[0]` answers LaLiga for
   * `'champions-league'`, so the cup chip would light up over a LaLiga round.
   */
  const active: { kind: 'league'; league: League } | { kind: 'ucl'; competition: Competition } =
    leagueSlug === UCL_LEAGUE_PHASE.slug
      ? { kind: 'ucl', competition: UCL_LEAGUE_PHASE }
      : {
          kind: 'league',
          league: ROUND_LEAGUES.find((l) => l.slug === leagueSlug) ?? ROUND_LEAGUES[0],
        };
  const isCup = active.kind === 'ucl';
  /**
   * ⚠⚠ **A FALLBACK, not the selection.** On the cup tab this is
   * `ROUND_LEAGUES[0]`, because the hooks below need a `League` unconditionally
   * and a hook cannot be called conditionally. It is therefore only safe to read
   * where `!isCup` — or where the value genuinely does not matter.
   *
   * ⚠ **Anything asking "which tab is selected" must read `leagueSlug`.**
   * Passing this to `LeagueSwitch`'s `active` drew LaLiga as selected while the
   * cup was showing, and — because the switch early-returns on a tap that
   * matches `active` — left no way back to LaLiga at all.
   *
   * ⚠ `useSeasonJornadas(league)` therefore fetches LaLiga's index while the cup
   * is open. Deliberate and ~free: it is the same cache entry the LaLiga tab
   * uses, so the switch back is warm rather than a spinner.
   */
  const league = active.kind === 'league' ? active.league : ROUND_LEAGUES[0];

  const artwork = useLeagueArtwork();
  const index = useSeasonJornadas(league);
  const uclIndex = useUclSeasonRounds(isCup);
  const [matchweek, setMatchweek] = useState<number | null>(null);
  /** Which competition `matchweek` belongs to — see the effect below. */
  const lastKind = useRef<'league' | 'ucl' | null>(null);

  /**
   * ⚠ **The cup's round count is the INDEX'S OWN LENGTH, never arithmetic.**
   * `roundCount()` is `2 * (clubs - 1)`, a double round robin — 70 for 36 clubs
   * against a real 8. The league phase is Swiss and the payload carries no
   * `totalMatchdays` precisely so that nobody derives one.
   */
  const total = isCup
    ? (uclIndex.data ? uclIndex.data.matchdays.length : null)
    : (index.data?.totalMatchweeks ?? null);

  /**
   * Open on the live round once the index lands, and clamp on every switch.
   *
   * ⚠ **ONE effect for both competitions, not one each.** They write the same
   * piece of state, and two effects racing to seed it would let the loser
   * overwrite the winner on the first render after a tab change.
   *
   * ⚠ The two OPENERS are picked differently, and deliberately. A league uses
   * `currentMatchweek`, which sorts on `firstKickoffUtc` because matchweek order
   * is not chronological — LaLiga matchday 1 finished after matchday 2 (trap 2).
   * The cup walks its rounds in NUMBER order and stops at the first not played
   * out: the league phase is a fixed eight-round ladder played strictly in
   * sequence, so there is no deferred opener to defend against, and
   * `firstKickoffUtc` is PROVISIONAL while `kickoffsTbd > 0` — the clock is the
   * weaker signal on this competition, not the stronger one.
   */
  useEffect(() => {
    const ucl = uclIndex.data;
    const league = index.data;
    if (isCup ? !ucl : !league) return;
    const cap = isCup ? (ucl as NonNullable<typeof ucl>).matchdays.length : league!.totalMatchweeks;
    const opener = isCup
      ? (uclOpeningRound((ucl as NonNullable<typeof ucl>).matchdays) ?? 1)
      : (currentMatchweek(league!.matchweeks, new Date())?.matchweek ?? 1);
    /**
     * ⚠⚠ **Crossing between the domestic ladder and the cup RE-SEEDS; staying
     * within one CLAMPS.** SPEC §3.2's rule — "switching league clamps the
     * matchday to that league's round count" — was written for leagues whose
     * ladders are comparable (38, 34, 42), where keeping the number is a
     * reasonable guess at intent. It is meaningless across competitions: the
     * cup's round 2 is October and LaLiga's round 2 was August, so carrying the
     * number back from an 8-round ladder to a 38-round one drops the reader on
     * a month-old round instead of the live one.
     */
    // ⚠ Derived from `isCup`, which is already a dependency — `active.kind` is
    // the same fact and would only add a dep the linter has to be told about.
    const kind = isCup ? 'ucl' : 'league';
    const crossed = lastKind.current !== null && lastKind.current !== kind;
    lastKind.current = kind;
    setMatchweek((previous) => {
      if (previous === null || crossed) return opener;
      return cap !== null ? Math.min(previous, cap) : previous;
    });
  }, [isCup, index.data, uclIndex.data]);

  /**
   * ⚠ The ONE setter the strip and the pager share, clamped to this league's
   * count. A second state for the arrows is how they drift from the strip.
   */
  const goTo = useCallback(
    (n: number) => setMatchweek(total === null ? n : Math.min(Math.max(n, 1), total)),
    [total],
  );

  const jornada = useJornada(league, isCup ? null : matchweek);
  const uclJornada = useUclJornada(isCup ? matchweek : null);

  /** Rounds whose last kickoff has passed, for the strip's played styling. */
  const played = useMemo(() => {
    if (isCup) {
      // ⚠ `finished === fixtures`, not a clock comparison: the cup index has no
      // `complete` flag by design, and a round's LAST kickoff passing does not
      // mean its matches finished — extra time and a late-finishing tie both sit
      // the wrong side of that line.
      const done = new Set(
        (uclIndex.data?.matchdays ?? []).filter(uclRoundPlayed).map((r) => r.matchday),
      );
      return (n: number) => done.has(n);
    }
    const now = Date.now();
    const done = new Set(
      (index.data?.matchweeks ?? [])
        .filter((w) => w.lastKickoffUtc !== null && Date.parse(w.lastKickoffUtc) < now)
        .map((w) => w.matchweek),
    );
    return (n: number) => done.has(n);
  }, [isCup, index.data, uclIndex.data]);

  /**
   * ⚠ The cup chip is APPENDED to the rounds-capable catalogue, never merged
   * into it — it is not a `League` (ADR 0150) and `GET /cronogol/leagues` serves
   * it no artwork, so it draws the bundled lockup. `competitionMarkKind` keys on
   * the EXACT wire string, which `Competition.name` is.
   */
  const options: LeagueOption[] = useMemo(
    () =>
      [
        ...leagueOptions(artwork.data, ROUND_LEAGUES).map((o, i) => ({
          ...o,
          order: ROUND_LEAGUES[i].order,
        })),
        {
          slug: UCL_LEAGUE_PHASE.slug,
          name: UCL_LEAGUE_PHASE.name,
          order: UCL_LEAGUE_PHASE.order,
          logoUrl: null,
          mark: competitionMarkKind(UCL_LEAGUE_PHASE.name) ?? undefined,
        },
      ]
        .sort((a, b) => a.order - b.order)
        .map(({ order: _order, ...option }) => option),
    [artwork.data],
  );

  const summary = index.data?.matchweeks.find((w) => w.matchweek === matchweek) ?? null;
  const uclSummary =
    uclIndex.data?.matchdays.find((r) => r.matchday === matchweek) ?? null;

  // ⚠ Never on the cup: `hasHalves` is a domestic idea (ida/vuelta), and the
  // league phase is a single eight-round pass with no return leg.
  const half = !isCup && league.hasHalves && matchweek !== null
    ? isIda(matchweek, total)
      ? copy.matchdays.firstHalf
      : copy.matchdays.secondHalf
    : null;

  const midweek =
    !isCup && summary
      ? isMidweek(summary.firstKickoffUtc, summary.kickoffsConfirmed, league.apiSlug)
      : false;

  // ⚠ Gated on `kickoffsConfirmed`: provisional dates print a range that moves.
  // The zone goes with the range — an abbreviation for times that do not exist
  // yet says nothing — and is read AT the round's kickoff, so CET/CEST is right.
  /**
   * ⚠ The cup states the same thing with a COUNT rather than a boolean:
   * `kickoffsTbd === 0` is its `kickoffsConfirmed`, and the payload's own
   * comment says `firstKickoffUtc`/`lastKickoffUtc` are PROVISIONAL above zero.
   * Same rule either way — a provisional range prints the pending copy, because
   * a range that moves is worse than no range.
   */
  const rangeSource = isCup
    ? uclSummary && { first: uclSummary.firstKickoffUtc, last: uclSummary.lastKickoffUtc,
                      confirmed: uclSummary.kickoffsTbd === 0, count: uclSummary.fixtures }
    : summary && { first: summary.firstKickoffUtc, last: summary.lastKickoffUtc,
                   confirmed: summary.kickoffsConfirmed, count: summary.count };

  const rangeConfirmed =
    rangeSource !== null &&
    rangeSource !== undefined &&
    rangeSource.confirmed &&
    rangeSource.first !== null &&
    rangeSource.last !== null;
  const rangeLabel =
    rangeConfirmed && rangeSource && rangeSource.first && rangeSource.last
      ? formatDateRange(rangeSource.first, rangeSource.last, zone, phrases)
      : copy.matchdays.datesPending;
  const rangeMeta = rangeSource
    ? [
        phrases.matches(rangeSource.count),
        rangeConfirmed && rangeSource.first
          ? zoneAbbreviation(zone, new Date(rangeSource.first))
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
        .toUpperCase()
    : '';

  const data = jornada.data;
  /** The cup's round as the neutral rows this screen already draws (ADR 0156). */
  const uclRows = useMemo(
    () => (uclJornada.data ? uclJornada.data.fixtures.map(uclFixtureRow) : null),
    [uclJornada.data],
  );
  const rows = isCup ? uclRows : (data?.fixtures ?? null);
  const query = isCup ? uclJornada : jornada;

  /**
   * The calendar affordance (ADR 0157) — one entry, and the sheet carries the
   * scope choice where there is one.
   *
   * ⚠ Drawn only when the round HAS matches. An empty round has nothing to
   * subscribe to, and the cup's own route answers an out-of-range matchday with
   * a cheerful empty 200 rather than a 404.
   */
  const hasFixtures = (rows?.length ?? 0) > 0;
  const openCalendar = useCallback(() => {
    if (matchweek === null) return;
    // ⚠ Two routes, because the cup's feeds live at a different path and it is
    // the only competition with a second scope to offer.
    router.push(
      isCup
        ? { pathname: '/(sheets)/calendar-ucl', params: { matchday: String(matchweek) } }
        : {
            pathname: '/(sheets)/calendar-jornada',
            params: { league: league.apiSlug, matchweek: String(matchweek) },
          },
    );
  }, [isCup, league.apiSlug, matchweek, router]);

  /**
   * ⚠ **Domestic only, and not an oversight.** The line reads "n matches
   * missing", which is a COVERAGE claim derived from `complete` +
   * `expectedCount` — two fields the cup route deliberately does not serve,
   * because on the domestic contract `complete` is true for all 38 LaLiga
   * matchweeks in July. With nothing to compare, there is nothing honest to say.
   */
  const missing =
    !isCup && data && !data.complete && data.expectedCount !== null && data.count < data.expectedCount
      ? data.expectedCount - data.count
      : null;

  return (
    <ScreenScaffold
      title={matchweek === null ? '' : copy.matchdays.title(matchweek)}
      accessory={
        <AvatarButton initials={initials} onPress={() => router.push('/(sheets)/account')} />
      }
      eyebrow={
        isCup
          ? // ⚠ The competition SPELLS its name here rather than wearing the
            // lockup (ADR 0133's mark stands on the cards, not in an eyebrow),
            // and the third segment names the PHASE where a league names its half.
            copy.matchdays.eyebrow(
              UCL_LEAGUE_PHASE.name,
              seasonLabel(SEASON),
              copy.matchdays.leaguePhase,
            )
          : copy.matchdays.eyebrow(league.name, seasonLabel(SEASON), half)
      }
      onRefresh={() => void query.refetch()}
      refreshing={query.isRefetching}
      // The pager and the league chips ride the crown (ADR 0087/0089); the
      // MATCHDAY strip sits just UNDER the fade, first in the body — the
      // mock's own split.
      payload={
        <View style={styles.controls}>
          {total !== null && matchweek !== null && rangeSource ? (
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
          <LeagueSwitch
            leagues={options}
            // ⚠⚠ `leagueSlug`, the STATE — never `league.slug`. `league` falls
            // back to `ROUND_LEAGUES[0]` whenever the cup is active (see its
            // definition), so passing it drew LaLiga as selected on the cup tab
            // AND made the LaLiga chip unpressable: `LeagueSwitch.select`
            // early-returns when the tapped slug already equals `active`, so
            // there was no way back out of the Champions League.
            active={leagueSlug}
            onSelect={setLeagueSlug}
            tone="crown"
          />
        </View>
      }>
      {total !== null && matchweek !== null ? (
        <View style={styles.strip}>
          {/**
           * ⚠ The calendar affordance rides the strip's own LABEL ROW, which was
           * empty (ADR 0157). It costs no vertical space, and it sits where the
           * round is chosen — which is what it is scoped to.
           *
           * ⚠ A `ChipButton` pill, NOT `Button tone="quiet"`: that atom carries
           * `minHeight: Size.minTouch` (44) and would nearly triple an eyebrow
           * row. The chip draws at 32 and buys its 44pt target with `hitSlop`.
           *
           * ⚠⚠ **It IS lime, and that is Ed's call over SPEC §2's one-lime
           * rule** (ADR 0157). The first cut was a neutral `eyebrowSm` line and
           * it read as a LABEL — a row that says MATCHDAY on the left does not
           * teach you that the word on the right is a button. The distinction
           * the app already draws is weight, not presence: a SOLID lime pill is
           * a marker ("you are here" — the strip's current round), a lime RING
           * is an invitation to act, which is `ChipButton`'s own header rule.
           * Two different lime weights doing two different jobs.
           */}
          <View style={styles.stripHead}>
            <Eyebrow small color="onCrown">
              {copy.matchdays.stripLabel}
            </Eyebrow>
            {hasFixtures ? (
              <ChipButton
                label={copy.matchdays.calendar}
                shape="pill"
                onPress={openCalendar}
              />
            ) : null}
          </View>
          <MatchdayStrip
            total={total}
            current={matchweek}
            played={played}
            onSelect={goTo}
            label={copy.matchdays.title}
          />
        </View>
      ) : null}
      {midweek ? (
        <Text variant="eyebrowSm" color="accent">
          {copy.matchdays.midweek}
        </Text>
      ) : null}

      {query.isError ? (
        <View style={styles.state}>
          <Text color="textSecondary">{copy.matchdays.error}</Text>
          <Button label={copy.matchdays.retry} tone="secondary" onPress={() => void query.refetch()} />
        </View>
      ) : query.isPending || matchweek === null ? (
        <SkeletonRows count={6} height={Size.rowSkeleton} />
      ) : rows && rows.length === 0 ? (
        <Text color="textSecondary">{copy.matchdays.empty}</Text>
      ) : rows ? (
        <>
          {/* ⚠ One claim, two spellings: the cup counts its TBD kickoffs where
              a league carries a boolean. Above zero, the range is provisional. */}
          {(isCup ? (uclSummary?.kickoffsTbd ?? 0) > 0 : data && !data.kickoffsConfirmed) ? (
            <Text variant="footnote" color="textFaint">
              {copy.matchdays.timesPending}
            </Text>
          ) : null}

          {missing !== null ? (
            <Text variant="footnote" color="textFaint">
              {copy.matchdays.missing(missing)}
            </Text>
          ) : null}

          {/**
           * ⚠ The age disclosure that has to accompany any in-play score. One
           * calm sentence in the footnote slot rather than the board's
           * `FeedAge` + note pair: `/cronogol/fixtures` carries no per-row
           * stamp, so `FeedAge` would print null hours on every row, and a
           * per-row age line in a ten-row list is noise (ADR 0035).
           */}
          {rows.some((fixture) => fixture.status === 'live') ? (
            <Text variant="footnote" color="textFaint">
              {copy.matchdays.inPlayNote}
            </Text>
          ) : null}

          <FixtureList
            fixtures={rows}
            /**
             * ⚠⚠ The cup's rows carry the COMPETITION'S fixture id, which 404s
             * on the domestic events route — and the club-centric twin that
             * would work there is present on only 5 of 18 (ADR 0156). This is
             * the route that covers the competition.
             */
            eventsSource={isCup ? 'ucl' : 'league'}
            zone={zone}
            clock={clock}
            phrases={phrases}
            finalLabel={copy.matchdays.final}
            inProgressLabel={copy.matchdays.inProgress}
            eventsCopy={copy.events}
          />
        </>
      ) : null}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  controls: { gap: Spacing.three },
  strip: { gap: Spacing.two },
  /**
   * ⚠ `styles.addAll` is GONE with the button it wrapped (ADR 0157) — and it had
   * always painted nothing anyway: it set `borderColor` with no `borderWidth`,
   * so the ring a reader saw was entirely the Button's own `outline` tone.
   */
  stripHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  state: { gap: Spacing.four, paddingVertical: Spacing.six },
});
