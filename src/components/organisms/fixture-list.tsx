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
 * ink.** That is score-driven, not status-driven — an in-play row dims the side
 * that is behind, which is what the visible score already says.
 *
 * ⚠ An in-play row shows its score under an `IN PLAY` caption in `live`, never
 * the word "live" (ADR 0035). The screen owns the cadence sentence that goes
 * with it; see `matchdays.tsx`.
 *
 * ⚠ Rows and day headers BLEED past the screen gutter (`-Spacing.five`), so a
 * separator and a live row's tint run edge to edge. Anything added here that
 * carries a background needs the same treatment or it will stop short.
 */
import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { Crest, Text } from '@/components/atoms';
import { FixtureTiming } from '@/components/molecules';
import { Colors, Size, Spacing } from '@/constants/theme';
import { abbreviate, crestSrc, displayName } from '@/lib/cronogol/derive';
import { dayGroups } from '@/lib/cronogol/jornada';
import type { JornadaFixtureView, TeamRef } from '@/lib/cronogol/types';
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
  /**
   * `IN PLAY` — shown under an in-play score, in `live`.
   * ⚠ Never the word "live": the sweep is ~3h (ADR 0035).
   */
  inProgressLabel: string;
}

/** Both sides full-strength unless one of them lost. */
function emphasis(goalsHome: number | null, goalsAway: number | null) {
  if (goalsHome === null || goalsAway === null || goalsHome === goalsAway) {
    return { home: false, away: false };
  }
  return { home: goalsHome < goalsAway, away: goalsAway < goalsHome };
}

/**
 * `[home] v [away]` — the pairing, in the order the match is named.
 *
 * ⚠ Private to this organism (ADR 0013): promote to `molecules/` only when a
 * second organism wants it. It is deliberately NOT `VersusBadge`, which is the
 * 34pt accent ring built for the next-up card's 64pt crests (ADR 0034) — at row
 * weight the ring would be the loudest thing in a ten-row list.
 *
 * ⚠ `accessible={false}`: the pairing is named once, by the two club names
 * beside it. Without this VoiceOver gains a stop that reads only "v".
 *
 * ⚠ `Size.crestCard` (40), NOT `Size.crestRow` (26). `crestRow` is shared with
 * the standings row, FINISHED TODAY and `ScoreLine` and must not move; 40 is
 * the size ADR 0034 records as "the row and list size", and it is what
 * `UpcomingRow` already uses for the same two-crest pairing.
 *
 * ⚠ The cut is `small`, not `xsmall`. `CREST_KEYS.xsmall` is documented for
 * 40–76px slots — at 40pt that is a 120px box on a @3x screen, and ADR 0034
 * already found `xsmall` "visibly softens" when asked to fill one.
 *
 * Its width is constant — two fixed-size crests and one glyph, and a club with
 * no artwork falls back to a monogram tile at the same size — so the name
 * column lines up across every row without a fixed-width token.
 */
function CrestPair({ home, away }: { home: TeamRef | null; away: TeamRef | null }) {
  return (
    <View style={styles.crests} accessible={false}>
      <Crest
        src={crestSrc(home?.logoUrls ?? null, home?.logoUrl ?? null, 'small')}
        fallback={home ? abbreviate(home.name, home.slug, home.shortName) : '?'}
        size={Size.crestCard}
      />
      <Text variant="caption" color="textFaint">
        v
      </Text>
      <Crest
        src={crestSrc(away?.logoUrls ?? null, away?.logoUrl ?? null, 'small')}
        fallback={away ? abbreviate(away.name, away.slug, away.shortName) : '?'}
        size={Size.crestCard}
      />
    </View>
  );
}

export function FixtureList({
  fixtures,
  zone,
  clock,
  phrases,
  finishedLabel,
  inProgressLabel,
}: FixtureListProps) {
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
            const inPlay = fixture.status === 'live';
            const dim = emphasis(fixture.goalsHome, fixture.goalsAway);
            const place = [fixture.venue, fixture.venueCity].filter(Boolean).join(' · ');

            return (
              <View key={fixture.id} style={[styles.row, inPlay && styles.live]}>
                <FixtureTiming
                  kickoffUtc={fixture.kickoffUtc}
                  kickoffTbd={fixture.kickoffTbd}
                  status={fixture.status}
                  goalsHome={fixture.goalsHome}
                  goalsAway={fixture.goalsAway}
                  zone={zone}
                  clock={clock}
                  tbdLabel={phrases.kickoffTbd}
                  caption={inPlay ? inProgressLabel : played ? finishedLabel : null}
                  captionTone={inPlay ? 'live' : 'textFaint'}
                />

                <CrestPair home={fixture.homeTeam} away={fixture.awayTeam} />

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
    // ⚠ `two`, not `three`. At 40pt crests the pairing column is 95pt wide and
    // the name column is the one that pays for it — 4pt back on each side of
    // the pairing is the difference between `Espanyol de Barcelona` fitting and
    // truncating for a reader on a 12-hour clock.
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    // Bleeds past the screen gutter so the rule below — and a live row's tint —
    // run edge to edge, flush with the day header above them.
    paddingHorizontal: Spacing.five,
    marginHorizontal: -Spacing.five,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.hairline,
  },
  live: { backgroundColor: Colors.dark.rowActive },
  crests: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  names: { flex: 1, gap: Spacing.half, minWidth: 0 },
});
