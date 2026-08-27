/**
 * The Today board.
 *
 * ⚠ With nothing followed the live/last/next cards are SUPPRESSED and the follow
 * card carries the screen — there is no "your" match to lead with. That is the
 * design's own rule (SPEC §3.1), and it is why this screen is fully buildable
 * before push exists: it is exactly what a new user sees.
 */
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Crest, SkeletonRows, Text } from '@/components/atoms';
import { SectionHeader, StatTile, UpcomingCard } from '@/components/molecules';
import { FinishedToday } from '@/components/organisms/finished-today';
import { MatchBoard } from '@/components/organisms/match-board';
import { AvatarButton, ScreenScaffold } from '@/components/templates/screen-scaffold';
import { useIdentityInitials } from '@/features/auth/use-identity';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import {
  boardOutcome,
  involvesFollowed,
  lastResult,
  liveFixture,
  upcomingRow,
} from '@/lib/cronogol/board';
import { abbreviate, crestSrc, displayName, matchday } from '@/lib/cronogol/derive';
import type { WindowFixtureView } from '@/lib/cronogol/types';
import {
  formatFixtureDate,
  formatKickoffTime,
  formatRelativeDay,
  formatWeekdayLong,
} from '@/lib/format';
import { zoneAbbreviation } from '@/lib/timezones';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useTeams } from '@/queries/use-teams';
import { useFinishedToday, useRecent, useUpcoming } from '@/queries/use-today';
import { usePreferences, useZone } from '@/store/preferences';

/** The six clubs offered in the follow card's grid. */
const FOLLOW_PICKS = 6;

export default function TodayScreen() {
  const router = useRouter();
  const { copy, phrases } = useI18n();
  const zone = useZone();
  const initials = useIdentityInitials();
  const { followed, clock } = usePreferences();

  const finished = useFinishedToday(zone);
  const upcoming = useUpcoming(zone);
  const recent = useRecent(zone);
  const teams = useTeams();

  const hasClubs = followed.length > 0;

  /**
   * The in-play match of a followed club, as of the last sweep. Read from the
   * fixture route, never the scoreboard — it is the only feed that knows which
   * club is yours (ADR 0027). Today's window is the fresher of the two that
   * contain it, so it is asked first.
   */
  const live = useMemo(() => {
    if (!hasClubs) return null;
    return (
      liveFixture(finished.data?.fixtures ?? [], followed) ??
      liveFixture(recent.data?.fixtures ?? [], followed)
    );
  }, [hasClubs, finished.data, recent.data, followed]);

  /** The most recent finished match of a followed club, with a score. */
  const last = useMemo(() => {
    if (!hasClubs || !recent.data) return null;
    return lastResult(recent.data.fixtures, followed);
  }, [hasClubs, recent.data, followed]);
  const lastOutcome = last ? boardOutcome(last, followed) : null;
  const lastMatchday = last ? matchday(last.round) : null;

  /** The soonest upcoming match involving a followed club. */
  const next = useMemo(() => {
    if (!hasClubs || !upcoming.data) return null;
    return upcoming.data.fixtures.find((f) => involvesFollowed(f, followed)) ?? null;
  }, [hasClubs, upcoming.data, followed]);

  const mine = useMemo(() => {
    if (!hasClubs || !upcoming.data) return [];
    return upcoming.data.fixtures.filter((f) => involvesFollowed(f, followed)).slice(0, 6);
  }, [hasClubs, upcoming.data, followed]);

  const picks = useMemo(() => (teams.data ?? []).slice(0, FOLLOW_PICKS), [teams.data]);

  /** Read once per render so every upcoming row is dated off the same instant. */
  const now = new Date();

  /** The losing side recedes; a draw or a missing score mutes nobody. */
  const loses = (mine: number | null, theirs: number | null) =>
    mine !== null && theirs !== null && mine < theirs;

  /** A crest, its monogram fallback and the short name for an upcoming side. */
  const upcomingSide = (team: WindowFixtureView['homeTeam']) => ({
    crest: crestSrc(team?.logoUrls ?? null, team?.logoUrl ?? null, 'small'),
    abbr: team ? abbreviate(team.name, team.slug, team.shortName) : phrases.unknownOpponent,
    name: team ? displayName(team.name) : '—',
  });

  const side = (team: WindowFixtureView['homeTeam'], goals: number | null, muted: boolean) => ({
    name: team ? displayName(team.name) : '—',
    crest: crestSrc(team?.logoUrls ?? null, team?.logoUrl ?? null, 'xsmall'),
    abbr: team ? abbreviate(team.name, team.slug, team.shortName) : phrases.unknownOpponent,
    goals,
    muted,
  });

  /**
   * The next-up pairing. Its own helper because the crest renders at
   * `Size.crestNext` — `side()` asks for `xsmall`, which is the row weight and
   * blurs at 56pt (ADR 0034).
   */
  const nextSide = (team: WindowFixtureView['homeTeam']) => ({
    ...side(team, null, false),
    crest: crestSrc(team?.logoUrls ?? null, team?.logoUrl ?? null, 'small'),
  });

  return (
    <ScreenScaffold
      title={copy.today.title}
      eyebrow={copy.today.eyebrow(formatWeekdayLong(new Date().toISOString(), zone, phrases))}
      accessory={<AvatarButton initials={initials} onPress={() => router.push('/(sheets)/account')} />}
      onRefresh={() => {
        void finished.refetch();
        void upcoming.refetch();
        void recent.refetch();
      }}
      refreshing={finished.isRefetching || upcoming.isRefetching || recent.isRefetching}>
      {/* The lead cards only exist once there is a club to lead with. */}
      {hasClubs && (live || last || next) ? (
        <MatchBoard
          live={
            live
              ? {
                  home: side(live.homeTeam, live.goalsHome, loses(live.goalsHome, live.goalsAway)),
                  away: side(live.awayTeam, live.goalsAway, loses(live.goalsAway, live.goalsHome)),
                  // ⚠ The fixture route carries no per-row stamp. Null, never
                  // our own fetch time — that would understate the age.
                  lastUpdateAt: null,
                }
              : null
          }
          last={
            last
              ? {
                  home: side(last.homeTeam, last.goalsHome, loses(last.goalsHome, last.goalsAway)),
                  away: side(last.awayTeam, last.goalsAway, loses(last.goalsAway, last.goalsHome)),
                  meta: [
                    lastMatchday !== null ? copy.today.md(lastMatchday) : null,
                    formatFixtureDate(last.kickoffUtc, zone, phrases),
                  ]
                    .filter(Boolean)
                    .join(' · '),
                  outcome: lastOutcome ? phrases.formLetters[lastOutcome] : null,
                }
              : null
          }
          next={
            next
              ? {
                  home: nextSide(next.homeTeam),
                  away: nextSide(next.awayTeam),
                  kickoffUtc: next.kickoffUtc,
                  kickoffTbd: next.kickoffTbd,
                  // ⚠ Its OWN label, not the section header's — the card sat
                  // directly above a section with the identical title.
                  meta: copy.today.nextUp,
                  kickoffLabel: next.kickoffTbd
                    ? '--:--'
                    : formatKickoffTime(next.kickoffUtc, zone, clock),
                  dateLabel: formatFixtureDate(next.kickoffUtc, zone, phrases),
                  zoneLabel: `${zoneAbbreviation(zone)} · ${copy.today.yourTime}`,
                  venue: next.venue,
                }
              : null
          }
          copy={copy.today}
        />
      ) : null}

      <SectionHeader
        title={copy.today.finishedToday}
        meta={
          finished.data
            ? phrases.matches(finished.data.fixtures.filter((f) => f.status === 'finished').length)
            : null
        }
      />

      {finished.isPending ? (
        <SkeletonRows count={3} height={Size.rowSkeleton} />
      ) : finished.data && finished.data.fixtures.some((f) => f.status === 'finished') ? (
        <>
          <FinishedToday window={finished.data} finishedLabel={copy.today.finished} />
          <Text variant="footnote" color="textFaint">
            {copy.today.settleNote}
          </Text>
        </>
      ) : (
        <Text variant="body" color="textDim">
          {copy.today.quiet}
        </Text>
      )}

      {hasClubs && mine.length > 0 ? (
        <>
          {/* ⚠ Plain, no count: the accent in this section belongs to the day
              word on today's card, and the count restates six visible cards. */}
          <SectionHeader title={copy.today.upcoming} />
          <View style={styles.upcoming}>
            {/* ⚠ One `now` for the whole section: read per card, a render that
                straddles midnight would date two of them off different days. */}
            {mine.map((fixture) => {
              // The row is read from the followed club's bench (ADR 0029) —
              // for the tap target and the home/away fallback, not the order:
              // the sides stay home-first, the way the match is named.
              const row = upcomingRow(fixture, followed);
              if (!row) return null;
              const md = matchday(fixture.round) ?? fixture.matchweek;
              // ⚠ `venue` is null on plenty of rows. Where the ground is
              // unknown, saying which end of it you are on is still a fact.
              const location =
                fixture.venue ?? (row.isHome ? copy.today.homeWord : copy.today.awayWord);
              // ⚠ A TBD kickoff is stored as midnight UTC — `formatRelativeDay`
              // must never see one, or it claims "tonight" for a match that has
              // no kickoff at all (ADR 0029). Those cards just lose the word.
              const relative = fixture.kickoffTbd
                ? null
                : formatRelativeDay(fixture.kickoffUtc, zone, now, copy.today, phrases);

              return (
                <UpcomingCard
                  key={fixture.id}
                  home={upcomingSide(fixture.homeTeam)}
                  away={upcomingSide(fixture.awayTeam)}
                  meta={[md !== null ? copy.today.md(md) : null, location]
                    .filter(Boolean)
                    .join(' · ')}
                  // ⚠ Today only. `formatRelativeDay` also names tomorrow, and
                  // that word is deliberately dropped here (ADR 0043) — the
                  // date under the kickoff already carries it.
                  todayLabel={relative?.tone === 'accent' ? relative.label : null}
                  kickoffLabel={
                    fixture.kickoffTbd ? '--:--' : formatKickoffTime(fixture.kickoffUtc, zone, clock)
                  }
                  dateLabel={formatFixtureDate(fixture.kickoffUtc, zone, phrases)}
                  onPress={() =>
                    router.push({ pathname: '/club/[slug]', params: { slug: row.club.slug } })
                  }
                />
              );
            })}
          </View>
        </>
      ) : null}

      {/**
       * The two stat tiles (SPEC §3.1 item 4).
       *
       * ⚠ Gated on `hasClubs` ALONE, not on the upcoming section above it. A
       * reader who follows clubs but has no fixtures in the window — an
       * international break, or the gap between seasons — still follows those
       * clubs, and the tiles are how they get back to them. Tying these to
       * `mine.length` would make the shortcuts vanish exactly when the screen is
       * emptiest and they are most useful.
       *
       * ⚠ **Both tiles show the SAME NUMBER, deliberately.** A calendar feed is
       * derived 1:1 from a followed club here (ADR 0019/0038) — there are no
       * claimed or subset feeds — so the counts cannot disagree. The tiles earn
       * their place on their DESTINATIONS, not on the arithmetic. If that ever
       * reads as a bug to a real user, drop the second one rather than inventing
       * a number for it.
       */}
      {hasClubs ? (
        <View style={styles.tiles}>
          <StatTile
            value={followed.length}
            label={copy.today.tileClubs}
            accessibilityLabel={`${followed.length} ${copy.today.tileClubs}`}
            onPress={() => router.push('/clubs')}
          />
          <StatTile
            value={followed.length}
            label={copy.today.tileFeeds}
            accessibilityLabel={`${followed.length} ${copy.today.tileFeeds}`}
            onPress={() => router.push('/(sheets)/account')}
          />
        </View>
      ) : null}

      {/* ⚠ The no-subscriptions state: the follow card REPLACES the board. */}
      {!hasClubs ? (
        <View style={styles.follow}>
          <Text variant="title3">{copy.today.followTitle}</Text>
          <Text variant="body" color="textDim">
            {copy.today.followBody}
          </Text>

          <View style={styles.grid}>
            {picks.map((team) => (
              <Pressable
                key={team.slug}
                onPress={() =>
                  router.push({ pathname: '/club/[slug]', params: { slug: team.slug } })
                }
                style={styles.pick}>
                <Crest
                  src={crestSrc(team.logoUrls, team.logoUrl, 'small')}
                  fallback={abbreviate(team.name, team.slug, team.shortName)}
                  size={Size.crestList}
                />
                <Text variant="callout" numberOfLines={1} style={styles.pickName}>
                  {displayName(team.name)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Button
            label={copy.today.browseAll}
            onPress={() => router.push('/clubs')}
          />
        </View>
      ) : null}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  // ⚠ Each fixture draws its own surface (ADR 0043); this only spaces them.
  upcoming: { gap: Spacing.three },
  // ⚠ The gap is the only thing separating the two tiles — they share a fill
  // colour, so a zero gap reads as one wide tile with two numbers in it.
  tiles: { flexDirection: 'row', gap: Spacing.two },
  follow: {
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.dark.accentRing,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    width: '48%',
    backgroundColor: Colors.dark.raised,
    borderRadius: Radius.tile,
    padding: Spacing.three,
  },
  pickName: { flex: 1, minWidth: 0 },
});
