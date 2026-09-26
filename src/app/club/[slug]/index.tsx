/**
 * A club, the Medina kit's way (ADR 0202): the club's own scene behind glass
 * back/share circles, the crest leading the name, the follow button, then
 * Overview / Fixtures / Squad.
 *
 *  - OVERVIEW is the kit's page: FORM, NEXT MATCH, SEASON SO FAR (whose tiles
 *    and "See all" open Season stats), KEY PLAYERS.
 *  - FIXTURES opens with the calendar row, then the season spine.
 *  - SQUAD opens with the Starting XI row, then the squad.
 *
 * ⚠ **`lastSyncedAt === null` renders the pending state, never the partial
 * list.** An opponent-only club returns just the matches where it happened to
 * face a tracked club — six games, not a season. Showing those as a schedule is
 * the single easiest way to ship a convincing-looking bug, which is why
 * `hasCompleteSchedule` exists and why this branch comes before the spine.
 *
 * ⚠ Sits outside `(tabs)/` so it pushes over the tab bar (ADR 0020).
 *
 * ⚠ A FOLDER route since ADR 0065 — `index.tsx` here, `starting-xi.tsx`
 * beside it. No `_layout.tsx` in this folder: that would nest a stack inside
 * the root stack, and the route string `/club/[slug]` is unchanged.
 */
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CalendarGlyph,
  Chevron,
  Eyebrow,
  SceneGround,
  SkeletonRows,
  Text,
} from '@/components/atoms';
import {
  ActionRow,
  FixturePairCard,
  FormStrip,
  PlayerStatRow,
  SectionHeader,
  SegmentedControl,
  StartingXiRow,
} from '@/components/molecules';
import { ClubHero } from '@/components/organisms/club-hero';
import { SeasonSoFar } from '@/components/organisms/season-so-far';
import { SeasonSpine } from '@/components/organisms/season-spine';
import { SquadList } from '@/components/organisms/squad-list';
import { BottomTabInset, ClubScene, Colors, Radius, Size, Spacing, Surfaces } from '@/constants/theme';
import { keyPlayers, type KeyStat } from '@/features/club/key-players';
import { tameClubColor } from '@/lib/cronogol/club-wash';
import {
  abbreviate,
  crestSrc,
  displayName,
  hasCompleteSchedule,
  matchday,
  nextUp,
} from '@/lib/cronogol/derive';
import { clubSceneTheme } from '@/lib/cronogol/league-theme';
import { SEASON } from '@/lib/cronogol/leagues';
import { clubUrl } from '@/lib/cronogol/site';
import { clubStanding, leagueOfClub } from '@/lib/cronogol/standings';
import { pickTeamSeason, pickTeamTotals } from '@/lib/cronogol/stats';
import type { FixtureView, TeamView } from '@/lib/cronogol/types';
import { formatFixtureDate, formatKickoffTime } from '@/lib/format';
import type { Phrases } from '@/lib/i18n/phrases';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useClubFixtures, useClubSquad } from '@/queries/use-club';
import { useStandings } from '@/queries/use-standings';
import { useStatsLeaders, useTeamStats } from '@/queries/use-stats';
import { usePreferences, useZone, type ClockFormat } from '@/store/preferences';
import { setLastClub } from '@/store/starting-xi';

type Tab = 'overview' | 'fixtures' | 'squad';

export default function ClubScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { copy, phrases, locale } = useI18n();
  const zone = useZone();
  const { clock, followed } = usePreferences();

  // ⚠ Opens on FIXTURES, not the first segment (Ed, 2026-09-25): the season
  // is what a reader comes to a club for. The segment ORDER stays the kit's.
  const [tab, setTab] = useState<Tab>('fixtures');
  /**
   * ⚠ Once at mount — `Date.now()` in a render body is impure and lint rejects
   * it. The 48-hour staleness test below does not need a ticking clock.
   */
  const [now] = useState(() => Date.now());

  const fixtures = useClubFixtures(slug);
  const squad = useClubSquad(slug);
  const standings = useStandings();
  /**
   * ⚠ Fetched HERE, not only on the stats screen: SEASON SO FAR reads it, and
   * the "See all" link must be able to say whether there is anything behind
   * it. It doubles as the child screen's prefetch (`STALE.stats`, 30 min).
   */
  const teamStats = useTeamStats(slug);

  const data = fixtures.data;
  const subscribed = followed.includes(slug);

  /**
   * This club's row in whichever published table holds it, and that table's
   * league.
   *
   * ⚠ Gated on `bandsApply`, and absent is a REAL answer: an unplayed or
   * incomplete table may not be quoted at all (trap 20), so the rank line and
   * FORM are not drawn rather than showing dashes.
   */
  const standing = useMemo(
    () => clubStanding(standings.data?.tables, slug),
    [standings.data, slug],
  );

  /** The club's league for the leaderboards — quotable table or not. */
  const league = standing?.league ?? leagueOfClub(standings.data?.tables, slug);

  /**
   * Whether Season stats has anything to show for this club — the one block
   * that screen renders (ADR 0141), resolved here so the link can be honest.
   */
  const seasonStats = useMemo(
    () => pickTeamSeason(teamStats.data, leagueOfClub(standings.data?.tables, slug), SEASON),
    [teamStats.data, standings.data, slug],
  );
  /**
   * SEASON SO FAR's figures: the MERGED all-competition totals, like Season
   * stats' own headline figures (ADR 0149).
   */
  const totals = useMemo(() => pickTeamTotals(teamStats.data, SEASON), [teamStats.data]);

  /**
   * KEY PLAYERS (ADR 0202): three league-wide boards, filtered to this club.
   * ⚠ Keyed per LEAGUE, so every club in it shares the three requests.
   */
  const goals = useStatsLeaders(league?.apiSlug, 'goals');
  const assists = useStatsLeaders(league?.apiSlug, 'assists');
  const involvements = useStatsLeaders(league?.apiSlug, 'goal-involvements');
  const keys = useMemo(
    () =>
      keyPlayers(
        slug,
        {
          goals: goals.data?.leaders,
          assists: assists.data?.leaders,
          involvements: involvements.data?.leaders,
        },
        squad.data?.players,
      ),
    [slug, goals.data, assists.data, involvements.data, squad.data],
  );

  /**
   * The next fixture, as the spine already resolves it — the first
   * `scheduled`/`live` row, NEVER a clock comparison (the API has served a
   * finished season before).
   *
   * ⚠ `nextUp` adds ONE refusal on top of that pick and only for this card:
   * a kickoff more than two days gone is not announced as the next match. The
   * spine still lists it. Puerto Rico is why — it publishes a finished table
   * over fixtures that stay `scheduled` forever.
   */
  const next = useMemo(() => (data ? nextUp(data.fixtures, now) : null), [data, now]);

  /** The club's scene (ADR 0202): its two colours and its crest, top-left. */
  const scene = data ? clubSceneTheme(data.team) : null;
  const heroCrest = data ? crestSrc(data.team.logoUrls, data.team.logoUrl, 'hero') : null;

  const share = () => {
    if (!data) return;
    void Share.share({ message: displayName(data.team.name), url: clubUrl(locale, slug) });
  };
  const openStats = () =>
    router.push({ pathname: '/club/[slug]/season-stats', params: { slug } });

  const keyLabel: Record<KeyStat, string> = copy.club.keyStat;

  return (
    <View style={styles.screen}>
      {scene ? (
        <SceneGround
          kind="club"
          base={scene.base}
          glow={scene.glow}
          mark={
            heroCrest ? (
              <Image
                source={{ uri: heroCrest }}
                style={styles.watermark}
                contentFit="contain"
                accessible={false}
              />
            ) : null
          }
        />
      ) : null}
      {/**
       * ⚠ The hero owns the top of the screen — no native header (ADR 0091).
       * Swipe-back still works: that is the stack's gesture, not the header's.
       */}
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.two, paddingBottom: BottomTabInset },
        ]}>
        {fixtures.isPending ? (
          <SkeletonRows count={8} height={Size.rowSkeleton} />
        ) : !data ? (
          <Text color="textSecondary">{copy.club.notFound}</Text>
        ) : (
          <>
            <ClubHero
              team={data.team}
              fixtures={data.fixtures}
              rankLine={
                standing
                  ? copy.club.rankLine(standing.league.name, standing.row.rank, standing.row.points)
                  : null
              }
              subscribed={subscribed}
              // ⚠ Always via the sheet, in BOTH directions (0082/0097).
              onFollow={() => router.push({ pathname: '/(sheets)/alerts', params: { slug } })}
              onBack={() => router.back()}
              onShare={share}
              copy={{
                follow: copy.club.follow,
                following: copy.club.following,
                followHint: copy.club.followHint,
                followingHint: copy.club.followingHint,
                back: copy.club.back,
                share: copy.club.share,
              }}
            />

            <SegmentedControl<Tab>
              options={[
                { value: 'overview', label: copy.club.overview },
                { value: 'fixtures', label: copy.club.fixtures },
                { value: 'squad', label: copy.club.squad },
              ]}
              value={tab}
              onChange={setTab}
              // White thumb (ADR 0206): the quiet tone vanished on the scene.
              tone="contrast"
            />

            {tab === 'overview' ? (
              <>
                {standing ? (
                  <View style={styles.formRow}>
                    <Eyebrow color="textMuted">{copy.club.form}</Eyebrow>
                    <FormStrip form={standing.row.form} letters={phrases.formLetters} />
                  </View>
                ) : null}

                {next ? (
                  <View style={styles.section}>
                    <Eyebrow color="textMuted">{copy.club.nextMatch}</Eyebrow>
                    <NextMatch
                      fixture={next}
                      team={data.team}
                      leagueName={league?.name ?? null}
                      zone={zone}
                      clock={clock}
                      phrases={phrases}
                      roundLabel={copy.matchdays.title}
                    />
                  </View>
                ) : null}

                {totals ? (
                  <View style={styles.section}>
                    <SectionHeader
                      title={copy.club.seasonSoFar}
                      accessory={
                        seasonStats !== null ? (
                          <Pressable
                            onPress={openStats}
                            accessibilityRole="link"
                            accessibilityLabel={copy.club.seeAll}
                            hitSlop={Spacing.three}
                            style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}>
                            <Text variant="eyebrowSm" color="textSecondary">
                              {copy.club.seeAll}
                            </Text>
                            <Chevron direction="right" color="textSecondary" />
                          </Pressable>
                        ) : undefined
                      }
                    />
                    <SeasonSoFar
                      totals={totals}
                      copy={{
                        tiles: copy.club.tiles,
                        perMatch: copy.stats.perMatch,
                        outOf: copy.stats.outOf,
                        ofGoals: copy.club.ofGoals,
                        cleanOf: copy.club.cleanOf,
                        cleanShare: copy.club.cleanShare,
                      }}
                      onOpen={seasonStats !== null ? openStats : undefined}
                    />
                  </View>
                ) : null}

                {keys.length > 0 ? (
                  <View style={styles.section}>
                    <Eyebrow color="textMuted">{copy.club.keyPlayers}</Eyebrow>
                    <View style={styles.group}>
                      {keys.map((player, i) => (
                        <PlayerStatRow
                          key={`${player.playerId}-${player.stat}`}
                          photo={player.squad?.photoUrl ?? null}
                          shirt={player.squad?.shirt ?? null}
                          // The name people use ("Raphinha"), not the registered
                          // one ("Raphael Dias Belloli") the leaderboard carries.
                          name={player.squad?.shortName ?? player.name}
                          meta={player.squad ? copy.club.positionLabels[player.squad.position] : null}
                          value={player.value}
                          label={keyLabel[player.stat]}
                          divider={i < keys.length - 1}
                          onPress={
                            player.squad
                              ? () =>
                                  router.push({
                                    pathname: '/(sheets)/player',
                                    params: { slug, id: player.squad!.id },
                                  })
                              : undefined
                          }
                        />
                      ))}
                    </View>
                  </View>
                ) : null}
              </>
            ) : tab === 'fixtures' ? (
              <>
                {/* The calendar moved here from the alerts tray (ADR 0202): it
                    is the fixtures, in the reader's own calendar app. */}
                <ActionRow
                  enabled
                  title={copy.club.calendarRow.title}
                  body={copy.club.calendarRow.body}
                  glyph={(color, size) => <CalendarGlyph size={size} color={color} />}
                  onPress={() =>
                    router.push({
                      pathname: '/(sheets)/calendar',
                      params: { slug, name: data.team.name },
                    })
                  }
                />
                {hasCompleteSchedule(data.team) ? (
                  <SeasonSpine
                    data={data}
                    zone={zone}
                    clock={clock}
                    phrases={phrases}
                    roundPrefix={copy.club.roundPrefix}
                    tint={tameClubColor(data.team.colorPrimary, data.team.colorSecondary)}
                    // A played row opens its match-stats sheet (ADR 0190).
                    onOpen={(fixture) =>
                      router.push({
                        pathname: '/(sheets)/match-stats',
                        params: { slug, id: fixture.id },
                      })
                    }
                    openHint={copy.matchStats.open}
                  />
                ) : (
                  <View style={styles.pending}>
                    <Text variant="headline">{copy.club.noScheduleTitle}</Text>
                    <Text variant="body" color="textDim">
                      {copy.club.noScheduleBody}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <>
                {/* Starting XI heads the Squad tab (ADR 0202) — the builder is
                    made OF the squad. Enabled off the squad itself (ADR 0065). */}
                <StartingXiRow
                  enabled={(squad.data?.players.length ?? 0) > 0}
                  title={copy.startingXi.rowTitle}
                  body={
                    (squad.data?.players.length ?? 0) > 0
                      ? copy.startingXi.rowBody
                      : copy.club.squadEmpty
                  }
                  onPress={() => {
                    // ⚠ Commit, then navigate (ADR 0212): the fifth tab opens on
                    // the reader's last club, and this tap is them choosing it.
                    setLastClub(slug);
                    router.push({ pathname: '/club/[slug]/starting-xi', params: { slug } });
                  }}
                />
                {squad.isPending ? (
                  <SkeletonRows count={6} height={Size.rowSkeleton} />
                ) : (
                  <SquadList
                    players={squad.data?.players ?? []}
                    bandLabels={copy.club.bandLabels}
                    emptyLabel={copy.club.squadEmpty}
                    // ⚠ The PERSON id, never the shirt — a Premier League squad
                    // can carry two players wearing the same number.
                    onSelectPlayer={(id) =>
                      router.push({ pathname: '/(sheets)/player', params: { slug, id } })
                    }
                  />
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * NEXT MATCH, told home-first (ADR 0202): the club's fixture is from its own
 * side (`homeAway`), so the card swaps the pair back into the order the match
 * is named. The centre is the dash before kickoff, the score once live.
 */
function NextMatch({
  fixture,
  team,
  leagueName,
  zone,
  clock,
  phrases,
  roundLabel,
}: {
  fixture: FixtureView;
  team: TeamView;
  leagueName: string | null;
  zone: string;
  clock: ClockFormat;
  phrases: Phrases;
  roundLabel: (n: number) => string;
}) {
  const us = {
    name: displayName(team.name),
    crest: crestSrc(team.logoUrls, team.logoUrl, 'small'),
    abbr: abbreviate(team.name, team.slug, team.shortName),
  };
  const them = {
    name: fixture.opponent ? displayName(fixture.opponent) : phrases.unknownOpponent,
    crest: crestSrc(fixture.opponentLogoUrls, fixture.opponentLogoUrl, 'small'),
    abbr: fixture.opponent ? abbreviate(fixture.opponent) : phrases.unknownOpponent,
  };
  const home = fixture.homeAway === 'H' ? us : them;
  const away = fixture.homeAway === 'H' ? them : us;
  // ⚠ A league fixture names OUR league (0141: never the wire's "LALIGA EA
  // SPORTS"); a cup tie names its competition.
  const competition =
    fixture.competition === 'league' ? (leagueName ?? fixture.competitionName) : fixture.competitionName;
  const md = matchday(fixture.round);
  const eyebrow = [competition, md !== null ? roundLabel(md) : null].filter(Boolean).join(' · ');
  // ⚠ `--:--` means published-but-unscheduled, never missing.
  const time = fixture.kickoffTbd ? '--:--' : formatKickoffTime(fixture.kickoffUtc, zone, clock);
  const kickoff = `${formatFixtureDate(fixture.kickoffUtc, zone, phrases)} · ${time}`;
  const live = fixture.status === 'live' && fixture.goalsFor !== null && fixture.goalsAgainst !== null;
  const [hg, ag] =
    fixture.homeAway === 'H'
      ? [fixture.goalsFor, fixture.goalsAgainst]
      : [fixture.goalsAgainst, fixture.goalsFor];
  const centre = live ? `${hg}–${ag}` : '–';

  return (
    <FixturePairCard
      eyebrow={eyebrow}
      kickoff={kickoff}
      home={home}
      away={away}
      centre={centre}
      accessibilityLabel={`${eyebrow}. ${home.name} v ${away.name}. ${kickoff}`}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.background },
  content: { paddingHorizontal: Spacing.five, gap: Spacing.five },
  watermark: {
    width: ClubScene.mark.width,
    height: ClubScene.mark.width,
    opacity: ClubScene.mark.alpha,
  },
  formRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { gap: Spacing.three },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: Spacing.half },
  pressed: { opacity: 0.6 },
  group: {
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.card,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.hairlineMid,
    overflow: 'hidden',
  },
  pending: {
    ...Surfaces.glass,
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.two,
  },
});
