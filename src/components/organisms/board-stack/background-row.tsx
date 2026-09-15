/**
 * The Board background row (ADR 0175) — edit mode's doorway to the picker
 * sheet, under its own section heading above the add tray.
 *
 * ⚠ A SOLID border, never the tray's dashed one: dashed means "not on the
 * board", and the background emphatically is — this row states what the board
 * is wearing right now.
 *
 * ⚠ The whole row is the press target (the add tray's own rule); the chevron
 * is 11pt decoration inside it, not a control.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Chevron, Text } from '@/components/atoms';
import { CrownSwatch, SectionHeader } from '@/components/molecules';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import type { CrownStop } from '@/lib/cronogol/league-theme';

export interface BackgroundRowProps {
  /** The section heading — `copy.board.background`. */
  title: string;
  /** What the board is wearing — the brand's name, a league's, or a club's. */
  valueLabel: string;
  /** The current choice's ramp, drawn as the mini swatch. */
  stops: readonly CrownStop[];
  /** Spoken: `copy.board.backgroundRow(valueLabel)`. */
  accessibilityLabel: string;
  onPress: () => void;
}

export function BackgroundRow({
  title,
  valueLabel,
  stops,
  accessibilityLabel,
  onPress,
}: BackgroundRowProps) {
  return (
    <View style={styles.block}>
      <SectionHeader title={title} />
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <CrownSwatch stops={stops} />
        <Text variant="bodyStrong" numberOfLines={1} style={styles.value}>
          {valueLabel}
        </Text>
        <Chevron direction="right" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: Spacing.three },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    minHeight: Size.minTouch,
    borderRadius: Radius.tile,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.glassLine,
  },
  pressed: { opacity: 0.7 },
  value: { flex: 1, minWidth: 0 },
});
