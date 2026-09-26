/**
 * Two arrows passing — the Starting XI pitch's Flip control (ADR 0213): it
 * turns the pitch end for end.
 *
 * ⚠ Drawn, not loaded — the repo has no icon set (0174 §14's rule).
 */
import Svg, { Path } from 'react-native-svg';

import { Colors, type ThemeColor } from '@/constants/theme';

export interface FlipGlyphProps {
  size: number;
  color?: ThemeColor;
}

export function FlipGlyph({ size, color = 'text' }: FlipGlyphProps) {
  const ink = Colors.dark[color];
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" accessible={false}>
      <Path
        d="M6.5 16.5V3.5M3.4 6.6 6.5 3.5l3.1 3.1M13.5 3.5v13M10.4 13.4l3.1 3.1 3.1-3.1"
        stroke={ink}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
