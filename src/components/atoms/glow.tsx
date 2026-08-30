/**
 * A radial "floodlight" — the app icon's lime glow, as a screen background
 * (ADR 0060 / 0076). Fills its parent absolutely and paints nothing else;
 * the parent decides where the light falls with `cx`/`cy`.
 *
 * `react-native-svg`, like `WashGradient`: no `expo-linear-gradient` (ADR 0062).
 * ⚠ Translucency is `opacity` on the stop, never an `rgba()` colour — svg paints
 * that opaque (see `wash-gradient.tsx`).
 */
import { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Colors, type ThemeColor } from '@/constants/theme';

export interface GlowProps {
  color?: ThemeColor;
  /** Peak opacity at the centre. */
  opacity: number;
  /** Centre and radius as fractions of the parent's box. */
  cx?: number;
  cy?: number;
  r?: number;
}

export function Glow({ color = 'accent', opacity, cx = 0.5, cy = 0.5, r = 0.6 }: GlowProps) {
  const id = `glow-${useId().replace(/:/g, '')}`;
  const hex = Colors.dark[color];
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false}>
      <Defs>
        <RadialGradient id={id} cx={`${cx * 100}%`} cy={`${cy * 100}%`} r={`${r * 100}%`}>
          <Stop offset={0} stopColor={hex} stopOpacity={opacity} />
          <Stop offset={0.55} stopColor={hex} stopOpacity={opacity * 0.3} />
          <Stop offset={1} stopColor={hex} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
