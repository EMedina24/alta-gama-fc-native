/**
 * The Alta Gama mark — `logos/mark-currentcolor.svg` as `react-native-svg`
 * (ADR 0076). A 42×30 unit box: the pitch outline, the halfway line, two goal
 * boxes flush to the touchline, and the centre circle.
 *
 * ⚠ Drawn, not loaded: no SVG transformer is configured, so the geometry lives
 * here verbatim. Change the logo and this file changes with it.
 */
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Colors, type ThemeColor } from '@/constants/theme';

export interface MarkProps {
  width: number;
  color?: ThemeColor;
  /** In viewBox units — the icon spec's 2.2, the export card's 2.5. */
  strokeWidth?: number;
}

export const MARK_RATIO = 30 / 42;

export function Mark({ width, color = 'accent', strokeWidth = 2.2 }: MarkProps) {
  const stroke = Colors.dark[color];
  return (
    <Svg width={width} height={width * MARK_RATIO} viewBox="0 0 42 30" accessible={false}>
      <Rect x={1.25} y={1.25} width={39.5} height={27.5} rx={4.75} stroke={stroke} strokeWidth={strokeWidth} fill="none" />
      <Path
        d="M21 1.25V8.5M21 21.5V28.75M0 8.25H4.75V21.75H0M42 8.25H37.25V21.75H42"
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle cx={21} cy={15} r={5.25} stroke={stroke} strokeWidth={strokeWidth} fill="none" />
    </Svg>
  );
}
