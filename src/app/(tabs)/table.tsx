/**
 * The league table — five domestic competitions and the Champions League
 * league phase (ADR 0150).
 *
 * ⚠ Five things this screen gets right that the obvious implementation gets
 * wrong, all of them documented at the function they call:
 *
 * 1. `tables` is ordered by league SLUG, not editorially. We sort by
 *    `League.order` so LaLiga leads (Spain is the market), with the Champions
 *    League's fractional `order` slotting it second.
 * 2. The domestic caption uses `completedMatchweek(matchweeks, table.lastMatchUtc)`
 *    — measured against the TABLE'S OWN last kickoff, not the wall clock — over
 *    `roundCount(league)`, never the payload's `matchesTotal` (380 vs 38).
 * 3. **The caption can legitimately be `null`**, and is on live data right now:
 *    LaLiga matchday 1 has a deferred fixture after matchday 2 has finished, so
 *    no matchday is complete. The header degrades to the club count rather than
 *    inventing a number — see `completedMatchweek`'s own comment.
 * 4. **The cup caption is a DIFFERENT provenance saying the same sentence.**
 *    `UclStandingsView.matchday` is derived on the server and printed verbatim;
 *    there is no UCL matchweek index to walk, and the doc forbids recomputing
 *    it. Its `null` is the COMMON case, not an edge — the league phase runs
 *    Tuesday to Thursday, so a round is half-played on two nights in three.
 * 5. **Band policy lives HERE, not in the organism** (ADR 0152). "May this
 *    table be coloured?" is a question about the data; the two competitions
 *    answer it with different functions over different payloads, and the
 *    organism just draws what it is handed.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, SkeletonRows, Text, competitionMarkKind } from '@/components/atoms';
import { LeagueMenu, type LeagueOption } from '@/components/molecules';
import { StandingsTable } from '@/components/organisms/standings-table';
import { AvatarButton, ScreenScaffold } from '@/components/templates/screen-scaffold';
import { useIdentityInitials } from '@/features/auth/use-identity';
import { Size, Spacing } from '@/constants/theme';
import {
  UCL_LEAGUE_PHASE,
  cupBandFor,
  cupBandsApply,
  usedCupBands,
  type Competition,
} from '@/lib/cronogol/competitions';
import {
  LEAGUES,
  findLeague,
  roundCount,
  type League,
} from '@/lib/cronogol/leagues';
import type { LegendItem } from '@/components/organisms/standings-table/legend';
import {
  bandRangeLabel,
  bandsApply,
  completedMatchweek,
  editorialTables,
  usedZones,
  zoneFor,
} from '@/lib/cronogol/standings';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useStandings, useAllSeasonJornadas, useUclStandings } from '@/queries/use-standings';
import { useCanOpenClub } from '@/queries/use-teams';
import { setLeagueSlug, usePreferences } from '@/store/preferences';

/**
 * The selected tab.
 *
 * ⚠ **A union, and it has to be.** The obvious
 * `LEAGUES.find(l => l.slug === activeSlug) ?? LEAGUES[0]` returns LaLiga for
 * `'champions-league'` — so the UCL chip would light up with LaLiga's table
 * rendered under it, silently and convincingly.
 */
type Tab =
  | { kind: 'league'; league: League }
  | { kind: 'ucl'; competition: Competition };

export default function TableScreen() {
  const router = useRouter();
  const initials = useIdentityInitials();
  const { copy, phrases } = useI18n();
  const { followed, leagueSlug: activeSlug } = usePreferences();
  const standings = useStandings();
  const jornadas = useAllSeasonJornadas();

  /**
   * `altagamafc://table?league=<slug>` — the STANDINGS widget's tap (ADR 0185).
   *
   * ⚠⚠ **Written INTO the shared, persisted pick, and that is not trap 72.**
   * A copy-into-state effect is the bug when the param and the state describe
   * the same fact; here the tap is the reader CHOOSING a league, the same act
   * as picking it in `LeagueMenu`, so Matchdays and Clubs follow it (ADR 0164).
   * Deriving the active tab from the param instead would show one league while
   * the store — and every other tab — still held another.
   *
   * ⚠ The param is cleared once applied: this tab stays mounted, so a stale
   * `league` would re-assert itself over the reader's next pick in the menu.
   * Unknown slugs are dropped, never stored — the store must only ever hold a
   * value this screen can show.
   */
  const params = useLocalSearchParams<{ league?: string }>();
  useEffect(() => {
    const requested = params.league;
    if (!requested) return;
    if (requested === UCL_LEAGUE_PHASE.slug || findLeague(requested)) {
      setLeagueSlug(requested);
    }
    router.setParams({ league: undefined });
  }, [params.league, router]);

  /**
   * The pick is SHARED with Matchdays and Clubs and persisted (ADR 0164). No
   * clamp here: this screen lists the WHOLE catalogue plus the cup, so every
   * value the store can hold is one this screen can show.
   */
  const active: Tab = useMemo(() => {
    if (activeSlug === UCL_LEAGUE_PHASE.slug) {
      return { kind: 'ucl', competition: UCL_LEAGUE_PHASE };
    }
    return { kind: 'league', league: findLeague(activeSlug) ?? LEAGUES[0] };
  }, [activeSlug]);

  // ⚠ Gated on the tab: six tabs, and a reader who never opens this one should
  // never pay for it.
  const ucl = useUclStandings(active.kind === 'ucl');

  /** Configured leagues only, editorially ordered — see `editorialTables`. */
  const tables = useMemo(() => editorialTables(standings.data?.tables), [standings.data]);

  const current = active.kind === 'league'
    ? tables.find((entry) => entry.league.slug === active.league.slug)
    : undefined;

  /**
   * ⚠ The Champions League chip is APPENDED to the wire-derived strip, never
   * merged into it — it has no row in `GET /cronogol/standings` and no artwork
   * in `GET /cronogol/leagues`. And it is appended only once the domestic strip
   * has resolved: a rail holding one lonely UCL chip beside a standings error
   * reads as broken.
   *
   * ⚠ The mark is resolved through `competitionMarkKind`, which keys on the
   * EXACT wire string — so the registry holds no second copy of the answer, and
   * a competition we draw no mark for degrades to its spelled name (ADR 0133's
   * own fallback rule), never to an empty chip.
   */
  const options: LeagueOption[] = useMemo(() => {
    if (tables.length === 0) return [];
    const domestic = tables.map(({ table, league: l }) => ({
      slug: l.slug,
      name: l.name,
      order: l.order,
      // ⚠ `icon` is the icon-only cut and is LaLiga's alone today; `primary`
      // is the full lockup. The tiles carry no text label (ADR 0031).
      logoUrl:
        table.league.logoUrls?.icon ??
        table.league.logoUrls?.primary ??
        table.league.logoUrl ??
        null,
      mark: undefined,
    }));
    return [
      ...domestic,
      {
        slug: UCL_LEAGUE_PHASE.slug,
        name: UCL_LEAGUE_PHASE.name,
        order: UCL_LEAGUE_PHASE.order,
        logoUrl: null,
        mark: competitionMarkKind(UCL_LEAGUE_PHASE.name) ?? undefined,
      },
    ]
      .sort((a, b) => a.order - b.order)
      .map(({ order: _order, ...option }) => option);
  }, [tables]);

  /** The pill's scope: this competition's club count, or null while it loads. */
  const clubCount =
    active.kind === 'ucl' ? active.competition.clubs : (current?.table.clubs ?? null);

  /**
   * The line under the title — how far the season has run (ADR 0165).
   *
   * ⚠⚠ **The club count is deliberately NOT here any more.** It moved to the
   * banner pill directly above, and printing `20 clubs` in both put the same
   * two words on two consecutive lines. `cupCaption` is dropped for the same
   * reason: it composed exactly that pair.
   *
   * ⚠ `undefined` — not a placeholder — while the matchday is unknown. A null
   * matchday is trap 2's honest state and on the cup tab it is the state two
   * nights in three.
   */
  const metaLine = useMemo(() => {
    if (active.kind === 'ucl') {
      // ⚠ `matchday` is nullable on the wire and null is the HONEST state, not
      // an outage — see this file's header on the deferred-fixture case.
      return ucl.data?.matchday == null
        ? undefined
        : copy.table.afterMatchday(ucl.data.matchday, active.competition.matchdays);
    }
    if (!current) return undefined;
    const index = jornadas.byLeague[current.league.apiSlug];
    const done = index ? completedMatchweek(index.matchweeks, current.table.lastMatchUtc) : null;
    return done === null
      ? undefined
      : copy.table.afterMatchday(done, roundCount(current.league));
  }, [active, ucl.data, current, jornadas.byLeague, copy]);

  /**
   * The legend, ABOVE the table (ADR 0155).
   *
   * ⚠ **Walked in CONFIG order and filtered by what is on screen**, rather than
   * looked up per used kind: config order IS rank order, so the key reads
   * top-down the way the rails do, and there is no lookup that can miss.
   *
   * ⚠ The RANGE comes from the band config and the WORDS from copy. Putting
   * `1–8` inside a translated string would let the two drift the day a format
   * changes — silently, and in one language only.
   */
  const cupLegend: LegendItem[] = useMemo(() => {
    if (active.kind !== 'ucl' || !ucl.data) return [];
    if (!cupBandsApply(ucl.data, active.competition)) return [];
    const used = usedCupBands(ucl.data.rows, active.competition);
    return active.competition.bands
      .filter((band) => used.includes(band.kind))
      .map((band) => ({
        kind: band.kind,
        label: copy.table.cupBandLabels[band.kind],
        range: bandRangeLabel(band),
      }));
  }, [active, ucl.data, copy]);

  const leagueLegend: LegendItem[] = useMemo(() => {
    if (!current || !bandsApply(current.table, current.league)) return [];
    const used = usedZones(current.table.rows, current.league);
    return current.league.zones
      .filter((zone) => used.includes(zone.kind))
      .map((zone) => ({
        kind: zone.kind,
        label: copy.table.zoneLabels[zone.kind],
        range: bandRangeLabel(zone),
      }));
  }, [current, copy]);

  /** Whether a club has a page worth opening — see the hook (ADR 0154). */
  const canOpenClub = useCanOpenClub();

  const query = active.kind === 'ucl' ? ucl : standings;
  const tableCopy = {
    pos: copy.table.pos,
    club: copy.table.club,
    played: copy.table.played,
    points: copy.table.points,
    statLabels: copy.table.statLabels,
    formLabel: copy.table.formLabel,
    openClub: copy.table.openClub,
    formLetters: phrases.formLetters,
  };
  // ⚠ Object form, not a template string: typed routes validate the pathname
  // against the route tree and the params separately.
  const openClub = (slug: string) =>
    router.push({ pathname: '/club/[slug]', params: { slug } });

  return (
    <ScreenScaffold
      /* ⚠ The guard still matters on the cup tab: `active.league` is the
         `?? LEAGUES[0]` fallback there, so its `apiSlug` would paint the wrong
         league. The cup passes its own TAB slug — `LeagueBand`'s one
         non-API-slug key (ADR 0168; null/brand before the UCL was banded). */
      tintLeague={active.kind === 'league' ? active.league.apiSlug : UCL_LEAGUE_PHASE.slug}
      title={copy.table.title}
      /* ⚠ UNDER the title, never a right-shoulder block (ADR 0100): beside the
         title, "Clasificación" got ~130pt and wrapped MID-WORD. */
      metaLine={metaLine}
      onRefresh={() => void query.refetch()}
      refreshing={query.isRefetching}
      /* The banner row (ADR 0165) — the same construction Matchdays uses, and
         it replaces `accessory`: the avatar lives here now. */
      banner={
        options.length > 0 ? (
          <View style={styles.banner}>
            <View style={styles.bannerMenu}>
              <LeagueMenu
                leagues={options}
                active={activeSlug}
                onSelect={setLeagueSlug}
                copy={copy.leagueMenu}
                tone="crown"
                /* ⚠ This screen's own scope is its CLUB count, not a round
                   count — `phrases.clubs`, which pluralises, rather than
                   `copy.table.clubCount`, which does not at n = 1. */
                subtitle={[
                  clubCount === null ? null : phrases.clubs(clubCount),
                  options.length > 1 ? copy.leagueMenu.switch : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
            </View>
            <AvatarButton
              initials={initials}
              onPress={() => router.push('/(sheets)/account')}
              tone="ground"
            />
          </View>
        ) : null
      }>
      {query.isPending ? (
        <SkeletonRows count={10} height={Size.rowSkeleton} />
      ) : query.isError ? (
        <View style={styles.state}>
          <Text color="textSecondary">{copy.table.error}</Text>
          <Button label={copy.table.retry} tone="secondary" onPress={() => void query.refetch()} />
        </View>
      ) : active.kind === 'ucl' ? (
        !ucl.data ? (
          <Text color="textSecondary">{copy.table.empty}</Text>
        ) : (
          <>
            <StandingsTable
              rows={ucl.data.rows}
              // ⚠ Gated once for the whole table, never per row — and on three
              // clauses, one of which the API doc does not name. See
              // `cupBandsApply`.
              bandFor={
                cupBandsApply(ucl.data, active.competition)
                  ? (rank) => cupBandFor(rank, active.competition)
                  : () => null
              }
              bands={cupLegend}
              followed={followed}
              onOpenClub={openClub}
              canOpenClub={canOpenClub}
              copy={tableCopy}
            />
            <Text variant="footnote" color="textFaint">
              {copy.table.uclFootnote}
            </Text>
          </>
        )
      ) : !current ? (
        <Text color="textSecondary">{copy.table.empty}</Text>
      ) : (
        <>
          <StandingsTable
            rows={current.table.rows}
            bandFor={
              bandsApply(current.table, current.league)
                ? (rank) => zoneFor(rank, current.league)
                : () => null
            }
            bands={leagueLegend}
            followed={followed}
            onOpenClub={openClub}
            copy={tableCopy}
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
  /** The banner row (ADR 0165) — see Matchdays' copy of this for why the pill flexes. */
  banner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  bannerMenu: { flex: 1 },
});
