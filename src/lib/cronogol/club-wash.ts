/**
 * The club-colour wash (ADR 0068): from a club's raw `colorPrimary` /
 * `colorSecondary` to a colour that can sit behind white text on the dark
 * ground.
 *
 * ⚠ **Pure, no native import** — proven in a plain-JS harness (14 assertions)
 * before it reached a screen, the same way `board.ts` and `live.ts` were. Keep
 * it that way.
 *
 * ⚠ NOT in `derive.ts`: that file is a verbatim port of `cronogol`'s and must
 * stay mirrorable (ADR 0018). Nothing here exists on the web.
 *
 * The rule, in order:
 *  1. Parse the hex. Garbage, null, and 4/8-digit forms are "unusable".
 *  2. A near-white or near-black primary (`ClubWash.extreme*`) is unusable too —
 *     it would paint a white or an invisible wash. Try the secondary.
 *  3. Nothing usable on this side → `tameClubColor` returns null and the caller
 *     decides: `clubWash` hands back graphite, `pairWash` returns null only when
 *     BOTH sides are null (a card with no colour at all renders exactly as today).
 *  4. A usable hue is clamped into one lightness band and given a floor of
 *     saturation so every club lands on the card with the same weight.
 */
import { ClubWash, Colors } from '@/constants/theme';

export interface Hsl {
  /** 0–360 */
  h: number;
  /** 0–100 */
  s: number;
  /** 0–100 */
  l: number;
}

/** Six- or three-digit `#rgb`, case-insensitive, with or without the hash. */
export function parseHex(hex: string | null | undefined): Hsl | null {
  if (typeof hex !== 'string') return null;
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let raw = m[1];
  if (raw.length === 3) raw = raw.split('').map((c) => c + c).join('');
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s: s * 100, l: l * 100 };
}

/** A hex the wash cannot use: unparseable, near-white, or near-black. */
export function isUnusable(hex: string | null | undefined): boolean {
  const c = parseHex(hex);
  return c === null || c.l > ClubWash.extremeHigh || c.l < ClubWash.extremeLow;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

/** The clamp itself, exposed for the harness. Returns an `hsl()` string. */
export function tameHsl({ h, s, l }: Hsl): string {
  const [bFrom, bTo] = ClubWash.brightHue;
  const bright = h >= bFrom && h <= bTo;
  const S = Math.max(s, ClubWash.satMin);
  const L = clamp(l, ClubWash.lightMin, bright ? ClubWash.lightMaxBright : ClubWash.lightMax);
  return `hsl(${Math.round(h)} ${Math.round(S)}% ${Math.round(L)}%)`;
}

/**
 * The club's wash colour, or null when neither hex is usable.
 *
 * ⚠ The secondary is a FALLBACK, not a blend: Barcelona (`#0f39b8` / `#bc161c`)
 * is blue, never purple.
 */
export function tameClubColor(
  primary: string | null | undefined,
  secondary: string | null | undefined,
): string | null {
  const src = !isUnusable(primary) ? primary : !isUnusable(secondary) ? secondary : null;
  const parsed = parseHex(src);
  return parsed ? tameHsl(parsed) : null;
}

/** As `tameClubColor`, but never null — graphite when the club has nothing usable. */
export function clubWash(
  primary: string | null | undefined,
  secondary: string | null | undefined,
): string {
  return tameClubColor(primary, secondary) ?? Colors.dark.washGraphite;
}

export interface WashSource {
  colorPrimary: string | null;
  colorSecondary: string | null;
}

export interface PairWash {
  home: string;
  away: string;
}

/**
 * The two-club diagonal's endpoints, or null when NEITHER side has a colour —
 * in which case the caller paints no wash and the card is today's card.
 *
 * ⚠ One side null (an opponent-only club, a Premier League club beside a LaLiga
 * one) still washes: that side is graphite and the other carries the card.
 */
export function pairWash(home: WashSource | null, away: WashSource | null): PairWash | null {
  const h = home ? tameClubColor(home.colorPrimary, home.colorSecondary) : null;
  const a = away ? tameClubColor(away.colorPrimary, away.colorSecondary) : null;
  if (h === null && a === null) return null;
  return { home: h ?? Colors.dark.washGraphite, away: a ?? Colors.dark.washGraphite };
}

/* ────────────────────────────────────────────────────────────────────────────
 * The club TINT (ADR 0082) — a second consumer of the selection rule above.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Clubs whose own colours the wash cannot use, and what the Clubs rail tints
 * them instead.
 *
 * ⚠ **Every Premier League and every Serie A club is in here, and that is most
 * of the reason the map exists.** `colorPrimary` is populated on all 20 LaLiga
 * and all 18 Bundesliga clubs and is `null` on all 40 of those — verified
 * against production 2026-08-31, the same gap ADR 0068 found a fortnight
 * earlier. Without the map, half the app's clubs draw a graphite bubble.
 *
 * ⚠ **The last five are a different failure and are not null at all.** Valencia
 * is `#000000` on both hexes, RB Leipzig and Stuttgart are `#FFFFFF` on both,
 * Frankfurt and Gladbach are black on both — colours that are *served* and
 * still unusable, because a pure black tint is invisible on a graphite bubble
 * and a pure white one paints over it. They reached graphite by a route the
 * "null league" framing does not describe, and they are five of the biggest
 * clubs in the app.
 *
 * ⚠ **`ceuta` is deliberately NOT here.** It has no colour, no crest and no
 * league config — it is the genuine "nothing is known about this club" case the
 * neutral bubble exists to draw. Adding it would leave that path untested.
 *
 * ⚠ **These are WASH SOURCES, not crest colours.** For a black- or white-kitted
 * side the entry is the SECONDARY: a near-black tint is invisible on a graphite
 * bubble, which is the whole point of tinting it. Fulham, Newcastle, Tottenham,
 * Juventus and Udinese are all here for that reason, and each is a *lifted*
 * grey rather than the kit's true white — see the assertion below.
 *
 * ⚠ **Every value must return `isUnusable === false`.** A near-white entry
 * paints a white bubble and a near-black one paints nothing; the harness asserts
 * this over the whole map so the check cannot be skipped for a club added later.
 * The handoff's own Fulham pick (`#d7dbdf`, L 86 %) fails it — that is not a
 * theoretical guard.
 *
 * ⚠ **Delete an entry the moment `/cronogol/teams` serves that club's colour.**
 * The API is the source; this is a stopgap that should shrink to nothing.
 */
const TINT_FALLBACK: Record<string, string> = {
  // Premier League
  arsenal: '#ef0107',
  'aston-villa': '#7a1142',
  bournemouth: '#da291c',
  brentford: '#e30613',
  'brighton-and-hove-albion': '#0057b8',
  chelsea: '#1f5fc2',
  'coventry-city': '#78d2f5',
  'crystal-palace': '#1b458f',
  everton: '#1a4fd6',
  fulham: '#c9ced3',
  'hull-city': '#f5a12c',
  'ipswich-town': '#3d6ab5',
  'leeds-united': '#1d428a',
  liverpool: '#c8102e',
  'manchester-city': '#6cabdd',
  'manchester-united': '#da291c',
  'newcastle-united': '#cfd3d6',
  'nottingham-forest': '#dd0000',
  sunderland: '#eb172b',
  'tottenham-hotspur': '#c8cdd4',
  // Serie A
  atalanta: '#1f5aa8',
  bologna: '#b01b2e',
  cagliari: '#b01e35',
  como: '#2059c4',
  fiorentina: '#7b2fbe',
  frosinone: '#f2c94c',
  genoa: '#b32127',
  inter: '#1f56c9',
  juventus: '#c2c7cd',
  lazio: '#87d8f7',
  lecce: '#f2c94c',
  milan: '#fb090b',
  monza: '#d0202d',
  napoli: '#12a0d7',
  parma: '#f5c73c',
  roma: '#a8202f',
  sassuolo: '#2fa84f',
  torino: '#8b1a1a',
  udinese: '#cbd0d6',
  venezia: '#1f8f5c',
  // ⚠ Colours ARE served for these five and are unusable anyway — see the
  // header. Each is the club's identifying colour, never its kit's black or
  // white: Valencia's amber, Leipzig's and Stuttgart's red, Frankfurt's red,
  // Gladbach's green.
  valencia: '#f18e00',
  'rb-leipzig': '#dd0741',
  'vfb-stuttgart': '#e32219',
  'eintracht-frankfurt': '#e1000f',
  'borussia-moenchengladbach': '#00a758',
};

/** Exposed for the harness, which asserts every entry is usable. */
export const TINT_FALLBACK_ENTRIES: readonly (readonly [string, string])[] =
  Object.entries(TINT_FALLBACK);

export interface TintSource {
  slug: string;
  colorPrimary: string | null;
  colorSecondary: string | null;
}

/**
 * The club's colour for the Clubs rail — the bubble's ring, its radial core and
 * its glow, and the browse row's tick (ADR 0082).
 *
 * Order: the API's primary, the API's secondary when the primary is near-black
 * or near-white, `TINT_FALLBACK`, graphite. Never null — the rail always draws
 * a bubble.
 *
 * ⚠⚠ **Deliberately NOT `clubWash`, and the difference is the lightness clamp.**
 * `tameHsl` pulls every hex into L 22–30 % because that colour goes BEHIND WHITE
 * TEXT and has to. This one sits behind a crest, next to a lime check, with
 * nothing legible on it — clamped, every bubble came out the same
 * graphite-with-a-hint and the rail lost the only thing it exists to show.
 *
 * ⚠ Returns a HEX, not the `hsl()` string `tameClubColor` returns, because every
 * caller composes it through `withAlpha`.
 */
export function clubTint(team: TintSource): string {
  if (!isUnusable(team.colorPrimary)) return team.colorPrimary as string;
  if (!isUnusable(team.colorSecondary)) return team.colorSecondary as string;
  return TINT_FALLBACK[team.slug] ?? Colors.dark.washGraphite;
}

/** True when `clubTint` fell all the way through — the rail draws its neutral bubble. */
export function isGraphite(tint: string): boolean {
  return tint === Colors.dark.washGraphite;
}

/**
 * `rgba()` from a hex and an alpha.
 *
 * ⚠ **Hex only.** An `hsl()` string — which is what `tameHsl` and
 * `tameClubColor` return — has no channels to read here and would parse as
 * `NaN`. Pair this with `clubTint`, never with `clubWash`.
 */
export function withAlpha(hex: string, alpha: number): string {
  const parsed = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!parsed) return hex;
  let raw = parsed[1];
  if (raw.length === 3) raw = raw.split('').map((c) => c + c).join('');
  const n = parseInt(raw, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
