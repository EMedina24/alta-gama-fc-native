/**
 * What happened the last time this device tried to register for push (ADR 0079).
 *
 * ⚠ Exists because a registration can fail SILENTLY for days. The one live
 * device row in production read `alert_goals: false` from 2026-08-28 19:24 UTC
 * while the switch on the phone said on — every `PUT` since had failed inside a
 * bare `catch`, three goals were dispatched to zero devices, and nothing on any
 * screen said so. This is the one line that does.
 *
 * ⚠ The same `useSyncExternalStore` shape as `preferences.ts`, and persisted
 * for the same reason: the account sheet must answer "did it land" on a cold
 * launch, before any sync has run. Hydrated once at import; a write before
 * hydration wins, which is the right order — the newest outcome is the truth.
 *
 * ⚠ Carries an outcome and a time, NEVER a status code or a reason string. The
 * reason goes to the console (`[push-sync]`); the screen says it saved or it
 * did not (ground rule: no diagnostics where a reader can see them).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'altagama:push-sync-status';

export interface PushSyncStatus {
  /** ISO instant of the last attempt that reached a verdict; null = never. */
  at: string | null;
  /** `true` the server ACKed, `false` it did not. Null with `at` null. */
  ok: boolean | null;
}

const NEVER: PushSyncStatus = { at: null, ok: null };

let snapshot: PushSyncStatus = NEVER;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): PushSyncStatus {
  return snapshot;
}

export function usePushSyncStatus(): PushSyncStatus {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Record a verdict. `unchanged` is not a verdict and must not call this. */
export function setPushSyncStatus(ok: boolean): void {
  snapshot = { at: new Date().toISOString(), ok };
  hydrated = true;
  emit();
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)).catch(() => {
    // Storage unavailable: the next verdict rewrites it.
  });
}

// ⚠ Fire-and-forget at import, guarded so a verdict that lands first is kept.
AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (hydrated || !raw) return;
    const parsed = JSON.parse(raw) as Partial<PushSyncStatus>;
    if (typeof parsed.at !== 'string' || typeof parsed.ok !== 'boolean') return;
    snapshot = { at: parsed.at, ok: parsed.ok };
    hydrated = true;
    emit();
  })
  .catch(() => {
    // Unreadable: stays NEVER until the next verdict.
  });
