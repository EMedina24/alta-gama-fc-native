/**
 * Three rising bars, as a mark: the club page's Season stats row tile (ADR
 * 0141).
 *
 * Drawn with `react-native-svg` like `pitch-glyph.tsx`, which it sits directly
 * under on the club page — same 20-unit box, same stroke weight, so the two
 * tiles read as one pair rather than two icons from different sets.
 *
 * ⚠ Rising left-to-right, not a symmetric chart shape: the row is about a
 * season's shape over time, and a symmetric glyph reads as an equaliser.
 */
import Svg, { Path } from 'react-native-svg';

import { Colors, type ThemeColor } from '@/constants/theme';

export interface BarsGlyphProps {
  size: number;
  color?: ThemeColor;
}

export function BarsGlyph({ size, color = 'accent' }: BarsGlyphProps) {
  const ink = Colors.dark[color];
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" accessible={false}>
      <Path
        d="M4.6 16.5v-4.6M10 16.5V7.4M15.4 16.5V4.2"
        stroke={ink}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
