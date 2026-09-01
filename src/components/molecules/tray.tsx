/**
 * The DOUBLE-BEZEL TRAY (ADR 0090/0091): an outer glass band wrapped around an
 * opaque inner surface, `Size.trayPad` apart — the 0087 design language's card
 * shape for a CONTROL group (Clubs' search and browse, the club page's four
 * trays). Supersedes 0081's no-nested-shells rule for exactly this pattern.
 *
 * ⚠ The inner radius is ALWAYS `radius − Size.trayPad`, never its own number —
 * one constant, two duties, so the two curves stay concentric. A drifted pair
 * reads as a misregistered print.
 *
 * ⚠ `innerStyle` exists for the club page's NEXT UP tray, whose inner carries
 * a club-tint wash over `trayInner` — the wash needs `position: 'relative'` +
 * the clip, which the inner already provides.
 */
import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Radius, Size, Surfaces } from '@/constants/theme';

export interface TrayProps {
  children: ReactNode;
  /** The OUTER radius — `Radius.tray` (26) by default, `trayLg` (28) for NEXT UP. */
  radius?: number;
  innerStyle?: StyleProp<ViewStyle>;
}

export function Tray({ children, radius = Radius.tray, innerStyle }: TrayProps) {
  return (
    <View style={[styles.outer, { borderRadius: radius }]}>
      <View style={[styles.inner, { borderRadius: radius - Size.trayPad }, innerStyle]}>
        {/* The inset top light — an overlay border, the repo's idiom. */}
        <View pointerEvents="none" style={[styles.innerTop, { borderRadius: radius - Size.trayPad }]} />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { ...Surfaces.trayOuter, padding: Size.trayPad },
  inner: {
    backgroundColor: Colors.dark.trayInner,
    overflow: 'hidden',
    position: 'relative',
  },
  innerTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: 'transparent',
    borderTopColor: Colors.dark.trayInnerTop,
  },
});
