/**
 * The export card's frame, in 1080 card units (ADR 0065).
 *
 * ⚠ These are the web card's numbers (`cronogol/components/starting-xi/geometry.ts`)
 * so a card shared from the app and one from the site are the same object. The
 * on-screen preview and the off-screen capture both draw `LineupCard` at
 * `unit × scale`; the capture uses `scale = 1 / PixelRatio.get()` so the
 * rasterised PNG is a TRUE 1080 × H, never a screenshot of a 361pt pitch scaled
 * up.
 *
 * ⚠ `pitchHeight` is PINNED to the card height, never derived from the header:
 * the pitch must be the same size for a one-line and a two-line title.
 */
export const EXPORT_SIZE_IDS = ['4:5', '1:1', '9:16'] as const;
export type ExportSize = (typeof EXPORT_SIZE_IDS)[number];
/** ⚠ Not persisted, like the web — every visit opens on 4:5. */
export const DEFAULT_EXPORT_SIZE: ExportSize = '4:5';

export const EXPORT_SIZES: Record<ExportSize, { w: number; h: number; px: string }> = {
  '4:5': { w: 1080, h: 1350, px: '1080 × 1350' },
  '1:1': { w: 1080, h: 1080, px: '1080 × 1080' },
  '9:16': { w: 1080, h: 1920, px: '1080 × 1920' },
};

export const CARD = {
  w: 1080,
  padX: 56,
  padTop: 56,
  crest: 176,
  crestGap: 30,
  /** The club name over the title. */
  clubSize: 22,
  clubTracking: 4,
  /** The accent rule under the title. */
  ruleW: 70,
  ruleH: 3,
  labelSize: 22,
  labelTracking: 5,
  /** The Alta Gama mark, top-right. */
  mark: 96,
  /** Header block height reserved above the pitch. */
  headerH: 370,
  /** The distance from the card bottom to the pitch bottom (footer + gap). */
  footerReserve: 100,
  pitchRadius: 28,
  /** Formation pill. */
  pillW: 150,
  pillH: 56,
  pillSize: 26,
  footerSize: 20,
  footerTracking: 4,
  /** Player tokens. */
  ring: 132,
  ringStroke: 4,
  numeral: 48,
  badge: 44,
  badgeSize: 22,
  /** Position chip on an EMPTY slot. */
  chipH: 36,
  chipSize: 18,
  nameGap: 10,
  captionMax: 180,
} as const;

export const TITLE_MAX = 26;

export function pitchWidth(): number {
  return CARD.w - CARD.padX * 2;
}

/** ⚠ Pinned: `cardH − 470`. */
export function pitchHeight(cardH: number): number {
  return cardH - 470;
}

export function pitchTop(): number {
  return CARD.headerH;
}

/** Title steps down as it lengthens — 82 → 70 → 58 — rather than wrapping past two lines. */
export function titleSize(title: string): number {
  if (title.length <= 12) return 82;
  if (title.length <= 19) return 70;
  return 58;
}

/** Caption size steps down with name length: 26 → 22 → 19. */
export function nameSize(name: string): number {
  if (name.length <= 8) return 26;
  if (name.length <= 12) return 22;
  return 19;
}

/** The name drawn on a token: the short form when the league gives one. */
export function tokenName(player: { name: string; shortName: string | null }): string {
  return player.shortName ?? player.name;
}

/** Up to three initials for a token with no shirt and no portrait — never `0` or `—`. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function clampTitle(title: string): string {
  return title.slice(0, TITLE_MAX);
}
