/**
 * The board's headline pairing. At `board` size a STACKED pair — crest over
 * its name, the score centred between the crests (ADR 0186); at `row` size a
 * list line: crest · name | score | name · crest.
 *
 * ⚠ The score itself is the `Score` atom (ADR 0044) — two numerals with a rule
 * between them, and **never a zero** for an unplayed match. It owns the dashes
 * and the spoken label; this molecule owns the sides around it.
 *
 * ⚠ Emphasis is SCORE-driven, not status-driven: the losing side recedes, a
 * draw leaves both at full strength. That is `scoreEmphasis` in `scores.ts` and
 * it is deliberately not a function of `status`. The atom applies the same rule
 * to the digits; `muted` here is the caller's word for the same thing on names.
 *
 * ⚠ The hero is BARE and a row is CHIPPED. A 38pt chip at the top of Today is
 * the loudest object on the screen and the hero does not need finding.
 *
 * ⚠⚠ **The board pair is STACKED and its names WRAP — they never shrink.** The
 * row this replaced gave each name ≈ 60pt beside the 38pt digits and shrank it
 * with `adjustsFontSizeToFit`, each side on its own: `Atlético de Madrid` at
 * one size, `Real Madrid` at another. And the floor was never there: on Fabric
 * (RN 0.86) `minimumFontScale` is parsed and never read — the iOS layout
 * manager honours only `minimumFontSize`, which JS never sends — so the floor
 * is 4pt and the names rendered at 8–13pt (HANDOFF trap 77). Under its crest a
 * name has ≈ 110pt and two lines of `bodyStrong`: NEXT UP's own pair (0095).
 */
import { StyleSheet, View } from 'react-native';

import { Crest, Score, Text } from '@/components/atoms';
import { Size, Spacing } from '@/constants/theme';

export interface ScoreSide {
  name: string;
  crest?: string | null;
  abbr: string;
  goals: number | null;
  /** The losing side recedes. */
  muted?: boolean;
}

export interface ScoreLineProps {
  home: ScoreSide;
  away: ScoreSide;
  /** `board` is the Today hero; `row` is a list line. */
  size?: 'board' | 'row';
  noScoreLabel: string;
  /**
   * Replaces the score between the crests — a kickoff time in the score slot
   * (SPEC §3.1). ⚠ No consumer passes it today: NEXT UP draws its own pair
   * around a `VersusBadge` (ADR 0095/0184). Kept for the slot, not a caller.
   */
  center?: string;
}

export function ScoreLine({ home, away, size = 'board', noScoreLabel, center }: ScoreLineProps) {
  const board = size === 'board';
  const centre = center ? (
    <Text variant="title3" tabular style={styles.score}>
      {center}
    </Text>
  ) : (
    <Score
      home={home.goals}
      away={away.goals}
      size={size}
      chip={!board}
      noScoreLabel={noScoreLabel}
      style={styles.score}
    />
  );

  if (board) {
    return (
      <View style={styles.pair}>
        <BoardSide side={home} />
        <View style={styles.scoreCol}>{centre}</View>
        <BoardSide side={away} />
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={[styles.side, styles.left]}>
        <Crest src={home.crest} fallback={home.abbr} size={Size.crestRow} filled={!home.crest} />
        <Text
          variant="bodyStrong"
          color={home.muted ? 'textDim' : 'text'}
          numberOfLines={1}
          style={styles.name}>
          {home.name}
        </Text>
      </View>
      {centre}
      <View style={[styles.side, styles.right]}>
        <Text
          variant="bodyStrong"
          color={away.muted ? 'textDim' : 'text'}
          numberOfLines={1}
          style={[styles.name, styles.awayName]}>
          {away.name}
        </Text>
        <Crest src={away.crest} fallback={away.abbr} size={Size.crestRow} filled={!away.crest} />
      </View>
    </View>
  );
}

/**
 * One side of the board pair: crest over a centred, two-line name.
 *
 * ⚠ ONE VoiceOver stop per club. Left ungrouped the monogram tile's code is its
 * own stop ("VAL", then "Valencia"); the score stays the `Score` atom's own
 * stop, so the pairing reads club · score · club.
 */
function BoardSide({ side }: { side: ScoreSide }) {
  return (
    <View style={styles.pairSide} accessible accessibilityLabel={side.name}>
      <Crest src={side.crest} fallback={side.abbr} size={Size.crestCard} filled={!side.crest} />
      <Text
        variant="bodyStrong"
        color={side.muted ? 'textDim' : 'text'}
        center
        numberOfLines={2}
        style={styles.pairName}>
        {side.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  /** BOARD — NEXT UP's `pair`/`pairSide` (ADR 0186): crests on one line, names under them. */
  pair: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  pairSide: { flex: 1, alignItems: 'center', gap: Spacing.two },
  /**
   * ⚠ The name BLEEDS `Spacing.two` past its side on both edges, symmetric so
   * it stays centred under its crest. The score column is only crest-high, so
   * below it the middle of the card is empty, and the outer edge still keeps
   * half the card's padding. Without it `Mönchengladbach` — one word, so it
   * cannot wrap — ellipsised by two letters at 402pt (ADR 0186).
   */
  pairName: { alignSelf: 'stretch', marginHorizontal: -Spacing.two },
  /**
   * Centres the digits on the CREST line. A fixed box, not NEXT UP's derived
   * `marginTop`: that needs the occupant's own height, and `scoreLarge` pins
   * no line height — SF at 38pt lays out ≈ 45pt, taller than the 40pt crest.
   * The text overflows the box a couple of points top and bottom (a View does
   * not clip) and its optical centre lands on the crest's, which is the point.
   * ⚠ `height`, not `minHeight`: the latter grows the column to the line box
   * and drops the digits 2–3pt below the crest's centre.
   */
  scoreCol: { height: Size.crestCard, justifyContent: 'center', flexShrink: 0 },
  // ⚠ The score never shrinks and the sides always can. Without this a long
  // pairing ("Real Madrid" v "Real Sociedad") pushes the name over the score.
  score: { flexShrink: 0 },
  /** ROW — a list line, unchanged by 0186. */
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  name: { flexShrink: 1 },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minWidth: 0 },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  awayName: { textAlign: 'right' },
});
