/**
 * The status column of a fixture row: a score, a kickoff, or `--:--`.
 *
 * ⚠ Branch order matters and is ported from the web app's `FixtureTiming`:
 *   1. finished AND both goals non-null → the score
 *   2. cancelled → an em dash
 *   3. `kickoffTbd` → `--:--` with the full sentence on the label
 *   4. otherwise → the kickoff time
 *
 * ⚠ **There is no `live` branch, deliberately.** A live caption used to read
 * "LIVE" in accent — but `/cronogol/scores` sweeps every ~4h, so a row flagged
 * in-play was in-play up to four hours ago. A live fixture falls through to its
 * kickoff time, which is the fact that does not decay. See `statusText` in
 * `scores.ts`, which enforces the same rule from the other direction.
 *
 * ⚠ Takes flat scalars, never a whole fixture object. On the web that was a
 * payload-size measurement (46KB vs 4.8KB across a 38-row season); here it is
 * about re-render scope, and it keeps the same shape either way.
 */
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Size, Spacing } from '@/constants/theme';
import type { FixtureStatus } from '@/lib/cronogol/types';
import { formatKickoffTime } from '@/lib/format';
import type { ClockFormat } from '@/store/preferences';

export interface FixtureTimingProps {
  kickoffUtc: string;
  kickoffTbd: boolean;
  status: FixtureStatus;
  goalsHome: number | null;
  goalsAway: number | null;
  zone: string;
  clock: ClockFormat;
  /** "kickoff time to be confirmed" — `phrases.kickoffTbd`. */
  tbdLabel: string;
  /** A caption under the value: `FT`, or nothing. */
  caption?: string | null;
  align?: 'left' | 'right';
}

export function FixtureTiming({
  kickoffUtc,
  kickoffTbd,
  status,
  goalsHome,
  goalsAway,
  zone,
  clock,
  tbdLabel,
  caption,
  align = 'left',
}: FixtureTimingProps) {
  const played = status === 'finished' && goalsHome !== null && goalsAway !== null;

  let value: string;
  let label: string | undefined;
  let dim = false;

  if (played) {
    value = `${goalsHome}–${goalsAway}`;
  } else if (status === 'cancelled') {
    value = '—';
    dim = true;
  } else if (kickoffTbd) {
    value = '--:--';
    label = tbdLabel;
    dim = true;
  } else {
    value = formatKickoffTime(kickoffUtc, zone, clock);
  }

  return (
    <View style={[styles.cell, align === 'right' && styles.right]}>
      <Text variant="numeral" tabular color={dim ? 'textFaint' : 'text'} accessibilityLabel={label}>
        {value}
      </Text>
      {caption ? (
        <Text variant="eyebrowSm" color="textFaint">
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Fixed width so switching 12/24h does not reflow the row.
  cell: { minWidth: Size.timingColumn, gap: Spacing.half },
  right: { alignItems: 'flex-end' },
});
