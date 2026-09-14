/**
 * The LaLiga glyph, as background art for the deep crown (ADR 0167) — the
 * second competition to carry one, on `PremierCrest`'s pattern (ADR 0165).
 *
 * ⚠ **Drawn, not loaded** — `premier-crest.tsx`'s rule: no SVG transformer is
 * configured, so the geometry lives here verbatim. The master is
 * `assets/images/LL.svg` (design source; no build step reads it, and nothing
 * `require`s it), itself the glyph subpaths of Wikimedia Commons'
 * `LaLiga 2023 Vertical Logo.svg` with the wordmark dropped.
 *
 * ⚠ **Bundled, where ADR 0159 says a league with a wire row should not be.**
 * The wire serves this league an `icon` and a `wordmark` through `logoUrls` —
 * both PNG, both sized for a chip. This is the flat glyph SILHOUETTE for use as
 * a full-bleed watermark: a different asset for a different job, the same
 * argument the PL crest and the UCL lockup (ADR 0133 §1) already made. It does
 * not replace the wire artwork, and the banner's trigger still draws that.
 *
 * ⚠ **Two departures from the master's path data, both deliberate and both in
 * `LL.svg` too, so master and code stay byte-identical.** The second subpath's
 * relative start (`m375.4 0`, legal only after the first subpath's `Z`) is made
 * absolute so the paths can render independently; and its arc of radius
 * 689654.91 — a straight line to within 0.02 units over its 347-unit chord — IS
 * the straight line, rather than betting a native arc parser's float precision
 * on a radius six orders larger than the canvas.
 *
 * ⚠ **Landscape where the PL crest is portrait** (ratio ≈ 1.07 vs 0.78): at the
 * same drawn height this mark is ~40% wider, so the scaffold sizes it by its
 * own `CrownArt` row rather than reusing the crest's numbers.
 *
 * ⚠ No `fillRule` — unlike the PL crest's crown-and-lion, these two strokes
 * have no interior counters and do not overlap, so the default `nonzero` is
 * correct and `evenodd` would change nothing.
 *
 * ⚠ **The fade IS the fill** (ADR 0165): each path is filled with a vertical
 * gradient running to zero, so the foot dissolves inside one `Svg` — the BOTTOM
 * offers no edge to explain a cut, and the RIGHT edge is the physical screen
 * edge, where a cut always reads as intentional (ADR 0098).
 *
 * ⚠ Translucency rides `stopOpacity`, never an rgba stop colour (trap 42).
 *
 * ⚠ Decorative. The competition is named in the pill beside it, so this is
 * `accessible` false with no label — announcing it would say the name twice.
 */
import { useId } from 'react';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

/** The glyph subpaths' own bounding box — the master's viewBox. */
const BOX = { x: 145.23, y: 0, width: 830.35, height: 772.57 } as const;

/**
 * Landscape, and exported so a caller sizing the art off its height never
 * re-derives it — `PL_CREST_RATIO`'s contract.
 */
export const LALIGA_GLYPH_RATIO = BOX.width / BOX.height;

const PATHS = [
  'M381.89 0h200.97c-88.58 123.58-177.3 247.06-265.9 370.62 57.87.01 115.73-.01 173.6.02-88.14 44.36-176.28 88.72-264.44 133.05-5.97-9.45-13.34-17.92-19.91-26.95-13.51-17.79-27.03-35.57-40.54-53.36-13.22-17.53-20.5-39.43-20.44-61.39-.07-21.46 6.86-42.87 19.5-60.22C237.13 201.19 309.43 100.54 381.89 0Z',
  'M757.29 0h218.29c-144.31 205.56-288.7 411.07-433.02 616.62 67.69.02 135.39-.02 203.08.02l-309.83 155.93c-22.49-29.88-45.44-59.42-68.12-89.16-5.29-6.63-9.99-13.75-13.56-21.45-11.96-25.23-12.41-55.47-1.54-81.14 5.95-14.77 16.43-26.96 25.2-40.06C504.31 360.52 630.69 180.18 757.29 0Z',
] as const;

export interface LaLigaGlyphProps {
  /** The drawn height in points; the width follows `LALIGA_GLYPH_RATIO`. */
  height: number;
  /** Peak opacity, at the top of the mark. It fades to nothing at the foot. */
  alpha?: number;
}

export function LaLigaGlyph({ height, alpha = 0.1 }: LaLigaGlyphProps) {
  // ⚠ `useId`, never a literal: two of these in one tree would resolve both
  // `url(#…)` fills to whichever mounted first (trap 40).
  const id = `laliga-glyph-${useId().replace(/:/g, '')}`;
  return (
    <Svg
      width={height * LALIGA_GLYPH_RATIO}
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
