/**
 * crest · score · crest — the board's headline row.
 *
 * ⚠ A `null` score renders an en dash, **never a zero**. The upstream really
 * does send zeros for unplayed matches and the backend strips them, so `null`
 * here means "no score yet". The dash alone reads as "en dash" to a screen
 * reader or is skipped outright, so the sentence goes on the label.
 *
 * ⚠ Emphasis is SCORE-driven, not status-driven: the losing side recedes, a
 * draw leaves both at full strength. That is `scoreEmphasis` in `scores.ts` and
 * it is deliberately not a function of `status`.
 */
import { StyleSheet, View } from 'react-native';

import { Crest, Text } from '@/components/atoms';
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
  const crestSize = size === 'board' ? Size.crestCard : Size.crestRow;
  const nameVariant = size === 'board' ? 'title3' : 'bodyStrong';
  const scoreVariant = size === 'board' ? 'scoreLarge' : 'numeral';
  const played = home.goals !== null && away.goals !== null;
  // ⚠ At board size a single-word club name cannot wrap, and "Barc…" beside a
  // 0–5 names nobody. It shrinks instead — verified on the simulator with
  // Elche v Barcelona, where the title3 name ellipsised at one line.
  const shrinkNames = size === 'board';

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

      <Text
        variant={center ? 'title3' : scoreVariant}
        tabular
        color={center || played ? 'text' : 'textFaint'}
        style={styles.score}
        accessibilityLabel={!center && !played ? noScoreLabel : undefined}>
        {center ?? (played ? `${home.goals}–${away.goals}` : '–')}
      </Text>

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
