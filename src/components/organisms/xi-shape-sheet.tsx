/**
 * The Formation sheet (ADR 0065): eleven shapes in a 3-up grid, the note that
 * a change keeps the eleven, and Done.
 *
 * ⚠ No `Grabber` (the root stack draws one) and no `flex: 1` (a formSheet
 * lays out at content height) — ADR 0030.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import { FORMATION_IDS, type FormationId } from '@/features/starting-xi/formations';

export interface XiShapeSheetProps {
  current: FormationId;
  onPick: (formation: FormationId) => void;
  title: string;
  note: string;
  doneLabel: string;
  onDone: () => void;
}

export function XiShapeSheet({ current, onPick, title, note, doneLabel, onDone }: XiShapeSheetProps) {
  return (
    <View style={styles.wrap}>
      <Text variant="title3">{title}</Text>
      <View style={styles.grid}>
        {FORMATION_IDS.map((id) => {
          const on = id === current;
          return (
            <Pressable
              key={id}
              onPress={() => onPick(id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={({ pressed }) => [styles.cell, on && styles.cellOn, pressed && styles.pressed]}>
              <Text variant="bodyStrong" tabular color={on ? 'accent' : 'text'}>
                {id}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text variant="caption" color="textMuted" style={styles.note}>
        {note}
      </Text>
      <Button label={doneLabel} tone="secondary" onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: Spacing.five, paddingTop: Spacing.six, gap: Spacing.four },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two + 1 },
  cell: {
    // Three across inside the sheet's padding: (100% − 2 gaps) / 3.
    width: '31.5%',
    height: Size.minTouch + Spacing.two,
    borderRadius: Radius.control,
    backgroundColor: Colors.dark.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.hairlineMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellOn: { backgroundColor: Colors.dark.accentWash, borderColor: Colors.dark.accentRing },
  pressed: { opacity: 0.7 },
  note: { fontWeight: '400' },
});
