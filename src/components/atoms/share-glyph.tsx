/**
 * The share mark — an arrow rising out of a tray, iOS's own vocabulary for the
 * action (ADR 0129). Drawn, not a font glyph — there is no icon set in this
 * app (see `chevron.tsx`). Path is the dc handoff's, verbatim.
 *
 * ⚠ Not a hit target — the 44pt circle in `ReelActions` owns the Pressable.
 */
import Svg, { Path } from 'react-native-svg';

import { Colors, type ThemeColor } from '@/constants/theme';

export interface ShareGlyphProps {
  color?: ThemeColor;
  size?: number;
}

export function ShareGlyph({ color = 'text', size = 15 }: ShareGlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" accessible={false}>
      <Path
        d="M8 10.6V2.4M4.9 5.3L8 2.2l3.1 3.1M3.2 9.4v3.3a1.2 1.2 0 001.2 1.2h7.2a1.2 1.2 0 001.2-1.2V9.4"
        stroke={Colors.dark[color]}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
