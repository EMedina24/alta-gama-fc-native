/**
 * The club page's SEASON SO FAR (ADR 0204, replacing 0203's mini bar charts):
 * three rings, the Season stats screen's own clean-sheet ring made tile-sized,
 * each sweeping to its share while the number in its hole counts up.
 *
 *  - GOALS FOR: the club's goals as a share of ALL the goals in its matches —
 *    17 of 26, a lime arc, "/ 26" under the number.
 *  - GOALS AGAINST: the other side of the same fact — 9 of 26, a red arc. The
 *    two goal rings are mirror halves: their arcs always add up to one ring.
 *  - CLEAN SHEETS: matches without conceding, of matches played — 3 of 8, a
 *    lime arc (0142's clean-sheet ink, as on Season stats).
 *
 * Each tile keeps a caption that puts it in proportion: goals per match, and
 * the clean-sheet share of matches as a percentage.
 *
 * ⚠ The figures are the MERGED all-competition totals (0149). "Matches played"
 * is the merged timeline's length (`home.played + away.played ===
 * timeline.length`, always); per match is Season stats' own `perMatch`.
 *
 * ⚠ One clock, Season stats' (`SeasonStats.count`, ease-out cubic), started on
 * MOUNT so returning to Overview replays it and cancelled on unmount. Reduce
 * Motion needs no branch (trap 63): everything renders final.
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  cancelAnimation,
  Easing,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { AnimatedNumber, SweepRing, Text } from '@/components/atoms';
import { ChartTile } from '@/components/molecules';
import { Colors, DisplayMetrics, SeasonStats, SeasonTiles, Spacing, Type } from '@/constants/theme';
import { perMatch } from '@/lib/cronogol/stats';
import type { TeamSeasonTotalsView } from '@/lib/cronogol/types';

export interface SeasonSoFarProps {
  totals: TeamSeasonTotalsView;
  copy: {
    tiles: Record<'gf' | 'ga' | 'cleanSheets', { label: string; spoken: string }>;
    perMatch: (value: string) => string;
    outOf: (total: number) => string;
    ofGoals: (total: number) => string;
    cleanOf: (clean: number, played: number) => string;
    cleanShare: (percent: number) => string;
  };
  /** Season stats, when there is a block behind it. Null leaves the tiles inert. */
  onOpen?: () => void;
}

const THICKNESS = (SeasonTiles.ring * (1 - SeasonTiles.cutout)) / 2;

/**
 * Where the ring's number sits (ADR 0205, Ed: *"the main number sits too
 * high"*). The DIGITS are centred on the ring, not the number's line box: a
 * Saira line box carries its whole descent as air below the digits (see
 * `DisplayMetrics`), so a centred box — or a centred box-plus-total stack —
 * lifts the digits above the middle. `DROP` moves the box down until the
 * digits' own midline is the box's; the total then hangs just under the digits'
 * foot, out of the flow, so it never pulls them back up.
 */
const NUM = Type.statSm;
// ⚠ `AnimatedNumber` draws through a TextInput, which sits Saira
// `inputLift` higher than a Text would — measured, see `DisplayMetrics`.
const DIGIT_FOOT =
  NUM.lineHeight - DisplayMetrics.descent * NUM.fontSize - DisplayMetrics.inputLift * NUM.fontSize;
const DIGIT_MID = DIGIT_FOOT - (DisplayMetrics.cap * NUM.fontSize) / 2;
const DROP = NUM.lineHeight / 2 - DIGIT_MID;

export function SeasonSoFar({ totals, copy, onOpen }: SeasonSoFarProps) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: SeasonStats.count, easing: Easing.out(Easing.cubic) });
    return () => cancelAnimation(progress);
  }, [progress]);

  const goals = totals.goalsFor + totals.goalsAgainst;
  const played = totals.timeline.length;
  const share = (part: number, whole: number) => (whole > 0 ? part / whole : 0);
  const rate = (value: number) => {
    const r = perMatch(value, totals.coverage);
    return r === null ? null : copy.perMatch(r.toFixed(1));
  };

  const gfCaption = rate(totals.goalsFor);
  const gaCaption = rate(totals.goalsAgainst);
  const csCaption =
    played > 0 ? copy.cleanShare(Math.round(share(totals.cleanSheets, played) * 100)) : null;
  const spoken = (parts: (string | null)[]) => parts.filter(Boolean).join(', ');

  return (
    <View style={styles.row}>
      <ChartTile
        label={copy.tiles.gf.label}
        caption={gfCaption}
        onPress={onOpen}
        accessibilityLabel={spoken([
          `${totals.goalsFor} ${copy.tiles.gf.spoken}`,
          copy.ofGoals(goals),
          gfCaption,
        ])}>
        <Ring
          value={totals.goalsFor}
          total={goals}
          share={share(totals.goalsFor, goals)}
          color={Colors.dark.accent}
          outOf={copy.outOf}
          progress={progress}
        />
      </ChartTile>
      <ChartTile
        label={copy.tiles.ga.label}
        caption={gaCaption}
        onPress={onOpen}
        accessibilityLabel={spoken([
          `${totals.goalsAgainst} ${copy.tiles.ga.spoken}`,
          copy.ofGoals(goals),
          gaCaption,
        ])}>
        <Ring
          value={totals.goalsAgainst}
          total={goals}
          share={share(totals.goalsAgainst, goals)}
          color={Colors.dark.danger}
          outOf={copy.outOf}
          progress={progress}
        />
      </ChartTile>
      <ChartTile
        label={copy.tiles.cleanSheets.label}
        caption={csCaption}
        onPress={onOpen}
        accessibilityLabel={spoken([
          `${totals.cleanSheets} ${copy.tiles.cleanSheets.spoken}`,
          copy.cleanOf(totals.cleanSheets, played),
        ])}>
        <Ring
          value={totals.cleanSheets}
          total={played}
          share={share(totals.cleanSheets, played)}
          color={Colors.dark.accent}
          outOf={copy.outOf}
          progress={progress}
        />
      </ChartTile>
    </View>
  );
}

/** One ring: the arc, and the number over its total in the hole. */
function Ring({
  value,
  total,
  share,
  color,
  outOf,
  progress,
}: {
  value: number;
  total: number;
  share: number;
  color: string;
  outOf: (total: number) => string;
  progress: SharedValue<number>;
}) {
  return (
    <SweepRing
      size={SeasonTiles.ring}
      thickness={THICKNESS}
      share={share}
      color={color}
      progress={progress}>
      <View style={styles.number}>
        <AnimatedNumber value={value} progress={progress} variant="statSm" align="center" />
        <Text variant="xiRailBadge" color="textFaint" tabular style={styles.total}>
          {outOf(total)}
        </Text>
      </View>
    </SweepRing>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two + 2 },
  number: { alignItems: 'center', transform: [{ translateY: DROP }] },
  total: { position: 'absolute', top: DIGIT_FOOT + Spacing.one + 1 },
});
