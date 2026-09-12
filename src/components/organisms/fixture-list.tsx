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
 * ⚠ **Each match is a STACKED pair** (ADR 0158): home over away, one crest and
 * one name per line, the venue under them. It is deliberately the same shape as
 * FINISHED TODAY (ADR 0069). What it replaces — a horizontal `⬤ v ⬤` pairing
 * beside two stacked names — asked the reader to pair a crest with a name by
 * remembering the order, and starved the names to ~187pt to do it.
 *
 * ⚠ The score is a per-line GOAL COLUMN on the right, not the chip in the
 * timing column (ADR 0158) — the board's shape (ADR 0069), so each digit sits
 * on its own club's line and dims with its own name. The timing cell therefore
 * always shows the KICKOFF, which a played row used to lose to the chip.
 *
 * ⚠ The column is reserved for the WHOLE ROUND whenever any fixture in it has
 * been played, not per row: goals are read down the list, and a column that
 * appeared only on played rows would shift the names on every row around them.
 * A round with nothing played draws no column at all, so a future matchday
 * pays nothing for it. An unplayed row inside a reserved column prints `–`,
 * never `0` (ADR 0044).
 *
 * ⚠ A CONCLUDED row says `FINAL` in `accent` where its kickoff would be, and
 * does NOT also carry `FT` under its score (ADR 0158). A row wearing both said
 * the same fact twice — the reason ADR 0069 deleted the word on the board.
 * ⚠ It costs a played row the time it kicked off. That is the trade Ed asked
 * for; the in-play caption is unaffected and still lives in the timing cell.
 *
 * ⚠ The chevron stays under the score, and does NOT take a column of its own
 * the way the board's does. That is trap 33: a right-hand chevron column cost
 * this row's names 19pt and truncated `Espanyol de Barcelona`.
 *
 * ⚠ A club name here may take TWO lines. Rows in one day group are therefore
 * ragged, which is accepted: a name that wraps beats one that silently loses
 * its second half, and truncating one is the failure ADR 0029 names. FINISHED
 * TODAY keeps `lines={1}` because its goal digits are read down the card.
 *
 * ⚠ The losing side's name drops to `textDim`; **a draw leaves both at full
 * ink.** That is score-driven, not status-driven — an in-play row dims the side
 * that is behind, which is what the visible score already says. `scoreEmphasis`
 * is the one copy of that rule; the `Score` atom applies it to the digits too.
 *
 * ⚠ An in-play row shows its score under an `IN PLAY` caption in `live`, never
 * the word "live" (ADR 0035). The screen owns the cadence sentence that goes
 * with it; see `matchdays.tsx`.
 *
 * ⚠ Rows and day headers BLEED past the screen gutter (`-Spacing.five`), so a
 * separator and a live row's tint run edge to edge. Anything added here that
 * carries a background needs the same treatment or it will stop short. ⚠ That
 * is exactly why `MatchEvents` is handed `bleed` below — its ground is a
 * background, and without it the panel stops short of both edges under a row
 * that does not.
 *
 * ⚠ A **finished** row expands into its match timeline (ADR 0045). An in-play
 * row does NOT: the ingest is finished-only, so there is nothing to show and
 * the chevron would open on an empty panel. Upcoming rows likewise.
 */
import { Fragment, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Chevron, Text } from '@/components/atoms';
import { ClubLine, FixtureTiming } from '@/components/molecules';
import { Colors, Size, Spacing } from '@/constants/theme';
import { abbreviate, crestSrc, displayName } from '@/lib/cronogol/derive';
import { dayGroups } from '@/lib/cronogol/jornada';
import { scoreEmphasis } from '@/lib/cronogol/scores';
import type { JornadaFixtureView } from '@/lib/cronogol/types';
import { formatFixtureDate } from '@/lib/format';
import type { Copy } from '@/lib/i18n/copy';
import type { Phrases } from '@/lib/i18n/phrases';
import type { ClockFormat } from '@/store/preferences';
import { MatchEvents } from './match-events';
import type { FixtureEventsSource } from '@/queries/use-fixture-events';

/** ⚠ Never `0` — an unplayed row mirrors the format, it does not claim a result (ADR 0044). */
const NO_SCORE = '–';

export interface FixtureListProps {
  fixtures: readonly JornadaFixtureView[];
  zone: string;
  clock: ClockFormat;
  phrases: Phrases;
  /**
   * `Final` — REPLACES the kickoff on a concluded row, in `accent` (ADR 0158).
   *
   * ⚠ It is not a caption beside the score; it is the row's status, said once.
   * The `FT` word that used to sit under the digits is GONE with it — a row
   * carrying both said the same fact twice, which is what ADR 0069 deleted the
   * word for on the board.
   */
  finalLabel: string;
  /**
   * `IN PLAY` — shown under an in-play score, in `live`.
   * ⚠ Never the word "live": the sweep is ~3h (ADR 0035).
   */
  inProgressLabel: string;
  eventsCopy: Copy['events'];
  /**
   * Which timeline route these rows' ids belong to (ADR 0156). Defaults to the
   * domestic one; the Champions League round passes `'ucl'`.
   *
   * ⚠ It is a property of the LIST, not of a row: every fixture in one round
   * comes off one route, so a per-row flag would be three ways to say the same
   * thing and one of them wrong.
   */
  eventsSource?: FixtureEventsSource;
}

export function FixtureList({
  fixtures,
  zone,
  clock,
  phrases,
  finalLabel,
  inProgressLabel,
  eventsCopy,
  eventsSource = 'league',
}: FixtureListProps) {
  const groups = dayGroups(fixtures, zone);
  /**
   * ⚠ Over the WHOLE round, not the day group: two groups side by side with
   * different column widths would misalign the names between them.
   *
   * ⚠ Keyed on STATUS, not on non-null goals. The column also carries the `FT`
   * and in-play captions, and a `live` row with null goals — which falls through
   * to its kickoff — would otherwise lose the caption ADR 0035 and trap 8
   * require it to wear.
   */
  const anyResult = fixtures.some((f) => f.status === 'finished' || f.status === 'live');
  /** ⚠ One row open at a time — a single id, not a set (ADR 0045). */
  const [openId, setOpenId] = useState<string | null>(null);

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
            const dim = scoreEmphasis({ home: fixture.goalsHome, away: fixture.goalsAway });
            const place = [fixture.venue, fixture.venueCity].filter(Boolean).join(' · ');

            const expanded = openId === fixture.id;
            const homeName = fixture.homeTeam ? displayName(fixture.homeTeam.name) : '—';
            const awayName = fixture.awayTeam ? displayName(fixture.awayTeam.name) : '—';
            /**
             * ⚠ Gated on STATUS, not on whether events exist. Knowing that
             * before the tap means pre-fetching every row on the round — ten
             * requests for nine panels nobody opened. An opened row with
             * nothing stored says so in its own words (ADR 0045).
             */
            const canExpand = played;

            /**
             * The row's contents, shared by both shells below.
             *
             * ⚠ An expandable row is a `Pressable`; every other row stays a
             * plain `View`. Wrapping an inert row in a pressable gives
             * VoiceOver a button that does nothing — which is worse than no
             * affordance, because it is one a reader goes looking for.
             */
            const body = (
              <>
                <View style={styles.head}>
                  <FixtureTiming
                    kickoffUtc={fixture.kickoffUtc}
                    kickoffTbd={fixture.kickoffTbd}
                    status={fixture.status}
                    goalsHome={fixture.goalsHome}
                    goalsAway={fixture.goalsAway}
                    zone={zone}
                    clock={clock}
                    tbdLabel={phrases.kickoffTbd}
                    /**
                     * ⚠ The IN-PLAY caption stays HERE, while `FT` moved under
                     * the score (ADR 0158). They annotate different facts: `FT`
                     * says *this score is final*, so it belongs to the digits;
                     * `In play` says *as of the last check*, which is a claim
                     * about the TIME and the one the cadence sentence beside the
                     * list pairs with (ADR 0035, trap 8).
                     *
                     * ⚠ It is also the only column that can afford it —
                     * `Size.timingColumn` was measured against `EN JUEGO`, not
                     * against the clock. Under the score it would widen the goal
                     * column on in-play rows alone and shift the names on every
                     * row around them.
                     */
                    caption={inPlay ? inProgressLabel : null}
                    captionTone="live"
                    finalLabel={finalLabel}
                    // ⚠ The digits and `FT` live in the goal column now, so this
                    // cell is the kickoff and, when live, its honest caption.
                    showScore={false}
                  />

                  <View style={styles.pair}>
                    {(
                      [
                        { team: fixture.homeTeam, name: homeName, muted: dim.home === 'muted' },
                        { team: fixture.awayTeam, name: awayName, muted: dim.away === 'muted' },
                      ] as const
                    ).map(({ team, name, muted }, i) => (
                      <ClubLine
                        key={i}
                        // ⚠ `xsmall`, not `small`. At `Size.crestRow` a @3x box
                        // is 78px, which is what that cut is documented for —
                        // and the pairing FINISHED TODAY already ships.
                        src={crestSrc(team?.logoUrls ?? null, team?.logoUrl ?? null, 'xsmall')}
                        fallback={team ? abbreviate(team.name, team.slug, team.shortName) : '?'}
                        name={name}
                        muted={muted}
                        // 17pt, not FINISHED TODAY's 15: dropping the 95pt
                        // pairing column gave this name ~60pt back, and there is
                        // no goal column on the right taking it away again.
                        variant="headline"
                        lines={2}
                      />
                    ))}
                  </View>

                  {anyResult ? (
                    /* ⚠ Both digits `tabular` and in a FIXED column — the same
                       shape the board uses, so a reader moving between the two
                       screens reads one score, not two. */
                    <View style={styles.goals}>
                      {(
                        [
                          { goals: fixture.goalsHome, muted: dim.home === 'muted' },
                          { goals: fixture.goalsAway, muted: dim.away === 'muted' },
                        ] as const
                      ).map(({ goals, muted }, i) => (
                        <Text
                          key={i}
                          variant="numeral"
                          tabular
                          color={goals === null ? 'textFaint' : muted ? 'textDim' : 'text'}
                          style={styles.goal}>
                          {goals === null ? NO_SCORE : goals}
                        </Text>
                      ))}

                      {/* ⚠ The disclosure stays UNDER its own score (Ed's
                          call), but the `FT` word that sat beside it is gone —
                          `FINAL` in the kickoff cell already says it, and a row
                          saying it twice is what ADR 0069 deleted the word for.
                          ⚠ Still not a column of its own: that width is trap 33. */}
                      {canExpand ? (
                        <View style={styles.captionRow}>
                          <Chevron expanded={expanded} />
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>

                {place ? (
                  <Text
                    variant="footnote"
                    color="textFaint"
                    numberOfLines={1}
                    // ⚠ Indented to the club NAMES, not to the row's edge, so the
                    // whole block has one text left-edge. Built from the tokens
                    // to its left; the timing column is the clock-dependent one.
                    style={{
                      paddingLeft:
                        (clock === '12' ? Size.timingColumn12 : Size.timingColumn) +
                        Spacing.three +
                        Size.crestRow +
                        Spacing.three,
                    }}>
                    {place}
                  </Text>
                ) : null}
              </>
            );

            return (
              <View key={fixture.id}>
                {canExpand ? (
                  <Pressable
                    onPress={() => setOpenId(expanded ? null : fixture.id)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    // One stop for the whole row. Without it VoiceOver reads
                    // the time, the pairing, both names and the venue as five.
                    accessibilityLabel={`${homeName} ${fixture.goalsHome}, ${awayName} ${fixture.goalsAway}`}
                    accessibilityHint={expanded ? eventsCopy.collapse : eventsCopy.expand}
                    style={({ pressed }) => [
                      styles.row,
                      inPlay && styles.live,
                      // ⚠ Opacity, not `rowActive` — that colour is the in-play
                      // tint two lines up, and borrowing it for a press would
                      // make a finished row flash as if it were live.
                      pressed && { opacity: 0.75 },
                    ]}>
                    {body}
                  </Pressable>
                ) : (
                  <View style={[styles.row, inPlay && styles.live]}>{body}</View>
                )}

                {expanded ? (
                  <MatchEvents
                    fixtureId={fixture.id}
                    source={eventsSource}
                    home={fixture.homeTeam}
                    away={fixture.awayTeam}
                    copy={eventsCopy}
                    bleed
                  />
                ) : null}
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
    // The quiet full-bleed slab the 0087 shell uses for a day header — a
    // charcoal band here would be the last `card` slab on the mesh.
    backgroundColor: Colors.dark.glassFillDim,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    marginHorizontal: -Spacing.five,
  },
  row: {
    // ⚠ A COLUMN, and the venue is a SIBLING of the head rather than a third
    // line inside the name block. Inside it, the head's vertical centre fell
    // between the away club and the venue, and `13:00` read as belonging to the
    // away side rather than to the match. The head centres on the two clubs.
    gap: Spacing.two,
    paddingVertical: Spacing.four,
    // Bleeds past the screen gutter so the rule below — and a live row's tint —
    // run edge to edge, flush with the day header above them.
    paddingHorizontal: Spacing.five,
    marginHorizontal: -Spacing.five,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.hairline,
  },
  live: { backgroundColor: Colors.dark.rowActive },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    // `three` is affordable again now the 95pt pairing column is gone — it was
    // clawed back to `two` in ADR 0035 to stop `Espanyol de Barcelona`
    // truncating, and the stacked pair hands the names far more than it costs.
    gap: Spacing.three,
  },
  /** The two club lines. `two` between them reads as one pair. */
  pair: { flex: 1, minWidth: 0, gap: Spacing.two },
  /**
   * A hairline on its left running the pair's full height, so the digits sit in
   * a column of their own and not at the end of a name. The same `two` gap as
   * the pair keeps each digit on its club's line. Ported from the board's own
   * `goals` style (ADR 0069) rather than re-derived — they must stay in step.
   */
  goals: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    // ⚠ `flex: 0` and a FIXED width — it has an intrinsic width and must never
    // take a share (trap 56), and it must not resize per row either. Two digits
    // set it; the chevron under them is narrower. It went back to `goalColumn`
    // when `FT` left this column for `FINAL` on the other side of the row.
    flex: 0,
    width: Size.goalColumn,
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingLeft: Spacing.three,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: Colors.dark.hairlineMid,
  },
  goal: { width: Size.goalColumn, textAlign: 'right' },
  captionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.half },
});
