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
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

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
  /**
   * `diagonal`: top-left → bottom-right. `vertical`: top → bottom.
   * `pair`: the 0087 two-club wash line — near-horizontal with a slight fall,
   * the mock's 100° drawn across a card-shaped box (`ClubWash2`).
   */
  angle: 'diagonal' | 'vertical' | 'pair';
}

const VECTOR = {
  diagonal: { x1: '0', y1: '0', x2: '1', y2: '1' },
  vertical: { x1: '0', y1: '0', x2: '0', y2: '1' },
  pair: { x1: '0', y1: '0.42', x2: '1', y2: '0.58' },
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

/**
 * The same fill, radial (ADR 0082) — the Clubs rail bubble's core, lit from
 * near the top so the crest reads as floating on the club's own colour.
 *
 * ⚠ **Not the old `Glow`.** That atom was the app icon's floodlight — a
 * `ThemeColor` key owning its own three stops — and left with onboarding's
 * floodlight look (ADR 0099). This one takes an arbitrary colour — a club's,
 * which is never a theme token — and the caller's stops.
 *
 * ⚠ The `stopOpacity` rule in `WashGradient`'s header applies here unchanged:
 * `react-native-svg` paints an `rgba()` `stopColor` opaque, so translucency is
 * `WashStop.opacity` and never the colour's alpha channel.
 *
 * `cx` / `cy` / `r` are fractions of the parent's box, as `Glow`'s are.
 * `rx` / `ry` make the pool ELLIPTICAL (ADR 0087's mesh and crown sheen are
 * both wider than tall); each defaults to `r`, so circular callers are
 * untouched.
 */
export interface WashRadialProps {
  stops: readonly WashStop[];
  cx?: number;
  cy?: number;
  r?: number;
  rx?: number;
  ry?: number;
}

export function WashRadial({ stops, cx = 0.5, cy = 0.5, r = 0.5, rx, ry }: WashRadialProps) {
  // As above: `useId` yields `:r1:`, and a colon is not legal in a `url()` ref.
  const id = `radial-${useId().replace(/:/g, '')}`;
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false}>
      <Defs>
        <RadialGradient
          id={id}
          cx={`${cx * 100}%`}
          cy={`${cy * 100}%`}
          rx={`${(rx ?? r) * 100}%`}
          ry={`${(ry ?? r) * 100}%`}>
          {stops.map((s) => (
            <Stop
              key={`${s.offset}-${s.color}`}
              offset={s.offset}
              stopColor={s.color}
              stopOpacity={s.opacity ?? 1}
            />
          ))}
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
