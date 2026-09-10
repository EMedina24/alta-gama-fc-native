/**
 * Which player the Season stats screen is showing, per club (ADR 0141).
 *
 * ⚠ **In memory only — no AsyncStorage, unlike `starting-xi.ts`.** A saved
 * lineup is a thing the reader MADE and expects to find again; a chosen player
 * is where they happened to be looking. Persisting it would also mean carrying
 * a slug across app launches, and slugs are neither unique nor permanent (the
 * stats route answers `409` when two people share one) — so a stored value
 * could resolve to a different footballer months later.
 *
 * ⚠ **A store rather than a route param, because the picker is a SHEET.**
 * `router.setParams` after `router.back()` is a race — it applies to whichever
 * route is focused when it runs — and `navigate` with params risks a second
 * copy of the screen on the stack. The Starting XI sheets make the same call
 * for the same reason: they commit to a store and let the screen re-render.
 *
 * ⚠ The value is a `players.slug`, because that is the only key
 * `GET /cronogol/players/{slug}/stats` takes. Everywhere else in this app a
 * player is identified by the stable person `id`; here the address wins, and
 * the screen re-resolves it against the squad on every read so a stale slug
 * falls back to the default rather than blanking the view.
 */
import { useSyncExternalStore } from 'react';

/** club slug → the chosen player's slug. */
let chosen: Record<string, string> = {};
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function chooseStatsPlayer(clubSlug: string, playerSlug: string) {
  if (chosen[clubSlug] === playerSlug) return;
  // A new object, not a mutation: `useSyncExternalStore` compares snapshots by
  // identity and a mutated record would never re-render.
  chosen = { ...chosen, [clubSlug]: playerSlug };
  emit();
}

/** The chosen player's slug for a club, or `null` — the screen picks a default. */
export function useStatsPlayer(clubSlug: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => chosen[clubSlug] ?? null,
    () => null,
  );
}
