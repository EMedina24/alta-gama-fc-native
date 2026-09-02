/**
 * A person silhouette — the signed-OUT avatar's glyph (ADR 0101), replacing
 * the mark: a circle that contains the brand says "app"; an account door
 * should say "you".
 *
 * ⚠ Drawn, not a font glyph: there is no icon set in this app (see
 * `chevron.tsx`). Head + open shoulders, the stroke style of `check.tsx`.
 */
import Svg, { Circle, Path } from 'react-native-svg';

import { Colors, type ThemeColor } from '@/constants/theme';

export interface PersonGlyphProps {
  color?: ThemeColor;
  size?: number;
  strokeWidth?: number;
}

export function PersonGlyph({ color = 'textSecondary', size = 18, strokeWidth = 1.8 }: PersonGlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" accessible={false}>
      <Circle
        cx={10}
        cy={6.4}
        r={3.3}
        stroke={Colors.dark[color]}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Path
        d="M3.6 17.2c.9-3.8 3.4-5.4 6.4-5.4s5.5 1.6 6.4 5.4"
        stroke={Colors.dark[color]}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
