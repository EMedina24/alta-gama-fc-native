/**
 * One finished match, opened from a played row on the club page (ADR 0190):
 * the scoreline, the goal flow, the head-to-head counts and the timeline.
 *
 * ⚠⚠ **Built from the EVENTS timeline, because nothing else exists.** The API
 * has no possession, shots or xG for any club (`CRONOGOL-API.md`). The
 * head-to-head rows are event counts and are labelled as such; `VersusBars`
 * takes more rows the day team stats land (backend "Tier 3").
 *
 * ⚠ **The score printed here is the FIXTURE's, not a count of goal events.**
 * The fixture is authoritative; the timeline can lag it while a sweep is
 * partial. The chart draws what the timeline holds.
 *
 * ⚠ **An empty timeline hides the charts and says why** — `MatchEvents` owns
 * that copy (`notPublished`): the sweep is three-hourly and finished-only, so
 * an un-swept 4-1 and a real 0-0 look identical on the wire. A goal-flow chart
 * of two flat lines would state the 0-0 as fact.
 *
 * ⚠ The events query shares its KEY with `MatchEvents` below, so the timeline
 * costs one request, not two.
 *
 * ⚠ Trap 19 — inside a `formSheet`, `flex: 1` collapses to zero. The body is a
 * `ScrollView`, never a flexed column.
 */
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  cancelAnimation,
  Easing,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { SkeletonRows, Text } from '@/components/atoms';
import { ClubLine, GoalFlowChart, StatCard, VersusBars } from '@/components/molecules';
import { Colors, SeasonStats, Size, Spacing } from '@/constants/theme';
import { abbreviate, crestSrc, displayName, matchday } from '@/lib/cronogol/derive';
import { goalFlow, versusCounts } from '@/lib/cronogol/match-stats';
import { scoreEmphasis } from '@/lib/cronogol/scores';
import type { WindowFixtureView } from '@/lib/cronogol/types';
import { formatFixtureDate } from '@/lib/format';
import type { Copy } from '@/lib/i18n/copy';
import type { Phrases } from '@/lib/i18n/phrases';
import { useFixtureEvents } from '@/queries/use-fixture-events';
import { MatchEvents } from './match-events';

export interface MatchStatsSheetProps {
  fixture: WindowFixtureView;
  /** The club whose page opened the sheet — drawn in `accent`, the other side in teal. */
  clubSlug: string;
  zone: string;
  phrases: Phrases;
  copy: Copy;
  /** `J` / `MD` — the club page's round prefix. */
  roundPrefix: string;
}

export function MatchStatsSheet({
  fixture,
  clubSlug,
  zone,
  phrases,
  copy,
  roundPrefix,
}: MatchStatsSheetProps) {
  const query = useFixtureEvents(fixture.id, 'league');
  const events = query.data?.events ?? [];
  const has = events.length > 0;

  const home = fixture.homeTeam;
  const away = fixture.awayTeam;
  const clubIsHome = home?.slug === clubSlug;
  const homeColor = clubIsHome ? Colors.dark.accent : Colors.dark.chartSeriesAlt;
  const awayColor = clubIsHome ? Colors.dark.chartSeriesAlt : Colors.dark.accent;

  const flow = goalFlow(events, home, away);
  const counts = versusCounts(events, home, away);
  const dim = scoreEmphasis({ home: fixture.goalsHome, away: fixture.goalsAway });

  /**
   * One clock for the chart's draw-in and every counting number — the Season
   * stats pattern. It starts when there is something to draw, not at mount, so
   * a slow request does not play the animation over a skeleton.
   */
  const progress = useSharedValue(0);
  useEffect(() => {
    if (!has) return;
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: SeasonStats.count,
      easing: Easing.out(Easing.cubic),
    });
    // ⚠ A dismiss mid-draw must leave nothing running.
    return () => cancelAnimation(progress);
  }, [has, progress]);

  const round = matchday(fixture.round);
  const eyebrow = [
    fixture.competitionName,
    round ? `${roundPrefix}${round}` : null,
    formatFixtureDate(fixture.kickoffUtc, zone, phrases),
  ]
    .filter(Boolean)
    .join(' · ');
  const place = [fixture.venue, fixture.venueCity].filter(Boolean).join(' · ');

  /** The club's side paints LAST, so a shared 0-line shows the club's colour. */
  const series = clubIsHome
    ? [
        { goals: flow.away, color: awayColor },
        { goals: flow.home, color: homeColor },
      ]
    : [
        { goals: flow.home, color: homeColor },
        { goals: flow.away, color: awayColor },
      ];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.head}>
        <Text variant="eyebrowSm" color="textMuted">
          {eyebrow}
        </Text>
        <View style={styles.scoreRow}>
          <View style={styles.pair}>
            {(
              [
                { team: home, muted: dim.home === 'muted' },
                { team: away, muted: dim.away === 'muted' },
              ] as const
            ).map(({ team, muted }, i) => (
              <ClubLine
                key={i}
                src={crestSrc(team?.logoUrls ?? null, team?.logoUrl ?? null, 'xsmall')}
                fallback={team ? abbreviate(team.name, team.slug || undefined, team.shortName) : '?'}
                name={team ? displayName(team.name) : '—'}
                muted={muted}
                size={Size.crestList}
                variant="headline"
                lines={2}
              />
            ))}
          </View>
          <View style={styles.goals}>
            {(
              [
                { goals: fixture.goalsHome, muted: dim.home === 'muted', color: homeColor },
                { goals: fixture.goalsAway, muted: dim.away === 'muted', color: awayColor },
              ] as const
            ).map(({ goals, muted, color }, i) => (
              <View key={i} style={styles.goalLine}>
                {/* The series key: which colour on the chart is which side. */}
                <View style={[styles.swatch, { backgroundColor: color }]} />
                <Text variant="title" tabular color={muted ? 'textDim' : 'text'}>
                  {goals ?? '–'}
                </Text>
              </View>
            ))}
          </View>
        </View>
        {place ? (
          <Text variant="footnote" color="textFaint" numberOfLines={1}>
            {place}
          </Text>
        ) : null}
      </View>

      {query.isPending ? <SkeletonRows count={3} height={Size.rowSkeleton} /> : null}

      {has ? (
        <>
          <StatCard label={copy.matchStats.goalFlow}>
            <GoalFlowChart
              series={series}
              end={flow.end}
              progress={progress}
              halfTimeLabel={copy.matchStats.halfTime}
            />
          </StatCard>

          <StatCard label={copy.matchStats.headToHead}>
            <VersusBars
              homeColor={homeColor}
              awayColor={awayColor}
              progress={progress}
              rows={[
                // ⚠ The goals row is the FIXTURE's score — see the header.
                {
                  label: copy.matchStats.goals,
                  home: fixture.goalsHome ?? counts.goals.home,
                  away: fixture.goalsAway ?? counts.goals.away,
                },
                { label: copy.matchStats.yellow, ...counts.yellow },
                { label: copy.matchStats.red, ...counts.red },
                { label: copy.matchStats.subs, ...counts.subs },
              ]}
            />
          </StatCard>
        </>
      ) : null}

      {/* ⚠ Owns loading / error / not-published itself; same query key as above. */}
      <MatchEvents
        fixtureId={fixture.id}
        home={home}
        away={away}
        copy={copy.events}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.five,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.eight,
    gap: Spacing.five,
  },
  head: { gap: Spacing.three },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  pair: { flex: 1, minWidth: 0, gap: Spacing.three },
  goals: { gap: Spacing.two, alignItems: 'flex-end' },
  goalLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  swatch: { width: Spacing.two, height: Spacing.two, borderRadius: Spacing.one },
});
