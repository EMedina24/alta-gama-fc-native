/**
 * The only instruction on the builder screen, and it changes with state
 * (ADR 0065): idle → "Pick the LB" → "Tap a player to swap into LB" (with a
 * Remove action) → "Eleven placed".
 *
 * ⚠ One line, ellipsised — it sits between the toolbar and the rail and must
 * never push the rail down. The `Remove` action is only offered when the
 * selected slot is FILLED; it is `clearInk`, the toolbar's Clear colour.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Spacing } from '@/constants/theme';

export interface HintLineProps {
  text: string;
  /** Accent while a slot is selected — the hint is then a prompt, not a caption. */
  active: boolean;
  removeLabel?: string;
  onRemove?: () => void;
}

export function HintLine({ text, active, removeLabel, onRemove }: HintLineProps) {
  return (
    <View style={styles.row}>
      <Text
        variant="callout"
        color={active ? 'accent' : 'textMuted'}
        numberOfLines={1}
        style={styles.text}>
        {text}
      </Text>
      {onRemove && removeLabel ? (
        <Pressable onPress={onRemove} accessibilityRole="button" hitSlop={Spacing.two}>
          <Text variant="callout" color="clearInk">
            {removeLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  text: { flex: 1, minWidth: 0 },
});
