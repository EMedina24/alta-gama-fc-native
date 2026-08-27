/**
 * The disclosure chevron on an expandable match row.
 *
 * ⚠ There is no icon set in this app. The only chevron-ish character on screen
 * before this was a literal `›` in the standings' expanded row, and `FeedAge`
 * still draws a placeholder circle "until the icon set lands". This is a drawn
 * mark, not a glyph from a font — see `event-glyph.tsx` on `react-native-svg`.
 *
 * ⚠ **Not a hit target.** It is 11pt. The 44pt target is the ROW it sits in,
 * which owns the `Pressable` and the `accessibilityState`.
 */
import Svg, { Path } from 'react-native-svg';

import { Colors, Size, type ThemeColor } from '@/constants/theme';

export interface ChevronProps {
  /** Points up when open, down when closed. */
  expanded?: boolean;
  color?: ThemeColor;
}

export function Chevron({ expanded = false, color = 'textFaint' }: ChevronProps) {
  return (
    <Svg
      width={Size.chevron}
      height={Size.chevron}
      viewBox="0 0 20 20"
      accessible={false}
      style={expanded ? { transform: [{ rotate: '180deg' }] } : undefined}>
      <Path
        d="M4.5 7.5l5.5 5.5 5.5-5.5"
        stroke={Colors.dark[color]}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
