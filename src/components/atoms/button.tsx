/**
 * The button, in six tones.
 *
 * ⚠ Accent is for ONE thing per screen (SPEC §2): "if two things on a screen are
 * lime, one is wrong". A screen with two `primary` buttons is a design bug.
 *
 * ⚠ `glass` (ADR 0208, the Medina kit's glass tone) is a PILL of liquid glass
 * for a quiet action floating over a scene — Settings' "Edit profile". It
 * presses with a TINT layer, never the other tones' opacity: an alpha on a
 * glass ancestor kills the glass (0120/0122). For the same reason it must never
 * be `disabled` or `loading`, both of which dim the whole control.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { GlassSurface } from './glass-surface';
import { Orb } from './orb';
import { Text } from './text';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export type ButtonTone = 'primary' | 'secondary' | 'outline' | 'quiet' | 'danger' | 'glass';

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
  /** What the press DOES, when the label only names a state ("Following"). */
  accessibilityHint?: string;
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
  accessibilityHint,
}: ButtonProps) {
  const inert = disabled || loading;
  const glass = tone === 'glass';
  const content = loading ? (
    // ADR 0197: the 20pt `solving` orb in place of the platform spinner —
    // dark ink on the lime fill, lime-tipped on every other tone.
    <Orb
      state="solving"
      size={20}
      tone={tone === 'primary' ? 'ink' : 'accent'}
      on={tone === 'primary' ? 'light' : 'dark'}
      accessibilityLabel={label}
    />
  ) : (
    <View style={styles.row}>
      {icon}
      <Text variant="bodyStrong" color={LABEL_COLOR[tone]}>
        {label}
      </Text>
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={inert}
      accessibilityRole="button"
      accessibilityState={{ disabled: inert, busy: loading }}
      accessibilityHint={accessibilityHint}
      // The glass pill is `Size.pill` tall, under `minTouch`; this buys it back.
      hitSlop={glass ? (Size.minTouch - Size.pill) / 2 : undefined}
      style={({ pressed }) => [
        styles.base,
        styles[tone],
        full && styles.full,
        tall && styles.tall,
        pressed && !inert && !glass && styles.pressed,
        inert && styles.inert,
      ]}>
      {({ pressed }) =>
        glass ? (
          <>
            <GlassSurface style={styles.glassShell} flatStyle={styles.glassFlat} />
            {/* The press, as a tint — see the header's ⚠ on `glass`. */}
            {pressed ? <View pointerEvents="none" style={styles.glassPressed} /> : null}
            {content}
          </>
        ) : (
          content
        )
      }
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
  glass: 'text',
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
    // The 0087 mock fills this ring with the lime wash ("Add all N matches");
    // the ring and lime label stay, so the tone keeps its name.
    backgroundColor: Colors.dark.accentWash,
    borderWidth: 1,
    borderColor: Colors.dark.accentRing,
  },
  quiet: { backgroundColor: 'transparent' },
  danger: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.danger,
  },
  // The shell is `GlassSurface`, a layer behind the label; this is only the box.
  glass: { minHeight: Size.pill, borderRadius: Radius.pill },
  glassShell: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.pill,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.glassLine,
  },
  glassFlat: { backgroundColor: Colors.dark.glassFill },
  glassPressed: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.pill,
    backgroundColor: Colors.dark.glassFill,
  },
});
