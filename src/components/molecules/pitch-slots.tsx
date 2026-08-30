/**
 * Positions one child per slot at its centre (ADR 0065).
 *
 * The ONE projection from the formation's percentages to points is
 * `slotCentre`; the board and the export card both come through here so a
 * table nudge moves both. Each child is centred on its slot with a fixed
 * `columnWidth` so the caption can overhang the ring symmetrically.
 */
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { slotCentre, type Slot } from '@/features/starting-xi/formations';

export interface PitchSlotsProps {
  slots: readonly Slot[];
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
   * `CARD.captionReserve`; the board passes nothing.
   */
  insetBottom?: number;
  renderSlot: (slot: Slot, index: number) => ReactNode;
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
        const c = slotCentre(slot, width, height - insetBottom);
        return (
          <View
            key={slot.label}
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
