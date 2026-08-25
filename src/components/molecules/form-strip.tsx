/**
 * The last-N form chips.
 *
 * ⚠ **The wire is NEWEST-FIRST and this reverses it.** Rendering it as given
 * puts the most recent result on the left of a strip every reader will scan
 * left-to-right as a timeline — and on a short array it silently loses the
 * OLDEST entry instead of the newest.
 *
 * ⚠ An empty `form` renders nothing at all. It is normal before a ball is
 * kicked, and padding it with placeholders would claim results that do not exist.
 */
import { StyleSheet, View } from 'react-native';

import { FormChip } from '@/components/atoms';
import { Spacing } from '@/constants/theme';
import type { FormResult } from '@/lib/cronogol/types';

export interface FormStripProps {
  /** As the API sends it: newest first. */
  form: readonly FormResult[];
  /** `phrases.formLetters` — Spanish renders a loss as `D`. */
  letters: Record<FormResult, string>;
  max?: number;
}

export function FormStrip({ form, letters, max = 5 }: FormStripProps) {
  if (form.length === 0) return null;
  const oldestFirst = [...form].slice(0, max).reverse();

  return (
    <View style={styles.strip}>
      {oldestFirst.map((result, index) => (
        // Index-keyed is justified here: a fixed positional strip, replaced wholesale.
        <FormChip key={index} result={result} letter={letters[result]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: Spacing.one },
});
