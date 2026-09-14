/**
 * A minus, for the Board editor's remove disc (ADR 0174). Drawn, not a font
 * glyph — there is no icon set in this app (see `plus-glyph.tsx`, `chevron.tsx`).
 *
 * ⚠ A sibling of `PlusGlyph` rather than a `kind` prop on it: the two are one
 * stroke apart, but `PlusGlyph` is named for what it draws and a component that
 * can draw a minus is not a plus. They share the viewBox and the stroke so the
 * pair reads as one set.
 *
 * ⚠ The `−` also appears in `copy.board.hint`, where it IS punctuation the
 * reader is told to tap. That string is the exception, not a second source: the
 * control itself is always this.
 */
import Svg, { Path } from 'react-native-svg';

import { Colors, type ThemeColor } from '@/constants/theme';

export interface MinusGlyphProps {
  color?: ThemeColor;
  size?: number;
}

export function MinusGlyph({ color = 'onDanger', size = 11 }: MinusGlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" accessible={false}>
      <Path
        d="M2.2 6h7.6"
        stroke={Colors.dark[color]}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
