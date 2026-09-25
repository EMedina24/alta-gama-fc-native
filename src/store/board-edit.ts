/**
 * Whether the Board is being arranged (ADR 0199) — the one piece of edit-mode
 * state that has to leave the Today screen.
 *
 * ⚠ It lives HERE, not in the screen's `useState`, because the TAB LAYOUT has
 * to read it: the kit hides the tab bar while editing, and `NativeTabs` is
 * configured one level above the screen. A module-level snapshot read through
 * `useSyncExternalStore`, shaped like [`session.ts`](./session.ts).
 *
 * ⚠ Never persisted (0174): the layout survives a relaunch, the mode does not.
 * The screen turns it off on blur, so a tab bar can never be left hidden
 * behind a screen that is no longer showing.
 *
 * ⚠ The `__DEV__` deep-link hook (`?boardEdit=1`) is NOT written here — both
 * readers derive it from the route params themselves, so no effect copies one
 * source of truth into another.
 */
import { useSyncExternalStore } from 'react';

let editing = false;
const listeners = new Set<() => void>();

export function setBoardEditing(on: boolean) {
  if (on === editing) return;
  editing = on;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => editing;

export function useBoardEditing(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
