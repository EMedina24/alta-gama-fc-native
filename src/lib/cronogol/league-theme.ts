/**
 * The per-league crown (ADR 0164, reshaped by ADR 0165): from a league's API
 * slug to the ramp, the mesh, the INK and the background art that screen wears.
 *
 * There are two crowns in this app and this file decides which one a screen gets:
 *
 *  - **bright** — the brand's `CrownGrad`, lime→teal, taking `onCrown`'s dark
 *    ink. Today, News, onboarding, and any competition with no `LeagueBand` row.
 *  - **deep** — a league's hue and saturation on `CrownDeep`'s dark lightness
 *    ladder, taking `onDeep`'s white ink. Every banded league.
 *
 * ⚠⚠ **`tone` ships with the stops, and that is the point of this file's shape.**
 * The ink is legal only for the ramp it was measured against, so the two may
 * never be decided separately — a league with no band row wears the BRAND ramp
 * and must keep DARK ink, which is exactly the case that breaks if a screen
 * derives ink from "do I have a league" instead of from the ramp it got back.
 * One call returns all of it (trap 72: if two pieces of state must agree,
 * compute one from the other).
 *
 * ⚠ ADR 0164's rule was the mirror of this one: hue-only, holding the BRIGHT
 * ladder's lightness, because that is what kept dark ink legal. It also rejected
 * the literal brand hex on measurement — white ink dies on the Bundesliga's
 * light red (`#FF404A`, 3.45). Clamping lightness DOWN is what rescued that case
 * and made the design in `handoff`'s mock viable across the catalogue; see
 * `CrownDeep`'s docblock for the numbers.
 *
 * ⚠ **Pure, no native import** — proven by `scripts/league-theme-harness.mjs`
 * before it reaches a screen, the same contract `club-wash.ts` keeps.
 *
 * ⚠ NOT in `derive.ts`: that file is a verbatim port of `cronogol`'s and must
 * stay mirrorable (ADR 0018). Nothing here exists on the web.
 */
import {
  CrownDeep,
  CrownDeepSat,
  CrownGrad,
  LeagueBand,
  Mesh,
  type LeagueBandSpec,
} from '@/constants/theme';
import { parseHex, type Hsl } from './club-wash';

/** A crown stop. Structurally the atom's `WashStop`, with `opacity` required. */
export interface CrownStop {
  offset: number;
  color: string;
  opacity: number;
}

/** A `Mesh` pool — one elliptical radial on the page ground. */
export interface MeshPool {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  color: string;
  alpha: number;
  fade: number;
}

/**
 * Which ink family the crown's head takes. `bright` → `onCrown*` (dark ink on
 * the brand's lime band); `deep` → `onDeep*` (white ink on a league's dark one).
 */
export type CrownTone = 'bright' | 'deep';

/** The background art a league's crown carries, or `null` for none. */
export type CrownArt = 'premier-league';

export interface CrownTheme {
  stops: readonly CrownStop[];
  pools: readonly MeshPool[];
  tone: CrownTone;
  /**
   * The bled crest (ADR 0165). ⚠ Only the Premier League has bundled silhouette
   * art; every other competition renders none, which is a known state rather
   * than a gap — `LeagueBand`'s own "absence is the fallback" rule (ADR 0062).
   */
  art: CrownArt | null;
}

/** `{h,s,l}` → `#rrggbb`. The inverse of `parseHex`, which is why it lives here. */
function toHex({ h, s, l }: Hsl): string {
  const H = ((h % 360) + 360) % 360;
  const S = s / 100;
  const L = l / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((H / 60) % 2) - 1));
  const m = L - c / 2;
  const [r, g, b] =
    H < 60 ? [c, x, 0]
    : H < 120 ? [x, c, 0]
    : H < 180 ? [0, c, x]
    : H < 240 ? [0, x, c]
    : H < 300 ? [x, 0, c]
    : [c, 0, x];
  return `#${[r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('')}`;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

/** One colour, re-hued — S and L, and therefore the ink's headroom, survive. */
function reHue(hex: string, hue: number): string {
  const parsed = parseHex(hex);
  return parsed ? toHex({ ...parsed, h: hue }) : hex;
}

/**
 * The hue and saturation a league paints with, or `null` for "wear the brand".
 *
 * ⚠⚠ **Keyed by `apiSlug`** (`laliga`), never our route `slug` (`la-liga`) —
 * trap 34 / ADR 0084. Pass the wrong one and LaLiga alone falls back to the
 * brand crown while the other leagues look perfect, which is how this class of
 * bug ships.
 *
 * ⚠ A gradient entry (Serie A) contributes its FIRST stop. The second is a
 * lighter tone of the same blue, so averaging buys nothing but a number nobody
 * can check against the band.
 *
 * ⚠ **Absence is the fallback, not a bug** (ADR 0062). `lpr-pro-clausura`,
 * `liga-nacional-apertura` and the UCL league phase (a competition, not a
 * league — ADR 0150 — with no band row at all) have none, so they wear the
 * brand crown and its dark ink.
 */
export function leagueInk(apiSlug: string | null | undefined): { h: number; s: number } | null {
  if (!apiSlug) return null;
  const band: LeagueBandSpec | undefined = LeagueBand[apiSlug as keyof typeof LeagueBand];
  if (!band) return null;
  const parsed = parseHex('solid' in band ? band.solid : band.gradient[0]);
  if (!parsed) return null;
  return { h: parsed.h, s: clamp(parsed.s, CrownDeepSat.min, CrownDeepSat.max) };
}

/** Back-compat alias for the hue alone — the harness and the gallery read it. */
export function leagueHue(apiSlug: string | null | undefined): number | null {
  return leagueInk(apiSlug)?.h ?? null;
}

/** Which competitions carry bundled silhouette art. See `CrownTheme.art`. */
const ART: Record<string, CrownArt> = { 'premier-league': 'premier-league' };

/**
 * Everything the crown needs for one competition.
 *
 * ⚠⚠ **The brand path returns the LITERAL `CrownGrad`/`Mesh` tables, by
 * reference**, and the harness asserts that identity. It is not a
 * micro-optimisation: the mesh's pools 2 and 3 are teal and blue-teal, so
 * round-tripping the brand through `reHue` at its own hue would turn every
 * league-less screen olive — Today, News, the club pages, onboarding.
 */
export function leagueCrownTheme(apiSlug: string | null | undefined): CrownTheme {
  const ink = leagueInk(apiSlug);
  if (ink === null) {
    return { stops: CrownGrad, pools: Mesh, tone: 'bright', art: null };
  }
  const stops = CrownDeep.map((stop) => ({
    offset: stop.offset,
    // ⚠ The last stop is `background` itself, held verbatim — see CrownDeep.
    color: 'ground' in stop ? CrownGrad[CrownGrad.length - 1].color : toHex({ ...ink, l: stop.light }),
    opacity: stop.opacity,
  }));
  return {
    stops,
    // The mesh keeps ADR 0164's hue-only rule: its pools are already dark, its
    // bright one sits behind the crown's opaque stops, and it is device-approved.
    pools: Mesh.map((pool) => ({ ...pool, color: reHue(pool.color, ink.h) })),
    tone: 'deep',
    art: ART[apiSlug as string] ?? null,
  };
}
