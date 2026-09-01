/**
 * A score: two numerals with a rule between them (ADR 0044).
 *
 * ⚠ A `null` score renders a dash on BOTH sides — `– │ –`, never a zero. The
 * upstream really does send zeros for unplayed matches and the backend strips
 * them, so `null` here means "no score yet". Mirroring the played format keeps
 * a row the same width before and after a score arrives.
 *
 * ⚠ Emphasis is SCORE-driven, not status-driven: the losing DIGIT recedes with
 * the losing name, and a draw leaves both at full strength. That rule is
 * `scoreEmphasis` in `scores.ts` — imported, not re-implemented, because this
 * is the fifth place that wanted it.
 *
 * ⚠ The chip is `raised`, a neutral ground, and never `liveWash`. A container
 * that reads as "current" is exactly the claim HANDOFF trap #8 exists to stop:
 * the fixtures feed sweeps roughly every three hours and no score here is live.
 *
 * ⚠ The two digits are one accessibility element. Split into two `Text`s they
 * are two VoiceOver stops that say "one" and then "zero" a swipe apart.
 */
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text, type TypeVariant } from '@/components/atoms/text';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import { scoreEmphasis } from '@/lib/cronogol/scores';

export type ScoreSize = 'board' | 'rowLg' | 'row';

export interface ScoreProps {
  home: number | null;
  away: number | null;
  /**
   * `board` is the Today hero, `rowLg` the jornada row's column, `row` a list
   * line. ⚠ `Type.numeral` is pinned at 16 by `theme.ts` — size the rule, not
   * the type, if one of these needs to change.
   */
  size?: ScoreSize;
  /**
   * The raised container. LIST ROWS ONLY — the board hero is 38pt and needs no
   * help being found; a chip that big is the loudest object on the screen.
   */
  chip?: boolean;
  /** Spoken in place of the dashes when there is no score — `copy.today.noScore`. */
  noScoreLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const VARIANT: Record<ScoreSize, TypeVariant> = {
  board: 'scoreLarge',
  rowLg: 'numeralLg',
  row: 'numeral',
};

const RULE: Record<ScoreSize, { height: number; width: number }> = {
  board: { height: Size.scoreRuleBoard, width: Size.scoreRuleWidthBoard },
  rowLg: { height: Size.scoreRuleRowLg, width: Size.scoreRuleWidth },
  row: { height: Size.scoreRuleRow, width: Size.scoreRuleWidth },
};

/** ⚠ Never `0`. See the header. */
const NO_SCORE = '–';

export function Score({ home, away, size = 'board', chip = false, noScoreLabel, style }: ScoreProps) {
  const played = home !== null && away !== null;
  const emphasis = scoreEmphasis({ home, away });
  const variant = VARIANT[size];

  return (
    <View
      accessible
      accessibilityLabel={played ? `${home}, ${away}` : noScoreLabel}
      style={[
        styles.row,
        size === 'board' ? styles.gapBoard : styles.gapRow,
        chip && styles.chip,
        style,
      ]}>
      <Text variant={variant} tabular color={!played ? 'textFaint' : emphasis.home === 'muted' ? 'textDim' : 'text'}>
        {played ? home : NO_SCORE}
      </Text>
      <View style={[styles.rule, RULE[size]]} />
      <Text variant={variant} tabular color={!played ? 'textFaint' : emphasis.away === 'muted' ? 'textDim' : 'text'}>
        {played ? away : NO_SCORE}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  gapBoard: { gap: Spacing.three },
  gapRow: { gap: Spacing.two },
  // ⚠ Height and width are applied inline, from `size` — see `Size.scoreRule*`.
  rule: { borderRadius: Radius.rail, backgroundColor: Colors.dark.hairlineStrong },
  // ⚠ `two`, not `three`. The chip is the widest thing between two club names
  // and every point it takes is a point the names pay: at `three` the FINISHED
  // TODAY row truncated `Real Madrid` v `Real Sociedad`, which is the failure
  // ADR 0029 names. The jornada column is tighter still (ADR 0035) and this is
  // what keeps the chip inside it on a 24-hour clock.
  chip: {
    // ⚠ `scoreChip` re-grounds the value for the mesh (ADR 0087) but the RULE
    // is 0044's unchanged: a NEUTRAL ground, never `live`/`liveWash` — a live
    // tint here makes every finished score in a list look current (trap 8).
    backgroundColor: Colors.dark.scoreChip,
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
});
