/**
 * A linear gradient filling its parent, drawn behind the parent's children
 * (ADR 0068). The parent must be `position: 'relative'` and — if it has rounded
 * corners — `overflow: 'hidden'`, or the fill squares them off; `match-board`'s
 * `flush` style documents that exact fault.
 *
 * `react-native-svg`, not `expo-linear-gradient`: the same call ADR 0062 made
 * for the Serie A band, for the same reason — no native rebuild.
 *
 * ⚠ The gradient `id` is from `useId()`, NOT a literal. `finished-today.tsx`
 * hard-codes `"band"` and gets away with it because only one league has a
 * gradient; two of these on one screen (the next-up card and, later, a club
 * header) would resolve `url(#…)` to whichever mounted first.
 */
import { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

export interface WashStop {
  /** 0–1 */
  offset: number;
  color: string;
  /**
   * 0–1, default 1. ⚠ The ONLY way to get a translucent stop: `react-native-svg`
   * ignores the alpha channel of an `rgba()` `stopColor` and paints it opaque —
   * the News lead's scrim shipped as a black slab over the picture that way.
   */
  opacity?: number;
}

export interface WashGradientProps {
  stops: readonly WashStop[];
  /** `diagonal`: top-left → bottom-right. `vertical`: top → bottom. */
  angle: 'diagonal' | 'vertical';
}

const VECTOR = {
  diagonal: { x1: '0', y1: '0', x2: '1', y2: '1' },
  vertical: { x1: '0', y1: '0', x2: '0', y2: '1' },
} as const;

export function WashGradient({ stops, angle }: WashGradientProps) {
  // `useId` yields `:r1:` — legal in an SVG id but not in a `url()` reference
  // on every renderer, so the colons are stripped.
  const id = `wash-${useId().replace(/:/g, '')}`;
  const v = VECTOR[angle];
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false}>
      <Defs>
        <LinearGradient id={id} x1={v.x1} y1={v.y1} x2={v.x2} y2={v.y2}>
          {stops.map((s) => (
            <Stop
              key={`${s.offset}-${s.color}`}
              offset={s.offset}
              stopColor={s.color}
              stopOpacity={s.opacity ?? 1}
            />
          ))}
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
