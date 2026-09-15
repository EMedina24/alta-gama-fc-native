/**
 * A pencil — the Board's EDIT chip glyph (ADR 0182), replacing the "EDITAR"
 * label so the crown control reads at a glance in any locale.
 *
 * ⚠ Drawn, not a font glyph: there is no icon set in this app (see
 * `chevron.tsx`). Diagonal body with a nib tick, the stroke style of
 * `person-glyph.tsx`.
 */
import Svg, { Path } from 'react-native-svg';

import { Colors, type ThemeColor } from '@/constants/theme';

export interface PencilGlyphProps {
  color?: ThemeColor;
  size?: number;
  strokeWidth?: number;
}

export function PencilGlyph({ color = 'textSecondary', size = 18, strokeWidth = 1.8 }: PencilGlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" accessible={false}>
      <Path
        d="M3.5 16.5l.6-3.1 9.3-9.3a1.9 1.9 0 0 1 2.7 2.7l-9.3 9.3-3.3.4z"
        stroke={Colors.dark[color]}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M12.2 5.3l2.5 2.5"
        stroke={Colors.dark[color]}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
