/**
 * The per-league crown (ADR 0164, reshaped by ADR 0165): from a league's API
 * slug to the ramp, the mesh, the INK and the background art that screen wears.
 *
 * There are two crowns in this app and this file decides which one a screen gets:
 *
 *  - **bright** — the brand's `CrownGrad`, lime→teal, taking `onCrown`'s dark
 *    ink. Today, News, onboarding, and any competition with no `LeagueBand` row.
 *  - **deep** — a league's hue and saturation on `CrownDeep`'s dark lightness
 *    ladder, taking `onDeep`'s white ink. Every banded league. A GRADIENT band
 *    (Serie A, LPR) interpolates hue and saturation down the ladder, top =
 *    `gradient[0]` (ADR 0172); lightness never interpolates — it is the ink
 *    contract.
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
  ClubScene,
  CrownClubDim,
  CrownDeep,
  CrownDeepSat,
  CrownGrad,
  LeagueBand,
  LeagueScene,
  Mesh,
  type LeagueBandSpec,
} from '@/constants/theme';
import { clubTint, isUnusable, parseHex, type Hsl, type TintSource } from './club-wash';

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
export type CrownArt =
  | 'premier-league'
  | 'laliga'
  | 'bundesliga'
  | 'champions-league'
  | 'serie-a'
  | 'liga-nacional-apertura'
  | 'lpr-pro-clausura';

export interface CrownTheme {
  stops: readonly CrownStop[];
  pools: readonly MeshPool[];
  tone: CrownTone;
  /**
   * The bled mark (ADR 0165/0167/0169/0170/0171). ⚠ Exactly the slugs in `ART`
   * have bundled silhouette art; every other competition renders none, which
   * is a known state rather than a gap — `LeagueBand`'s own "absence is the
   * fallback" rule (ADR 0062). Every banded competition carries one now.
   * ⚠ `segunda` shares LaLiga's RAMP (0062) but not its art: it is not in
   * `LEAGUES`, so no screen ever wears its crown.
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
 * bug ships. ⚠ One key is NOT an API slug: `champions-league` (ADR 0168), the
 * UCL's tab slug, because a competition has no API slug to key by — see
 * `LeagueBand`'s own docblock.
 *
 * ⚠ A gradient entry contributes its FIRST stop here — this function answers
 * "one representative ink" (`leagueHue`'s contract). The crown itself asks
 * `leagueInks` below and gets BOTH ends (ADR 0172); until then the first stop
 * was all the crown used, which is exactly the "weird combo" Ed reported on
 * Serie A: a vivid two-tone band rendered as one dull steel-blue ladder.
 *
 * ⚠ **Absence is the fallback, not a bug** (ADR 0062) — though as of ADR 0173
 * every competition in the catalogue is banded, so the fallback's remaining
 * jobs are `null` (Today, News, onboarding), unknown slugs, and whatever
 * league arrives next before its row does.
 */
export function leagueInk(apiSlug: string | null | undefined): { h: number; s: number } | null {
  return leagueInks(apiSlug)?.[0] ?? null;
}

/**
 * The one or two inks a league's band carries, each S pulled into the
 * `CrownDeepSat` window, or `null` for "wear the brand". Two entries means a
 * GRADIENT band (Serie A, LPR): `[0]` paints the TOP of the crown and `[1]`
 * the foot of the fade — `gradient[0]` = top is the convention Ed picked (ADR
 * 0172). ⚠ Clamping the ENDPOINTS is sufficient: the window is convex, so
 * every interpolated saturation lands inside it without a per-stop clamp.
 */
function leagueInks(
  apiSlug: string | null | undefined,
): [{ h: number; s: number }] | [{ h: number; s: number }, { h: number; s: number }] | null {
  if (!apiSlug) return null;
  const band: LeagueBandSpec | undefined = LeagueBand[apiSlug as keyof typeof LeagueBand];
  if (!band) return null;
  const clamped = (hex: string) => {
    const parsed = parseHex(hex);
    return parsed ? { h: parsed.h, s: clamp(parsed.s, CrownDeepSat.min, CrownDeepSat.max) } : null;
  };
  if ('solid' in band) {
    const ink = clamped(band.solid);
    return ink ? [ink] : null;
  }
  const from = clamped(band.gradient[0]);
  const to = clamped(band.gradient[1]);
  if (!from) return null;
  return to ? [from, to] : [from];
}

/** Back-compat alias for the hue alone — the harness and the gallery read it. */
export function leagueHue(apiSlug: string | null | undefined): number | null {
  return leagueInk(apiSlug)?.h ?? null;
}

/**
 * Hue interpolation along the SHORTEST arc — 350° → 10° passes through 0°,
 * never back around through 180°. The result is normalised to [0, 360).
 */
function lerpHue(from: number, to: number, t: number): number {
  const delta = ((to - from + 540) % 360) - 180;
  return (((from + delta * t) % 360) + 360) % 360;
}

/** Which competitions carry bundled silhouette art. See `CrownTheme.art`. */
const ART: Record<string, CrownArt> = {
  'premier-league': 'premier-league',
  laliga: 'laliga',
  bundesliga: 'bundesliga',
  'champions-league': 'champions-league',
  'serie-a': 'serie-a',
  'liga-nacional-apertura': 'liga-nacional-apertura',
  'lpr-pro-clausura': 'lpr-pro-clausura',
};

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
  const inks = leagueInks(apiSlug);
  if (inks === null) {
    return BRAND_THEME;
  }
  const [from, to = from] = inks;
  return deepTheme(from, to, ART[apiSlug as string] ?? null);
}

/**
 * A league's SCENE (ADR 0201) — the Medina kit's fixed background for the
 * league tabs: a dark `base` tint washed down the screen, a vivid `glow` pool
 * top-right, and the drawn `art` as the watermark's fallback.
 *
 * The KIT'S tint pair where it authored one (`LeagueScene.tints` — see its
 * docblock for the measurement and the Puerto Rico exception). Otherwise
 * derived: hue and saturation are `leagueInks`' — `LeagueBand` through
 * `CrownDeepSat`, the deep crown's own inputs — and a GRADIENT band gives the
 * base its first end and the glow its second (Puerto Rico's blue and red).
 * Lightness is `LeagueScene`'s.
 *
 * Null for no league, or a league with no band: the caller keeps the brand
 * crown there, exactly as `leagueCrownTheme` falls back.
 */
export interface SceneTheme {
  base: string;
  glow: string;
  art: CrownArt | null;
}

export function leagueSceneTheme(apiSlug: string | null | undefined): SceneTheme | null {
  const inks = leagueInks(apiSlug);
  if (inks === null) return null;
  const art = ART[apiSlug as string] ?? null;
  const kit = LeagueScene.tints[apiSlug as string];
  if (kit) return { base: kit.base, glow: kit.glow, art };
  const [from, to = from] = inks;
  return {
    base: toHex({ h: from.h, s: from.s, l: LeagueScene.base.light }),
    glow: toHex({ h: to.h, s: to.s, l: LeagueScene.glow.light }),
    art,
  };
}

/**
 * A CLUB's crown (ADR 0175) — the Board wearing the reader's picked club.
 *
 * The same `CrownDeep` ladder as a league's, off an arbitrary brand hex — the
 * ladder is hue-agnostic, which is the whole reason it exists (see the file
 * header). The caller passes `clubTint(team)`, so the primary → secondary →
 * fallback → graphite order stays `club-wash.ts`'s one rule in one place.
 *
 * ⚠ SOLID, never a primary+secondary gradient: most secondaries are white,
 * black or otherwise unusable (`clubTint`'s own finding), and the wash's
 * precedent holds — Barcelona is blue, never purple.
 *
 * ⚠ Graphite input takes the `CrownDeepSat` clamp like any hex — the sat floor
 * exists exactly because a desaturated crown "reads as a rendering fault", so
 * a colourless club wears a deliberate steel-blue rather than grey.
 *
 * ⚠ An unparseable hex returns the LITERAL brand tables, the same identity
 * contract as the no-league path — garbage in, brand out, provably.
 *
 * ⚠ `art` is always null here: a club's watermark is a REMOTE crest, which the
 * screen supplies as a node (`FadeOutImage`) — see `ScreenScaffold`'s
 * `crownOverride`. `CrownArt` keys name bundled drawings only.
 */
export function clubCrownTheme(hex: string): CrownTheme {
  const parsed = parseHex(hex);
  if (!parsed) return BRAND_THEME;
  const ink = { h: parsed.h, s: clamp(parsed.s, CrownDeepSat.min, CrownDeepSat.max) };
  return deepTheme(ink, ink, null, clubDim(ink.h));
}

/**
 * A CLUB's scene (ADR 0202) — the club page's fixed background: the club's
 * primary as the dark `base`, its SECONDARY as the `glow` where both are
 * usable (Barcelona: blue base, garnet glow — Ed's call, the kit's pairing,
 * over the club-wash "one colour" rule for this scene only).
 *
 * ⚠ The glow falls back to the base's own hue whenever the pair is not two
 * real colours — an unusable secondary (white, black, missing), or a primary
 * so unusable that `clubTint` already fell through to the secondary. A club
 * with nothing usable takes graphite for both, which the `CrownDeepSat` floor
 * turns into `clubCrownTheme`'s deliberate steel-blue.
 *
 * ⚠ The glow's lightness is scaled by `clubDim` — the high-luma pull-down the
 * club crown already uses — so a yellow secondary cannot blow out the head.
 */
export function clubSceneTheme(team: TintSource): { base: string; glow: string } {
  const primary = parseHex(clubTint(team));
  if (!primary) {
    // An unparseable hex (the wire is unvalidated): the page ground, no scene
    // colour at all — never a guess.
    const ground = CrownGrad[CrownGrad.length - 1].color;
    return { base: ground, glow: ground };
  }
  const twoColours = !isUnusable(team.colorPrimary) && !isUnusable(team.colorSecondary);
  const second = twoColours ? parseHex(team.colorSecondary as string) : null;
  const glowInk = second ?? primary;
  const sat = (s: number) => clamp(s, CrownDeepSat.min, CrownDeepSat.max);
  return {
    base: toHex({ h: primary.h, s: sat(primary.s), l: LeagueScene.base.light }),
    glow: toHex({
      h: glowInk.h,
      s: sat(glowInk.s),
      l: ClubScene.glow.light * clubDim(glowInk.h),
    }),
  };
}

/**
 * The lightness scale for a club hue — 1 outside `CrownClubDim`'s window,
 * piecewise-linear through its control points inside it. See the table's
 * docblock for why the league ladder alone cannot carry an arbitrary hex.
 */
function clubDim(hue: number): number {
  const h = ((hue % 360) + 360) % 360;
  const first = CrownClubDim[0];
  const last = CrownClubDim[CrownClubDim.length - 1];
  if (h <= first[0] || h >= last[0]) return 1;
  for (let i = 1; i < CrownClubDim.length; i += 1) {
    const [h1, s1] = CrownClubDim[i];
    if (h <= h1) {
      const [h0, s0] = CrownClubDim[i - 1];
      return s0 + ((s1 - s0) * (h - h0)) / (h1 - h0);
    }
  }
  return 1;
}

/** The brand's own crown — the LITERAL tables, by reference (see above). */
const BRAND_THEME: CrownTheme = { stops: CrownGrad, pools: Mesh, tone: 'bright', art: null };

/**
 * The deep crown, painted: one or two inks down the `CrownDeep` ladder, the
 * mesh re-hued to match. Shared by `leagueCrownTheme` and `clubCrownTheme` —
 * the geometry is identical, only where the ink comes from differs.
 */
function deepTheme(
  from: { h: number; s: number },
  to: { h: number; s: number },
  art: CrownArt | null,
  /** The club path's high-luma pull-down (`clubDim`); leagues stay at 1. */
  lightScale = 1,
): CrownTheme {
  /**
   * A gradient band interpolates hue and saturation DOWN the ladder (ADR
   * 0172): stop i sits at `t = offset / lastOpaqueOffset`, so the top stop is
   * pure `gradient[0]` and the last opaque stop pure `gradient[1]`. Lightness
   * and opacity are NEVER interpolated — the ladder is the ink contract, and
   * the harness rates both inks against whatever hue lands on stops 0 and 1.
   * A solid band degenerates to `to === from`, i.e. the pre-0172 output,
   * byte-identically.
   */
  const lastOpaque = CrownDeep[CrownDeep.length - 2].offset;
  const inkAt = (t: number) => ({
    h: lerpHue(from.h, to.h, t),
    s: from.s + (to.s - from.s) * t,
  });
  const stops = CrownDeep.map((stop) => ({
    offset: stop.offset,
    // ⚠ The last stop is `background` itself, held verbatim — see CrownDeep.
    color:
      'ground' in stop
        ? CrownGrad[CrownGrad.length - 1].color
        : toHex({ ...inkAt(stop.offset / lastOpaque), l: stop.light * lightScale }),
    opacity: stop.opacity,
  }));
  return {
    stops,
    // The mesh keeps ADR 0164's hue-only rule: its pools are already dark, its
    // bright one sits behind the crown's opaque stops, and it is device-approved.
    // A gradient band spreads its arc across the pools — pool i at t = i/(n-1).
    pools: Mesh.map((pool, i) => ({
      ...pool,
      color: reHue(pool.color, inkAt(Mesh.length > 1 ? i / (Mesh.length - 1) : 0).h),
    })),
    tone: 'deep',
    art,
  };
}
