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

import { Button, Crest, Text } from '@/components/atoms';
import { SectionHeader } from '@/components/molecules';
import { FinishedToday } from '@/components/organisms/finished-today';
import { MatchBoard } from '@/components/organisms/match-board';
import { AvatarButton, ScreenScaffold } from '@/components/templates/screen-scaffold';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import { abbreviate, crestSrc, displayName } from '@/lib/cronogol/derive';
import type { WindowFixtureView } from '@/lib/cronogol/types';
import { formatWeekdayLong } from '@/lib/format';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useTeams } from '@/queries/use-teams';
import { useFinishedToday, useUpcoming } from '@/queries/use-today';
import { usePreferences, useZone } from '@/store/preferences';

/** The six clubs offered in the follow card's grid. */
const FOLLOW_PICKS = 6;

export default function TodayScreen() {
  const router = useRouter();
  const { copy, phrases } = useI18n();
  const zone = useZone();
  const { followed } = usePreferences();

  const finished = useFinishedToday(zone);
  const upcoming = useUpcoming(zone);
  const teams = useTeams();

  const hasClubs = followed.length > 0;

  /** The soonest upcoming match involving a followed club. */
  const next = useMemo(() => {
    if (!hasClubs || !upcoming.data) return null;
    return (
      upcoming.data.fixtures.find(
        (f) =>
          (f.homeTeam && followed.includes(f.homeTeam.slug)) ||
          (f.awayTeam && followed.includes(f.awayTeam.slug)),
      ) ?? null
    );
  }, [hasClubs, upcoming.data, followed]);

  const mine = useMemo(() => {
    if (!hasClubs || !upcoming.data) return [];
    return upcoming.data.fixtures
      .filter(
        (f) =>
          (f.homeTeam && followed.includes(f.homeTeam.slug)) ||
          (f.awayTeam && followed.includes(f.awayTeam.slug)),
      )
      .slice(0, 6);
  }, [hasClubs, upcoming.data, followed]);

  const picks = useMemo(() => (teams.data ?? []).slice(0, FOLLOW_PICKS), [teams.data]);

  const side = (team: WindowFixtureView['homeTeam'], goals: number | null, muted: boolean) => ({
    name: team ? displayName(team.name) : '—',
    crest: crestSrc(team?.logoUrls ?? null, team?.logoUrl ?? null, 'xsmall'),
    abbr: team ? abbreviate(team.name, team.slug, team.shortName) : phrases.unknownOpponent,
    goals,
    muted,
  });

  return (
    <ScreenScaffold
      title={copy.today.title}
      eyebrow={copy.today.eyebrow(formatWeekdayLong(new Date().toISOString(), zone, phrases))}
      accessory={<AvatarButton initials="" onPress={() => router.push('/(sheets)/account')} />}
      onRefresh={() => {
        void finished.refetch();
        void upcoming.refetch();
      }}
      refreshing={finished.isRefetching || upcoming.isRefetching}>
      {/* The lead pairing only exists once there is a club to lead with. */}
      {hasClubs && next ? (
        <MatchBoard
          next={{
            home: side(next.homeTeam, null, false),
            away: side(next.awayTeam, null, false),
            kickoffUtc: next.kickoffUtc,
            kickoffTbd: next.kickoffTbd,
            meta: copy.today.upcoming,
          }}
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
        <Text color="textFaint">…</Text>
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
          <SectionHeader title={copy.today.upcoming} meta={String(mine.length)} tone="accent" />
          <View style={styles.card}>
            {mine.map((fixture) => (
              <Pressable
                key={fixture.id}
                onPress={() => {
                  const slug =
                    fixture.homeTeam && followed.includes(fixture.homeTeam.slug)
                      ? fixture.homeTeam.slug
                      : fixture.awayTeam?.slug;
                  if (slug) router.push({ pathname: '/club/[slug]', params: { slug } });
                }}
                style={styles.mineRow}>
                <Text variant="bodyStrong" numberOfLines={1} style={styles.mineName}>
                  {fixture.homeTeam ? displayName(fixture.homeTeam.name) : '—'}
                  {' v '}
                  {fixture.awayTeam ? displayName(fixture.awayTeam.name) : '—'}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
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
  card: { backgroundColor: Colors.dark.card, borderRadius: Radius.group, overflow: 'hidden' },
  mineRow: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.dark.hairline,
  },
  mineName: { flex: 1 },
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
