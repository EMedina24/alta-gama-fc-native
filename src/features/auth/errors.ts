/**
 * Sign-in failures, as something the UI can key off.
 *
 * ⚠ **Supabase's own English prose must never reach the screen.** Same rule
 * `CronogolApiError` already states in
 * [`lib/cronogol/client.ts`](../../lib/cronogol/client.ts): the message is for
 * logs, the COPY is chosen from a code through i18n. Here it matters more than
 * there — these strings are user-facing failures in an app that ships in two
 * languages, and GoTrue writes them in one.
 *
 * ⚠ Detected STRUCTURALLY rather than with `instanceof AuthError`, ported from
 * `cronogol/lib/supabase/auth-errors.ts`. The web app does it to keep the class
 * out of its bundle; here it is because an `instanceof` across a re-exported
 * class is a silent `false` the day the dependency is deduped differently.
 */

export type AuthFailure =
  /** The user backed out. Not an error — render nothing. */
  | 'cancelled'
  /** Provider rejected the credential, or the token was stale. */
  | 'rejected'
  /** Too many attempts. */
  | 'rateLimited'
  /** Offline, timeout, provider unreachable. */
  | 'unavailable'
  /** Anything we have not classified. */
  | 'unknown';

function errorCode(cause: unknown): string | null {
  if (typeof cause !== 'object' || cause === null) return null;
  if (!('__isAuthError' in cause)) return null;
  const code = (cause as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

/**
 * ⚠ **A cancel is not a failure**, and it is the single most common outcome
 * here — a user opening the Apple sheet to see what it says and dismissing it.
 * Apple raises `ERR_REQUEST_CANCELED`; `openAuthSessionAsync` reports `dismiss`
 * or `cancel` as a RESULT rather than throwing, which `google.ts` handles at its
 * own call site.
 */
export function isCancellation(cause: unknown): boolean {
  if (typeof cause !== 'object' || cause === null) return false;
  const code = (cause as { code?: unknown }).code;
  return code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED';
}

export function classifyAuthError(cause: unknown): AuthFailure {
  if (isCancellation(cause)) return 'cancelled';

  switch (errorCode(cause)) {
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'rateLimited';
    case 'provider_disabled':
    case 'validation_failed':
    case 'bad_jwt':
    case 'session_expired':
      return 'rejected';
    default:
      break;
  }

  // A fetch that never reached anywhere. `supabase-js` surfaces these as a
  // plain TypeError, with no code to key on.
  if (cause instanceof TypeError) return 'unavailable';

  if (typeof cause === 'object' && cause !== null && 'status' in cause) {
    const status = (cause as { status?: unknown }).status;
    if (status === 429) return 'rateLimited';
    if (typeof status === 'number' && status >= 500) return 'unavailable';
    if (typeof status === 'number' && status >= 400) return 'rejected';
  }

  return 'unknown';
}

/**
 * The GoTrue codes the email/password form (ADR 0103) maps to their own
 * sentences, ported from the web's `auth-errors.ts` map. Anything not listed
 * falls through to `classifyAuthError` and the generic auth strings — the
 * rate-limit codes deliberately stay out, `classifyAuthError` already names
 * them.
 *
 * ⚠ `invalid_credentials` covers a wrong password AND an unknown address —
 * GoTrue does not distinguish them, and neither may the copy (a message that
 * differs would enumerate which emails have accounts).
 */
export type EmailAuthCode =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'user_already_exists'
  | 'weak_password'
  | 'same_password'
  | 'email_address_invalid'
  | 'validation_failed'
  | 'signup_disabled'
  | 'email_provider_disabled';

const EMAIL_AUTH_CODES: readonly EmailAuthCode[] = [
  'invalid_credentials',
  'email_not_confirmed',
  'user_already_exists',
  'weak_password',
  'same_password',
  'email_address_invalid',
  'validation_failed',
  'signup_disabled',
  'email_provider_disabled',
];

export function emailAuthCode(cause: unknown): EmailAuthCode | null {
  const code = errorCode(cause);
  // Two codes, one situation, one message — the web normalises them the same way.
  if (code === 'email_exists') return 'user_already_exists';
  return code !== null && (EMAIL_AUTH_CODES as readonly string[]).includes(code)
    ? (code as EmailAuthCode)
    : null;
}

/**
 * ⚠ The one code a form BRANCHES on rather than reports: an unconfirmed
 * account gets a neutral notice and a resend button, never a red
 * "wrong password" line.
 */
export function isUnconfirmed(cause: unknown): boolean {
  return errorCode(cause) === 'email_not_confirmed';
}
