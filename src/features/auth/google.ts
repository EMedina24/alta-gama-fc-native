/**
 * Sign in with Google.
 *
 * ⚠ **The browser hop, not a native SDK** — the same flow the web app uses, and
 * it needs no Google Cloud work at all: it goes through Supabase's existing
 * Google web client, so there is no new iOS OAuth client and no reversed-client-id
 * URL scheme in the Info.plist.
 *
 * ⚠ `openAuthSessionAsync` is `ASWebAuthenticationSession` — a Safari-backed
 * system browser, not a webview. That distinction is load-bearing: Google refuses
 * OAuth in embedded webviews, so a `WebView` here would be rejected at the
 * provider, not by us.
 *
 * The upgrade path is `@react-native-google-signin/google-signin` for a one-tap
 * native sheet. It is contained to this file on purpose — that swap needs an iOS
 * OAuth client, both client ids in Supabase's *Client IDs* field, and a config
 * plugin, and it changes nothing above this module.
 */
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase/client';

/**
 * ⚠ **Must match a Supabase → Authentication → URL Configuration → Redirect URL
 * entry EXACTLY.** An unlisted value does not error: Supabase silently falls back
 * to the project's Site URL, so the browser lands on `altagamafc.com` and the app
 * never hears back. It reads as "Google sign-in opens the website" and looks
 * nothing like a configuration problem.
 *
 * ⚠ Built from the app's `scheme` rather than hardcoded, so it cannot drift from
 * `app.json`.
 */
export const GOOGLE_REDIRECT_URL = Linking.createURL('auth-callback');

/** Whether the user completed the hop. `false` means they dismissed it. */
export async function signInWithGoogle(): Promise<boolean> {
  if (!supabase) throw new Error('Auth is not configured');

  /**
   * ⚠ `skipBrowserRedirect` — without it `supabase-js` tries to navigate a
   * `window` that does not exist here. What we want is the URL, to open ourselves
   * in a session the OS will hand back to us.
   */
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: GOOGLE_REDIRECT_URL, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Google sign-in returned no URL');

  const result = await WebBrowser.openAuthSessionAsync(data.url, GOOGLE_REDIRECT_URL);

  // ⚠ A dismissal is a RESULT here, not a thrown error — `cancel` is the user
  // tapping Cancel, `dismiss` is the sheet being swiped away. Neither is a
  // failure and neither may raise one.
  if (result.type !== 'success') return false;

  await exchange(result.url);
  return true;
}

/**
 * Every parameter on the redirect, query and fragment both.
 *
 * ⚠ **Hand-rolled rather than `new URL()` + `URLSearchParams`, and not out of
 * preference.** React Native ships its own minimal versions of both, and each has
 * a defect that lands exactly here:
 *
 * - `URL.hash` is `match(/#([^/]*)/)` — it stops at the first `/`, silently
 *   truncating a fragment.
 * - `URLSearchParams` does `pair.split('=')` and destructures two elements, so
 *   any value containing `=` — base64 padding, which opaque tokens carry — is cut
 *   at the first one.
 *
 * Both corrupt a credential rather than failing, which is the worst way to be
 * wrong. Splitting on the FIRST `=` only is the whole fix.
 *
 * (`react-native-url-polyfill` would also fix it. It is not installed: nothing
 * else here needs it, and `supabase-js` reaches `new URL()` only on
 * `window.location` paths that `isBrowser()` already gates off. Verified against
 * `@supabase/auth-js` before leaving it out.)
 */
function params(url: string): Record<string, string> {
  const out: Record<string, string> = {};

  const hashAt = url.indexOf('#');
  const fragment = hashAt === -1 ? '' : url.slice(hashAt + 1);
  const beforeHash = hashAt === -1 ? url : url.slice(0, hashAt);
  const queryAt = beforeHash.indexOf('?');
  const query = queryAt === -1 ? '' : beforeHash.slice(queryAt + 1);

  // ⚠ Fragment first, query second: the query WINS on a collision, matching
  // `parseParametersFromURL` in auth-js. Reversing it would prefer a stale
  // fragment value over the one the provider just set.
  for (const source of [fragment, query]) {
    for (const pair of source.split('&')) {
      if (!pair) continue;
      const eq = pair.indexOf('=');
      const key = eq === -1 ? pair : pair.slice(0, eq);
      const value = eq === -1 ? '' : pair.slice(eq + 1);
      try {
        out[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '));
      } catch {
        // A malformed escape is not a reason to drop the whole redirect.
        out[key] = value;
      }
    }
  }
  return out;
}

/**
 * ⚠ Supabase appends this to `redirectTo` so the exchange can find the right PKCE
 * verifier — `PKCE_FLOW_ID_PARAM` in `@supabase/auth-js`, which does not export it.
 *
 * ⚠ **Passing it is not optional for long.** Without it, `exchangeCodeForSession`
 * falls back to a fixed legacy storage key that auth-js writes only as a
 * "deprecation-window dual write" and says so in a comment. It works today and
 * will stop, silently, on some future minor version.
 */
const FLOW_ID_PARAM = 'sb_flow_id';

/**
 * Turn the redirect back into a session.
 *
 * ⚠ Two shapes, and both are real. PKCE returns `?code=` in the QUERY; the
 * implicit grant returns tokens in the FRAGMENT. `detectSessionInUrl` is off
 * (there is no `window.location` to detect anything in), so this is the only
 * place either one is consumed — miss a shape and a perfectly good sign-in
 * silently lands back on the signed-out sheet.
 */
async function exchange(url: string): Promise<void> {
  if (!supabase) return;

  const query = params(url);

  // ⚠ The provider reports its own refusals here rather than by failing the hop —
  // a denied consent screen is a `success` result carrying `error=access_denied`.
  if (query.error) throw new Error(`Google sign-in failed (${query.error})`);

  if (query.code) {
    const flowId = query[FLOW_ID_PARAM];
    const { error } = await supabase.auth.exchangeCodeForSession(
      query.code,
      flowId ? { flowId } : undefined,
    );
    if (error) throw error;
    return;
  }

  if (query.access_token && query.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: query.access_token,
      refresh_token: query.refresh_token,
    });
    if (error) throw error;
    return;
  }

  throw new Error('Google sign-in returned no credential');
}
