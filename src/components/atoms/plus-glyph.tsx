/**
 * A plus, for the follow pill's disc (ADR 0082). Drawn, not a font glyph —
 * there is no icon set in this app (see `chevron.tsx`, `check.tsx`).
 *
 * ⚠ The `+` used to live IN the copy (`'+ FOLLOW'` / `'+ SEGUIR'`). It is a
 * glyph now, so the strings are the bare verb — a translator must never be
 * handed punctuation that is really artwork.
 */
import Svg, { Path } from 'react-native-svg';

import { Colors, type ThemeColor } from '@/constants/theme';

export interface PlusGlyphProps {
  color?: ThemeColor;
  size?: number;
}

export function PlusGlyph({ color = 'accent', size = 11 }: PlusGlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" accessible={false}>
      <Path
        d="M6 2.2v7.6M2.2 6h7.6"
        stroke={Colors.dark[color]}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
