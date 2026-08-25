/**
 * The Today board's lead card: a match in progress, or last result + next kickoff.
 *
 * ⚠ **The score-age line is required and must never be removed to tidy the
 * screen.** The backend has no live push — `/cronogol/scores` sweeps roughly
 * every four hours — so a score here can be hours stale. The handoff is explicit:
 * those lines "are the difference between honest and broken".
 *
 * ⚠ For the same reason there is **no minute and no pulsing dot**. SPEC §3.1
 * asks for both, but no endpoint returns a minute (`/cronogol/scores` collapses
 * every in-play state to `live` with no minute and "no way to derive one"), and
 * a dot pulsing on four-hour-old data is a liveness claim made by animation.
 * The card states that it is in play *as of the last check* and leaves it there.
 */
import { StyleSheet, View } from 'react-native';

import { Pill, Text } from '@/components/atoms';
import { Countdown, FeedAge, ScoreLine, type ScoreSide } from '@/components/molecules';
import { Colors, Radius, Spacing } from '@/constants/theme';

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
    meta: string;
  } | null;
  /** The soonest upcoming match of a followed club. */
  next?: {
    home: ScoreSide;
    away: ScoreSide;
    kickoffUtc: string;
    kickoffTbd: boolean;
    meta: string;
  } | null;
  copy: {
    inProgress: string;
    inPlayNote: string;
    kickoffIn: string;
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
          <Text variant="eyebrowSm" color="textFaint">
            {last.meta}
          </Text>
          <ScoreLine home={last.home} away={last.away} noScoreLabel={copy.noScore} />
        </View>
      ) : null}

      {next ? (
        <View style={[styles.card, styles.nextCard]}>
          <Text variant="eyebrowSm" color="accent">
            {next.meta}
          </Text>
          <ScoreLine home={next.home} away={next.away} noScoreLabel={copy.noScore} />
          <View style={styles.rule} />
          {next.kickoffTbd ? (
            <Text variant="footnote" color="textFaint">
              {copy.tbd}
            </Text>
          ) : (
            <View style={styles.countdown}>
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
  countdown: { gap: Spacing.one },
});
