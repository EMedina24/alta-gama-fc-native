/**
 * One W / D / L chip.
 *
 * ⚠ The LETTER is localised but the RESULT is not: Spanish renders a loss as
 * `D` (Derrota), which is English's *draw*. The mapping lives in
 * `phrases.formLetters` and the caller passes the already-localised letter, so
 * this component never sees a language.
 */
import { StyleSheet, View } from 'react-native';

import { Text } from './text';
import { Colors, Radius } from '@/constants/theme';

export type FormResult = 'W' | 'D' | 'L';

export function FormChip({ result, letter }: { result: FormResult; letter: string }) {
  return (
    <View style={[styles.chip, styles[result]]}>
      <Text variant="eyebrowSm" color={result === 'L' ? 'text' : 'onAccent'} style={styles.letter}>
        {letter}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.chipSm,
  },
  letter: { letterSpacing: 0 },
  W: { backgroundColor: Colors.dark.formWin },
  D: { backgroundColor: Colors.dark.formDraw },
  // A loss is an OUTLINE, not a fill — the design does not shout about defeats.
  L: { borderWidth: 1, borderColor: Colors.dark.formLossBorder },
});
