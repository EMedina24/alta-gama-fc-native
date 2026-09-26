/**
 * The seven bench cells under the pitch (ADR 0211, 0213): a player's orb with
 * his shirt on the shoulder, or an empty dashed cell with a `+`.
 *
 * ⚠ Order is the bench's own — the order players were benched in — so a swap
 * from the pitch puts the incoming sub in the cell the other man left.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { GlassSurface, PlusGlyph, ShirtBadge, XiOrb } from '@/components/atoms';
import { Colors, Radius, Size, Spacing, Xi } from '@/constants/theme';

import type { XiTokenPlayer } from './xi-token';

export interface BenchTrayProps {
  /** Exactly `BENCH_SIZE` cells; `null` is an empty one. */
  cells: readonly ((XiTokenPlayer & { id: string }) | null)[];
  onPress: (index: number, id: string | null) => void;
  labels: { empty: string; filled: (name: string) => string };
}

export function BenchTray({ cells, onPress, labels }: BenchTrayProps) {
  return (
    <View style={styles.tray}>
      <GlassSurface style={styles.shell} flatStyle={styles.flat} />
      {cells.map((cell, i) => (
        <Pressable
          key={cell?.id ?? `empty-${i}`}
          onPress={() => onPress(i, cell?.id ?? null)}
          accessibilityRole="button"
          accessibilityLabel={cell ? labels.filled(cell.name) : labels.empty}
          hitSlop={Spacing.one}
          style={styles.cell}>
          {cell ? (
            <View>
              <XiOrb size={Xi.benchOrb} initials={cell.initials} photoUrl={cell.photoUrl} ring="white" ringWidth={2} />
              {cell.shirt !== null ? (
                <View style={styles.badge} pointerEvents="none">
                  <ShirtBadge shirt={cell.shirt} size={Xi.benchBadge} ring={1.5} />
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.empty}>
              <PlusGlyph color="textSecondary" size={12} />
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tray: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.two + 2,
    borderRadius: Xi.benchRadius,
  },
  shell: {
    ...StyleSheet.absoluteFill,
    borderRadius: Xi.benchRadius,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.xiControlLine,
  },
  flat: { backgroundColor: Colors.dark.glassFill },
  cell: { alignItems: 'center', justifyContent: 'center', minWidth: Xi.benchOrb, minHeight: Xi.benchOrb },
  badge: { position: 'absolute', top: -5, right: -5 },
  empty: {
    width: Xi.benchOrb,
    height: Xi.benchOrb,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.dark.xiBenchDash,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
