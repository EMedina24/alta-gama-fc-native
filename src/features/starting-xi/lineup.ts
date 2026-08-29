/**
 * The Starting XI builder's state, as a pure reducer (ADR 0065).
 *
 * ⚠⚠ Placements are keyed on the PERSON id (`SquadPlayerView.id`), NEVER the
 * shirt. Shirt is `number | null` on the wire and a Premier League squad can
 * carry two players wearing the same number. The handoff's `formations.ts`
 * keyed on shirt; that is the one thing deliberately not ported.
 *
 * ⚠ The reducer returns an `effect` beside the state so the screen can map a
 * state change to a haptic without re-deriving what happened. Haptics carry
 * the confirmation — the pitch is too small for motion to read as one.
 *
 * Semantics follow `handoff_squad-builder/STARTING-XI.md` §Interactions and
 * the interaction script in `Starting XI.dc.html`; `reseat` and `autoFill`
 * follow the web's `lineup.ts` (by band first, leftovers to the first empty),
 * not the handoff's positional re-seat — positional turns a defender into a
 * midfielder going 4-3-3 → 3-5-2.
 *
 * Pure: no React, no storage, no theme.
 */
import { FORMATIONS, lineOf, type FormationId, type Line } from './formations';

/** Slot index → player id. Sparse; a missing key is an empty slot. */
export type Placed = Readonly<Record<number, string>>;

/** What survives a relaunch. */
export interface Lineup {
  formation: FormationId;
  placed: Placed;
}

/** What does not: which slot is selected and how the rail is filtered. */
export interface Selection {
  slot: number | null;
  filter: Line | 'all';
}

export interface BuilderState extends Lineup, Selection {}

export interface SquadEntry {
  id: string;
  line: Line;
}

export type Effect = 'placed' | 'swapped' | 'removed' | 'cleared' | null;

export type Action =
  | { type: 'tapSlot'; slot: number }
  | { type: 'tapPlayer'; id: string; line: Line }
  | { type: 'remove'; slot: number }
  | { type: 'dropOn'; from: number; to: number }
  | { type: 'autoFill'; squad: readonly SquadEntry[] }
  | { type: 'setShape'; formation: FormationId }
  | { type: 'clear' }
  | { type: 'deselect' }
  | { type: 'prune'; ids: ReadonlySet<string> };

export const NO_SELECTION: Selection = { slot: null, filter: 'all' };

export function placedCount(placed: Placed): number {
  return Object.keys(placed).length;
}

export function isFull(placed: Placed): boolean {
  return placedCount(placed) === FORMATIONS['4-3-3'].length;
}

/** The slot a player currently occupies, or null. */
export function slotOf(placed: Placed, id: string): number | null {
  for (const key of Object.keys(placed)) {
    const i = Number(key);
    if (placed[i] === id) return i;
  }
  return null;
}

/**
 * The first empty slot of `line`, falling back to the first empty slot at all.
 * Walks back to front, which is the table order.
 */
export function nextEmptySlot(formation: FormationId, placed: Placed, line: Line): number | null {
  const slots = FORMATIONS[formation];
  const ownLine = slots.findIndex((s, i) => lineOf(s.label) === line && placed[i] === undefined);
  if (ownLine >= 0) return ownLine;
  const any = slots.findIndex((_, i) => placed[i] === undefined);
  return any >= 0 ? any : null;
}

/**
 * Auto XI: fill each EMPTY slot with the first unused squad player of that
 * line, in the squad's own order. Existing placements are kept.
 *
 * ⚠ Predictable, not clever. There is no rating in the data — the site lists
 * official league registrations and nothing else — so any "best XI" would be
 * invented. If the shape needs a fourth centre-back the squad does not have,
 * the slot takes the next unused player rather than staying empty: a visibly
 * wrong name is fixable in one tap, an empty slot on "Auto fill" reads as a
 * broken button.
 */
export function autoFill(
  formation: FormationId,
  placed: Placed,
  squad: readonly SquadEntry[],
): Placed {
  const used = new Set(Object.values(placed));
  const next: Record<number, string> = { ...placed };
  FORMATIONS[formation].forEach((slot, i) => {
    if (next[i] !== undefined) return;
    const want = lineOf(slot.label);
    // ⚠ The fallback skips keepers for an outfield slot: a midfielder at right
    // back is a wrong name, a goalkeeper there is a joke.
    const pick =
      squad.find((p) => p.line === want && !used.has(p.id)) ??
      squad.find((p) => p.line !== 'gk' && !used.has(p.id)) ??
      squad.find((p) => !used.has(p.id));
    if (pick) {
      used.add(pick.id);
      next[i] = pick.id;
    }
  });
  return next;
}

/**
 * Keep the eleven, re-seat them on the new grid: each player goes to the first
 * empty slot of the LINE he was in, then leftovers spill into whatever is empty
 * (in the old order). Slot labels carry the line, so `reseat` needs no squad.
 */
export function reseat(from: FormationId, to: FormationId, placed: Placed): Placed {
  const oldSlots = FORMATIONS[from];
  const newSlots = FORMATIONS[to];
  const players = oldSlots.flatMap((s, i) =>
    placed[i] === undefined ? [] : [{ id: placed[i], line: lineOf(s.label) }],
  );
  const next: Record<number, string> = {};
  const leftovers: string[] = [];
  for (const p of players) {
    const i = newSlots.findIndex((s, j) => lineOf(s.label) === p.line && next[j] === undefined);
    if (i >= 0) next[i] = p.id;
    else leftovers.push(p.id);
  }
  for (const id of leftovers) {
    const i = newSlots.findIndex((_, j) => next[j] === undefined);
    if (i < 0) break;
    next[i] = id;
  }
  return next;
}

function without(placed: Placed, id: string): Record<number, string> {
  const next: Record<number, string> = {};
  for (const key of Object.keys(placed)) {
    const i = Number(key);
    if (placed[i] !== id) next[i] = placed[i];
  }
  return next;
}

export function reduce(state: BuilderState, action: Action): { state: BuilderState; effect: Effect } {
  switch (action.type) {
    case 'tapSlot': {
      // Tapping the selected slot again deselects it; otherwise select and
      // filter the rail to that slot's line.
      if (state.slot === action.slot) return { state: { ...state, ...NO_SELECTION }, effect: null };
      const label = FORMATIONS[state.formation][action.slot]?.label;
      if (label === undefined) return { state, effect: null };
      return { state: { ...state, slot: action.slot, filter: lineOf(label) }, effect: null };
    }

    case 'tapPlayer': {
      // A player is never in two slots: lift him from wherever he is first.
      const lifted = without(state.placed, action.id);
      const target = state.slot ?? nextEmptySlot(state.formation, lifted, action.line);
      if (target === null) return { state, effect: null };
      const swapped = lifted[target] !== undefined;
      lifted[target] = action.id;
      return {
        state: { ...state, placed: lifted, ...NO_SELECTION },
        effect: swapped ? 'swapped' : 'placed',
      };
    }

    case 'remove': {
      if (state.placed[action.slot] === undefined) return { state: { ...state, ...NO_SELECTION }, effect: null };
      const next = { ...state.placed };
      delete next[action.slot];
      return { state: { ...state, placed: next, ...NO_SELECTION }, effect: 'removed' };
    }

    case 'dropOn': {
      // Drag a PLACED token onto a teammate to swap, or onto an empty slot to move.
      const { from, to } = action;
      const mover = state.placed[from];
      if (from === to || mover === undefined) return { state: { ...state, ...NO_SELECTION }, effect: null };
      const next = { ...state.placed };
      const other = next[to];
      next[to] = mover;
      if (other === undefined) delete next[from];
      else next[from] = other;
      return {
        state: { ...state, placed: next, ...NO_SELECTION },
        effect: other === undefined ? 'placed' : 'swapped',
      };
    }

    case 'autoFill':
      return {
        state: { ...state, placed: autoFill(state.formation, state.placed, action.squad), ...NO_SELECTION },
        effect: 'placed',
      };

    case 'setShape':
      if (action.formation === state.formation) return { state, effect: null };
      return {
        state: {
          ...state,
          formation: action.formation,
          placed: reseat(state.formation, action.formation, state.placed),
          ...NO_SELECTION,
        },
        effect: null,
      };

    case 'clear':
      return { state: { ...state, placed: {}, ...NO_SELECTION }, effect: 'cleared' };

    // Opening a sheet drops the slot selection, so the rail's filter goes with
    // it — a narrowed rail with nothing selected explains nothing.
    case 'deselect':
      return { state: { ...state, ...NO_SELECTION }, effect: null };

    case 'prune': {
      // A stored id that has left the club (transfer, deregistration). Drops
      // silently — there is nothing to say about a player who is no longer
      // registered.
      const next: Record<number, string> = {};
      let changed = false;
      for (const key of Object.keys(state.placed)) {
        const i = Number(key);
        if (action.ids.has(state.placed[i])) next[i] = state.placed[i];
        else changed = true;
      }
      return changed ? { state: { ...state, placed: next }, effect: null } : { state, effect: null };
    }
  }
}

/** The placements whose player is still in the squad — what the board draws even before a prune commits. */
export function visiblePlaced(placed: Placed, ids: ReadonlySet<string>): Placed {
  const next: Record<number, string> = {};
  for (const key of Object.keys(placed)) {
    const i = Number(key);
    if (ids.has(placed[i])) next[i] = placed[i];
  }
  return next;
}
