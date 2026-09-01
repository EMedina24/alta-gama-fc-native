/**
 * The card a standings row expands into: W D L GF GA GD, the form strip, and a
 * link into the club.
 *
 * ⚠ **Form is never re-derived from fixtures.** A `finished` fixture with null
 * goals is a real stored shape; the backend excludes it so the table
 * under-reports rather than crediting a phantom 0–0, while a client-side derive
 * scores it a draw — printing chips that disagree with the points column beside
 * them, from the same data.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Hairline, Text } from '@/components/atoms';
import { FormStrip, StatRow } from '@/components/molecules';
import { Radius, Spacing, Surfaces } from '@/constants/theme';
import type { FormResult, StandingsRowView } from '@/lib/cronogol/types';

export interface ExpandedRowProps {
  row: StandingsRowView;
  statLabels: readonly [string, string, string, string, string, string];
  formLetters: Record<FormResult, string>;
  formLabel: string;
  openLabel: string;
  onOpen: () => void;
}

export function ExpandedRow({
  row,
  statLabels,
  formLetters,
  formLabel,
  openLabel,
  onOpen,
}: ExpandedRowProps) {
  return (
    <View style={styles.card}>
      <StatRow row={row} labels={statLabels} />

      {row.form.length > 0 ? (
        <>
          <Hairline />
          <View style={styles.formRow}>
            <Text variant="eyebrowSm" color="textFaint">
              {formLabel}
            </Text>
            <FormStrip form={row.form} letters={formLetters} />
          </View>
        </>
      ) : null}

      <Hairline />
      <Pressable
        onPress={onOpen}
        accessibilityRole="link"
        style={({ pressed }) => [styles.open, pressed && { opacity: 0.7 }]}>
        <Text variant="bodyStrong" color="accent">
          {openLabel}
        </Text>
        <Text variant="bodyStrong" color="accent">
          ›
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...Surfaces.glass,
    borderRadius: Radius.tile,
    padding: Spacing.four,
    marginHorizontal: Spacing.five,
    marginVertical: Spacing.two,
    gap: Spacing.three,
  },
  formRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  open: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
