/**
 * Getting `standings.json` onto disk and the timelines reloaded (ADR 0185).
 *
 * ⚠ Mirrors `features/news/sync.ts`: a trailing debounce plus a "did anything
 * actually change" guard. The re-arm runs on EVERY foreground; without the
 * guard each one would spend a WidgetKit reload (trap 34).
 *
 * ⚠ The order inside `applyStandingsSnapshot` is load-bearing, the news order:
 * crests are warmed BEFORE the snapshot is built, so `crestFile` names a file
 * on disk rather than a hoped-for download, and the prune runs AFTER the write.
 */
import { File } from 'expo-file-system';

import { groupContainer } from '@/features/app-group';
import { reloadWidgets } from '@/features/push/capability';
import { SNAPSHOT_DIR, writeGroupJson } from '@/features/widgets/snapshot';
import type { ClubCrestView } from '@/lib/cronogol/types';
import type { Copy } from '@/lib/i18n/copy';

import { pruneStandingsCrests, warmStandingsCrests } from './crests';
import {
  buildStandingsSnapshot,
  standingsSnapshotKey,
  type StandingsInputs,
  type StandingsSnapshot,
} from './snapshot';

const STANDINGS_NAME = 'standings.json';
const DEBOUNCE_MS = 1_000;

let timer: ReturnType<typeof setTimeout> | null = null;

/** In-memory only, as `features/widgets/sync.ts` argues: one write per launch. */
let lastKey: string | null = null;

/** Where `_debug/widgets` and `StandingsSnapshot.swift` both look. */
export function standingsSnapshotFile(): File | null {
  const container = groupContainer();
  if (!container) return null;
  return new File(container, SNAPSHOT_DIR, STANDINGS_NAME);
}

/** Temp-then-rename, shared with the other two snapshots. */
export function writeStandingsSnapshot(snapshot: StandingsSnapshot): boolean {
  return writeGroupJson(SNAPSHOT_DIR, STANDINGS_NAME, snapshot);
}

export interface StandingsSyncInputs extends Omit<StandingsInputs, 'crests'> {
  /** Every crest set that has resolved. */
  crestSets: readonly ClubCrestView[];
  /** Every crest set answered — only then may the sweep run. */
  crestSetsComplete: boolean;
}

export async function applyStandingsSnapshot(
  inputs: StandingsSyncInputs,
  now: Date,
  copy: Copy,
): Promise<void> {
  // ⚠ Warm even when the snapshot will turn out unchanged: a download that
  // failed last time must be retryable, and a settled cache is an existence
  // check per club.
  const crests = await warmStandingsCrests(inputs.crestSets);

  const snapshot = buildStandingsSnapshot({ ...inputs, crests }, now, copy);
  const key = standingsSnapshotKey(snapshot);
  const changed = key !== lastKey;

  if (changed) {
    if (!writeStandingsSnapshot(snapshot)) return; // No App Group: Android, or unprovisioned.
    lastKey = key;
  }

  // ⚠ Against EVERY crest on disk, not the snapshot's rows: the Champions
  // League window shows 20 of 36, and a club crossing the cut must not have
  // its file swept and re-downloaded every matchday. And only once every set
  // answered — a failed set would read as clubs that no longer exist.
  if (inputs.crestSetsComplete) pruneStandingsCrests(new Set(crests.values()));

  // ⚠ `reloadWidgets` passes no kind (ADR 0047), so this reloads every widget.
  // The key guard keeps that to once per real table change.
  if (changed) await reloadWidgets();
}

/** Trailing-debounced `applyStandingsSnapshot`. */
export function scheduleStandingsSync(inputs: StandingsSyncInputs, now: Date, copy: Copy): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void applyStandingsSnapshot(inputs, now, copy);
  }, DEBOUNCE_MS);
}

/** ⚠ Test/debug only — forces the next `applyStandingsSnapshot` to write. */
export function forgetStandingsSnapshot(): void {
  lastKey = null;
}
