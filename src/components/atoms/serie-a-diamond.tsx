/**
 * The Serie A diamond, as background art for the deep crown (ADR 0171) — on
 * `PremierCrest`/`LaLigaGlyph`'s pattern (ADR 0165/0167), cut from the wire's
 * OWN Serie A asset.
 *
 * ⚠ **Drawn, not loaded** — no SVG transformer is configured, so the geometry
 * lives here verbatim. The master is `assets/images/SA.svg` (design source; no
 * build step reads it, and nothing `require`s it): the two gradient-filled
 * paths of the wire's football-logos.cc lockup — the diamond's bright body,
 * whose own outline already carves the monogram figure, and the inner bottom
 * triangle. The wordmark, tricolor bar and navy facet paths are dropped:
 * white-as-bright is exactly how the mark reads on a dark ground, so the navy
 * parts ARE the crown showing through.
 *
 * ⚠ **The coordinates are BAKED, not verbatim — the one master where that was
 * forced.** The source pair shares `matrix(.44962 0 0 -.44962 …)`, and the
 * NEGATIVE y-scale means the Bundesliga's "dodge the transform via the
 * viewBox" trick cannot work (the mark would render upside down). Both paths
 * are purely polygonal (m/l/h/z), so applying the affine to every vertex is
 * exact — nothing was re-measured, only re-based.
 *
 * ⚠ Two disjoint shapes, no counters — no `fillRule`; the monogram is carved
 * by the body path's own boundary, not by winding.
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

/** The baked pair's own bounding box — the master's viewBox. */
const BOX = { x: 9.12, y: 4.55, width: 45.3, height: 52.54 } as const;

/**
 * Portrait-ish — between the crest and the starball — and exported so a caller
 * sizing the art off its height never re-derives it — `PL_CREST_RATIO`'s
 * contract.
 */
export const SERIE_A_DIAMOND_RATIO = BOX.width / BOX.height;

const PATHS = [
  'M25.51 4.55L9.12 42.73L22.99 42.73L31.77 19.56L35.56 29.57L30.77 29.57L27.51 38.18L38.82 38.18L40.54 42.73L54.42 42.73L38.02 4.55Z',
  'M22.99 42.73L31.77 57.09L40.54 42.73Z',
] as const;

export interface SerieADiamondProps {
  /** The drawn height in points; the width follows `SERIE_A_DIAMOND_RATIO`. */
  height: number;
  /** Peak opacity, at the top of the mark. It fades to nothing at the foot. */
  alpha?: number;
}

export function SerieADiamond({ height, alpha = 0.1 }: SerieADiamondProps) {
  // ⚠ `useId`, never a literal: two of these in one tree would resolve both
  // `url(#…)` fills to whichever mounted first (trap 40).
  const id = `serie-a-diamond-${useId().replace(/:/g, '')}`;
  return (
    <Svg
      width={height * SERIE_A_DIAMOND_RATIO}
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
