/**
 * A football pitch, as a mark: touchline, halfway line, centre circle, both
 * boxes. The club-page Starting XI row's tile glyph (ADR 0065).
 *
 * Drawn with `react-native-svg` like `event-glyph.tsx`; the geometry is
 * transcribed from `handoff_squad-builder/Starting XI.dc.html`'s toolbar icon.
 * Every colour comes from `@/constants/theme`, never the spec's hex.
 */
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Colors, type ThemeColor } from '@/constants/theme';

export interface PitchGlyphProps {
  size: number;
  color?: ThemeColor;
}

export function PitchGlyph({ size, color = 'accent' }: PitchGlyphProps) {
  const ink = Colors.dark[color];
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" accessible={false}>
      <Rect x={2.5} y={3.5} width={15} height={13} rx={2.5} stroke={ink} strokeWidth={1.7} fill="none" />
      <Path d="M10 3.5v13" stroke={ink} strokeWidth={1.7} strokeLinecap="round" />
      <Circle cx={10} cy={10} r={2.6} stroke={ink} strokeWidth={1.5} fill="none" />
      <Path d="M2.5 7h3v6h-3M17.5 7h-3v6h3" stroke={ink} strokeWidth={1.4} fill="none" strokeLinejoin="round" />
    </Svg>
  );
}
