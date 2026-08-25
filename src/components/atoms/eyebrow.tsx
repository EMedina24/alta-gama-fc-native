/** An uppercase section label. `Type.eyebrow` already applies the transform. */
import { Text, type TextProps } from './text';

export interface EyebrowProps extends Omit<TextProps, 'variant'> {
  small?: boolean;
}

export function Eyebrow({ small = false, color = 'textFaint', ...rest }: EyebrowProps) {
  return <Text variant={small ? 'eyebrowSm' : 'eyebrow'} color={color} {...rest} />;
}
