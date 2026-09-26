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

import { Colors, DisplayMetrics, Type, type ThemeColor } from '@/constants/theme';

export type TypeVariant = keyof typeof Type;

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  color?: ThemeColor;
  /** Lining, fixed-width digits. Required for anything numeric. */
  tabular?: boolean;
  center?: boolean;
  /**
   * Put a Saira number's DIGITS on its line box's midline (ADR 0205).
   *
   * ⚠ A Saira line box shorter than the face's natural 1.574em (every number
   * token, at 0194's 1.2×) keeps the whole descent as air under the digits, so
   * a number centred in a chip or a pill reads HIGH — 3.7pt at `numeral`, 8.6pt
   * at `scoreLarge`. This nudges the glyphs down by exactly that, from
   * `DisplayMetrics`, as a transform (layout is untouched).
   *
   * ⚠ Opt-in, for digits CENTRED in a box. Never on a number baseline-aligned
   * with SF text beside it (the countdown's units): a transform does not move
   * the layout baseline, and the pair would split. A no-op on SF tokens.
   */
  opticalCentre?: boolean;
}

export function Text({
  variant = 'body',
  color = 'text',
  tabular = false,
  center = false,
  opticalCentre = false,
  style,
  ...rest
}: TextProps) {
  const token = Type[variant];
  const drop =
    opticalCentre && 'fontFamily' in token && 'lineHeight' in token
      ? (DisplayMetrics.descent + DisplayMetrics.cap / 2) * token.fontSize - token.lineHeight / 2
      : 0;
  return (
    <RNText
      style={[
        Type[variant],
        { color: Colors.dark[color] },
        tabular && styles.tabular,
        center && styles.center,
        drop !== 0 && { transform: [{ translateY: drop }] },
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
