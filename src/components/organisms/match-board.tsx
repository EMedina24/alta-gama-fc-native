/**
 * The Today board's lead card: a match in progress, or last result + next kickoff.
 *
 * ⚠ **The score-age line is required and must never be removed to tidy the
 * screen.** The backend has no live push — the fixture sweep that writes
 * `status: "live"` and its goals runs roughly every three hours — so a score
 * here can be hours stale. The handoff is explicit: those lines "are the
 * difference between honest and broken".
 *
 * ⚠ For the same reason there is **no minute and no pulsing dot**. SPEC §3.1
 * asks for both, but no endpoint returns a minute (every in-play state collapses
 * to `live` with "no minute, no HT, and no way to derive one"), and a dot
 * pulsing on hours-old data is a liveness claim made by animation. The card
 * states that it is in play *as of the last check* and leaves it there.
 *
 * ⚠ Both the live and last-result cards are fed from `/cronogol/fixtures`, not
 * the scoreboard — the scoreboard cannot say which match is yours (ADR 0027).
 * The fixture route carries no per-row stamp, so `lastUpdateAt` is null and the
 * age line states the cadence rather than a number.
 */
import { StyleSheet, View } from 'react-native';

import { Crest, Pill, Text, VersusBadge } from '@/components/atoms';
import { Countdown, FeedAge, ScoreLine, type ScoreSide } from '@/components/molecules';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export interface MatchBoardProps {
  /** A match in play at the last sweep, if any. */
  live?: {
    home: ScoreSide;
    away: ScoreSide;
    lastUpdateAt: string | null;
  } | null;
  /** The most recent finished match of a followed club. */
  last?: {
    home: ScoreSide;
    away: ScoreSide;
    /** "MD 3 · SAT 29 AUG" */
    meta: string;
    /** Already mapped through `phrases.formLetters` — never a raw `W`/`D`/`L`. */
    outcome: string | null;
  } | null;
  /** The soonest upcoming match of a followed club. */
  next?: {
    home: ScoreSide;
    away: ScoreSide;
    kickoffUtc: string;
    kickoffTbd: boolean;
    meta: string;
    /** Already formatted in the reader's zone and clock. `--:--` when TBD. */
    kickoffLabel: string;
    /** "SAT 5 SEP" — the reader's own day. */
    dateLabel: string;
    /** "CEST · YOUR TIME" — states WHOSE clock this is. */
    zoneLabel: string;
    venue: string | null;
  } | null;
  copy: {
    inProgress: string;
    inPlayNote: string;
    kickoffIn: string;
    lastResult: string;
    noScore: string;
    scoreAge: (hoursAgo: number | null) => string;
    tbd: string;
  };
}

export function MatchBoard({ live, last, next, copy }: MatchBoardProps) {
  if (live) {
    return (
      <View style={[styles.card, styles.liveCard]}>
        <View style={styles.headRow}>
          <Pill label={copy.inProgress} tone="live" />
        </View>
        <ScoreLine home={live.home} away={live.away} noScoreLabel={copy.noScore} />
        <View style={styles.rule} />
        <FeedAge lastUpdateAt={live.lastUpdateAt} render={copy.scoreAge} />
        <Text variant="footnote" color="textFaint">
          {copy.inPlayNote}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      {last ? (
        <View style={styles.card}>
          <View style={styles.headRow}>
            <Text variant="eyebrowSm" color="textFaint">
              {copy.lastResult} · {last.meta}
            </Text>
            {last.outcome ? <Pill label={last.outcome} /> : null}
          </View>
          <ScoreLine home={last.home} away={last.away} noScoreLabel={copy.noScore} />
        </View>
      ) : null}

      {next ? (
        /**
         * ⚠ STACKED, not a row. Names sit UNDER their crest so each gets half the
         * card's width — a row layout truncated both sides of Real Madrid v Real
         * Sociedad to "Real…" against "Real…", which names neither club.
         */
        <View style={[styles.card, styles.nextCard]}>
          <View style={styles.headRow}>
            <Text variant="eyebrowSm" color="accent">
              {next.meta}
            </Text>
            {next.venue ? (
              <Text variant="eyebrowSm" color="textFaint" numberOfLines={1} style={styles.venue}>
                {next.venue}
              </Text>
            ) : null}
          </View>

          {/* One VoiceOver stop for the whole pairing, as UpcomingCard already
              does — otherwise it reads as four: crest, name, "V", name. */}
          <View
            style={styles.pair}
            accessible
            accessibilityLabel={`${next.home.name} v ${next.away.name}`}>
            <View style={styles.pairSide}>
              <Crest
                src={next.home.crest}
                fallback={next.home.abbr}
                size={Size.crestNext}
                filled={!next.home.crest}
              />
              <Text variant="bodyStrong" center numberOfLines={1}>
                {next.home.name}
              </Text>
            </View>
            <View style={styles.versus}>
              <VersusBadge />
            </View>
            <View style={styles.pairSide}>
              <Crest
                src={next.away.crest}
                fallback={next.away.abbr}
                size={Size.crestNext}
                filled={!next.away.crest}
              />
              <Text variant="bodyStrong" center numberOfLines={1}>
                {next.away.name}
              </Text>
            </View>
          </View>

          <View style={styles.kickoffRow}>
            <Text variant="kickoff" tabular>
              {next.kickoffLabel}
            </Text>
            <View style={styles.kickoffMeta}>
              <Text variant="eyebrowLg" color="textSecondary">
                {next.dateLabel}
              </Text>
              {/* ⚠ States whose clock this is. Every time on screen is the
                  reader's own zone, and saying so is what stops "9:00 PM" being
                  read as the stadium's local time — which is why it is set to
                  be read rather than skimmed. */}
              <Text variant="eyebrowLg" color="textFaint">
                {next.zoneLabel}
              </Text>
            </View>
          </View>

          <View style={styles.rule} />
          {next.kickoffTbd ? (
            <Text variant="footnote" color="textFaint">
              {copy.tbd}
            </Text>
          ) : (
            <View style={styles.countdownRow}>
              <Text variant="eyebrowSm" color="textFaint">
                {copy.kickoffIn}
              </Text>
              <Countdown kickoffUtc={next.kickoffUtc} />
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: Spacing.three },
  card: {
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  liveCard: { borderColor: Colors.dark.live },
  nextCard: { borderColor: Colors.dark.accentRing },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.dark.hairlineMid },
  venue: { flexShrink: 1, textAlign: 'right' },
  pair: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  pairSide: { flex: 1, alignItems: 'center', gap: Spacing.two },
  /** Centres the ring on the crest line — derived, so a crest resize follows. */
  versus: { marginTop: (Size.crestNext - Size.versusBadge) / 2 },
  kickoffRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.three },
  kickoffMeta: { flex: 1, gap: Spacing.one, paddingBottom: Spacing.one },
  /**
   * ⚠ WRAPS rather than shrinks. `1d 18h 04m 12s` is four rigid groups, and at
   * the largest Dynamic Type sizes squeezing them slid every digit over its own
   * unit letter. Given the room it drops to its own line instead, which is the
   * one failure mode here that stays readable.
   */
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    columnGap: Spacing.three,
    rowGap: Spacing.two,
  },
});
