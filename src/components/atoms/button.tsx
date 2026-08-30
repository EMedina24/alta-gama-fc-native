/**
 * The button, in five tones.
 *
 * ⚠ Accent is for ONE thing per screen (SPEC §2): "if two things on a screen are
 * lime, one is wrong". A screen with two `primary` buttons is a design bug.
 */
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from './text';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export type ButtonTone = 'primary' | 'secondary' | 'outline' | 'quiet' | 'danger';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  tone?: ButtonTone;
  /** Rendered left of the label — an SF Symbol or a glyph. */
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  /** `Size.ctaH` instead of `minTouch` — the onboarding footer's primary (ADR 0076). */
  tall?: boolean;
}

export function Button({
  label,
  onPress,
  tone = 'primary',
  icon,
  disabled = false,
  loading = false,
  full = true,
  tall = false,
}: ButtonProps) {
  const inert = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inert}
      accessibilityRole="button"
      accessibilityState={{ disabled: inert }}
      style={({ pressed }) => [
        styles.base,
        styles[tone],
        full && styles.full,
        tall && styles.tall,
        pressed && !inert && styles.pressed,
        inert && styles.inert,
      ]}>
      {loading ? (
        <ActivityIndicator color={tone === 'primary' ? Colors.dark.onAccent : Colors.dark.text} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text variant="bodyStrong" color={LABEL_COLOR[tone]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const LABEL_COLOR = {
  primary: 'onAccent',
  secondary: 'text',
  /** Accent ring + accent label, no fill — the design's `Add all N matches`. */
  outline: 'accent',
  quiet: 'textSecondary',
  danger: 'danger',
} as const;

const styles = StyleSheet.create({
  base: {
    minHeight: Size.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.control,
  },
  full: { alignSelf: 'stretch' },
  tall: { minHeight: Size.ctaH },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  pressed: { opacity: 0.75 },
  inert: { opacity: 0.4 },
  primary: { backgroundColor: Colors.dark.accent },
  secondary: {
    backgroundColor: Colors.dark.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.hairlineStrong,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.dark.accentRing,
  },
  quiet: { backgroundColor: 'transparent' },
  danger: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.danger,
  },
});
