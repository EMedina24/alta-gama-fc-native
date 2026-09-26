/**
 * A bin — the Starting XI lineups sheet's delete control (ADR 0214).
 *
 * ⚠ Drawn, not loaded — the repo has no icon set (0174 §14's rule).
 */
import Svg, { Path } from 'react-native-svg';

import { Colors, type ThemeColor } from '@/constants/theme';

export interface TrashGlyphProps {
  size: number;
  color?: ThemeColor;
}

export function TrashGlyph({ size, color = 'textSecondary' }: TrashGlyphProps) {
  const ink = Colors.dark[color];
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" accessible={false}>
      <Path
        d="M3.6 5.4h12.8M8 5.2V3.6h4v1.6M5.2 5.6l.8 10.4a1.4 1.4 0 0 0 1.4 1.3h5.2a1.4 1.4 0 0 0 1.4-1.3l.8-10.4M8.4 8.6v5.6M11.6 8.6v5.6"
        stroke={ink}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
