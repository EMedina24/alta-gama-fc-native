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
