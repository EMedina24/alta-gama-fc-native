/**
 * The three alert types as stroke glyphs, on the onboarding primer (ADR 0076):
 * a clock (before kickoff), two arrows (moved), a crossed circle (postponed).
 *
 * ⚠ Drawn, not a font glyph — there is no icon set in this app (see
 * `chevron.tsx`). One stroke weight, one grid, so the three read as a set.
 */
import Svg, { Circle, Path } from 'react-native-svg';

import { Colors, type ThemeColor } from '@/constants/theme';

export type AlertKind = 'reminder' | 'moved' | 'postponed';

export interface AlertGlyphProps {
  kind: AlertKind;
  color?: ThemeColor;
  size?: number;
}

export function AlertGlyph({ kind, color = 'accent', size = 18 }: AlertGlyphProps) {
  const stroke = Colors.dark[color];
  const common = { stroke, strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" accessible={false}>
      {kind === 'reminder' ? (
        <>
          <Circle cx={9} cy={9} r={7} {...common} />
          <Path d="M9 5v4.2l2.8 1.6" {...common} />
        </>
      ) : kind === 'moved' ? (
        <>
          <Path d="M3 6h11M11 3l3 3-3 3" {...common} />
          <Path d="M15 12H4M7 9l-3 3 3 3" {...common} />
        </>
      ) : (
        <>
          <Circle cx={9} cy={9} r={7} {...common} />
          <Path d="M6.5 6.5l5 5M11.5 6.5l-5 5" {...common} />
        </>
      )}
    </Svg>
  );
}
