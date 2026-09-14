/**
 * The cards the reader has put away, and the way back (ADR 0174).
 *
 * ⚠ The heading STAYS when the tray is empty and the copy replaces the rows
 * only. The heading is what explains that removing a card is reversible; drop it
 * and an empty tray reads as "there is nothing here", which is the one thing it
 * must not say.
 *
 * ⚠ Tapping anywhere on the row adds the card — the lime disc is decoration
 * inside the press target, not a control of its own (the `ChipButton trailing`
 * rule).
 *
 * ⚠ A DASHED border, and it is the only dashed thing in the app: these rows
 * describe cards that are not on the board, and a solid surface would draw them
 * as if they were.
 */
import { StyleSheet, Pressable, View } from 'react-native';

import { Button, PlusGlyph, Text } from '@/components/atoms';
import { SectionHeader } from '@/components/molecules';
import { BoardEdit, Colors, Radius, Size, Spacing } from '@/constants/theme';

export interface AddTrayCard {
  id: string;
  label: string;
  body: string;
}

export interface AddTrayProps {
  cards: readonly AddTrayCard[];
  title: string;
  emptyLabel: string;
  resetLabel: string;
  addLabel: (card: string) => string;
  onAdd: (id: string) => void;
  onReset: () => void;
}

export function AddTray({
  cards,
  title,
  emptyLabel,
  resetLabel,
  addLabel,
  onAdd,
  onReset,
}: AddTrayProps) {
  return (
    <View style={styles.tray}>
      <SectionHeader title={title} />

      {cards.length === 0 ? (
        <Text variant="body" color="textDim">
          {emptyLabel}
        </Text>
      ) : (
        cards.map((card) => (
          <Pressable
            key={card.id}
            onPress={() => onAdd(card.id)}
            accessibilityRole="button"
            accessibilityLabel={addLabel(card.label)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <View style={styles.add}>
              {/* ⚠ `onAccent`, never the glyph's default: its default IS the
                  lime, and on a lime disc it draws nothing at all. */}
              <PlusGlyph color="onAccent" />
            </View>
            <View style={styles.words}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {card.label}
              </Text>
              <Text variant="caption" color="textDim" numberOfLines={1}>
                {card.body}
              </Text>
            </View>
          </Pressable>
        ))
      )}

      {/* ⚠ Immediate, no confirm — it restores a layout, it does not destroy
          anything, and every card it puts back is one tap from being removed
          again. */}
      {/* ⚠ `secondary`, not `outline`: `outline` is the lime-ringed tone, and the
          lime on this screen already belongs to the add discs (SPEC §2). */}
      <Button label={resetLabel} tone="secondary" onPress={onReset} />
    </View>
  );
}

const styles = StyleSheet.create({
  tray: { gap: Spacing.three },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    minHeight: Size.minTouch,
    borderRadius: Radius.tile,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.glassLine,
    borderStyle: 'dashed',
  },
  pressed: { opacity: 0.7 },
  add: {
    width: BoardEdit.remove,
    height: BoardEdit.remove,
    borderRadius: Radius.pill,
    backgroundColor: Colors.dark.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  words: { flex: 1, minWidth: 0, gap: Spacing.half },
});
