/**
 * A check mark — the receipt glyph on a done control (ADR 0074).
 *
 * ⚠ Drawn, not a font glyph: there is no icon set in this app (see
 * `chevron.tsx`). Sized to `Size.chevron` so it sits on a button's text line
 * without moving it.
 */
import Svg, { Path } from 'react-native-svg';

import { Colors, Size, type ThemeColor } from '@/constants/theme';

export interface CheckProps {
  color?: ThemeColor;
  size?: number;
}

export function Check({ color = 'accent', size = Size.chevron + 2 }: CheckProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" accessible={false}>
      <Path
        d="M4 10.5l4 4 8-9"
        stroke={Colors.dark[color]}
        strokeWidth={2.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
