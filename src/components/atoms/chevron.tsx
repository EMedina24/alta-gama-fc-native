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
  /**
   * `right` is a disclosure INTO a screen (the club-page Starting XI row, ADR
   * 0065) rather than an expand/collapse; it ignores `expanded`.
   */
  direction?: 'down' | 'right';
}

export function Chevron({ expanded = false, color = 'textFaint', direction = 'down' }: ChevronProps) {
  const rotate = direction === 'right' ? '-90deg' : expanded ? '180deg' : null;
  return (
    <Svg
      width={Size.chevron}
      height={Size.chevron}
      viewBox="0 0 20 20"
      accessible={false}
      style={rotate ? { transform: [{ rotate }] } : undefined}>
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
