/**
 * Starting XI slot geometry (ADR 0065).
 *
 * ⚠⚠ THE NUMBERS ARE THE DESIGN. A slot draws a `Size.xiToken` (46pt) token
 * with a ~19pt name caption under it — about 70pt tall. On the phone pitch
 * (361 × 424pt) that means two slots sharing a column need >= 16% of pitch
 * HEIGHT between them, and two on the same line need >= 19% of pitch WIDTH.
 * Every table below was measured against that rule in all eleven shapes, and
 * `spacingViolations()` re-checks it in the harness; nudging a row by "a couple
 * of percent" is how the centre-back's name lands on the keeper's number again.
 *
 * ⚠ The keeper sits at 89%, not 91–95%: his caption has to finish inside the
 * touchline, and 89% + 23 + 5 + 19 lands 2pt short of the bottom edge.
 *
 * ⚠ Slots are ordered BACK TO FRONT, keeper first. `reseat` in `lineup.ts`
 * depends on the LABELS, not the order — but the order is what the rail's
 * "first empty slot" walks, so a defender fills before a forward.
 *
 * ⚠ Nine tables are the handoff's (`handoff_squad-builder/formations.ts`),
 * verbatim. `4-3-2-1` and `3-4-2-1` are the web builder's two later additions
 * (`cronogol/components/starting-xi/geometry.ts`), derived here under the same
 * rule from rows the other tables already prove: the back four / back three of
 * `4-3-3` / `3-4-3`, and the AM pair + lone striker of `4-2-3-1`.
 *
 * ⚠ Label suffixes are LOAD-BEARING — `lineOf` reads the line off them. A wing
 * back is `LWB` (…B → defender) so a back five is five defenders; 3-5-2's wide
 * players are `LM`/`RM` so they read as midfield. Do not rename for looks.
 *
 * Pure: no React, no theme. Percentages only; the token size lives in `Size`.
 */

export type Line = 'gk' | 'def' | 'mid' | 'fwd';

export interface Slot {
  /** Position label shown inside an empty token: `LB`, `LCM`, `ST`. Protocol value — never translated. */
  label: string;
  /** Percent of pitch width, centre of the token. */
  x: number;
  /** Percent of pitch height, centre of the token. Attack is up. */
  y: number;
}

export const FORMATION_IDS = [
  '4-3-3',
  '4-2-3-1',
  '4-4-2',
  '4-1-4-1',
  '4-3-2-1',
  '4-5-1',
  '3-4-3',
  '3-5-2',
  '3-4-2-1',
  '5-3-2',
  '5-4-1',
] as const;

export type FormationId = (typeof FORMATION_IDS)[number];

export const DEFAULT_FORMATION: FormationId = '4-3-3';

export function isFormationId(value: unknown): value is FormationId {
  return typeof value === 'string' && (FORMATION_IDS as readonly string[]).includes(value);
}

function s(rows: readonly (readonly [string, number, number])[]): readonly Slot[] {
  return rows.map(([label, x, y]) => ({ label, x, y }));
}

// prettier-ignore
export const FORMATIONS: Record<FormationId, readonly Slot[]> = {
  '4-3-3':   s([['GK',50,89],['LB',13,67],['LCB',37,72],['RCB',63,72],['RB',87,67],['LCM',26,49],['CM',50,53],['RCM',74,49],['LW',17,25],['ST',50,17],['RW',83,25]]),
  '4-2-3-1': s([['GK',50,89],['LB',13,67],['LCB',37,72],['RCB',63,72],['RB',87,67],['LDM',35,53],['RDM',65,53],['LAM',16,34],['CAM',50,34],['RAM',84,34],['ST',50,15]]),
  '4-4-2':   s([['GK',50,89],['LB',13,67],['LCB',37,72],['RCB',63,72],['RB',87,67],['LM',13,48],['LCM',38,50],['RCM',62,50],['RM',87,48],['LST',36,22],['RST',64,22]]),
  '4-1-4-1': s([['GK',50,89],['LB',13,67],['LCB',37,72],['RCB',63,72],['RB',87,67],['DM',50,55],['LM',13,38],['LCM',38,38],['RCM',62,38],['RM',87,38],['ST',50,16]]),
  // Derived (web-only shape). Back four from 4-3-3, midfield three widened a
  // touch so the AM pair above has a clear column, AM pair + ST from 4-2-3-1.
  '4-3-2-1': s([['GK',50,89],['LB',13,67],['LCB',37,72],['RCB',63,72],['RB',87,67],['LCM',28,52],['CM',50,54],['RCM',72,52],['LAM',34,34],['RAM',66,34],['ST',50,15]]),
  '4-5-1':   s([['GK',50,89],['LB',13,67],['LCB',37,72],['RCB',63,72],['RB',87,67],['LM',10,50],['LCM',30,50],['CM',50,50],['RCM',70,50],['RM',90,50],['ST',50,16]]),
  '3-4-3':   s([['GK',50,89],['LCB',24,71],['CB',50,71],['RCB',76,71],['LM',12,50],['LCM',38,52],['RCM',62,52],['RM',88,50],['LW',17,25],['ST',50,17],['RW',83,25]]),
  '3-5-2':   s([['GK',50,89],['LCB',24,71],['CB',50,71],['RCB',76,71],['LM',10,50],['LCM',30,50],['CM',50,50],['RCM',70,50],['RM',90,50],['LST',36,22],['RST',64,22]]),
  // Derived (web-only shape). Back three + midfield four from 3-4-3, AM pair +
  // ST from 4-2-3-1.
  '3-4-2-1': s([['GK',50,89],['LCB',24,71],['CB',50,71],['RCB',76,71],['LM',12,50],['LCM',38,52],['RCM',62,52],['RM',88,50],['LAM',34,33],['RAM',66,33],['ST',50,15]]),
  '5-3-2':   s([['GK',50,89],['LWB',10,64],['LCB',30,72],['CB',50,72],['RCB',70,72],['RWB',90,64],['LCM',28,48],['CM',50,48],['RCM',72,48],['LST',36,22],['RST',64,22]]),
  '5-4-1':   s([['GK',50,89],['LWB',10,64],['LCB',30,72],['CB',50,72],['RCB',70,72],['RWB',90,64],['LM',13,46],['LCM',38,46],['RCM',62,46],['RM',87,46],['ST',50,16]]),
};

/** Every formation has exactly this many slots. */
export const SLOT_COUNT = 11;

/**
 * Which line a slot belongs to, read off its label — no second table to drift.
 * `GK` is the keeper, anything ending in `B` is a defender (LB, RCB, LWB),
 * anything ending in `M` a midfielder (CM, LDM, CAM), the rest forwards.
 */
export function lineOf(label: string): Line {
  if (label === 'GK') return 'gk';
  if (/B$/.test(label)) return 'def';
  if (/M$/.test(label)) return 'mid';
  return 'fwd';
}

/** The API's band → the builder's line. `SquadPosition` is already the line, upper-cased. */
export function lineOfPosition(position: 'GK' | 'DEF' | 'MID' | 'FWD'): Line {
  return position.toLowerCase() as Line;
}

/** A slot's centre in points, for a pitch box of `w × h`. The ONE projection — board and card both use it. */
export function slotCentre(slot: Slot, w: number, h: number): { x: number; y: number } {
  return { x: (slot.x / 100) * w, y: (slot.y / 100) * h };
}

/**
 * The spacing rule, as code, so the harness proves every table rather than a
 * reader trusting the docblock. Returns one string per violation; empty is good.
 *
 * "Share a column" = centres within `colTol` % horizontally; those need `minDy`
 * vertically. "Same line" = centres within `rowTol` % vertically; those need
 * `minDx` horizontally.
 */
export function spacingViolations(
  slots: readonly Slot[],
  { minDy = 16, minDx = 19, colTol = 12, rowTol = 8 } = {},
): string[] {
  const out: string[] = [];
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i];
      const b = slots[j];
      const dx = Math.abs(a.x - b.x);
      const dy = Math.abs(a.y - b.y);
      if (dx <= colTol && dy < minDy) out.push(`${a.label}/${b.label} share a column ${dy}% apart`);
      if (dy <= rowTol && dx < minDx) out.push(`${a.label}/${b.label} share a line ${dx}% apart`);
    }
  }
  return out;
}

/* ── Looks ───────────────────────────────────────────────────────────── */

export const LOOK_IDS = ['lines', 'turf', 'angled'] as const;
export type Look = (typeof LOOK_IDS)[number];
/** ⚠ Turf, like the web (product call 2026-08-22): green reads as a pitch at feed-thumbnail size. */
export const DEFAULT_LOOK: Look = 'turf';

export function isLook(value: unknown): value is Look {
  return typeof value === 'string' && (LOOK_IDS as readonly string[]).includes(value);
}
