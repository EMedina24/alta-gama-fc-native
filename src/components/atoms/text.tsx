/**
 * The type scale, as a component. Every string on screen goes through this.
 *
 * ⚠ `tabular` is not cosmetic. SPEC §2: every numeric run — scores, kickoffs,
 * points, goal difference, countdowns — sets `fontVariant: ['tabular-nums']`,
 * because proportional digits make a column of numbers fail to line up and
 * "the table looks broken". It is off by default because prose should NOT be
 * tabular; turn it on for anything that is a number.
 */
import { Text as RNText, StyleSheet, type TextProps as RNTextProps } from 'react-native';

import { Colors, Type, type ThemeColor } from '@/constants/theme';

export type TypeVariant = keyof typeof Type;

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  color?: ThemeColor;
  /** Lining, fixed-width digits. Required for anything numeric. */
  tabular?: boolean;
  center?: boolean;
}

export function Text({
  variant = 'body',
  color = 'text',
  tabular = false,
  center = false,
  style,
  ...rest
}: TextProps) {
  return (
    <RNText
      style={[
        Type[variant],
        { color: Colors.dark[color] },
        tabular && styles.tabular,
        center && styles.center,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  tabular: { fontVariant: ['tabular-nums'] },
  center: { textAlign: 'center' },
});
