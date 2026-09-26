/**
 * A pill of the Medina kit's liquid glass, holding whatever it is handed —
 * the Starting XI builder's formation chip, bench chip, Mirror and Clear
 * (ADR 0213). `GlassIconButton`'s recipe at a free width and height.
 *
 * ⚠ The glass is a SIBLING layer behind the content, never its ancestor, and
 * pressed/disabled are tint layers or ink — never opacity on the control: an
 * alpha on a glass ancestor kills the glass (0120/0122).
 *
 * ⚠ 44pt hit target whatever the drawn height (SPEC §2), through `hitSlop`.
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { GlassSurface } from '@/components/atoms';
import { Colors, Size, Spacing } from '@/constants/theme';

export interface GlassPillProps {
  height: number;
  onPress: () => void;
  children: ReactNode;
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityState?: { expanded?: boolean; selected?: boolean };
  disabled?: boolean;
  /** Horizontal padding; the handoff's chips differ by a few points. */
  padX?: number;
  style?: StyleProp<ViewStyle>;
}

export function GlassPill({
  height,
  onPress,
  children,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  disabled = false,
  padX = Spacing.three + 2,
  style,
}: GlassPillProps) {
  const radius = height / 2;
  const slop = Math.max(0, (Size.minTouch - height) / 2);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={slop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ ...accessibilityState, disabled }}
      style={[styles.pill, { height, borderRadius: radius, paddingHorizontal: padX }, style]}>
      {({ pressed }) => (
        <>
          <GlassSurface
            style={[styles.shell, { borderRadius: radius }]}
            flatStyle={styles.flat}
          />
          {pressed ? <View pointerEvents="none" style={[styles.tint, { borderRadius: radius }]} /> : null}
          <View pointerEvents="none" style={styles.content}>
            {children}
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { justifyContent: 'center' },
  shell: {
    ...StyleSheet.absoluteFill,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.xiControlLine,
  },
  flat: { backgroundColor: Colors.dark.glassFill },
  tint: { ...StyleSheet.absoluteFill, backgroundColor: Colors.dark.glassFill },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two - 2 },
});
