/**
 * A round's matches, grouped by calendar day.
 *
 * ⚠ Grouping comes from `dayGroups`, which reads a FLOATING (`kickoffTbd`)
 * kickoff's day in UTC and a confirmed one in the viewer's zone. A provisional
 * kickoff is stored as `00:00:00Z` — a date wearing a midnight time — so
 * converting it westward dates the round to the previous day.
 *
 * ⚠ Insertion order, never sorted. The API orders confirmed kickoffs first,
 * which is editorial (what you can actually plan around, first); sorting by day
 * would float a provisional date above a confirmed one.
 *
 * ⚠ The losing side's name drops to `textDim`; **a draw leaves both at full
 * ink.** That is score-driven, not status-driven.
 */
import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { Crest, Hairline, Text } from '@/components/atoms';
import { FixtureTiming } from '@/components/molecules';
import { Colors, Size, Spacing } from '@/constants/theme';
import { abbreviate, crestSrc, displayName } from '@/lib/cronogol/derive';
import { dayGroups } from '@/lib/cronogol/jornada';
import type { JornadaFixtureView } from '@/lib/cronogol/types';
import { formatFixtureDate } from '@/lib/format';
import type { Phrases } from '@/lib/i18n/phrases';
import type { ClockFormat } from '@/store/preferences';

export interface FixtureListProps {
  fixtures: readonly JornadaFixtureView[];
  zone: string;
  clock: ClockFormat;
  phrases: Phrases;
  /** `FT` — shown under a finished score. */
  finishedLabel: string;
}

/** Both sides full-strength unless one of them lost. */
function emphasis(goalsHome: number | null, goalsAway: number | null) {
  if (goalsHome === null || goalsAway === null || goalsHome === goalsAway) {
    return { home: false, away: false };
  }
  return { home: goalsHome < goalsAway, away: goalsAway < goalsHome };
}

export function FixtureList({ fixtures, zone, clock, phrases, finishedLabel }: FixtureListProps) {
  const groups = dayGroups(fixtures, zone);

  return (
    <View>
      {groups.map((group) => (
        <Fragment key={group.key}>
          <View style={styles.dayHeader}>
            <Text variant="eyebrow" color="textSecondary">
              {formatFixtureDate(group.iso, group.zone, phrases)}
            </Text>
            <Text variant="eyebrow" color="textFaint">
              {phrases.matches(group.items.length)}
            </Text>
          </View>

          {group.items.map((fixture) => {
            const played = fixture.status === 'finished';
            const dim = emphasis(fixture.goalsHome, fixture.goalsAway);
            const place = [fixture.venue, fixture.venueCity].filter(Boolean).join(' · ');

            return (
              <View
                key={fixture.id}
                style={[styles.row, fixture.status === 'live' && styles.live]}>
                <FixtureTiming
                  kickoffUtc={fixture.kickoffUtc}
                  kickoffTbd={fixture.kickoffTbd}
                  status={fixture.status}
                  goalsHome={fixture.goalsHome}
                  goalsAway={fixture.goalsAway}
                  zone={zone}
                  clock={clock}
                  tbdLabel={phrases.kickoffTbd}
                  caption={played ? finishedLabel : null}
                />

                <View style={styles.crests}>
                  <Crest
                    src={crestSrc(fixture.homeTeam?.logoUrls ?? null, fixture.homeTeam?.logoUrl ?? null, 'xsmall')}
                    fallback={fixture.homeTeam ? abbreviate(fixture.homeTeam.name, fixture.homeTeam.slug, fixture.homeTeam.shortName) : '?'}
                    size={Size.crestRow}
                  />
                  <Crest
                    src={crestSrc(fixture.awayTeam?.logoUrls ?? null, fixture.awayTeam?.logoUrl ?? null, 'xsmall')}
                    fallback={fixture.awayTeam ? abbreviate(fixture.awayTeam.name, fixture.awayTeam.slug, fixture.awayTeam.shortName) : '?'}
                    size={Size.crestRow}
                  />
                </View>

                <View style={styles.names}>
                  <Text variant="bodyStrong" color={dim.home ? 'textDim' : 'text'} numberOfLines={1}>
                    {fixture.homeTeam ? displayName(fixture.homeTeam.name) : '—'}
                  </Text>
                  <Text variant="bodyStrong" color={dim.away ? 'textDim' : 'text'} numberOfLines={1}>
                    {fixture.awayTeam ? displayName(fixture.awayTeam.name) : '—'}
                  </Text>
                  {place ? (
                    <Text variant="footnote" color="textFaint" numberOfLines={1}>
                      {place}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
          <Hairline />
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // The darker group ground the design uses for a day header.
    backgroundColor: Colors.dark.card,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    marginHorizontal: -Spacing.five,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.hairline,
  },
  live: { backgroundColor: Colors.dark.rowActive },
  crests: { alignItems: 'center', gap: Spacing.one },
  names: { flex: 1, gap: Spacing.half, minWidth: 0 },
});
