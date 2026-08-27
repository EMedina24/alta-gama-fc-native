/**
 * The status column of a fixture row: a score, a kickoff, or `--:--`.
 *
 * ⚠ Branch order matters and is ported from the web app's `FixtureTiming`:
 *   1. finished OR live, with both goals non-null → the score
 *   2. cancelled → an em dash
 *   3. `kickoffTbd` → `--:--` with the full sentence on the label
 *   4. otherwise → the kickoff time
 *
 * ⚠ Branch 1 is the only one that is not a string. A score is the `Score` atom
 * (ADR 0044) — two numerals, a rule, and a chip; the other three are a time or
 * a dash and stay plain text, because a chip around `--:--` would claim there
 * is a result.
 *
 * ⚠ **The `live` branch is new and narrow (ADR 0035).** It shows the score; it
 * does NOT let the caller say "live". `/cronogol/fixtures` sweeps roughly every
 * three hours, so a row flagged in-play was in-play up to three hours ago — the
 * caption above this component is the Today board's own wording, "In play" /
 * "En juego", meaning *as of the last check*, and the screen carries the
 * cadence sentence beside the list. No minute, no pulsing dot, never the word
 * live. `statusText` in `scores.ts` still returns null for `live` and is
 * untouched: that guard governs `/cronogol/scores`, which no UI reads (ADR 0027).
 *
 * ⚠ A live row with null goals falls through to its kickoff time, which is the
 * fact that does not decay.
 *
 * ⚠ Takes flat scalars, never a whole fixture object. On the web that was a
 * payload-size measurement (46KB vs 4.8KB across a 38-row season); here it is
 * about re-render scope, and it keeps the same shape either way.
 */
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Score, Text } from '@/components/atoms';
import { Size, Spacing } from '@/constants/theme';
import type { ThemeColor } from '@/constants/theme';
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
  /** A caption under the value: `FT`, `IN PLAY`, or nothing. */
  caption?: string | null;
  /** ⚠ `live` only ever paints the honest in-play caption — see the header. */
  captionTone?: ThemeColor;
  /**
   * A disclosure mark, drawn BESIDE the caption (ADR 0045).
   *
   * ⚠ It lives here, and not in a column of its own on the row, because this
   * cell has spare width and the row's name column has none. A chevron column
   * on the right cost the names 19pt and truncated `Espanyol de Barcelona` —
   * measured on the simulator, and the exact failure ADR 0029 names. Beside the
   * caption it costs nothing, and it matches the design's own placement on
   * FINISHED TODAY, where the chevron sits next to `FT`.
   */
  disclosure?: ReactNode;
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
  captionTone = 'textFaint',
  disclosure = null,
  align = 'left',
}: FixtureTimingProps) {
  const scored =
    (status === 'finished' || status === 'live') && goalsHome !== null && goalsAway !== null;

  let value: string;
  let label: string | undefined;
  let dim = false;

  if (status === 'cancelled') {
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
    <View
      style={[
        styles.cell,
        { minWidth: clock === '12' ? Size.timingColumn12 : Size.timingColumn },
        align === 'right' && styles.right,
      ]}>
      {scored ? (
        <Score
          home={goalsHome}
          away={goalsAway}
          size="rowLg"
          chip
          // ⚠ The cell is a column, so without this the chip STRETCHES to the
          // column's width — and that width is a caption artifact (`EN JUEGO`)
          // that also changes with the clock format, so the chip would be 64pt
          // wide for a 24-hour reader and 88pt for a 12-hour one. It hugs its
          // digits and aligns with the caption under it instead.
          style={align === 'right' ? styles.chipRight : styles.chipLeft}
        />
      ) : (
        <Text variant="numeralLg" tabular color={dim ? 'textFaint' : 'text'} accessibilityLabel={label}>
          {value}
        </Text>
      )}
      {caption || disclosure ? (
        <View style={[styles.captionRow, align === 'right' && styles.right]}>
          {caption ? (
            <Text variant="eyebrowSm" color={captionTone}>
              {caption}
            </Text>
          ) : null}
          {disclosure}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // ⚠ The width is applied inline, from `clock` — see `Size.timingColumn`.
  // Fixed within a format, so no row reflows against its neighbours.
  cell: { gap: Spacing.half },
  right: { alignItems: 'flex-end' },
  captionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.half },
  chipLeft: { alignSelf: 'flex-start' },
  chipRight: { alignSelf: 'flex-end' },
});
