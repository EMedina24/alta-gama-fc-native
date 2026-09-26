/**
 * The Starting XI builder's state (ADR 0211): every club's working XI, bench
 * and saved lineups, the club the tab opens on, and how the reader left the
 * pitch.
 *
 * ⚠ A SIBLING of `preferences.ts`, not a field in it. Preferences is one small
 * fixed record; this is unbounded and keyed by club, and a shape bump here must
 * never be able to touch `followed` (trap 24). Same mechanism otherwise:
 * AsyncStorage + `useSyncExternalStore`, one JSON blob, hydrated in
 * `_layout.tsx` before the tree renders.
 *
 * ⚠ Every rule about what a stored byte may become lives in
 * `features/starting-xi/migrate.ts` (pure, harnessed), and every rule about
 * what an action does in `features/starting-xi/xi-state.ts`. This file only
 * reads, writes and emits.
 *
 * ⚠ **One writer for the XI itself: `dispatchXi`.** The screen and every sheet
 * (the picker places a player, the card benches one, the lineups sheet loads
 * one) share no React state, so they all go through here and the screen
 * re-renders underneath them. Departed players are pruned INSIDE that user
 * action, never in an effect (the lint baseline).
 *
 * ⚠ Nothing here reaches the server. There is no lineup endpoint.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import {
  EMPTY_STORED,
  SCHEMA_VERSION,
  parseStoredXi,
  type StoredXi,
  type XiView,
} from '@/features/starting-xi/migrate';
import type { SlotId } from '@/features/starting-xi/slots';
import {
  EMPTY_CLUB,
  reduceXi,
  sameClubXi,
  type ClubXi,
  type SquadIndex,
  type XiAction,
  type XiEffect,
} from '@/features/starting-xi/xi-state';
import { TITLE_MAX } from '@/features/starting-xi/card-geometry';

/** ⚠ Renaming wipes every reader's saved XI. The v1 blob lived here too. */
const STORAGE_KEY = 'altagama:starting-xi';

/**
 * The last placement, for the pitch's one-shot pop and ripple (ADR 0217).
 * ⚠ Ephemeral and never persisted: a relaunch must not replay a placement.
 * `n` bumps on every event so two placements into one slot still read as two.
 */
export interface XiFx {
  slug: string;
  slots: readonly SlotId[];
  at: number;
  n: number;
}

let snapshot: StoredXi = EMPTY_STORED;
let fx: XiFx | null = null;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function persist() {
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)).catch(() => {
    // Storage full or unavailable. The value still holds for this session.
  });
}

function commit(next: StoredXi) {
  snapshot = next;
  persist();
  emit();
}

export async function hydrateStartingXi(): Promise<void> {
  if (hydrated) return;
  try {
    const parsed = parseStoredXi(await AsyncStorage.getItem(STORAGE_KEY));
    snapshot = parsed.stored;
    // A v1 blob is written forward once, so the migration never runs twice.
    if (parsed.migrated) persist();
  } catch {
    snapshot = EMPTY_STORED;
  }
  hydrated = true;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => snapshot;
const getFx = () => fx;

/* ── readers ─────────────────────────────────────────────────────────── */

/** A club's XI, or the empty default. Identity is stable while nothing changes. */
export function useClubXi(slug: string | null): ClubXi {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return (slug && stored.clubs[slug]) || EMPTY_CLUB;
}

export function getClubXi(slug: string): ClubXi {
  return snapshot.clubs[slug] ?? EMPTY_CLUB;
}

export function useXiView(): XiView {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot).view;
}

export function getXiView(): XiView {
  return snapshot.view;
}

export function useLastClub(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot).lastClub;
}

/** The last placement on THIS club's pitch, or null. */
export function useXiFx(slug: string | null): XiFx | null {
  const current = useSyncExternalStore(subscribe, getFx, getFx);
  return current && current.slug === slug ? current : null;
}

/* ── writers ─────────────────────────────────────────────────────────── */

/**
 * Apply one builder action to one club. Returns what happened, for the haptic.
 *
 * ⚠ Stamps `lastClub` — any edit is the reader choosing this club — and marks
 * `onboarded` on the first placement. Skips the write when nothing changed.
 */
export function dispatchXi(slug: string, action: XiAction, squad: SquadIndex): XiEffect {
  const prev = getClubXi(slug);
  const { state, effect } = reduceXi(prev, action, squad);
  const changed = !sameClubXi(prev, state);
  const placedNow = effect === 'placed' || effect === 'swapped';
  const view = placedNow && !snapshot.view.onboarded ? { ...snapshot.view, onboarded: true } : snapshot.view;
  if (!changed && snapshot.lastClub === slug && view === snapshot.view) return effect;

  if (placedNow && action.type === 'place') {
    const slots: SlotId[] = [action.slot];
    // A swap moves the occupant too — both ends land.
    for (const [slot, id] of Object.entries(state.placements)) {
      if (slot !== action.slot && prev.placements[slot] !== id && id !== undefined) slots.push(slot);
    }
    fx = { slug, slots, at: Date.now(), n: (fx?.n ?? 0) + 1 };
  }

  commit({
    ...snapshot,
    lastClub: slug,
    clubs: changed ? { ...snapshot.clubs, [slug]: state } : snapshot.clubs,
    view,
  });
  return effect;
}

/** The club the tab opens on. A reader's own pick or push — never an effect. */
export function setLastClub(slug: string): void {
  if (snapshot.lastClub === slug) return;
  commit({ ...snapshot, lastClub: slug });
}

export function setXiView(patch: Partial<XiView>): void {
  const next = { ...snapshot.view, ...patch };
  const keys = Object.keys(patch) as (keyof XiView)[];
  if (keys.every((key) => next[key] === snapshot.view[key])) return;
  commit({ ...snapshot, view: next });
}

/** The export card's title. Blank is the default copy. */
export function setXiTitle(slug: string, title: string | null): void {
  const clean = title === null ? null : title.slice(0, TITLE_MAX).trim() || null;
  const prev = getClubXi(slug);
  if (prev.title === clean) return;
  commit({ ...snapshot, clubs: { ...snapshot.clubs, [slug]: { ...prev, title: clean } } });
}

/** ⚠ Dev only: a v1 blob for `_debug/xi?seedV1=1`, read on the next launch. */
export async function seedV1ForDebug(raw: string): Promise<void> {
  if (!__DEV__) return;
  await AsyncStorage.setItem(STORAGE_KEY, raw);
}

export { SCHEMA_VERSION };
