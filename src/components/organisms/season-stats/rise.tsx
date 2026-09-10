/**
 * The staggered entrance every Season stats card wears.
 *
 * ⚠ **`Motion.enter`/`Motion.stagger`, NOT the mock's 700 ms and 80 ms** (ADR
 * 0141). `stagger`'s own note in the theme says past ~50 ms a step, blocks read
 * as a queue the reader waits through — and the Club view has seven cards where
 * the account sheet, which set the token, has five. A 700 ms rise on the last
 * of seven would land more than a second after the screen appeared.
 *
 * ⚠ Guarded by `useReducedMotion()` and passing `undefined`, like every other
 * `entering=` in this app. That is a hard house rule and not a per-feature call.
 */
import { type ReactNode } from 'react';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { Motion } from '@/constants/theme';

export function Rise({ step, children }: { step: number; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View
      entering={
        reduceMotion
          ? undefined
          : FadeInDown.duration(Motion.enter).delay(step * Motion.stagger)
      }>
      {children}
    </Animated.View>
  );
}
