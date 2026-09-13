/**
 * A calendar, as a mark: the page, its two hangers, the torn-off header rule,
 * and a single marked day. The Calendar pill's glyph on the Matchdays strip row
 * (ADR 0165).
 *
 * Drawn with `react-native-svg` like `pitch-glyph.tsx` — there is no icon set in
 * this app (`chevron.tsx`'s rule), so every mark is geometry. Colours come from
 * `@/constants/theme`, never a literal.
 *
 * ⚠ Decorative: it sits beside the word `Calendar`, which the chip already
 * announces, so it takes no label of its own.
 *
 * ⚠ The marked day is a FILLED dot rather than a second outlined box: at 14pt —
 * the pill's size — an outline inside an outline reads as noise.
 */
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Colors, type ThemeColor } from '@/constants/theme';

export interface CalendarGlyphProps {
  size: number;
  color?: ThemeColor;
}

export function CalendarGlyph({ size, color = 'accent' }: CalendarGlyphProps) {
  const ink = Colors.dark[color];
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" accessible={false}>
      <Rect x={2.8} y={4.6} width={14.4} height={12.6} rx={2.6} stroke={ink} strokeWidth={1.7} fill="none" />
      <Path d="M6.6 2.8v3.2M13.4 2.8v3.2" stroke={ink} strokeWidth={1.7} strokeLinecap="round" />
      <Path d="M2.8 8.6h14.4" stroke={ink} strokeWidth={1.5} />
      <Circle cx={10} cy={12.8} r={1.5} fill={ink} />
    </Svg>
  );
}
