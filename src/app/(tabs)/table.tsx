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
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, SkeletonRows, Text, competitionMarkKind } from '@/components/atoms';
import { LeagueSwitch, type LeagueOption } from '@/components/molecules';
import { StandingsTable } from '@/components/organisms/standings-table';
import { AvatarButton, ScreenScaffold } from '@/components/templates/screen-scaffold';
import { useIdentityInitials } from '@/features/auth/use-identity';
import { Size, Spacing } from '@/constants/theme';
import {
  UCL_LEAGUE_PHASE,
  cupBandFor,
  cupBandsApply,
  cupCaption,
  usedCupBands,
  type Competition,
} from '@/lib/cronogol/competitions';
import { hasCompleteSchedule } from '@/lib/cronogol/derive';
import {
  LEAGUES,
  byEditorialOrder,
  findLeague,
  findLeagueByApiSlug,
  roundCount,
  type League,
} from '@/lib/cronogol/leagues';
import type { LegendItem } from '@/components/organisms/standings-table/legend';
import {
  bandRangeLabel,
  bandsApply,
  completedMatchweek,
  usedZones,
  zoneFor,
} from '@/lib/cronogol/standings';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useStandings, useAllSeasonJornadas, useUclStandings } from '@/queries/use-standings';
import { useTeams } from '@/queries/use-teams';
import { usePreferences } from '@/store/preferences';

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
  const { followed } = usePreferences();
  const standings = useStandings();
  const jornadas = useAllSeasonJornadas();

  const [activeSlug, setActiveSlug] = useState(LEAGUES[0].slug);
  const active: Tab = useMemo(() => {
    if (activeSlug === UCL_LEAGUE_PHASE.slug) {
      return { kind: 'ucl', competition: UCL_LEAGUE_PHASE };
    }
    return { kind: 'league', league: findLeague(activeSlug) ?? LEAGUES[0] };
  }, [activeSlug]);

  // ⚠ Gated on the tab: six tabs, and a reader who never opens this one should
  // never pay for it.
  const ucl = useUclStandings(active.kind === 'ucl');

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
      .filter((entry): entry is { table: (typeof rows)[number]; league: League } =>
        Boolean(entry.league),
      )
      .sort((a, b) => byEditorialOrder(a.league, b.league));
  }, [standings.data]);

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

  const subtitle = useMemo(() => {
    if (active.kind === 'ucl') {
      return ucl.data
        ? cupCaption(ucl.data, active.competition, {
            afterMatchday: copy.table.afterMatchday,
            clubCount: copy.table.clubCount,
          })
        : undefined;
    }
    if (!current) return undefined;
    const index = jornadas.byLeague[current.league.apiSlug];
    const done = index ? completedMatchweek(index.matchweeks, current.table.lastMatchUtc) : null;
    const clubs = copy.table.clubCount(current.table.clubs);
    return done === null
      ? clubs
      : `${copy.table.afterMatchday(done, roundCount(current.league))} · ${clubs}`;
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

  /**
   * Whether a club has a page worth opening (ADR 0154).
   *
   * ⚠ **Half the Champions League field has none.** 18 of the 36 are absent
   * from `GET /cronogol/teams`; their club route answers `200` with
   * `lastSyncedAt: null`, which is trap 1 — a hero, a squad and a standing
   * strip with nothing in them. `undefined` data (loading, or a failed
   * catalogue fetch) resolves to FALSE: never draw a link you cannot honour.
   *
   * ⚠ `hasCompleteSchedule` rather than mere membership, and rather than a
   * hardcoded list: it is the field that already means this, and it self-corrects
   * the day the backend widens coverage.
   */
  const teams = useTeams();
  const canOpenClub = useMemo(() => {
    const bySlug = new Map((teams.data ?? []).map((team) => [team.slug, team]));
    return (slug: string) => {
      const team = bySlug.get(slug);
      return team ? hasCompleteSchedule(team) : false;
    };
  }, [teams.data]);

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
      title={copy.table.title}
      accessory={
        <AvatarButton initials={initials} onPress={() => router.push('/(sheets)/account')} />
      }
      // ⚠ UNDER the title, not the mock's right-shoulder block (ADR 0100):
      // beside the title, "Clasificación" got ~130pt and wrapped MID-WORD —
      // the shoulder cannot hold the Spanish title. It can legitimately be
      // the club count alone — a null matchday is trap 2's honest state, and
      // on the cup tab it is the state two nights in three.
      subtitle={subtitle}
      onRefresh={() => void query.refetch()}
      refreshing={query.isRefetching}
      payload={
        options.length > 0 ? (
          <LeagueSwitch
            leagues={options}
            active={activeSlug}
            onSelect={setActiveSlug}
            tone="crown"
          />
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
});
