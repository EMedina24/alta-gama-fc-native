/**
 * The Starting XI header's club: crest, name and `League · season` (ADR 0212).
 *
 * In the TAB it is the club switcher — a caret, and a tap opens the club
 * sheet. Pushed from a club page it is the club's name and nothing more:
 * that builder belongs to the page it was opened from, and switching there
 * would strand the back button on a different club.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Chevron, Crest, Text } from '@/components/atoms';
import { Spacing, Xi } from '@/constants/theme';

export interface XiClubButtonProps {
  crest: string | null;
  abbr: string;
  name: string;
  meta: string;
  /** Absent: inert, no caret. */
  onPress?: () => void;
  accessibilityHint?: string;
}

export function XiClubButton({ crest, abbr, name, meta, onPress, accessibilityHint }: XiClubButtonProps) {
  const body = (
    <>
      <Crest src={crest} fallback={abbr} size={Xi.crest} filled />
      <View style={styles.text}>
        <View style={styles.nameRow}>
          <Text variant="headline" numberOfLines={1} style={styles.name}>
            {name}
          </Text>
          {onPress ? <Chevron color="textSecondary" /> : null}
        </View>
        <Text variant="micro" color="textSecondary" numberOfLines={1}>
          {meta}
        </Text>
      </View>
    </>
  );
  if (!onPress) {
    return (
      <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel={`${name}. ${meta}`}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${meta}`}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.three - 2, minHeight: Xi.circle },
  // A tint would need a surface; the row has none, so pressed dims the INK only.
  pressed: { opacity: 0.6 },
  text: { flex: 1, minWidth: 0, gap: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one + 2 },
  name: { flexShrink: 1 },
});
