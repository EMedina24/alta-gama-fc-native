/**
 * A five-point star — the club page's follow button (ADR 0202): outline to
 * invite ("Follow"), filled once followed ("Following"), the kit's glyph.
 *
 * ⚠ Drawn, not loaded — the repo has no icon set (0174 §14's rule).
 * ⚠ Trap 75: the default ink is `text`, never the lime; a star on the lime
 * button passes `onAccent`.
 */
import Svg, { Path } from 'react-native-svg';

import { Colors, type ThemeColor } from '@/constants/theme';

export interface StarGlyphProps {
  size: number;
  color?: ThemeColor;
  filled?: boolean;
}

const STAR =
  'M10 2.6l2.25 4.72 5.15.66-3.78 3.56.96 5.1L10 14.2l-4.58 2.44.96-5.1L2.6 7.98l5.15-.66z';

export function StarGlyph({ size, color = 'text', filled = false }: StarGlyphProps) {
  const ink = Colors.dark[color];
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" accessible={false}>
      <Path
        d={STAR}
        stroke={ink}
        strokeWidth={1.6}
        strokeLinejoin="round"
        fill={filled ? ink : 'none'}
      />
    </Svg>
  );
}
