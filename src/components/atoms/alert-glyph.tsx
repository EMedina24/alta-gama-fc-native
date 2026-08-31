/**
 * The four alert types as stroke glyphs — the onboarding primer's three
 * (ADR 0076) plus goals, added for the account sheet's rows (ADR 0081): a clock
 * (before kickoff), two arrows (moved), a crossed circle (postponed), a ball
 * (goals and full time).
 *
 * ⚠ Drawn, not a font glyph — there is no icon set in this app (see
 * `chevron.tsx`). One stroke weight, one grid, so the four read as a set.
 *
 * ⚠ `goals` is drawn here rather than borrowed from `event-glyph.tsx`, whose
 * ball is a different mark for a different job: that one is locked to the
 * timeline's fixed 18×15 slot and takes no colour, because it is a marker in a
 * column. This one is a 34pt tile's glyph and has to tint like its siblings.
 */
import Svg, { Circle, Path } from 'react-native-svg';

import { Colors, type ThemeColor } from '@/constants/theme';

export type AlertKind = 'reminder' | 'moved' | 'postponed' | 'goals';

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
      ) : kind === 'goals' ? (
        <>
          {/* The ball: the same r=7 circle its siblings use, with the panel
              pentagon inside it — two elements, like the clock and the cross.
              ⚠ The pentagon is r=4.2 against the circle's 7. Smaller and it
              stops reading as a ball and starts reading as a camera aperture,
              which is what the first draft did on the simulator. */}
          <Circle cx={9} cy={9} r={7} {...common} />
          <Path d="M9 4.8l3.99 2.9-1.52 4.7H6.53L5.01 7.7z" {...common} />
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
