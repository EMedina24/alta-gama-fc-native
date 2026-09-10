/**
 * Season stats (ADR 0141) — `/club/[slug]/season-stats`.
 *
 * A club's season in numbers, and one player's, behind one segmented control.
 * Design: `handoff_season-stats/`. Backend contract: that folder's
 * `API-SEASON-STATS.md` and `CRONOGOL-API.md` → *Season stats*.
 *
 * ⚠ A SIBLING route of `starting-xi.tsx` with no `_layout.tsx` in the folder —
 * that would nest a stack inside the root stack (ADR 0065). Header idiom is the
 * club page's, not the builder's: no native header, the hero draws its own back
 * chip, because the design's header starts at the top of the screen and a
 * transparent nav bar still reserves its 44pt band (ADR 0091).
 *
 * ⚠⚠ **`seasons[]` holds one block per COMPETITION-season and this screen shows
 * exactly one: the club's own league, this season** (ADR 0141). Barcelona
 * answers 2026 champions-league, 2026 laliga and 2025 champions-league in one
 * payload, so `seasons[0]` would render a cup record under a league heading.
 * The league comes from the standings — `leagueOfClub` is the only thing that
 * knows it, since no `TeamView` carries one.
 *
 * ⚠⚠ **Nothing here may be presented as live.** These rows are rebuilt by a
 * three-hourly cron chain: the lag from a final whistle is ~25 minutes at best
 * and ~4 hours at worst. No timestamp, no "just now", no ticking anything — and
 * nothing on this screen may be snapshotted into a widget or a share image,
 * because a backfill revises the totals retroactively.
 *
 * ⚠ The Players segment appears only where the league publishes player stats
 * AND the squad carries a slug to address them with (ADR 0144). Today that is
 * LaLiga alone: every Premier League player's slug is null on the wire.
 *
 * ⚠ One shared clock drives every count-up on the screen, restarted on entry
 * and on each view switch — and `cancelAnimation` on unmount, so a pop mid-count
 * leaves nothing running.
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Easing,
  cancelAnimation,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Button, MeshGround, SkeletonRows, Text } from '@/components/atoms';
import {
  ClubView,
  PlayerEmpty,
  PlayerView,
  SeasonStatsHero,
  type StatsMode,
} from '@/components/organisms/season-stats';
import { BottomTabInset, Colors, SeasonStats, Size, Spacing } from '@/constants/theme';
import { tameClubColor } from '@/lib/cronogol/club-wash';
import { abbreviate, crestSrc } from '@/lib/cronogol/derive';
import { SEASON, leagueSeasonLabel, roundCount } from '@/lib/cronogol/leagues';
import { leagueOfClub } from '@/lib/cronogol/standings';
import { pickPlayerSeason, pickTeamSeason, statsSlug } from '@/lib/cronogol/stats';
import { formatFixtureDate } from '@/lib/format';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useClubFixtures, useClubSquad } from '@/queries/use-club';
import { useLeagueArtwork } from '@/queries/use-leagues';
import { useStandings } from '@/queries/use-standings';
import { usePlayerStats, useStatsLeaders, useTeamStats } from '@/queries/use-stats';
import { useZone } from '@/store/preferences';
import { useStatsPlayer } from '@/store/stats-player';

export default function SeasonStatsScreen() {
  const { slug, mode: initialMode } = useLocalSearchParams<{
    slug: string;
    /**
     * Which view to OPEN on. Optional, and read once — the segmented control
     * owns the state after that, so a deep link chooses the first screen
     * rather than pinning it.
     *
     * ⚠ It exists because the Players view is otherwise unreachable except by
     * a tap, which makes it unverifiable from a script: every other state on
     * this screen can be deep-linked or previewed at `/_debug/stats`, and the
     * one that could not was the one whose default player was wrong for weeks
     * of an afternoon. A deep link into a tab is also the shape a push
     * notification would need later.
     */
    mode?: StatsMode;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { copy, phrases } = useI18n();
  const zone = useZone();
  const stats = copy.stats;

  const [mode, setMode] = useState<StatsMode>(
    initialMode === 'players' ? 'players' : 'club',
  );

  const teamStats = useTeamStats(slug);
  const fixtures = useClubFixtures(slug);
  const squad = useClubSquad(slug);
  const standings = useStandings();
  const artwork = useLeagueArtwork();

  const league = useMemo(
    () => leagueOfClub(standings.data?.tables, slug),
    [standings.data, slug],
  );

  const season = useMemo(
    () => pickTeamSeason(teamStats.data, league, SEASON),
    [teamStats.data, league],
  );

  const players = useMemo(
    () => (squad.data?.players ?? []).filter((p) => statsSlug(p, league) !== null),
    [squad.data, league],
  );

  /**
   * Who the Players view OPENS on: this club's leading scorer.
   *
   * ⚠⚠ **The first squad row is the wrong default and looked like a bug.**
   * Barcelona's squad begins with a goalkeeper, and a goalkeeper answers
   * `seasons: []` — correctly, permanently — so the Players tab opened on an
   * empty state for the club with the most complete data in the app. The mock
   * opens on the club's main scorer, which is also what a reader means.
   *
   * ⚠ The leaderboard is per LEAGUE, so every club in it shares one cached
   * request; this only picks its own club's best-placed row out of the list.
   * Falls back to the first addressable squad row when the club has no ranked
   * scorer yet — in August, nobody has.
   */
  const leaders = useStatsLeaders(league?.apiSlug, 'goals');
  const topScorerSlug = useMemo(
    () =>
      (leaders.data?.leaders ?? []).find(
        (row) => row.slug !== null && row.teams.some((t) => t.slug === slug),
      )?.slug ?? null,
    [leaders.data, slug],
  );
  /**
   * ⚠ Re-resolved against the squad on every read, so a chosen slug that no
   * longer matches a squad row — a transfer between sessions — falls back to
   * the default rather than blanking the view.
   */
  const chosen = useStatsPlayer(slug);
  const selected = useMemo(
    () =>
      players.find((p) => p.slug === chosen) ??
      players.find((p) => p.slug === topScorerSlug) ??
      players[0] ??
      null,
    [players, chosen, topScorerSlug],
  );

  const playerStats = usePlayerStats(selected?.slug ?? null);
  const playerSeason = useMemo(
    () => pickPlayerSeason(playerStats.data, league, SEASON),
    [playerStats.data, league],
  );

  /** The view switch only exists where there is a second view to switch to. */
  const canShowPlayers = Boolean(league?.playerStats) && players.length > 0;

  /**
   * One clock for every number on screen.
   *
   * ⚠ Reduce Motion needs no branch (trap 63): Reanimated skips `withTiming`
   * when the system switch is on and this jumps to 1, so every number renders
   * final. That IS the accommodation — see `SeasonStats` in the theme.
   */
  const progress = useSharedValue(0);
  const ready = season !== null;
  useEffect(() => {
    if (!ready) return;
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: SeasonStats.count,
      easing: Easing.out(Easing.cubic),
    });
    // ⚠ A pop mid-count must leave nothing running — the design's "tear the
    // charts down on unmount", in the shape Reanimated actually needs.
    return () => cancelAnimation(progress);
  }, [ready, mode, progress]);

  const team = fixtures.data?.team ?? null;
  const wash = team ? tameClubColor(team.colorPrimary, team.colorSecondary) : null;
  const crest = team ? crestSrc(team.logoUrls, team.logoUrl, 'card') : null;
  const clubName = teamStats.data?.team.name ?? team?.name ?? slug;
  const backLabel = team
    ? abbreviate(team.name, team.slug, team.shortName)
    : clubName;

  const art = league ? artwork.data?.[league.apiSlug] : undefined;
  const wordmark =
    art?.logoUrls?.wordmark ??
    art?.logoUrls?.onDark ??
    art?.logoUrls?.primary ??
    art?.logoUrl ??
    null;

  const eyebrow = league
    ? stats.eyebrow(
        league.name,
        leagueSeasonLabel(league, SEASON),
        phrases.matches(roundCount(league)),
      )
    : '';

  const pending = teamStats.isPending || standings.isPending;

  return (
    <View style={styles.screen}>
      <MeshGround />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top, paddingBottom: BottomTabInset },
        ]}>
        <SeasonStatsHero
          title={stats.title}
          eyebrow={eyebrow}
          wordmarkUrl={wordmark}
          crestUrl={crest}
          backLabel={backLabel}
          onBack={() => router.back()}
          wash={wash}
          bleedX={Spacing.five}
          bleedTop={insets.top}
          segments={
            canShowPlayers
              ? {
                  value: mode,
                  options: [
                    { value: 'club', label: stats.club },
                    { value: 'players', label: stats.players },
                  ],
                  onChange: setMode,
                  accessibilityLabel: stats.title,
                }
              : null
          }
        />

        {/* ⚠ Three states, three strings: a failed request is NOT an empty one
            (the doctrine `match-events.tsx` records). Falling through to
            `empty` on an error would have the app state, as fact, that the
            backend holds no season for a club it never managed to ask about. */}
        {pending ? (
          <SkeletonRows count={5} height={Size.rowSkeleton} />
        ) : teamStats.isError ? (
          <View style={styles.state}>
            <Text color="textSecondary">{stats.error}</Text>
            <Button
              label={stats.retry}
              tone="secondary"
              onPress={() => void teamStats.refetch()}
            />
          </View>
        ) : !season ? (
          <Text color="textSecondary">{stats.empty}</Text>
        ) : mode === 'club' || !canShowPlayers ? (
          <ClubView
            season={season}
            copy={stats}
            progress={progress}
            formatDate={(iso) => formatFixtureDate(iso, zone, phrases)}
            // ⚠ `roundCount`, never the standings payload's `matchesTotal` —
            // that is 380, a count of the league's MATCHES, on a different
            // scale entirely (its own docblock says so).
            seasonLength={league ? roundCount(league) : null}
          />
        ) : playerStats.isPending ? (
          <SkeletonRows count={4} height={Size.rowSkeleton} />
        ) : playerStats.isError ? (
          <View style={styles.state}>
            <Text color="textSecondary">{stats.error}</Text>
            <Button
              label={stats.retry}
              tone="secondary"
              onPress={() => void playerStats.refetch()}
            />
          </View>
        ) : !selected ? (
          <Text color="textSecondary">{stats.empty}</Text>
        ) : !playerSeason ? (
          /* ⚠ Not a bare sentence: a player with no block is the ordinary
             answer for a goalkeeper, and the way to read about someone else
             has to be on the screen that says there is nothing to read. */
          <PlayerEmpty
            name={playerStats.data?.name ?? selected.name}
            squad={selected}
            positionLabel={copy.player.positionNames[selected.position]}
            copy={stats}
            wash={wash}
            onChangePlayer={() =>
              router.push({ pathname: '/(sheets)/stats-player', params: { slug } })
            }
          />
        ) : (
          <PlayerView
            name={playerStats.data?.name ?? selected.name}
            squad={selected}
            season={playerSeason}
            clubName={clubName}
            positionLabel={copy.player.positionNames[selected.position]}
            copy={stats}
            progress={progress}
            wash={wash}
            onChangePlayer={() =>
              router.push({ pathname: '/(sheets)/stats-player', params: { slug } })
            }
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.background },
  content: { paddingHorizontal: Spacing.five, gap: Spacing.two },
  state: { gap: Spacing.four, paddingVertical: Spacing.six },
});
