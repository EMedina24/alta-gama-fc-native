/**
 * What the reader follows, as a wrapping cloud of crest chips with a dashed
 * "+ Add" chip at the end (ADR 0208) — Settings' FOLLOWING block.
 *
 * ⚠ CLUBS, not leagues. Ed's mock drew league chips, but following is clubs
 * only, in the app and on the backend (`account_follows.club_slug`). A league
 * chip here would promise alerts nothing sends.
 *
 * ⚠ The Add chip is DASHED so it cannot be read as one more thing followed:
 * same height and radius as its neighbours, and nothing else alike.
 * `slot-token.tsx` is the only other dashed edge in the app, for the same
 * reason — an empty place, not a thing.
 *
 * ⚠ Press feedback is a fill change, never opacity: these chips sit inside a
 * glass group (0120/0122).
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Crest, PlusGlyph, Text } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export interface FollowChip {
  key: string;
  label: string;
  crest: string | null;
  /** The monogram behind a missing crest. */
  crestFallback: string;
  /**
   * Opens the club. ⚠ Absent for a club with no page to open (`useCanOpenClub`
   * — half the Champions League field): the chip still says it is followed,
   * but it is not a link the app cannot honour.
   */
  onPress?: () => void;
}

export interface FollowChipsProps {
  chips: readonly FollowChip[];
  addLabel: string;
  onAdd: () => void;
}

export function FollowChips({ chips, addLabel, onAdd }: FollowChipsProps) {
  return (
    <View style={styles.cloud}>
      {chips.map((chip) => {
        const face = (
          <>
            <Crest src={chip.crest} fallback={chip.crestFallback} size={Size.chipCrest} />
            <Text variant="callout" numberOfLines={1}>
              {chip.label}
            </Text>
          </>
        );
        return chip.onPress ? (
          <Pressable
            key={chip.key}
            onPress={chip.onPress}
            accessibilityRole="button"
            accessibilityLabel={chip.label}
            hitSlop={Spacing.one}
            style={({ pressed }) => [styles.chip, styles.filled, pressed && styles.pressed]}>
            {face}
          </Pressable>
        ) : (
          <View key={chip.key} accessible accessibilityLabel={chip.label} style={[styles.chip, styles.filled]}>
            {face}
          </View>
        );
      })}
      <Pressable
        onPress={onAdd}
        accessibilityRole="button"
        accessibilityLabel={addLabel}
        hitSlop={Spacing.one}
        style={({ pressed }) => [styles.chip, styles.add, pressed && styles.pressed]}>
        <PlusGlyph color="textSecondary" size={Size.moreGlyph - 4} />
        <Text variant="callout" color="textSecondary">
          {addLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: Size.pill,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    maxWidth: '100%',
  },
  filled: { backgroundColor: Colors.dark.raisedAlt },
  add: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.dark.hairlineStrong,
  },
  pressed: { backgroundColor: Colors.dark.rowActive },
});
