/**
 * Sign in with email and password (ADR 0103).
 *
 * ⚠ **Confirmation and reset links land on the WEB** — `altagamafc.com`'s own
 * `/auth/callback` and `/reset-password` pages, which already exist and are
 * already on Supabase's Redirect URLs allowlist. The app has no deep-link
 * landing for either flow on purpose: the user confirms or resets in the
 * browser, comes back, and signs in normally.
 *
 * ⚠ Same trap as `GOOGLE_REDIRECT_URL` in [`google.ts`](./google.ts): an
 * unlisted redirect does not error — Supabase silently falls back to the Site
 * URL. These are built to match the web's own locale-prefixed URLs exactly.
 *
 * Every function throws the raw GoTrue error; the route maps it to copy
 * through `emailAuthCode`/`classifyAuthError` — Supabase's English prose never
 * reaches the screen (see [`errors.ts`](./errors.ts)).
 */
import { SITE_ORIGIN } from '@/lib/cronogol/site';
import type { Locale } from '@/lib/i18n/phrases';
import { supabase } from '@/lib/supabase/client';

const confirmRedirect = (locale: Locale) => `${SITE_ORIGIN}/${locale}/auth/callback`;
const resetRedirect = (locale: Locale) => `${SITE_ORIGIN}/${locale}/reset-password`;

export async function signInWithPassword(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Auth is not configured');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/**
 * ⚠ **`false` is SUCCESS.** Confirmations are on (`mailer_autoconfirm` off,
 * deliberately), so a good sign-up returns NO session and NO error — the
 * account exists and a confirmation mail is on its way. Render "check your
 * email", never a failure. `true` (a live session) would mean autoconfirm,
 * which production never runs.
 */
export async function signUpWithPassword(
  email: string,
  password: string,
  locale: Locale,
): Promise<boolean> {
  if (!supabase) throw new Error('Auth is not configured');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: confirmRedirect(locale) },
  });
  if (error) throw error;
  return data.session !== null;
}

/**
 * ⚠ Supabase enforces a 60-second per-address window between sends; a call
 * inside it fails with nothing worth showing. The route locks the button for
 * that long instead of explaining a refusal.
 */
export async function resendConfirmation(email: string, locale: Locale): Promise<void> {
  if (!supabase) throw new Error('Auth is not configured');
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: confirmRedirect(locale) },
  });
  if (error) throw error;
}

/**
 * ⚠ The caller must swallow rejections and show the SAME notice either way —
 * a response that differs for an unknown address tells an attacker which
 * emails have accounts here. The server already answers a real and an unknown
 * address identically; the UI must not undo that.
 */
export async function requestPasswordReset(email: string, locale: Locale): Promise<void> {
  if (!supabase) throw new Error('Auth is not configured');
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: resetRedirect(locale),
  });
  if (error) throw error;
}
