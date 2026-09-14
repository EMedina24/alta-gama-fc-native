/**
 * The only instruction in the Board's edit mode, and its state readout (ADR
 * 0174).
 *
 * ⚠ It rides in the CROWN, above the pinned lead card — so it sits on the lime
 * band and takes its own dark ground rather than the body's glass. It is passed
 * as the first child of `ScreenScaffold`'s `payload`; the crown's own
 * `Spacing.four` gap puts it where the design does, with no change to the crown.
 *
 * ⚠⚠ **The hint is the elastic half and the count is not** (trap 56). The count
 * has an intrinsic width in both languages and takes `flex: 0`; giving a
 * fixed-width thing a flex share is what overflows a row, and short test data
 * hides it.
 *
 * ⚠ **It is deliberately LOUD** — near-opaque ground, `bodyStrong` ink, a full
 * `eyebrow` count, and a lime ring (Ed: *"give this a bit more importance so the
 * user recognizes it and sees it quicker"*, then *"give this an attention
 * grabbing border along with the DONE button"*). The first cut was a translucent
 * bar of `caption` text and it read as a caption, which is the one thing the
 * mode's only instruction must not do.
 *
 * ⚠ The ring is the same lime the DONE pill wears, and that pairing is the
 * point: the two pieces of chrome that belong to the MODE rather than to the
 * board read as one object, at opposite ends of the crown.
 */
import { StyleSheet, View } from 'react-native';

import { Eyebrow, Text } from '@/components/atoms';
import { BoardEdit, Colors, Radius, Spacing } from '@/constants/theme';

export interface BoardEditHintProps {
  hint: string;
  count: string;
}

export function BoardEditHint({ hint, count }: BoardEditHintProps) {
  return (
    <View style={styles.bar}>
      <Text variant="bodyStrong" numberOfLines={1} style={styles.hint}>
        {hint}
      </Text>
      {/* ⚠ `textSecondary`, not `textDim`: on this ground the dim ink read as
          disabled rather than as secondary, and the count is a live number. */}
      <Eyebrow color="textSecondary" style={styles.count}>
        {count}
      </Eyebrow>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    // ⚠ Taller than the design's bar. The copy lost half its length, so the
    // weight had to come from somewhere; height is the cheapest place to find it
    // without taking type size from the title above.
    paddingVertical: Spacing.three + 2,
    borderRadius: Radius.control,
    backgroundColor: BoardEdit.hintFill,
    // ⚠ A full point of LIME, not the 0.5pt glass hairline: the bar and the DONE
    // pill wear the same ring so the mode announces itself as one object
    // (ADR 0174 §13, Ed's call). A 0.33pt lime ring vanishes against the mesh —
    // `chip-button.tsx`'s own finding.
    borderWidth: 1,
    borderColor: Colors.dark.accent,
  },
  hint: { flex: 1, minWidth: 0 },
  count: { flex: 0 },
});
