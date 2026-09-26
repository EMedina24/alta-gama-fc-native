/**
 * The Starting XI blob as stored — parsed, validated, and carried forward from
 * v1 (ADR 0211).
 *
 * Lives beside the reducer rather than in `store/starting-xi.ts` so the
 * harness can run it without AsyncStorage: every rule about what a stored
 * byte may become is here, and the store only reads, writes and emits.
 *
 * ⚠⚠ **A v1 payload is MIGRATED, never dropped.** Version 1 (ADR 0065) keyed
 * placements by slot INDEX 0–10 into a formation table whose order is exactly
 * `FORMATION_SLOTS`' — keeper first, deepest band first, each band left to
 * right — so index `i` IS `V1_LABELS[formation][i]`. The one rename is
 * 4-2-3-1's `LAM/CAM/RAM` → `LM/AM/RM`, the spelling the web app and the
 * backend already use. ⚠ ONLY for 4-2-3-1: 4-3-2-1 and 3-4-2-1 really do
 * seat a `LAM` and a `RAM`, and a global rename would orphan them.
 *
 * ⚠ `V1_LABELS` is FROZEN. It is what v1 meant, not what the formations are
 * now; it must never be "kept in step" with `slots.ts`.
 *
 * ⚠ Everything is re-validated on the way in, whatever the version: a slot id
 * the formation lacks, a player seated twice, an eighth on the bench, a sixth
 * lineup — each drops silently, and what is left is a state the pitch can draw.
 */
import { TITLE_MAX } from './card-geometry';
import { DEFAULT_FORMATION, FORMATION_SLOTS, isFormationId, type FormationId, type SlotId } from './slots';
import {
  BENCH_SIZE,
  EMPTY_CLUB,
  MAX_LINEUPS,
  type ClubXi,
  type Placements,
  type SavedLineup,
} from './xi-state';

export const SCHEMA_VERSION = 2;

export type StatsMode = 'season' | 'recent';

/** How the reader last left the pitch — one set, whichever club. */
export interface XiView {
  statsMode: StatsMode;
  /** The flat (top-down) view, or the 3D one. Flat is the handoff's default. */
  flat: boolean;
  /** Flat view's orientation — Flip turns it end for end. */
  flatRot: 0 | 180;
  /** 3D camera, degrees. Unbounded spin; tilt clamped to `CAMERA`'s range. */
  rotZ: number;
  tiltX: number;
  benchOpen: boolean;
  /** A first player has been placed — the keeper slot stops pulsing. */
  onboarded: boolean;
  /** A first camera gesture has been made — the gesture hint retires. */
  gestured: boolean;
}

export const DEFAULT_VIEW: XiView = {
  statsMode: 'season',
  flat: true,
  flatRot: 0,
  rotZ: 0,
  tiltX: 34,
  benchOpen: false,
  onboarded: false,
  gestured: false,
};

export interface StoredXi {
  v: typeof SCHEMA_VERSION;
  /** The club the tab opens on. Written by a user action, never by an effect. */
  lastClub: string | null;
  clubs: Readonly<Record<string, ClubXi>>;
  view: XiView;
}

export const EMPTY_STORED: StoredXi = { v: SCHEMA_VERSION, lastClub: null, clubs: {}, view: DEFAULT_VIEW };

/** ⚠ FROZEN — v1's formation tables, label by index. See the header. */
// prettier-ignore
export const V1_LABELS: Readonly<Record<FormationId, readonly string[]>> = {
  '4-3-3':   ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LCM', 'CM', 'RCM', 'LW', 'ST', 'RW'],
  '4-2-3-1': ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LDM', 'RDM', 'LAM', 'CAM', 'RAM', 'ST'],
  '4-4-2':   ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LM', 'LCM', 'RCM', 'RM', 'LST', 'RST'],
  '4-1-4-1': ['GK', 'LB', 'LCB', 'RCB', 'RB', 'DM', 'LM', 'LCM', 'RCM', 'RM', 'ST'],
  '4-3-2-1': ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LCM', 'CM', 'RCM', 'LAM', 'RAM', 'ST'],
  '4-5-1':   ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LM', 'LCM', 'CM', 'RCM', 'RM', 'ST'],
  '3-4-3':   ['GK', 'LCB', 'CB', 'RCB', 'LM', 'LCM', 'RCM', 'RM', 'LW', 'ST', 'RW'],
  '3-5-2':   ['GK', 'LCB', 'CB', 'RCB', 'LM', 'LCM', 'CM', 'RCM', 'RM', 'LST', 'RST'],
  '3-4-2-1': ['GK', 'LCB', 'CB', 'RCB', 'LM', 'LCM', 'RCM', 'RM', 'LAM', 'RAM', 'ST'],
  '5-3-2':   ['GK', 'LWB', 'LCB', 'CB', 'RCB', 'RWB', 'LCM', 'CM', 'RCM', 'LST', 'RST'],
  '5-4-1':   ['GK', 'LWB', 'LCB', 'CB', 'RCB', 'RWB', 'LM', 'LCM', 'RCM', 'RM', 'ST'],
};

/** v1 → v2 slot renames, per formation. ⚠ One formation, on purpose. */
const V1_RENAMES: Partial<Record<FormationId, Readonly<Record<string, SlotId>>>> = {
  '4-2-3-1': { LAM: 'LM', CAM: 'AM', RAM: 'RM' },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isId = (value: unknown): value is string => typeof value === 'string' && value !== '';

function readTitle(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.slice(0, TITLE_MAX).trim();
  return clean === '' ? null : clean;
}

/**
 * Placements and a bench, rebuilt against a formation: a slot the shape lacks,
 * a player seated twice, an eighth on the bench — each drops.
 */
function readSeating(
  formation: FormationId,
  placements: unknown,
  bench: unknown,
): { placements: Placements; bench: readonly string[] } {
  const slots = FORMATION_SLOTS[formation];
  const taken = new Set<string>();
  const seated: Record<SlotId, string> = {};
  if (isRecord(placements)) {
    // In the formation's own order, so which duplicate wins is deterministic.
    for (const slot of slots) {
      const player = placements[slot];
      if (!isId(player) || taken.has(player)) continue;
      seated[slot] = player;
      taken.add(player);
    }
  }
  const benched: string[] = [];
  if (Array.isArray(bench)) {
    for (const player of bench) {
      if (benched.length >= BENCH_SIZE) break;
      if (!isId(player) || taken.has(player)) continue;
      benched.push(player);
      taken.add(player);
    }
  }
  return { placements: seated, bench: benched };
}

function readLineups(value: unknown): SavedLineup[] {
  if (!Array.isArray(value)) return [];
  const out: SavedLineup[] = [];
  const ids = new Set<string>();
  for (const entry of value) {
    if (out.length >= MAX_LINEUPS) break;
    if (!isRecord(entry)) continue;
    const { id, name, formation, savedAt } = entry;
    if (!isId(id) || ids.has(id) || typeof name !== 'string' || typeof savedAt !== 'string') continue;
    if (!isFormationId(formation)) continue;
    ids.add(id);
    out.push({ id, name, formation, savedAt, ...readSeating(formation, entry.placements, entry.bench) });
  }
  return out;
}

function readClub(value: unknown): ClubXi | null {
  if (!isRecord(value)) return null;
  const formation = isFormationId(value.formation) ? value.formation : DEFAULT_FORMATION;
  const lineups = readLineups(value.lineups);
  const loadedId = isId(value.loadedId) && lineups.some((l) => l.id === value.loadedId) ? value.loadedId : null;
  return {
    formation,
    ...readSeating(formation, value.placements, value.bench),
    lineups,
    loadedId,
    title: readTitle(value.title),
  };
}

function readView(value: unknown): XiView {
  if (!isRecord(value)) return DEFAULT_VIEW;
  const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  return {
    statsMode: value.statsMode === 'recent' ? 'recent' : 'season',
    flat: typeof value.flat === 'boolean' ? value.flat : DEFAULT_VIEW.flat,
    flatRot: value.flatRot === 180 ? 180 : 0,
    // ⚠ Reduced to one turn: the spin is unbounded under a finger, and a
    // stored 7,200° would make Reset animate through twenty rotations.
    rotZ: finite(value.rotZ) ? ((value.rotZ % 360) + 360) % 360 : DEFAULT_VIEW.rotZ,
    // Clamped, not trusted: a stored 90 would be a pitch seen edge-on.
    tiltX: finite(value.tiltX) ? Math.min(64, Math.max(14, value.tiltX)) : DEFAULT_VIEW.tiltX,
    benchOpen: value.benchOpen === true,
    onboarded: value.onboarded === true,
    gestured: value.gestured === true,
  };
}

/** One v1 club: index-keyed placements, a look that no longer exists, a title. */
function migrateV1Club(value: unknown): ClubXi | null {
  if (!isRecord(value)) return null;
  const formation = isFormationId(value.formation) ? value.formation : DEFAULT_FORMATION;
  const labels = V1_LABELS[formation];
  const renames = V1_RENAMES[formation] ?? {};
  const bySlot: Record<string, string> = {};
  if (isRecord(value.placed)) {
    for (const [key, player] of Object.entries(value.placed)) {
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0 || index >= labels.length) continue;
      const label = labels[index];
      bySlot[renames[label] ?? label] = player as string;
    }
  }
  return {
    ...EMPTY_CLUB,
    formation,
    // `look` has no successor and is dropped; the title survives for the card.
    ...readSeating(formation, bySlot, []),
    title: readTitle(value.title),
  };
}

export interface ParsedXi {
  stored: StoredXi;
  /** True when the input was an older version — the store writes v2 back once. */
  migrated: boolean;
}

/** Whatever AsyncStorage held → a v2 state the app can draw. Never throws. */
export function parseStoredXi(raw: string | null): ParsedXi {
  if (!raw) return { stored: EMPTY_STORED, migrated: false };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { stored: EMPTY_STORED, migrated: false };
  }
  if (!isRecord(data)) return { stored: EMPTY_STORED, migrated: false };

  if (data.v === 1) {
    const clubs: Record<string, ClubXi> = {};
    if (isRecord(data.clubs)) {
      for (const [slug, value] of Object.entries(data.clubs)) {
        const club = migrateV1Club(value);
        if (club) clubs[slug] = club;
      }
    }
    // Someone who had built an XI has found the slots; do not pulse at them.
    const onboarded = Object.values(clubs).some((c) => Object.keys(c.placements).length > 0);
    return {
      stored: { v: SCHEMA_VERSION, lastClub: null, clubs, view: { ...DEFAULT_VIEW, onboarded } },
      migrated: true,
    };
  }

  if (data.v !== SCHEMA_VERSION) return { stored: EMPTY_STORED, migrated: false };
  const clubs: Record<string, ClubXi> = {};
  if (isRecord(data.clubs)) {
    for (const [slug, value] of Object.entries(data.clubs)) {
      const club = readClub(value);
      if (club) clubs[slug] = club;
    }
  }
  return {
    stored: {
      v: SCHEMA_VERSION,
      lastClub: isId(data.lastClub) ? data.lastClub : null,
      clubs,
      view: readView(data.view),
    },
    migrated: false,
  };
}
