/**
 * One club's Starting XI, as a pure reducer (ADR 0211).
 *
 * ⚠⚠ **Placements are keyed SLOT ID → PERSON id** (`SquadPlayerView.id`),
 * never the shirt: shirt is `number | null` on the wire and a Premier League
 * squad can carry two players wearing one number. Slot ids are the protocol
 * values in `slots.ts` — the first builder keyed by slot INDEX, and
 * `migrate.ts` carries a stored v1 lineup across.
 *
 * ⚠ A player is in at most ONE place: a slot, a bench cell, or neither (the
 * pool — the rest of the squad, which is never stored). Every action below
 * lifts a player from wherever he is before it seats him.
 *
 * ⚠ The reducer returns an `effect` beside the state so a call site maps a
 * change to a haptic (and the pitch to its one-shot pop) without re-deriving
 * what happened. `null` means nothing changed.
 *
 * ⚠ Ids and timestamps come IN (`saveLineup`'s `id`/`savedAt`): the React
 * Compiler treats a reducer as pure, and `Date.now()` inside one is exactly
 * the impurity it assumes away.
 *
 * Pure: no React, no storage, no theme.
 */
import type { SquadPosition } from '@/lib/cronogol/types';

import { pitchSlots } from './pitch-geometry';
import {
  DEFAULT_FORMATION,
  FORMATION_SLOTS,
  SLOT_COUNT,
  bandOf,
  type FormationId,
  type SlotId,
} from './slots';

/** Slot id → person id. Sparse: a missing key is an empty slot. */
export type Placements = Readonly<Record<SlotId, string>>;

/** Seven, the handoff's and the web's — the most any league here names. */
export const BENCH_SIZE = 7;
/** Per club. The handoff's and the web's. */
export const MAX_LINEUPS = 5;

export interface SavedLineup {
  id: string;
  name: string;
  formation: FormationId;
  placements: Placements;
  bench: readonly string[];
  /** ISO. */
  savedAt: string;
}

/** One club's working XI, its bench, and its saved lineups. */
export interface ClubXi {
  formation: FormationId;
  placements: Placements;
  /** ≤ `BENCH_SIZE`, in the order they were benched. */
  bench: readonly string[];
  /** ≤ `MAX_LINEUPS`, newest first. */
  lineups: readonly SavedLineup[];
  /** The saved lineup last loaded or saved here — its card wears the ring. */
  loadedId: string | null;
  /** The export card's title; `null` = the default copy in the reader's language. */
  title: string | null;
}

export const EMPTY_CLUB: ClubXi = {
  formation: DEFAULT_FORMATION,
  placements: {},
  bench: [],
  lineups: [],
  loadedId: null,
  title: null,
};

/** What the reducer needs of the squad: who is in it, and each one's band. */
export type SquadIndex = ReadonlyMap<string, { position: SquadPosition }>;

export type XiAction =
  | { type: 'place'; slot: SlotId; id: string }
  | { type: 'toBench'; id: string }
  | { type: 'unplace'; id: string }
  | { type: 'mirror' }
  | { type: 'clear' }
  | { type: 'setFormation'; formation: FormationId }
  | { type: 'saveLineup'; id: string; name: string; savedAt: string }
  | { type: 'loadLineup'; id: string }
  | { type: 'deleteLineup'; id: string }
  | { type: 'prune' };

export type XiEffect =
  | 'placed'
  | 'swapped'
  | 'benched'
  | 'removed'
  | 'mirrored'
  | 'cleared'
  | 'reshaped'
  | 'saved'
  | 'loaded'
  | 'deleted'
  | null;

export type Whereabouts = { kind: 'slot'; slot: SlotId } | { kind: 'bench'; index: number } | null;

/** Where a player is: a slot, a bench cell, or nowhere (the pool). */
export function whereIs(state: Pick<ClubXi, 'placements' | 'bench'>, id: string): Whereabouts {
  for (const [slot, player] of Object.entries(state.placements)) {
    if (player === id) return { kind: 'slot', slot };
  }
  const index = state.bench.indexOf(id);
  return index >= 0 ? { kind: 'bench', index } : null;
}

export interface XiValidity {
  /** Placed players who resolve in the squad. */
  count: number;
  /** Eleven, and a keeper in goal — what Save asks for. */
  ready: boolean;
  /** Eleven, but the GK slot holds an outfielder. Only said at eleven. */
  noGk: boolean;
}

/**
 * ⚠ Counts RESOLVED players, not keys: a stored id whose player has left the
 * squad is not a player on the pitch, and eleven of them must not read
 * "Ready" (the prototype counted keys). An empty squad index — not loaded yet
 * — counts keys, so a cold start does not flash "0 of 11".
 */
export function validateXi(state: Pick<ClubXi, 'placements'>, squad: SquadIndex): XiValidity {
  const ids = Object.values(state.placements);
  const count = squad.size === 0 ? ids.length : ids.filter((id) => squad.has(id)).length;
  const keeper = state.placements.GK;
  const keeperIsGk = keeper !== undefined && squad.get(keeper)?.position === 'GK';
  const full = count === SLOT_COUNT;
  return { count, ready: full && keeperIsGk, noGk: full && !keeperIsGk };
}

function lift(state: ClubXi, id: string): { placements: Record<SlotId, string>; bench: string[] } {
  const placements: Record<SlotId, string> = {};
  for (const [slot, player] of Object.entries(state.placements)) {
    if (player !== id) placements[slot] = player;
  }
  return { placements, bench: state.bench.filter((player) => player !== id) };
}

/** Pitch and bench without anyone the squad no longer holds. */
function pruned(state: ClubXi, squad: SquadIndex): ClubXi {
  if (squad.size === 0) return state; // ⚠ Not loaded is not "everyone left".
  let changed = false;
  const placements: Record<SlotId, string> = {};
  for (const [slot, player] of Object.entries(state.placements)) {
    if (squad.has(player)) placements[slot] = player;
    else changed = true;
  }
  const bench = state.bench.filter((player) => squad.has(player));
  if (bench.length !== state.bench.length) changed = true;
  return changed ? { ...state, placements, bench } : state;
}

/**
 * Mirror left ↔ right within each row. A row of one — the keeper, a lone
 * pivot, a lone striker — maps onto itself. Rows come from the geometry, so
 * two bands can never be read as one.
 */
function mirrored(formation: FormationId, placements: Placements): Record<SlotId, string> {
  const rows = new Map<number, SlotId[]>();
  for (const slot of pitchSlots(formation)) {
    const row = rows.get(slot.row) ?? [];
    row.push(slot.id); // pitchSlots lists each row left to right
    rows.set(slot.row, row);
  }
  const next: Record<SlotId, string> = {};
  for (const row of rows.values()) {
    row.forEach((slot, i) => {
      const player = placements[row[row.length - 1 - i]];
      if (player !== undefined) next[slot] = player;
    });
  }
  return next;
}

/**
 * Re-seat onto a new shape:
 * 1. a player whose slot id exists in the new shape keeps it;
 * 2. the rest, in the old shape's order, take the first empty slot of their
 *    OWN band in the new one;
 * 3. whoever is still standing goes to the bench while it has room, then back
 *    to the pool.
 *
 * ⚠ Never across bands. The web spills a leftover into any empty slot, which
 * puts a winger at right midfield and says nothing; here he lands on the
 * bench, visible and one tap from wherever the reader wants him.
 */
function reshaped(state: ClubXi, to: FormationId): ClubXi {
  const newSlots = FORMATION_SLOTS[to];
  const placements: Record<SlotId, string> = {};
  const leftovers: { id: string; band: SquadPosition }[] = [];
  for (const slot of FORMATION_SLOTS[state.formation]) {
    const player = state.placements[slot];
    if (player === undefined) continue;
    if (newSlots.includes(slot)) placements[slot] = player;
    else leftovers.push({ id: player, band: bandOf(slot) });
  }
  const standing: string[] = [];
  for (const { id, band } of leftovers) {
    const seat = newSlots.find((slot) => bandOf(slot) === band && placements[slot] === undefined);
    if (seat) placements[seat] = id;
    else standing.push(id);
  }
  const bench = [...state.bench];
  for (const id of standing) {
    if (bench.length < BENCH_SIZE) bench.push(id);
  }
  return { ...state, formation: to, placements, bench };
}

function same<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function samePlacements(a: Placements, b: Placements): boolean {
  const ak = Object.keys(a);
  return ak.length === Object.keys(b).length && ak.every((k) => a[k] === b[k]);
}

export function reduceXi(
  current: ClubXi,
  action: XiAction,
  squad: SquadIndex,
): { state: ClubXi; effect: XiEffect } {
  // Departed players leave as part of whatever the reader just did — never in
  // an effect (the lint baseline) and never behind their back mid-render.
  const state = pruned(current, squad);
  const unchanged = { state, effect: null } as const;

  switch (action.type) {
    case 'place': {
      if (!FORMATION_SLOTS[state.formation].includes(action.slot)) return unchanged;
      if (state.placements[action.slot] === action.id) return unchanged;
      const from = whereIs(state, action.id);
      const occupant = state.placements[action.slot];
      const next = lift(state, action.id);
      next.placements[action.slot] = action.id;
      let effect: XiEffect = 'placed';
      if (occupant !== undefined) {
        if (from?.kind === 'slot') {
          next.placements[from.slot] = occupant;
          effect = 'swapped';
        } else if (from?.kind === 'bench') {
          // Into the cell he left, so the bench does not reshuffle under him.
          next.bench.splice(from.index, 0, occupant);
          effect = 'swapped';
        } else if (next.bench.length < BENCH_SIZE) {
          next.bench.push(occupant);
        }
        // else: back to the pool — the bench is full, and he is still in the squad.
      }
      return { state: { ...state, placements: next.placements, bench: next.bench }, effect };
    }

    case 'toBench': {
      if (state.bench.includes(action.id)) return unchanged;
      if (state.bench.length >= BENCH_SIZE) return unchanged;
      const next = lift(state, action.id);
      next.bench.push(action.id);
      return { state: { ...state, ...next }, effect: 'benched' };
    }

    case 'unplace': {
      if (whereIs(state, action.id) === null) return unchanged;
      return { state: { ...state, ...lift(state, action.id) }, effect: 'removed' };
    }

    case 'mirror': {
      if (Object.keys(state.placements).length === 0) return unchanged;
      const placements = mirrored(state.formation, state.placements);
      if (samePlacements(placements, state.placements)) return unchanged;
      return { state: { ...state, placements }, effect: 'mirrored' };
    }

    case 'clear': {
      if (Object.keys(state.placements).length === 0 && state.bench.length === 0) return unchanged;
      return { state: { ...state, placements: {}, bench: [], loadedId: null }, effect: 'cleared' };
    }

    case 'setFormation': {
      if (action.formation === state.formation) return unchanged;
      return { state: reshaped(state, action.formation), effect: 'reshaped' };
    }

    case 'saveLineup': {
      if (!validateXi(state, squad).ready) return unchanged;
      if (state.lineups.length >= MAX_LINEUPS) return unchanged;
      const lineup: SavedLineup = {
        id: action.id,
        name: action.name,
        formation: state.formation,
        placements: { ...state.placements },
        bench: [...state.bench],
        savedAt: action.savedAt,
      };
      return {
        state: { ...state, lineups: [lineup, ...state.lineups], loadedId: lineup.id },
        effect: 'saved',
      };
    }

    case 'loadLineup': {
      const lineup = state.lineups.find((l) => l.id === action.id);
      if (!lineup) return unchanged;
      // ⚠ The working copy drops a player who has left; the SAVED lineup is
      // never rewritten — it is still the reader's lineup, one short.
      const loaded = pruned(
        { ...state, formation: lineup.formation, placements: lineup.placements, bench: lineup.bench },
        squad,
      );
      if (
        state.loadedId === lineup.id &&
        state.formation === loaded.formation &&
        samePlacements(state.placements, loaded.placements) &&
        same(state.bench, loaded.bench)
      ) {
        return unchanged;
      }
      return { state: { ...loaded, loadedId: lineup.id }, effect: 'loaded' };
    }

    case 'deleteLineup': {
      if (!state.lineups.some((l) => l.id === action.id)) return unchanged;
      return {
        state: {
          ...state,
          lineups: state.lineups.filter((l) => l.id !== action.id),
          loadedId: state.loadedId === action.id ? null : state.loadedId,
        },
        effect: 'deleted',
      };
    }

    case 'prune':
      return unchanged;
  }
}

/** Two club states that would render and persist identically. */
export function sameClubXi(a: ClubXi, b: ClubXi): boolean {
  return (
    a === b ||
    (a.formation === b.formation &&
      a.loadedId === b.loadedId &&
      a.title === b.title &&
      samePlacements(a.placements, b.placements) &&
      same(a.bench, b.bench) &&
      same(a.lineups, b.lineups))
  );
}
