/**
 * Starting XI slot geometry.
 *
 * ⚠⚠ THE NUMBERS ARE THE DESIGN. A slot draws a 46pt token with a ~19pt name
 * caption under it — about 70pt tall. On the phone pitch (361 × 424pt) that
 * means two slots sharing a column need >= 16% of pitch HEIGHT between them,
 * and two on the same line need >= 19% of pitch WIDTH. Every table below was
 * measured against that rule in all nine shapes; nudging a row by "a couple of
 * percent" is how the centre-back's name lands on the keeper's number again.
 *
 * ⚠ The keeper sits at 89%, not 91–95%: his caption has to finish inside the
 * touchline, and 89% + 23 + 5 + 19 lands 2pt short of the bottom edge.
 *
 * ⚠ Slots are ordered BACK TO FRONT, and `reseat` depends on it — changing
 * shape keeps the eleven players and re-seats them in this order, which is what
 * keeps a defender a defender across a 4-3-3 → 3-5-2 switch.
 */
export type Line = 'gk' | 'def' | 'mid' | 'fwd';

export interface Slot {
  /** Position label shown inside an empty token: `LB`, `LCM`, `ST`. */
  label: string;
  /** Percent of pitch width, centre of the token. */
  x: number;
  /** Percent of pitch height, centre of the token. */
  y: number;
}

export const FORMATIONS: Record<string, Slot[]> = {
  '4-3-3': s([['GK',50,89],['LB',13,67],['LCB',37,72],['RCB',63,72],['RB',87,67],['LCM',26,49],['CM',50,53],['RCM',74,49],['LW',17,25],['ST',50,17],['RW',83,25]]),
  '4-2-3-1': s([['GK',50,89],['LB',13,67],['LCB',37,72],['RCB',63,72],['RB',87,67],['LDM',35,53],['RDM',65,53],['LAM',16,34],['CAM',50,34],['RAM',84,34],['ST',50,15]]),
  '4-4-2': s([['GK',50,89],['LB',13,67],['LCB',37,72],['RCB',63,72],['RB',87,67],['LM',13,48],['LCM',38,50],['RCM',62,50],['RM',87,48],['LST',36,22],['RST',64,22]]),
  '4-1-4-1': s([['GK',50,89],['LB',13,67],['LCB',37,72],['RCB',63,72],['RB',87,67],['DM',50,55],['LM',13,38],['LCM',38,38],['RCM',62,38],['RM',87,38],['ST',50,16]]),
  '3-4-3': s([['GK',50,89],['LCB',24,71],['CB',50,71],['RCB',76,71],['LM',12,50],['LCM',38,52],['RCM',62,52],['RM',88,50],['LW',17,25],['ST',50,17],['RW',83,25]]),
  '3-5-2': s([['GK',50,89],['LCB',24,71],['CB',50,71],['RCB',76,71],['LM',10,50],['LCM',30,50],['CM',50,50],['RCM',70,50],['RM',90,50],['LST',36,22],['RST',64,22]]),
  '5-3-2': s([['GK',50,89],['LWB',10,64],['LCB',30,72],['CB',50,72],['RCB',70,72],['RWB',90,64],['LCM',28,48],['CM',50,48],['RCM',72,48],['LST',36,22],['RST',64,22]]),
  '5-4-1': s([['GK',50,89],['LWB',10,64],['LCB',30,72],['CB',50,72],['RCB',70,72],['RWB',90,64],['LM',13,46],['LCM',38,46],['RCM',62,46],['RM',87,46],['ST',50,16]]),
  '4-5-1': s([['GK',50,89],['LB',13,67],['LCB',37,72],['RCB',63,72],['RB',87,67],['LM',10,50],['LCM',30,50],['CM',50,50],['RCM',70,50],['RM',90,50],['ST',50,16]]),
};

function s(rows: [string, number, number][]): Slot[] {
  return rows.map(([label, x, y]) => ({ label, x, y }));
}

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

/**
 * Auto XI: fill each slot with the first unused squad player of that line, in
 * the squad's own published order.
 *
 * ⚠ Predictable, not clever. There is no rating in the data — the site lists
 * official league registrations and nothing else — so any "best XI" would be
 * invented. If the shape needs a fourth centre-back the squad does not have,
 * the slot takes the next unused player rather than staying empty: a visibly
 * wrong name is fixable in one tap, an empty slot on "Auto fill" reads as a
 * broken button.
 */
export function autoFill<T extends { number: number; line: Line }>(
  shape: string,
  squad: T[]
): Record<number, number> {
  const used: number[] = [];
  const out: Record<number, number> = {};
  FORMATIONS[shape].forEach((slot, i) => {
    const want = lineOf(slot.label);
    const pick =
      squad.find(p => p.line === want && !used.includes(p.number)) ??
      squad.find(p => !used.includes(p.number));
    if (pick) {
      used.push(pick.number);
      out[i] = pick.number;
    }
  });
  return out;
}

/** Keep the eleven, re-seat them on the new grid, back to front. */
export function reseat(from: string, to: string, placed: Record<number, number>): Record<number, number> {
  const players = FORMATIONS[from].map((_, i) => placed[i]).filter(n => n !== undefined);
  const next: Record<number, number> = {};
  players.forEach((n, i) => {
    if (i < FORMATIONS[to].length) next[i] = n;
  });
  return next;
}
