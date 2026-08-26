/**
 * The Supabase client — **`/auth/v1` only**.
 *
 * Sign-in is the one thing that does not go through `crono-gol.com`. The app
 * authenticates against Supabase directly, then sends the resulting access token
 * to the API as `Authorization: Bearer …` (ADR 0039). That is the same boundary
 * `cronogol/lib/supabase/client.ts` describes, and it leaves ADR 0009 intact:
 * every byte of football data still comes from the backend.
 *
 * ⚠ **Never query a Supabase table from here.** The grants on `profiles`,
 * `feed_selections` and `subscriptions` are revoked for this key, so a table read
 * answers `401 / 42501` rather than `200 []` — it fails, but it fails as though
 * the data were merely empty.
 *
 * ⚠ **Nothing outside `lib/supabase/`, `store/session.ts` and `features/auth/`
 * may import this module or `@supabase/supabase-js`.** Screens and queries see
 * `getAccessToken()` and our own session shape. Proxying auth through the backend
 * is the intended end state (ADR 0039); held to that containment it is a swap of
 * three modules rather than a rewrite, and the moment a screen reaches for
 * `supabase.auth` directly that stops being true.
 *
 * ⚠ Deliberately NOT ported from the web client: the `import type` +
 * dynamic-`import()` bundle-splitting dance, `sessionPossible()`'s mirroring of
 * `auth-js`'s callback detection, and the `localStorage` `SecurityError` guard.
 * All three solve browser problems that do not exist here, and each one is a
 * standing maintenance obligation to keep mirroring a library's internals.
 */
import { createClient } from '@supabase/supabase-js';
import { AppState, type AppStateStatus } from 'react-native';

import { SessionStore } from './session-storage';

/**
 * ⚠ Must stay `EXPO_PUBLIC_`-prefixed to reach the client bundle, and read as a
 * whole identifier — the bundler only inlines the literal property access.
 *
 * ⚠ The project is on a CUSTOM DOMAIN, not `<ref>.supabase.co`. Both resolve and
 * both are configured; this one matches `senpai-backend/.env` and the web app.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Whether sign-in can work at all.
 *
 * ⚠ Synchronous, and it must stay that way: `createClient` throws on an empty
 * URL, and everything except the sign-in sheet works fine without these. A
 * missing variable must degrade to "no sign-in offered", never to a blank app.
 */
export const authConfigured = Boolean(url && publishableKey);

/**
 * ⚠ **Explicit, and it can never change.**
 *
 * Left unset, `supabase-js` derives the key from the URL's hostname —
 * `sb-${hostname.split('.')[0]}-auth-token`. The web app learned what that costs:
 * moving to the custom domain silently renamed its key, every live session stayed
 * filed under one the new client never read, and it presented as "the app forgot
 * me after a deploy" with no error anywhere. It is now pinned to a stale project
 * ref forever.
 *
 * Native starts clean, so this is an app-owned name that no hostname can move.
 * Renaming it later signs every user out — treat it like `FOLLOWED_RULE_VERSION`.
 */
export const AUTH_STORAGE_KEY = 'altagama:auth';

export const supabase = authConfigured
  ? createClient(url!, publishableKey!, {
      auth: {
        storage: SessionStore,
        storageKey: AUTH_STORAGE_KEY,
        persistSession: true,
        autoRefreshToken: true,
        /**
         * ⚠ Required on native. The web default exists to consume a `?code=` or
         * `#access_token=` off `window.location`; there is no such thing here,
         * and the Google hop is completed explicitly in `features/auth/google.ts`.
         */
        detectSessionInUrl: false,
      },
    })
  : null;

/**
 * Hold token refresh to the foreground.
 *
 * ⚠ `autoRefreshToken` alone runs a timer that keeps firing while the app is
 * suspended — waking to spend requests nobody is waiting on. `startAutoRefresh`
 * also refreshes immediately, which is exactly what is wanted on resume: the
 * first authenticated call after a long background is the one most likely to
 * find an expired token.
 */
export function watchAppStateForRefresh(): () => void {
  if (!supabase) return () => {};

  const apply = (status: AppStateStatus) => {
    if (status === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  };

  apply(AppState.currentState);
  const subscription = AppState.addEventListener('change', apply);
  return () => subscription.remove();
}
