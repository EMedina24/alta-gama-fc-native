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
import { playerFamilyName } from '@/lib/cronogol/derive';

import type { FormationId, SlotId } from './slots';

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
  /**
   * Kept clear under the lowest slot so its ring and caption fit inside the
   * pitch (ADR 0075): `ring / 2` + `nameGap` + the tallest caption (~44).
   * ⚠ Measured, not derived — a taller caption means a bigger reserve.
   */
  captionReserve: 120,
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

/**
 * The name drawn on a token: the short form when the league gives one.
 *
 * ⚠ Falls back to the SURNAME half, not the whole string, for a league that
 * serves `"Surname, Given"` and no `shortName` — a token is shirt-sized, and a
 * caption reading `COTTO MARTINEZ, LUIS ALEJANDRO` would set at the smallest
 * step and still be clipped. Names without a comma are unchanged.
 */
export function tokenName(player: { name: string; shortName: string | null }): string {
  return player.shortName ?? playerFamilyName(player.name);
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

/**
 * The two letters on a player's orb (ADR 0213) — the handoff's rule: from the
 * short name when there is one, letters only; two or more words give the first
 * and last word's initials, one word its first two letters.
 *
 * ⚠ Reads `tokenName`, so a `"Surname, Given"` league with no short name uses
 * the surname — never the given name's initial off the end of the string.
 */
export function orbInitials(player: { name: string; shortName: string | null }): string {
  const words = tokenName(player)
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}]/gu, ''))
    .filter(Boolean);
  if (words.length === 0) return '?';
  const letters =
    words.length >= 2 ? `${words[0][0]}${words[words.length - 1][0]}` : words[0].slice(0, 2);
  return letters.toLocaleUpperCase();
}

export function clampTitle(title: string): string {
  return title.slice(0, TITLE_MAX);
}

/* ── The card's slots ────────────────────────────────────────────────── */

/** One slot on the card: its id and where its token's centre sits. */
export interface CardSlot {
  /** ⚠ Protocol value — the same ids as `slots.ts`; the harness asserts it. */
  id: SlotId;
  /** Percent of pitch width. */
  x: number;
  /** Percent of pitch height from the TOP (attack is up). */
  y: number;
}

function s(rows: readonly (readonly [SlotId, number, number])[]): readonly CardSlot[] {
  return rows.map(([id, x, y]) => ({ id, x, y }));
}

/**
 * The card's hand-measured tables (ADR 0065, kept by ADR 0213).
 *
 * ⚠⚠ THE NUMBERS ARE THE DESIGN. They were measured against a 46pt token with
 * a ~19pt caption on a 361 × 424 pitch — the ratios the 1080 card inherits:
 * two slots sharing a column need >= 16% of pitch HEIGHT between them, two on
 * one line >= 19% of pitch WIDTH, and `spacingViolations()` proves every
 * table in the harness. The live pitch's generated ladder does NOT fit here —
 * a four-band shape puts rows ~130 card units apart on the 1:1 card, against
 * the ~186 a ring plus its caption needs.
 *
 * ⚠ The keeper sits at 89%: his caption must finish inside the touchline.
 *
 * ⚠ Order is `FORMATION_SLOTS`' and 4-2-3-1 reads LM/AM/RM, like every other
 * table in the three repos (this one said LAM/CAM/RAM until ADR 0211).
 */
// prettier-ignore
export const CARD_SLOTS: Record<FormationId, readonly CardSlot[]> = {
  '4-3-3':   s([['GK',50,89],['LB',13,67],['LCB',37,72],['RCB',63,72],['RB',87,67],['LCM',26,49],['CM',50,53],['RCM',74,49],['LW',17,25],['ST',50,17],['RW',83,25]]),
  '4-2-3-1': s([['GK',50,89],['LB',13,67],['LCB',37,72],['RCB',63,72],['RB',87,67],['LDM',35,53],['RDM',65,53],['LM',16,34],['AM',50,34],['RM',84,34],['ST',50,15]]),
  '4-4-2':   s([['GK',50,89],['LB',13,67],['LCB',37,72],['RCB',63,72],['RB',87,67],['LM',13,48],['LCM',38,50],['RCM',62,50],['RM',87,48],['LST',36,22],['RST',64,22]]),
  '4-1-4-1': s([['GK',50,89],['LB',13,67],['LCB',37,72],['RCB',63,72],['RB',87,67],['DM',50,55],['LM',13,38],['LCM',38,38],['RCM',62,38],['RM',87,38],['ST',50,16]]),
  '4-3-2-1': s([['GK',50,89],['LB',13,67],['LCB',37,72],['RCB',63,72],['RB',87,67],['LCM',28,52],['CM',50,54],['RCM',72,52],['LAM',34,34],['RAM',66,34],['ST',50,15]]),
  '4-5-1':   s([['GK',50,89],['LB',13,67],['LCB',37,72],['RCB',63,72],['RB',87,67],['LM',10,50],['LCM',30,50],['CM',50,50],['RCM',70,50],['RM',90,50],['ST',50,16]]),
  '3-4-3':   s([['GK',50,89],['LCB',24,71],['CB',50,71],['RCB',76,71],['LM',12,50],['LCM',38,52],['RCM',62,52],['RM',88,50],['LW',17,25],['ST',50,17],['RW',83,25]]),
  '3-5-2':   s([['GK',50,89],['LCB',24,71],['CB',50,71],['RCB',76,71],['LM',10,50],['LCM',30,50],['CM',50,50],['RCM',70,50],['RM',90,50],['LST',36,22],['RST',64,22]]),
  '3-4-2-1': s([['GK',50,89],['LCB',24,71],['CB',50,71],['RCB',76,71],['LM',12,50],['LCM',38,52],['RCM',62,52],['RM',88,50],['LAM',34,33],['RAM',66,33],['ST',50,15]]),
  '5-3-2':   s([['GK',50,89],['LWB',10,64],['LCB',30,72],['CB',50,72],['RCB',70,72],['RWB',90,64],['LCM',28,48],['CM',50,48],['RCM',72,48],['LST',36,22],['RST',64,22]]),
  '5-4-1':   s([['GK',50,89],['LWB',10,64],['LCB',30,72],['CB',50,72],['RCB',70,72],['RWB',90,64],['LM',13,46],['LCM',38,46],['RCM',62,46],['RM',87,46],['ST',50,16]]),
};

/** A card slot's centre in points, for a pitch box of `w × h`. */
export function cardSlotCentre(slot: CardSlot, w: number, h: number): { x: number; y: number } {
  return { x: (slot.x / 100) * w, y: (slot.y / 100) * h };
}

/**
 * The spacing rule, as code, so the harness proves every table rather than a
 * reader trusting the docblock. One string per violation; empty is good.
 */
export function spacingViolations(
  slots: readonly CardSlot[],
  { minDy = 16, minDx = 19, colTol = 12, rowTol = 8 } = {},
): string[] {
  const out: string[] = [];
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i];
      const b = slots[j];
      const dx = Math.abs(a.x - b.x);
      const dy = Math.abs(a.y - b.y);
      if (dx <= colTol && dy < minDy) out.push(`${a.id}/${b.id} share a column ${dy}% apart`);
      if (dy <= rowTol && dx < minDx) out.push(`${a.id}/${b.id} share a line ${dx}% apart`);
    }
  }
  return out;
}
