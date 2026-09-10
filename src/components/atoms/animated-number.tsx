/**
 * A number that counts up from zero, on the UI thread (ADR 0142).
 *
 * ⚠ **The first `useAnimatedProps` in this app, and the reason is cost, not
 * taste.** The Season stats screen holds ~20 of these over seven cards that
 * each draw SVG; a JS-thread progress value would re-render all of them ~45
 * times during entry. The caller owns ONE shared clock and passes it in, so
 * every number on a view moves together and the screen re-renders zero times
 * while they do.
 *
 * ⚠⚠ **It is a `TextInput`, because Reanimated cannot animate `Text` children.**
 * That has two consequences worth knowing before reaching for it:
 *
 *   - It bypasses the `Text` atom, so it reads `Type`/`Colors` directly. That is
 *     the ONLY place in the app allowed to, and it must not spread: anything
 *     that is not a counting number goes through `Text`.
 *   - **`adjustsFontSizeToFit` does not exist on `TextInput`**, so trap 33's
 *     usual answer is unavailable. The answer here is the hidden sizer below,
 *     which is better anyway: the box is laid out at the FINAL value's width, so
 *     it cannot reflow while the digits change underneath it. A `102` arriving
 *     through `9`, `47`, `88` would otherwise widen its column four times on the
 *     way, which reads as a rendering fault rather than a flourish.
 *
 * ⚠ Reduce Motion needs no branch here (trap 63): Reanimated skips `withTiming`
 * when the system switch is on and `progress` jumps straight to 1, so the number
 * renders final. That IS the accommodation — see `SeasonStats` in the theme.
 */
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
} from 'react-native';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';

import { Colors, Type, type ThemeColor } from '@/constants/theme';
import { Text, type TypeVariant } from './text';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export interface AnimatedNumberProps {
  /** The number to land on. */
  value: number;
  /** 0→1, owned by the view so every number shares one clock. */
  progress: SharedValue<number>;
  variant?: TypeVariant;
  color?: ThemeColor;
  /** Decimal places — `1` for "2.7 per match". Default 0. */
  decimals?: number;
  /** Drawn after the digits and included in the reserved width — e.g. `'%'`. */
  suffix?: string;
  align?: TextStyle['textAlign'];
}

/**
 * Formats inside the worklet. Deliberately `toFixed` and not `Intl`: the UI
 * thread has no `Intl`, and these are bare counts — the locale-shaped strings
 * around them come from `copy`/`phrases` on the JS side.
 */
export function AnimatedNumber({
  value,
  progress,
  variant = 'statHero',
  color = 'text',
  decimals = 0,
  suffix = '',
  align = 'left',
}: AnimatedNumberProps) {
  const final = `${value.toFixed(decimals)}${suffix}`;

  const animatedProps = useAnimatedProps<TextInputProps>(() => {
    const at = value * progress.value;
    // ⚠ `text` is a real native prop on `TextInput` and the documented way to
    // drive one from a worklet, but it is absent from `TextInputProps` — the
    // cast is that gap in the types, not a type being silenced.
    return { text: `${at.toFixed(decimals)}${suffix}` } as Partial<TextInputProps>;
  });

  return (
    <View
      style={styles.box}
      accessible
      accessibilityRole="text"
      accessibilityLabel={final}>
      {/* The sizer: never painted, never read aloud, only measured. It holds
          the column at the final value's width for the whole count. */}
      <Text
        variant={variant}
        color={color}
        tabular
        accessible={false}
        importantForAccessibility="no"
        style={[styles.sizer, { textAlign: align }]}>
        {final}
      </Text>
      <AnimatedTextInput
        editable={false}
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no"
        underlineColorAndroid="transparent"
        defaultValue={final}
        animatedProps={animatedProps}
        style={[
          Type[variant],
          styles.input,
          { color: Colors.dark[color], textAlign: align },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { position: 'relative' },
  // `opacity: 0` rather than `display: 'none'` — a hidden box is not measured,
  // and measurement is the entire job.
  sizer: { opacity: 0 },
  input: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // ⚠ A `TextInput` carries its own padding and vertical centring; without
    // these it sits a couple of points below the sizer it is meant to cover.
    padding: 0,
    margin: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
    fontVariant: ['tabular-nums'],
  },
});
