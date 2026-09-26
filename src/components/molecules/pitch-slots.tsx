/**
 * Positions one child per slot at its centre on the EXPORT CARD (ADR 0065).
 *
 * The projection from the card's measured percentages to points is
 * `cardSlotCentre`. Each child is centred on its slot with a fixed
 * `columnWidth` so the caption can overhang the ring symmetrically.
 *
 * ⚠ The card only since ADR 0213: the live pitch places its tokens through
 * the camera (`features/starting-xi/projection.ts`), not through here.
 */
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { cardSlotCentre, type CardSlot } from '@/features/starting-xi/card-geometry';

export interface PitchSlotsProps {
  slots: readonly CardSlot[];
  width: number;
  height: number;
  /** Ring diameter — the column is centred on the ring, not on the caption. */
  ring: number;
  /** Column width; the caption's max width plus padding. */
  columnWidth: number;
  /**
   * Height kept clear at the bottom, in points (ADR 0075). The y-projection
   * runs over `height − insetBottom`, so the lowest slot's ring AND caption
   * stay inside a pitch that clips. The export card passes
   * `CARD.captionReserve`.
   */
  insetBottom?: number;
  renderSlot: (slot: CardSlot, index: number) => ReactNode;
}

export function PitchSlots({
  slots,
  width,
  height,
  ring,
  columnWidth,
  insetBottom = 0,
  renderSlot,
}: PitchSlotsProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {slots.map((slot, i) => {
        const c = cardSlotCentre(slot, width, height - insetBottom);
        return (
          <View
            key={slot.id}
            pointerEvents="box-none"
            style={[
              styles.column,
              { left: c.x - columnWidth / 2, top: c.y - ring / 2, width: columnWidth },
            ]}>
            {renderSlot(slot, i)}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { position: 'absolute', alignItems: 'center' },
});
