/**
 * A round glass control carrying one glyph (ADR 0202) — the Medina kit's
 * `GlassCircle`: the club page's back and share. 44pt, so it needs no
 * `hitSlop`.
 *
 * ⚠ Liquid glass through `GlassSurface` (flat `glassFill` below iOS 26). It
 * floats over the club scene, which is what gives the glass something to
 * refract. ⚠ Never put it under a scale or opacity transform — a transformed
 * ancestor kills the glass (the 0120/0122 rule).
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GlassSurface } from './glass-surface';
import { Colors, Radius, Size } from '@/constants/theme';

export interface GlassIconButtonProps {
  /** The glyph, already sized and inked. */
  children: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
}

export function GlassIconButton({ children, onPress, accessibilityLabel }: GlassIconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.button}>
      {({ pressed }) => (
        <>
          <GlassSurface style={styles.shell} flatStyle={styles.flat} />
          {/* ⚠ Pressed is a TINT layer, not opacity on the control: an alpha on
              a glass ancestor kills the glass (0120/0122). */}
          {pressed ? <View pointerEvents="none" style={styles.pressed} /> : null}
          <View pointerEvents="none">{children}</View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: Size.glassIcon,
    height: Size.glassIcon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shell: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.pill,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.glassLine,
  },
  flat: { backgroundColor: Colors.dark.glassFill },
  pressed: { ...StyleSheet.absoluteFill, borderRadius: Radius.pill, backgroundColor: Colors.dark.glassFill },
});
