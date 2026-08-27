/**
 * Getting the snapshot onto disk and the timelines reloaded.
 *
 * ⚠ Mirrors `features/push/sync.ts`: a trailing debounce plus a "did anything
 * actually change" guard, so a reader dragging through the club browser
 * toggling follows produces one write, not thirty.
 */
import { reloadWidgets } from '@/features/push/capability';

import { warmWidgetCrests } from './crests';
import { snapshotKey, writeSnapshot, type WidgetSnapshot } from './snapshot';

/**
 * Shorter than push's 1 500 ms.
 *
 * ⚠ The two are debounced against different things. Push is protecting a server
 * route rated at 20 requests a minute; this is protecting WidgetKit's daily
 * reload budget, which is not a rate but a total — so what matters here is the
 * `snapshotKey` guard below, and the timer only has to outlast a flurry of taps.
 */
const DEBOUNCE_MS = 1_000;

let timer: ReturnType<typeof setTimeout> | null = null;

/**
 * ⚠ In-memory only, and that is correct: a fresh launch writes once and reloads
 * once, which costs a single reload out of the day's budget and guarantees the
 * widget is not left rendering a snapshot from a previous install.
 */
let lastKey: string | null = null;

/**
 * Write the snapshot and reload the widgets, if anything moved.
 *
 * ⚠⚠ **The `snapshotKey` comparison excludes `writtenAt`, and everything depends
 * on it.** The re-arm this is called from runs on EVERY foreground. Comparing
 * whole serialised snapshots would call each one a change, spend WidgetKit's
 * ~40–70 daily reloads within a few minutes of ordinary app switching, and leave
 * the widget frozen for the rest of the day — with no error in any log, on the
 * device or off it. See `reloadWidgets`.
 *
 * ⚠ The crests are warmed even when the snapshot is unchanged. A download that
 * failed last time (offline, flaky network) has to be retryable, and a settled
 * cache costs nothing — `warmLongLookCrests` skips files already on disk.
 */
export async function applyWidgetSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  const key = snapshotKey(snapshot);
  const changed = key !== lastKey;

  if (changed) {
    if (!writeSnapshot(snapshot)) return; // No App Group: Android, or unprovisioned.
    lastKey = key;
  }

  await warmWidgetCrests(snapshot.entries);

  // ⚠ AFTER the crests. A reload that lands first builds its timeline against a
  // container with no artwork in it, and the widget draws lettered tiles for
  // clubs that have crests until something else happens to reload it.
  if (changed) await reloadWidgets();
}

/** Trailing-debounced `applyWidgetSnapshot`, for rapid follow toggling. */
export function scheduleWidgetSync(snapshot: WidgetSnapshot): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void applyWidgetSnapshot(snapshot);
  }, DEBOUNCE_MS);
}

/** ⚠ Test/debug only — forces the next `applyWidgetSnapshot` to write. */
export function forgetWidgetSnapshot(): void {
  lastKey = null;
}
