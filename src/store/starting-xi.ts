/**
 * Per-club Starting XI state: formation, look, placements, card title (ADR 0065).
 *
 * ⚠ A SIBLING of `preferences.ts`, not a field in it. Preferences is one small
 * fixed record; this is unbounded and keyed by club, and a shape bump here must
 * never be able to touch `followed` (trap 24). Same mechanism otherwise:
 * AsyncStorage + `useSyncExternalStore`, one JSON blob, `parse()` re-validating
 * every field with explicit defaults, hydrated in `_layout.tsx` before the tree
 * renders.
 *
 * ⚠ Placements key on the PERSON id. A stored id that has since left the club
 * is dropped at render (`visiblePlaced`) and pruned on the next user action —
 * never in an effect (the lint baseline).
 *
 * ⚠ What is NOT stored: the ephemeral selection (`slot`, `filter`) and the
 * export size — both deliberately, matching the web (`cronogol/components/starting-xi/store.ts`).
 *
 * ⚠ Nothing here reaches the server. There is no lineup endpoint and none is
 * coming (`CRONOGOL-API.md` "No lineups").
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { clampTitle } from '@/features/starting-xi/card-geometry';
import {
  DEFAULT_FORMATION,
  DEFAULT_LOOK,
  SLOT_COUNT,
  isFormationId,
  isLook,
  type FormationId,
  type Look,
} from '@/features/starting-xi/formations';
import { reseat, type Placed } from '@/features/starting-xi/lineup';

/** ⚠ Renaming wipes every reader's saved XI. */
const STORAGE_KEY = 'altagama:starting-xi';
const SCHEMA_VERSION = 1;

export interface ClubLineup {
  formation: FormationId;
  look: Look;
  placed: Placed;
  /** The card title; `null` = the default copy in the reader's language. */
  title: string | null;
}

interface Stored {
  v: number;
  clubs: Record<string, ClubLineup>;
}

export const EMPTY_LINEUP: ClubLineup = {
  formation: DEFAULT_FORMATION,
  look: DEFAULT_LOOK,
  placed: {},
  title: null,
};

const DEFAULTS: Stored = { v: SCHEMA_VERSION, clubs: {} };

let snapshot: Stored = DEFAULTS;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function parsePlaced(raw: unknown): Placed {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<number, string> = {};
  const seen = new Set<string>();
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const i = Number(key);
    if (!Number.isInteger(i) || i < 0 || i >= SLOT_COUNT) continue;
    if (typeof value !== 'string' || value === '' || seen.has(value)) continue;
    seen.add(value);
    out[i] = value;
  }
  return out;
}

function parseClub(raw: unknown): ClubLineup | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<Record<keyof ClubLineup, unknown>>;
  return {
    formation: isFormationId(data.formation) ? data.formation : DEFAULT_FORMATION,
    look: isLook(data.look) ? data.look : DEFAULT_LOOK,
    placed: parsePlaced(data.placed),
    title: typeof data.title === 'string' && data.title.trim() ? clampTitle(data.title) : null,
  };
}

function parse(raw: string | null): Stored {
  if (!raw) return DEFAULTS;
  try {
    const data = JSON.parse(raw) as Partial<Stored>;
    const clubs: Record<string, ClubLineup> = {};
    if (data.clubs && typeof data.clubs === 'object') {
      for (const [slug, value] of Object.entries(data.clubs)) {
        const club = parseClub(value);
        if (club) clubs[slug] = club;
      }
    }
    return { v: SCHEMA_VERSION, clubs };
  } catch {
    return DEFAULTS;
  }
}

function samePlaced(a: Placed, b: Placed): boolean {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  return ak.length === bk.length && ak.every((k) => a[Number(k)] === b[Number(k)]);
}

function sameClub(a: ClubLineup, b: ClubLineup): boolean {
  return a.formation === b.formation && a.look === b.look && a.title === b.title && samePlaced(a.placed, b.placed);
}

function commit(slug: string, next: ClubLineup) {
  const prev = snapshot.clubs[slug] ?? EMPTY_LINEUP;
  if (sameClub(prev, next)) return;
  snapshot = { v: SCHEMA_VERSION, clubs: { ...snapshot.clubs, [slug]: next } };
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)).catch(() => {
    // Storage full or unavailable. The value still holds for this session.
  });
  emit();
}

export async function hydrateStartingXi(): Promise<void> {
  if (hydrated) return;
  try {
    snapshot = parse(await AsyncStorage.getItem(STORAGE_KEY));
  } catch {
    snapshot = DEFAULTS;
  }
  hydrated = true;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => snapshot;

/** The club's saved XI, or the empty default. Identity is stable while nothing changes. */
export function useClubLineup(slug: string): ClubLineup {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return stored.clubs[slug] ?? EMPTY_LINEUP;
}

export function getClubLineup(slug: string): ClubLineup {
  return snapshot.clubs[slug] ?? EMPTY_LINEUP;
}

/* ── writers ─────────────────────────────────────────────────────────────
   Module-level, like `preferences.ts`, so the sheets (which share no React
   state with the builder screen) can write and the screen re-renders under
   them through the store.
   ─────────────────────────────────────────────────────────────────────── */

export function commitLineup(slug: string, lineup: { formation: FormationId; placed: Placed }) {
  commit(slug, { ...getClubLineup(slug), ...lineup });
}

/** Changing shape keeps the eleven and re-seats them (`reseat`). */
export function setFormation(slug: string, formation: FormationId) {
  const current = getClubLineup(slug);
  if (current.formation === formation) return;
  commit(slug, { ...current, formation, placed: reseat(current.formation, formation, current.placed) });
}

export function setLook(slug: string, look: Look) {
  commit(slug, { ...getClubLineup(slug), look });
}

export function setTitle(slug: string, title: string | null) {
  const clean = title === null ? null : clampTitle(title).trim() || null;
  commit(slug, { ...getClubLineup(slug), title: clean });
}

export function clearLineup(slug: string) {
  commit(slug, { ...getClubLineup(slug), placed: {} });
}
