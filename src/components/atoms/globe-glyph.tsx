/** A globe, beside the welcome screen's language line (ADR 0077). Drawn — no icon set here. */
import Svg, { Circle, Path } from 'react-native-svg';

import { Colors, type ThemeColor } from '@/constants/theme';

export function GlobeGlyph({ color = 'textFaint', size = 14 }: { color?: ThemeColor; size?: number }) {
  const stroke = Colors.dark[color];
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" accessible={false}>
      <Circle cx={8} cy={8} r={6.5} stroke={stroke} strokeWidth={1.5} fill="none" />
      <Path
        d="M1.5 8h13M8 1.5c-2.2 2.2-2.2 10.8 0 13M8 1.5c2.2 2.2 2.2 10.8 0 13"
        stroke={stroke}
        strokeWidth={1.5}
        fill="none"
      />
    </Svg>
  );
}
