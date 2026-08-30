/** A magnifier, for the onboarding search field (ADR 0076). Drawn — no icon set here. */
import Svg, { Circle, Path } from 'react-native-svg';

import { Colors, type ThemeColor } from '@/constants/theme';

export function SearchGlyph({ color = 'textFaint', size = 16 }: { color?: ThemeColor; size?: number }) {
  const stroke = Colors.dark[color];
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" accessible={false}>
      <Circle cx={7} cy={7} r={5} stroke={stroke} strokeWidth={1.8} fill="none" />
      <Path d="M11 11l3.5 3.5" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" fill="none" />
    </Svg>
  );
}
