/**
 * Where a slot stands on the LIVE pitch (ADR 0213).
 *
 * The plane is 520 × 800 units, attack at the top — the handoff's world
 * (`handoff_lineup/xi-data.js`, `geometry()`), and since 2026-09-21 the web
 * creator's too. Formations are GENERATED onto a ladder, never hand-placed:
 *
 * - **x** comes from `LANES`, keyed by how many stand in the row, which is
 *   what makes a row flat and identically spaced in every shape.
 * - **y** is measured from the OWN goal: the keeper at 9, the deepest band at
 *   26, the attack at 90, the bands evenly between whatever their count.
 *
 * ⚠ **The export card does NOT use this.** It keeps the hand-measured table in
 * `card-geometry.ts`: on the 1:1 card a four-band ladder puts rows ~130 card
 * units apart against the ~186 a ring plus its caption needs (ADR 0075's
 * reserve was measured against that table). The two share slot IDS, and the
 * harness asserts they do.
 *
 * Pure: no React, no theme.
 */
import { FORMATION_BANDS, type FormationId, type SlotId } from './slots';

/** The plane, in units. The camera scales it; nothing here knows points. */
export const PLANE_W = 520;
export const PLANE_H = 800;

/** One flat row's x positions (percent of width), by how many stand in it. */
export const LANES: Readonly<Record<number, readonly number[]>> = {
  1: [50],
  2: [34, 66],
  3: [19, 50, 81],
  4: [12, 37, 63, 88],
  5: [9, 29.5, 50, 70.5, 91],
};

/** Percent of height from the own goal line. */
const GK_Y = 9;
const DEEP_Y = 26;
const ATTACK_Y = 90;

export interface PitchSlot {
  id: SlotId;
  /** Percent of plane width, centre of the slot. */
  x: number;
  /** Percent of plane height from the OWN goal (keeper 9, attack 90). */
  y: number;
  /** 0 for the keeper, then 1… deepest band first — the mirror's row key. */
  row: number;
  /** How many stand in this row — what the name pill's width is capped by. */
  rowSize: number;
}

/** The eleven, keeper first, in `FORMATION_SLOTS` order. */
export function pitchSlots(formation: FormationId): readonly PitchSlot[] {
  const bands = FORMATION_BANDS[formation];
  const step = bands.length > 1 ? (ATTACK_Y - DEEP_Y) / (bands.length - 1) : 0;
  const out: PitchSlot[] = [{ id: 'GK', x: 50, y: GK_Y, row: 0, rowSize: 1 }];
  bands.forEach((ids, b) => {
    const y = bands.length > 1 ? DEEP_Y + b * step : (DEEP_Y + ATTACK_Y) / 2;
    const lanes = LANES[ids.length];
    ids.forEach((id, i) => out.push({ id, x: lanes[i], y, row: b + 1, rowSize: ids.length }));
  });
  return out;
}

/** A slot's position in plane UNITS, top-down (attack at the top). */
export function toPlane(slot: { x: number; y: number }): { ux: number; uy: number } {
  return { ux: (slot.x / 100) * PLANE_W, uy: ((100 - slot.y) / 100) * PLANE_H };
}

/**
 * The gap between neighbours in a row of `rowSize`, in plane units — what a
 * name pill may occupy before it touches the next one. A lone slot gets the
 * full width (it has no neighbour).
 */
export function laneGap(rowSize: number): number {
  const lanes = LANES[rowSize];
  if (!lanes || lanes.length < 2) return PLANE_W;
  let gap = Infinity;
  for (let i = 1; i < lanes.length; i++) gap = Math.min(gap, lanes[i] - lanes[i - 1]);
  return (gap / 100) * PLANE_W;
}
