/**
 * The LPR flag ball, as background art for the deep crown (ADR 0173) — Puerto
 * Rico's watermark, on `PremierCrest`/`LaLigaGlyph`'s pattern (ADR 0165/0167),
 * cut from the wire's OWN LPR asset like the Serie A diamond before it.
 *
 * ⚠ **Drawn, not loaded** — no SVG transformer is configured, so the geometry
 * lives here verbatim. The master is `assets/images/PR.svg` (design source; no
 * build step reads it, and nothing `require`s it): the three COLOURED paths of
 * the wire's football-logos.cc mark — two red swirl pieces and the blue
 * triangle — with the white backing ellipse dropped. As one white silhouette
 * the pieces tile a near-solid disc, so the mark reads as a ball with the
 * swirl slits and the star — the PL shield's solidity, not the starball's
 * airiness, and correct for this mark.
 *
 * ⚠ **The star is a HOLE by winding**: an opposite-wound subpath inside the
 * triangle's own `d`, open under the default `nonzero` rule — so the
 * triangle's subpaths may never be split across `Path` elements (the UCL
 * starball's rule; each source path stays one element here).
 *
 * ⚠ **The viewBox passes through verbatim** — the swirl arcs make a sampled
 * crop box unreliable, which is `PL.svg`'s own rule for arc-heavy masters.
 *
 * ⚠ **The fade IS the fill** (ADR 0165): a vertical gradient running to zero,
 * so the foot dissolves inside one `Svg` and only the physical screen edge
 * hard-clips (ADR 0098).
 *
 * ⚠ Translucency rides `stopOpacity`, never an rgba stop colour (trap 42).
 *
 * ⚠ Decorative. The league is named in the pill beside it, so this is
 * `accessible` false with no label — announcing it would say the name twice.
 */
import { useId } from 'react';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

/** The master's own box, verbatim. */
const BOX = { x: 0, y: 0, width: 777.66, height: 788.97 } as const;

/**
 * Near-square, and exported so a caller sizing the art off its height never
 * re-derives it — `PL_CREST_RATIO`'s contract.
 */
export const PUERTO_RICO_BALL_RATIO = BOX.width / BOX.height;

const PATHS = [
  'M591.277 203.146a.273.273 0 0 0 .46-.28l-57.7-142.89a.557.558.872 0 1 .74-.72q22.91 9.95 47.08 25.06 49.59 31.01 84.51 75.98 34.67 44.65 54.09 97.4c14.75 40.04 22.68 81.21 25.19 123.61a.67.669-9.824 0 1-.48.68l-71.09 21.12a1.098 1.096-32.609 0 1-1.05-.23c-74.69-67.3-153.42-136.43-233.47-204.58q-82.38-70.13-172.11-146.07a.512.51 56.707 0 1 .18-.88q11.51-3.48 21.72-6.38 34.25-9.72 70.03-13.7c13.99-1.56 28.53-1.75 41.65-1.36q20.66.6 40.51 5.4a3.57 3.519 75.601 0 1 1.78 1.07q50.18 55.51 119.39 134.01 17.26 19.57 28.57 32.76M129.167 307.516a.175.175 0 0 0-.31-.15q-3.32 4.46-7.52 10.53-45.15 65.25-85.24 125.93a.254.251 58.137 0 1-.46-.11q-11.3-83.73 12.66-164.9 17.14-58.06 52.02-107.96c24.17-34.58 54.09-65.5 88.82-89.5a1.193 1.191-40.37 0 1 1.5.12l58.24 55.97a.974.957-64.148 0 1 .28.83l-78.26 541.27a.473.472 24.59 0 1-.78.29q-34.84-30.13-62.39-66.36c-17.08-22.45-31.98-48.88-41.77-76.11a4.804 4.793 43.109 0 1-.1-2.93q19.75-68.36 37.3-131.88 18.93-68.54 26.01-95.04',
  'M251.527 563.906a.447.449-7.941 0 1-.62-.47q12.86-95.78 24.79-180.62 21.85-155.35 24.44-174.51 1.99-14.76 3.44-23.55a.527.521-66.068 0 1 .84-.33l292.86 230.7a.734.729 42.076 0 1 .06 1.1q-.33.33-1.18.45-.75.11-1.27.36c-8.24 4.01-15.66 6.65-24.97 10.59-103.59 43.82-188.44 80.36-318.39 136.28m130.83-144.925q.048 0 .096.003a.296.243 61.919 0 1 .174.072l39.71 30.31a.29.289 22.495 0 0 .46-.19q.05-.4-.17-1.08-4.92-15.05-14.73-47.02a.911.898 63.499 0 1 .33-1.01l40.39-29.49a.338.337 26.935 0 0-.2-.61h-49.73a.703.693-8.382 0 1-.67-.49l-15.42-49.58a.129.242-9.391 0 0-.112-.146q-.048-.016-.097-.016-.048 0-.097.016a.129.242 9.428 0 0-.112.146l-15.452 49.57a.703.693 8.419 0 1-.67.489l-49.73-.032a.338.337-26.898 0 0-.2.61l40.37 29.516a.911.898-63.462 0 1 .33 1.01q-9.83 31.964-14.76 47.01-.22.68-.17 1.08a.29.289-22.458 0 0 .46.19l39.728-30.283a.296.243-61.882 0 1 .174-.072q.048-.003.097-.003',
  'M442.707 664.616a.23.227-47.949 0 0 .02.45l157.43 18.94a.304.303 29.555 0 1 .15.54q-55.48 43.4-122.06 61.94c-87.3 24.3-181.62 13.33-262.03-28.19a.512.511 21.294 0 1-.26-.59l21.05-78.02a1.104 1.113-.914 0 1 .74-.77q3.66-1.11 6.08-2.02 234.21-88.34 267.96-101.27 154.08-59.03 227.24-86.96a.412.409-4.915 0 1 .55.46q-6.82 34.23-18.65 66.13c-13.09 35.29-32.33 68.68-57.41 97.15a2.796 2.743-75.42 0 1-1.45.87z',
] as const;

export interface PuertoRicoBallProps {
  /** The drawn height in points; the width follows `PUERTO_RICO_BALL_RATIO`. */
  height: number;
  /** Peak opacity, at the top of the mark. It fades to nothing at the foot. */
  alpha?: number;
}

export function PuertoRicoBall({ height, alpha = 0.1 }: PuertoRicoBallProps) {
  // ⚠ `useId`, never a literal: two of these in one tree would resolve both
  // `url(#…)` fills to whichever mounted first (trap 40).
  const id = `puerto-rico-ball-${useId().replace(/:/g, '')}`;
  return (
    <Svg
      width={height * PUERTO_RICO_BALL_RATIO}
      height={height}
      viewBox={`${BOX.x} ${BOX.y} ${BOX.width} ${BOX.height}`}
      accessible={false}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset={0} stopColor="#ffffff" stopOpacity={alpha} />
          <Stop offset={0.55} stopColor="#ffffff" stopOpacity={alpha * 0.55} />
          <Stop offset={1} stopColor="#ffffff" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {PATHS.map((d, i) => (
        <Path key={i} d={d} fill={`url(#${id})`} />
      ))}
    </Svg>
  );
}
