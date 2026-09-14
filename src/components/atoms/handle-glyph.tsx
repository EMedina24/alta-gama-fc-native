/**
 * The drag handle's mark (ADR 0174): two rules, the universal "pick this up".
 *
 * ⚠ Two rules, not three. The design's handle is a 34pt square with a small
 * mark in it; at three rules the gaps close up at this size and it reads as a
 * filled block rather than as a grip.
 *
 * ⚠ Decorative — `accessible={false}`. The row that owns it carries the label
 * and the move actions, because a drag handle is unreachable by VoiceOver and
 * a labelled one would promise something it cannot do.
 */
import Svg, { Path } from 'react-native-svg';

import { Colors, type ThemeColor } from '@/constants/theme';

export interface HandleGlyphProps {
  color?: ThemeColor;
  size?: number;
}

export function HandleGlyph({ color = 'textSecondary', size = 14 }: HandleGlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" accessible={false}>
      <Path
        d="M2.5 5h9M2.5 9h9"
        stroke={Colors.dark[color]}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
