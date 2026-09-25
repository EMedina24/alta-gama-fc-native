/**
 * The iOS share mark — an open box with an arrow leaving it (ADR 0202, the
 * club page's glass share circle).
 *
 * ⚠ Drawn, not loaded — the repo has no icon set (0174 §14's rule).
 */
import Svg, { Path } from 'react-native-svg';

import { Colors, type ThemeColor } from '@/constants/theme';

export interface ShareGlyphProps {
  size: number;
  color?: ThemeColor;
}

export function ShareGlyph({ size, color = 'text' }: ShareGlyphProps) {
  const ink = Colors.dark[color];
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" accessible={false}>
      <Path
        d="M7 7.6H5.6a1.6 1.6 0 0 0-1.6 1.6v6.6a1.6 1.6 0 0 0 1.6 1.6h8.8a1.6 1.6 0 0 0 1.6-1.6V9.2a1.6 1.6 0 0 0-1.6-1.6H13"
        stroke={ink}
        strokeWidth={1.7}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M10 12.2V2.8M6.9 5.6 10 2.6l3.1 3"
        stroke={ink}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
