/**
 * crest · score · crest — the board's headline row.
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
   * Replaces the score between the crests.
   *
   * ⚠ The NEXT-fixture card uses this to show the kickoff time (SPEC §3.1). An
   * unplayed match has no score, and rendering the null-score dash there is both
   * cramped between two long names and says nothing — the kickoff is the fact
   * the reader came for.
   */
  center?: string;
}

/** How far a board-size name may shrink before it would rather ellipsise. */
const NAME_MIN_SCALE = 0.7;

export function ScoreLine({
  home,
  away,
  size = 'board',
  noScoreLabel,
  center,
}: ScoreLineProps) {
  const board = size === 'board';
  const crestSize = board ? Size.crestCard : Size.crestRow;
  const nameVariant = board ? 'title3' : 'bodyStrong';
  // ⚠ At board size a single-word club name cannot wrap, and "Barc…" beside a
  // 0–5 names nobody. It shrinks instead — verified on the simulator with
  // Elche v Barcelona, where the title3 name ellipsised at one line.
  const shrinkNames = board;

  return (
    <View style={styles.row}>
      <View style={[styles.side, styles.left]}>
        <Crest src={home.crest} fallback={home.abbr} size={crestSize} filled={!home.crest} />
        <Text
          variant={nameVariant}
          color={home.muted ? 'textDim' : 'text'}
          numberOfLines={1}
          adjustsFontSizeToFit={shrinkNames}
          minimumFontScale={NAME_MIN_SCALE}
          style={styles.name}>
          {home.name}
        </Text>
      </View>

      {center ? (
        <Text variant="title3" tabular style={styles.score}>
          {center}
        </Text>
      ) : (
        <Score
          home={home.goals}
          away={away.goals}
          size={board ? 'board' : 'row'}
          chip={!board}
          noScoreLabel={noScoreLabel}
          style={styles.score}
        />
      )}

      <View style={[styles.side, styles.right]}>
        <Text
          variant={nameVariant}
          color={away.muted ? 'textDim' : 'text'}
          numberOfLines={1}
          adjustsFontSizeToFit={shrinkNames}
          minimumFontScale={NAME_MIN_SCALE}
          style={[styles.name, styles.awayName]}>
          {away.name}
        </Text>
        <Crest src={away.crest} fallback={away.abbr} size={crestSize} filled={!away.crest} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  // ⚠ The score never shrinks and the names always can. Without this a long
  // pairing ("Real Madrid" v "Real Sociedad") pushes the name over the score.
  score: { flexShrink: 0 },
  name: { flexShrink: 1 },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minWidth: 0 },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  awayName: { textAlign: 'right' },
});
