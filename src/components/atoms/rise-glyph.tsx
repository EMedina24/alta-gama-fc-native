/**
 * The reel's `PULL UP TO READ` chevron (ADR 0129) — a small up-mark beside the
 * hint. Drawn, not a font glyph — there is no icon set in this app.
 *
 * ⚠ NOT `Chevron`: that atom is the disclosure chevron with an
 * expanded/direction contract, and the two must be free to move apart.
 */
import Svg, { Path } from 'react-native-svg';

import { Colors, type ThemeColor } from '@/constants/theme';

export interface RiseGlyphProps {
  color?: ThemeColor;
  size?: number;
}

export function RiseGlyph({ color = 'accent', size = 13 }: RiseGlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" accessible={false}>
      <Path
        d="M3 9l4-4 4 4"
        stroke={Colors.dark[color]}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
