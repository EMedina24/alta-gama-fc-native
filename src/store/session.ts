/**
 * The signed-in session.
 *
 * ⚠ Shaped exactly like [`store/preferences.ts`](./preferences.ts) — a
 * module-level snapshot read through `useSyncExternalStore`, with writers that
 * are plain functions rather than context methods. Same reason: the push
 * registration effect needs the access token and is not a component, and
 * `lib/cronogol/account.ts` needs it from inside a fetch wrapper.
 *
 * ⚠ **This module owns the app's session shape, and `Account` is not Supabase's
 * user.** Everything above this layer sees `Session` and `getAccessToken()`;
 * nothing else imports `@supabase/supabase-js`. That containment is what makes
 * moving to backend-proxied auth (ADR 0039) a swap of this file plus
 * `lib/supabase/` and `features/auth/`, instead of a change to every caller.
 *
 * ⚠ **Signing out clears the session and NOTHING else.** It must never touch
 * `followed` — that is device state, this device's array IS the follow state,
 * and nothing on the server can rebuild it (ADR 0019). Wiping it on sign-out
 * would silently unsubscribe the user from every alert they had.
 */
import { useSyncExternalStore } from 'react';

import { supabase, authConfigured } from '@/lib/supabase/client';

export interface Session {
  userId: string;
  /**
   * ⚠ From the JWT, and it goes STALE — for up to an hour after a confirmed
   * email change it still carries the old address. Render `GET /cronogol/me`'s
   * `email` instead, which is read from Supabase Auth and is correct the whole
   * time. This is here to seed an avatar before that request lands, nothing more.
   */
  email: string | null;
}

let snapshot: Session | null = null;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function commit(next: Session | null) {
  const same =
    snapshot === next ||
    (snapshot !== null &&
      next !== null &&
      snapshot.userId === next.userId &&
      snapshot.email === next.email);

  // `useSyncExternalStore` compares with `Object.is`, so replacing the identity
  // with an equal-but-new object schedules a render for nothing. Auth state
  // events fire on every token refresh — roughly hourly, forever — so this is
  // the difference between a quiet app and one that re-renders on a timer.
  if (same) return;

  snapshot = next;
  emit();
}

/**
 * ⚠ **The root layout paints nothing until this resolves, so it must ALWAYS
 * resolve.** Past this the app renders signed-out and the listener catches up.
 *
 * Not a theoretical guard. `onAuthStateChange` emits `INITIAL_SESSION` from an
 * uncaught `(async () => …)()` in `GoTrueClient` that first awaits
 * `initializePromise` and then `_acquireLock(lockAcquireTimeout)`. A hung
 * Keychain read or a lock that times out throws INSIDE that IIFE, the callback
 * never fires, and this promise never settles — which would be a permanently
 * black app, caused by a subsystem a signed-out reader never asked for.
 *
 * Generous, because it is a deadlock backstop and not a latency budget: reading
 * a handful of Keychain chunks is milliseconds, so anything approaching this is
 * already pathological.
 */
const HYDRATE_TIMEOUT_MS = 4_000;

/**
 * Start listening for auth state, and resolve once the stored session has been
 * read.
 *
 * ⚠ `onAuthStateChange` fires immediately with whatever was persisted, which is
 * what this awaits — the callback is the hydration signal, not a separate read.
 * Racing a `getSession()` against it would be a second source of truth.
 *
 * ⚠ Resolves rather than hanging when auth is not configured, so a missing env
 * var is a signed-out app rather than a splash screen that never clears.
 */
export function hydrateSession(): Promise<void> {
  // ⚠ Bound to a local before the closure: `supabase` is a nullable module
  // export, so TypeScript re-widens it inside the callback no matter what the
  // guard above proved.
  const client = supabase;
  if (hydrated || !client) {
    hydrated = true;
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    /**
     * ⚠ The subscription is NEVER torn down, timeout or not. If the first event
     * arrives late it still lands here, `commit` still fires, and a reader who
     * saw a signed-out frame is corrected rather than stranded.
     */
    const settle = () => {
      if (hydrated) return;
      hydrated = true;
      emit();
      resolve();
    };

    const fallback = setTimeout(settle, HYDRATE_TIMEOUT_MS);

    client.auth.onAuthStateChange((_event, next) => {
      commit(next?.user ? { userId: next.user.id, email: next.user.email ?? null } : null);
      clearTimeout(fallback);
      settle();
    });
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => snapshot;
const getHydrated = () => hydrated;

/** The session, or `null` when signed out. */
export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Whether the stored session has been read yet.
 *
 * Same job as `useHydrated()` in the preferences store: "signed out" and "we have
 * not looked yet" are indistinguishable from a `null` session and render very
 * differently — one shows a Sign in row, the other should show nothing at all.
 */
export function useSessionHydrated(): boolean {
  return useSyncExternalStore(subscribe, getHydrated, getHydrated);
}

/**
 * The signed-in user id, read outside React.
 *
 * ⚠ For the push registration, which is not a component and needs to know
 * whether the account it last linked to has changed. Reads the snapshot rather
 * than the network — a stale answer here just means one more re-register.
 */
export function getSessionUserId(): string | null {
  return snapshot?.userId ?? null;
}

/** Whether sign-in can be offered. False when the env vars are absent. */
export const AUTH_CONFIGURED = authConfigured;

/**
 * A usable access token, or `null`.
 *
 * ⚠ Goes through `getSession()` rather than reading the snapshot, because that
 * is what refreshes an expired token — and `supabase-js` de-duplicates concurrent
 * refreshes internally, which matters: GoTrue ROTATES refresh tokens, so two
 * parallel refreshes would have one presenting an already-consumed token and
 * signing the user out for no reason.
 */
export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Force a refresh, for the one-retry-after-401 path in
 * [`lib/cronogol/account.ts`](../lib/cronogol/account.ts).
 *
 * ⚠ Returns `null` rather than throwing on failure — a dead refresh token means
 * "sign in again", which is a render, not an error to propagate.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) return null;
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Sign out.
 *
 * ⚠ Local scope: it clears THIS device's session and leaves other devices signed
 * in. A global sign-out would be a surprise from a button that says "Sign out",
 * and it is not what the web app does either.
 *
 * ⚠ **Does not, and must not, touch `followed` or the push registration.** The
 * follow list is device state whose loss is permanent (ADR 0019), and the device
 * row keeps its account link regardless — there is no unlink operation, and
 * re-registering anonymously does not remove one.
 */
export async function signOut(): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // The listener still fires on a cleared session; nothing else to do.
  }
}
