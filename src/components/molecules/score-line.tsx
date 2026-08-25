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
}

export function ScoreLine({ home, away, size = 'board', noScoreLabel }: ScoreLineProps) {
  const crestSize = size === 'board' ? Size.crestCard : Size.crestRow;
  const nameVariant = size === 'board' ? 'title3' : 'bodyStrong';
  const scoreVariant = size === 'board' ? 'scoreLarge' : 'numeral';
  const played = home.goals !== null && away.goals !== null;

  return (
    <View style={styles.row}>
      <View style={[styles.side, styles.left]}>
        <Crest src={home.crest} fallback={home.abbr} size={crestSize} filled={!home.crest} />
        <Text variant={nameVariant} color={home.muted ? 'textDim' : 'text'} numberOfLines={1}>
          {home.name}
        </Text>
      </View>

      <Text
        variant={scoreVariant}
        tabular
        color={played ? 'text' : 'textFaint'}
        accessibilityLabel={played ? undefined : noScoreLabel}>
        {played ? `${home.goals}–${away.goals}` : '–'}
      </Text>

      <View style={[styles.side, styles.right]}>
        <Text
          variant={nameVariant}
          color={away.muted ? 'textDim' : 'text'}
          numberOfLines={1}
          style={styles.awayName}>
          {away.name}
        </Text>
        <Crest src={away.crest} fallback={away.abbr} size={crestSize} filled={!away.crest} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minWidth: 0 },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  awayName: { textAlign: 'right', flexShrink: 1 },
});
