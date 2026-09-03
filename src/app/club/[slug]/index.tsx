/**
 * A club: identity, the subscribe block, and its season.
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
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BAND_COLOR, MeshGround, SkeletonRows, Text } from '@/components/atoms';
import { ClubNextCard, ClubStatsStrip, StartingXiRow } from '@/components/molecules';
import { ClubActions } from '@/components/organisms/club-actions';
import { ClubHero } from '@/components/organisms/club-hero';
import { SeasonSpine } from '@/components/organisms/season-spine';
import { SquadList } from '@/components/organisms/squad-list';
import { BottomTabInset, Colors, Radius, Size, Spacing, Surfaces } from '@/constants/theme';
import { clubTint, tameClubColor } from '@/lib/cronogol/club-wash';
import {
  abbreviate,
  crestSrc,
  displayName,
  hasCompleteSchedule,
  matchday,
  nextUp,
  primaryCompetition,
} from '@/lib/cronogol/derive';
import { formatFixtureDate, formatKickoffTime } from '@/lib/format';
import { bandsApply, zoneFor } from '@/lib/cronogol/standings';
import { findLeagueByApiSlug } from '@/lib/cronogol/leagues';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useClubFixtures, useClubSquad } from '@/queries/use-club';
import { useStandings } from '@/queries/use-standings';
import { useTeams } from '@/queries/use-teams';
import { usePreferences, useZone } from '@/store/preferences';

export default function ClubScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { copy, phrases } = useI18n();
  const zone = useZone();
  const { clock, followed } = usePreferences();

  const [tab, setTab] = useState<'fixtures' | 'players'>('fixtures');
  /**
   * ⚠ Once at mount — `Date.now()` in a render body is impure and lint rejects
   * it. The 48-hour staleness test below does not need a ticking clock.
   */
  const [now] = useState(() => Date.now());

  const fixtures = useClubFixtures(slug);
  const squad = useClubSquad(slug);
  const standings = useStandings();
  const teams = useTeams();

  const data = fixtures.data;
  const subscribed = followed.includes(slug);

  /**
   * This club's row in whichever published table holds it (ADR 0091's stats
   * strip).
   *
   * ⚠ Gated on `bandsApply`, and absent is a REAL answer: an unplayed or
   * incomplete table may not be quoted at all (trap 20), and the strip is not
   * drawn rather than showing dashes. The band ink comes from `zoneFor`
   * against `League.zones` — never position arithmetic.
   */
  const standing = useMemo(() => {
    const hit = (standings.data?.tables ?? [])
      .map((table) => {
        const league = findLeagueByApiSlug(table.league.slug);
        if (!league || !bandsApply(table, league)) return null;
        const row = table.rows.find((r) => r.team.slug === slug);
        return row ? { row, league } : null;
      })
      .find(Boolean);
    if (!hit) return null;
    const zone = zoneFor(hit.row.rank, hit.league);
    return { row: hit.row, rankColor: zone ? BAND_COLOR[zone] : null };
  }, [standings.data, slug]);

  /**
   * The next fixture, as the spine already resolves it — the first
   * `scheduled`/`live` row, NEVER a clock comparison (the API has served a
   * finished season before).
   *
   * ⚠ `nextUp` adds ONE refusal on top of that pick and only for this card:
   * a kickoff more than two days gone is not announced as the next match. The
   * spine below still lists it. Puerto Rico is why — it publishes a finished
   * table over fixtures that stay `scheduled` forever.
   */
  const next = useMemo(() => {
    if (!data) return null;
    const fixture = nextUp(data.fixtures, now);
    if (!fixture) return null;
    /**
     * The OPPONENT's colour, not this club's — see `ClubNextCard`.
     *
     * ⚠ Joined by NAME, because `FixtureView` carries `opponent` (a name) and
     * no slug. Both sides come from the same provider strings, so an exact
     * match is right when it hits; a miss is simply no wash, which is already
     * the state for every Premier League and Serie A club.
     */
    const opponentTeam =
      (teams.data ?? []).find((t) => t.name === fixture.opponent) ?? null;
    return { fixture, tint: opponentTeam ? clubTint(opponentTeam) : null };
  }, [data, teams.data, now]);

  return (
    <View style={styles.screen}>
      <MeshGround />
      {/**
       * ⚠ NO native header at all since ADR 0091 — the hero draws its own back
       * pill, because the mock's hero starts at the top of the screen and a
       * transparent nav bar still reserves its 44pt band. The swipe-back
       * gesture is unaffected (it belongs to the stack, not the header).
       *
       * ⚠ The pill is LABELLED with the club's competition. The native back
       * button could not be: left to itself it inherits the previous route's
       * name and renders the ROUTE GROUP — "(tabs)" — and this screen is
       * reached from Clubs, the Table and a push, so no single label was true.
       * A pill that names where you ARE rather than where you came from has no
       * such problem.
       */}
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          // ⚠ `insets.top` alone now — the hero owns the top of the screen and
          // there is no native header band to clear (ADR 0091).
          { paddingTop: insets.top, paddingBottom: BottomTabInset },
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
              // The club's own colour behind the hero (ADR 0068's taming, 0091's
              // geometry). Null for a club with no usable hex — every Premier
              // League and Serie A club today — which draws the neutral fade,
              // not a missing hero. The bleeds mirror this ScrollView's padding.
              wash={tameClubColor(data.team.colorPrimary, data.team.colorSecondary)}
              bleedX={Spacing.five}
              bleedTop={insets.top}
              onBack={() => router.back()}
              backLabel={primaryCompetition(data.fixtures) ?? copy.club.fixtures}
              // ⚠ A second door to the SAME sheet as the alerts row (ADR 0097),
              // above the fold — never a direct unfollow. Hidden while not
              // subscribed: the solid-lime alerts row is the follow invitation,
              // and the screen keeps one lime hero.
              follow={
                subscribed
                  ? {
                      label: copy.club.following,
                      hint: copy.club.followingHint,
                      onPress: () =>
                        router.push({ pathname: '/(sheets)/alerts', params: { slug } }),
                    }
                  : null
              }
            />

            {standing ? (
              <ClubStatsStrip
                rank={standing.row.rank}
                rankColor={standing.rankColor}
                points={standing.row.points}
                goalDifference={standing.row.goalDifference}
                form={standing.row.form}
                phrases={phrases}
                labels={{
                  pos: copy.table.pos,
                  points: copy.table.points,
                  goalDifference: copy.table.statLabels[5],
                  form: copy.table.formLabel(5),
                }}
              />
            ) : null}

            {next ? (
              <ClubNextCard
                label={copy.today.nextUp}
                opponent={
                  next.fixture.opponent
                    ? displayName(next.fixture.opponent)
                    : phrases.unknownOpponent
                }
                crest={crestSrc(
                  next.fixture.opponentLogoUrls,
                  next.fixture.opponentLogoUrl,
                  'small',
                )}
                abbr={
                  next.fixture.opponent
                    ? abbreviate(next.fixture.opponent)
                    : phrases.unknownOpponent
                }
                tint={next.tint}
                homeAwayTag={next.fixture.homeAway === 'H' ? phrases.home : phrases.away}
                atPrefix={next.fixture.homeAway === 'A' ? phrases.at : null}
                meta={[
                  matchday(next.fixture.round) !== null
                    ? `${copy.club.roundPrefix}${matchday(next.fixture.round)}`
                    : null,
                  formatFixtureDate(next.fixture.kickoffUtc, zone, phrases),
                ]
                  .filter(Boolean)
                  .join(' · ')}
                // ⚠ `--:--` means published-but-unscheduled, never missing.
                kickoffLabel={
                  next.fixture.kickoffTbd
                    ? '--:--'
                    : formatKickoffTime(next.fixture.kickoffUtc, zone, clock)
                }
                venue={next.fixture.venue}
              />
            ) : null}

            <ClubActions
              subscribed={subscribed}
              // ⚠ Always via the sheet, in BOTH directions — the design confirms
              // a subscribe and an unsubscribe in the same place.
              onToggleAlerts={() =>
                router.push({ pathname: '/(sheets)/alerts', params: { slug } })
              }
              onOpenCalendar={() =>
                router.push({
                  pathname: '/(sheets)/calendar',
                  params: { slug, name: data.team.name },
                })
              }
              copy={{
                alertsOn: copy.club.alertsOn,
                alertsOff: copy.club.alertsOff,
                calendar: copy.club.calendar,
                note: copy.club.subscribeNote,
              }}
            />

            {/* ⚠ Between the club actions and the segmented control — a club
                action, not a squad detail (ADR 0065). Enabled off the SQUAD, not
                the league: the row stays and explains itself when there is none. */}
            <StartingXiRow
              enabled={(squad.data?.players.length ?? 0) > 0}
              title={copy.startingXi.rowTitle}
              body={
                (squad.data?.players.length ?? 0) > 0
                  ? copy.startingXi.rowBody
                  : copy.club.squadEmpty
              }
              onPress={() => router.push({ pathname: '/club/[slug]/starting-xi', params: { slug } })}
            />

            <View style={styles.segmented}>
              {(['fixtures', 'players'] as const).map((key) => (
                <Pressable
                  key={key}
                  onPress={() => setTab(key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === key }}
                  style={[styles.segment, tab === key && styles.segmentActive]}>
                  <Text variant="bodyStrong" color={tab === key ? 'text' : 'textDim'}>
                    {key === 'fixtures' ? copy.club.fixtures : copy.club.players}
                  </Text>
                </Pressable>
              ))}
            </View>

            {tab === 'fixtures' ? (
              hasCompleteSchedule(data.team) ? (
                <SeasonSpine
                  data={data}
                  zone={zone}
                  clock={clock}
                  phrases={phrases}
                  roundPrefix={copy.club.roundPrefix}
                  tint={tameClubColor(data.team.colorPrimary, data.team.colorSecondary)}
                />
              ) : (
                <View style={styles.pending}>
                  <Text variant="headline">{copy.club.noScheduleTitle}</Text>
                  <Text variant="body" color="textDim">
                    {copy.club.noScheduleBody}
                  </Text>
                </View>
              )
            ) : squad.isPending ? (
              <SkeletonRows count={6} height={Size.rowSkeleton} />
            ) : (
              <SquadList
                players={squad.data?.players ?? []}
                bandLabels={copy.club.bandLabels}
                emptyLabel={copy.club.squadEmpty}
                // ⚠ The PERSON id, never the shirt — a Premier League squad can
                // carry two players wearing the same number.
                onSelectPlayer={(id) =>
                  router.push({ pathname: '/(sheets)/player', params: { slug, id } })
                }
              />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.background },
  content: { paddingHorizontal: Spacing.five, gap: Spacing.four },
  segmented: {
    flexDirection: 'row',
    // The 0087 track: a quiet glass slab; the thumb is the opaque lift.
    backgroundColor: Colors.dark.glassFillDim,
    borderRadius: Radius.control,
    padding: Spacing.one,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.seg,
  },
  segmentActive: { backgroundColor: Colors.dark.segThumb },
  pending: {
    ...Surfaces.glass,
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.two,
  },
});
