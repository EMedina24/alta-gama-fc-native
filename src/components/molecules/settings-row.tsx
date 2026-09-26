/**
 * One row of a Settings group (ADR 0208): a title, an optional note under it,
 * an optional leading node, and a trailing slot — a switch, a segmented
 * control, a value, a crest.
 *
 * Promoted from the account sheet's private `Row`, which was already exactly
 * this shape. It adds the two things a navigating row needs: `onPress` (which
 * draws the chevron, so a pressable row and a static one can never look alike)
 * and a `danger` tone for Sign out and Delete.
 *
 * ⚠ Press feedback is a GROUND change (`rowActive`), the row idiom — never
 * opacity. These rows sit inside a glass group, and an alpha anywhere between
 * the glass and its rows reads as the glass dimming.
 *
 * ⚠ A row with a control in `trailing` must NOT also take `onPress`: the row
 * would swallow taps meant for the switch. The control is the target.
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Chevron, Text } from '@/components/atoms';
import { Colors, Size, Spacing } from '@/constants/theme';

export interface SettingsRowProps {
  title: string;
  /** A second line under the title — what the setting does, or its limit. */
  note?: string | null;
  leading?: ReactNode;
  /** The control or the value, right-aligned. */
  trailing?: ReactNode;
  /** Makes the whole row the target and draws a chevron. See the ⚠ above. */
  onPress?: () => void;
  tone?: 'default' | 'danger';
  /**
   * Whether a pressable row draws its chevron. ⚠ Off for a PICKER's rows, which
   * choose rather than navigate — a chevron beside a checkmark promises a
   * screen that is not there. Danger rows never draw one.
   */
  chevron?: boolean;
  /** A picker row's state, for VoiceOver — the checkmark is only seen. */
  selected?: boolean;
  /** Announced when the title alone does not say what the press does. */
  accessibilityHint?: string;
}

export function SettingsRow({
  title,
  note,
  leading,
  trailing,
  onPress,
  tone = 'default',
  chevron = true,
  selected,
  accessibilityHint,
}: SettingsRowProps) {
  const body = (
    <>
      {leading}
      <View style={styles.text}>
        <Text variant="body" color={tone === 'danger' ? 'danger' : 'text'} numberOfLines={2}>
          {title}
        </Text>
        {note ? (
          <Text variant="footnote" color="textDim">
            {note}
          </Text>
        ) : null}
      </View>
      {trailing}
      {onPress && chevron && tone !== 'danger' ? <Chevron direction="right" /> : null}
    </>
  );

  if (!onPress) return <View style={styles.row}>{body}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={note ? `${title}. ${note}` : title}
      accessibilityHint={accessibilityHint}
      accessibilityState={selected === undefined ? undefined : { selected }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    minHeight: Size.settingsRow,
  },
  pressed: { backgroundColor: Colors.dark.rowActive },
  text: { flex: 1, gap: Spacing.half, minWidth: 0 },
});
