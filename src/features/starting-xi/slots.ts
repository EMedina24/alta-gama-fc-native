/**
 * The eleven formations and the slot ids each one seats (ADR 0211).
 *
 * ⚠⚠ **A HAND-KEPT COPY OF TWO OTHER REPOSITORIES' CONSTANT.** The source of
 * truth is `SHAPES` in the web app's `components/starting-xi/geometry.ts`
 * (`cronogol`); the backend keeps its own copy in
 * `src/cronogol/ig-xi-formations.ts` (`senpai-backend`). The three share no
 * code, so `scripts/starting-xi-harness.mjs` diffs this file against both
 * whenever the sibling repos are checked out beside this one.
 *
 * ⚠⚠ **Slot ids are PROTOCOL VALUES — never translate, never tidy.** They are
 * the empty-slot labels, the keys a saved lineup is stored under, and the
 * names the backend's poster route pairs players with. This file's 4-2-3-1
 * reads `LM, AM, RM` — the three repositories' spelling. The app's first
 * builder called them `LAM, CAM, RAM`; `migrate.ts` renames a stored v1
 * lineup, and ONLY for that formation (4-3-2-1 and 3-4-2-1 really are
 * `LAM`/`RAM`).
 *
 * ⚠ **The suffix discipline is load-bearing.** `bandOf` reads a slot's line
 * off its id: `GK`; anything ending `B` defends (so a back five's wing-backs
 * are `LWB`/`RWB`); anything ending `M` is midfield (so 3-5-2's wide players
 * are `LM`/`RM`); the rest attack. A new id must keep it or a formation
 * switch re-seats a player in the wrong line.
 *
 * ⚠ **Order is the contract**: keeper first, then the bands DEEPEST first,
 * each band left to right. That is the web's emitted order and the backend's
 * wire order, and `FORMATION_SLOTS` is derived from the bands so the two
 * cannot drift inside this file.
 *
 * Pure: no React, no theme. Where a slot STANDS is `pitch-geometry.ts`'s
 * business (the live pitch) and `card-geometry.ts`'s (the export card).
 */
import type { SquadPosition } from '@/lib/cronogol/types';

export const FORMATION_IDS = [
  // Back four, most attacking first.
  '4-3-3',
  '4-2-3-1',
  '4-4-2',
  '4-1-4-1',
  '4-3-2-1',
  '4-5-1',
  // Back three.
  '3-4-3',
  '3-5-2',
  '3-4-2-1',
  // Back five.
  '5-3-2',
  '5-4-1',
] as const;

export type FormationId = (typeof FORMATION_IDS)[number];

/** A slot id — `GK`, `LCB`, `AM`… ⚠ Protocol value. */
export type SlotId = string;

export const DEFAULT_FORMATION: FormationId = '4-3-3';

export function isFormationId(value: unknown): value is FormationId {
  return typeof value === 'string' && (FORMATION_IDS as readonly string[]).includes(value);
}

/**
 * Outfield bands, deepest first, keeper implied — the web's `SHAPES`,
 * verbatim. A row of more than five has no lane table (`pitch-geometry.ts`)
 * and is not a formation anyone plays.
 */
// prettier-ignore
export const FORMATION_BANDS: Record<FormationId, readonly (readonly SlotId[])[]> = {
  '4-3-3':   [['LB', 'LCB', 'RCB', 'RB'], ['LCM', 'CM', 'RCM'], ['LW', 'ST', 'RW']],
  '4-2-3-1': [['LB', 'LCB', 'RCB', 'RB'], ['LDM', 'RDM'], ['LM', 'AM', 'RM'], ['ST']],
  '4-4-2':   [['LB', 'LCB', 'RCB', 'RB'], ['LM', 'LCM', 'RCM', 'RM'], ['LST', 'RST']],
  '4-1-4-1': [['LB', 'LCB', 'RCB', 'RB'], ['DM'], ['LM', 'LCM', 'RCM', 'RM'], ['ST']],
  '4-3-2-1': [['LB', 'LCB', 'RCB', 'RB'], ['LCM', 'CM', 'RCM'], ['LAM', 'RAM'], ['ST']],
  '4-5-1':   [['LB', 'LCB', 'RCB', 'RB'], ['LM', 'LCM', 'CM', 'RCM', 'RM'], ['ST']],
  '3-4-3':   [['LCB', 'CB', 'RCB'], ['LM', 'LCM', 'RCM', 'RM'], ['LW', 'ST', 'RW']],
  '3-5-2':   [['LCB', 'CB', 'RCB'], ['LM', 'LCM', 'CM', 'RCM', 'RM'], ['LST', 'RST']],
  '3-4-2-1': [['LCB', 'CB', 'RCB'], ['LM', 'LCM', 'RCM', 'RM'], ['LAM', 'RAM'], ['ST']],
  '5-3-2':   [['LWB', 'LCB', 'CB', 'RCB', 'RWB'], ['LCM', 'CM', 'RCM'], ['LST', 'RST']],
  '5-4-1':   [['LWB', 'LCB', 'CB', 'RCB', 'RWB'], ['LM', 'LCM', 'RCM', 'RM'], ['ST']],
};

/** Each formation's eleven slot ids — keeper first, deepest band first. */
export const FORMATION_SLOTS = {} as Record<FormationId, readonly SlotId[]>;
for (const id of FORMATION_IDS) FORMATION_SLOTS[id] = ['GK', ...FORMATION_BANDS[id].flat()];

/** Every formation has exactly this many slots. */
export const SLOT_COUNT = 11;

/** A slot's line, read off its id — no second table to drift. */
export function bandOf(slot: SlotId): SquadPosition {
  if (slot === 'GK') return 'GK';
  if (slot.endsWith('B')) return 'DEF';
  if (slot.endsWith('M')) return 'MID';
  return 'FWD';
}

/** The picker's bands, in the order its filter and sections read. */
export const BAND_ORDER: readonly SquadPosition[] = ['GK', 'DEF', 'MID', 'FWD'];

export function isSlotOf(formation: FormationId, slot: unknown): slot is SlotId {
  return typeof slot === 'string' && FORMATION_SLOTS[formation].includes(slot);
}
