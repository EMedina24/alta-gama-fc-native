/**
 * A 1px rule, at three strengths.
 *
 * ⚠ Hairlines do all the separating in this design — **there are no shadows in
 * the app** (SPEC §2). Depth is surface lightness. The only shadow in the
 * handoff is the device frame around the mock.
 */
import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';

export interface HairlineProps {
  /** `row` between list rows · `mid` section rules · `strong` outlines. */
  strength?: 'row' | 'mid' | 'strong';
  /** Left inset, to align the rule with row content rather than the card edge. */
  inset?: number;
}

export function Hairline({ strength = 'row', inset = 0 }: HairlineProps) {
  return (
    <View
      style={[
        styles.rule,
        { marginLeft: inset },
        strength === 'mid' && { backgroundColor: Colors.dark.hairlineMid },
        strength === 'strong' && { backgroundColor: Colors.dark.hairlineStrong },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.dark.hairline },
});
