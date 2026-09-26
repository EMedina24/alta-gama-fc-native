/**
 * A fingertip landing — the Starting XI pitch's "tap a position" hint
 * (ADR 0213). A dot inside two arcs of a ripple, which reads at 15pt where a
 * hand outline does not.
 *
 * ⚠ Drawn, not loaded — the repo has no icon set (0174 §14's rule).
 */
import Svg, { Circle, Path } from 'react-native-svg';

import { Colors, type ThemeColor } from '@/constants/theme';

export interface TapGlyphProps {
  size: number;
  color?: ThemeColor;
}

export function TapGlyph({ size, color = 'accent' }: TapGlyphProps) {
  const ink = Colors.dark[color];
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" accessible={false}>
      <Circle cx={10} cy={10} r={2.6} fill={ink} />
      <Path
        d="M5.4 5.4a6.5 6.5 0 0 0 0 9.2M14.6 5.4a6.5 6.5 0 0 1 0 9.2"
        stroke={ink}
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
