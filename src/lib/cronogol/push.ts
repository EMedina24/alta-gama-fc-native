/**
 * Device push registration.
 *
 * ⚠ Wire contract: `senpai-backend/CRONOGOL-API.md` ("push device") and
 * `.claude/PUSH-AND-ACCOUNTS.md`. This file is COMPLETE and correct today — it is
 * the transport only. Nothing calls it until an APNs token exists, which needs
 * the Apple Developer account (ADR 0023).
 */

import { API_BASE, CronogolApiError } from './client';

/** ⚠ 20 max. The DTO rejects a longer array outright. */
export const MAX_CLUB_SLUGS = 20;

export type ApnsEnvironment = 'sandbox' | 'production';

export interface PushRegistration {
  /** ⚠ RAW APNs token, 64 LOWERCASE hex. See `normaliseToken`. */
  token: string;
  platform: 'ios';
  lang: 'es' | 'en';
  /** ⚠ Max 20. Duplicates are collapsed server-side; trust the RESPONSE, not the request. */
  clubSlugs: string[];
  alertMoved: boolean;
  alertPostponed: boolean;
  /**
   * ⚠ **REQUIRED IN PRACTICE, optional in the schema.** The DTO defaults a
   * missing value to `production`, and a development build registered as
   * `production` receives nothing, silently, with no error anywhere. Wire it to
   * the build profile, never to `__DEV__` — `__DEV__` is false in a
   * release-configuration dev-client build, which is exactly what an internal
   * EAS build is.
   */
  environment: ApnsEnvironment;
}

export interface PushRegistrationView {
  clubSlugs: string[];
  alertMoved: boolean;
  alertPostponed: boolean;
  lang: string;
  environment: string;
  /** Whether a bearer linked this row to an account — never whose. */
  linked: boolean;
}

const HEX64 = /^[0-9a-f]{64}$/;

/**
 * ⚠ **The backend does NOT lowercase the token, and its own migration comment
 * wrongly claims the DTO does.** `@Matches(/^[0-9a-f]{64}$/)` rejects uppercase,
 * so an unnormalised token is a 400 on EVERY registration — total, silent
 * failure of push for that device.
 *
 * Also strips `<`, `>` and spaces, in case a platform ever hands back the old
 * ObjC `NSData` description format.
 */
export function normaliseToken(raw: string): string | null {
  const cleaned = raw.replace(/[<>\s]/g, '').toLowerCase();
  return HEX64.test(cleaned) ? cleaned : null;
}

async function send<T>(method: 'PUT' | 'DELETE', path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    // 404 unknown club slug · 400 malformed token or undeclared field · 429 rate limit
    throw new CronogolApiError(res.status, `push ${method} failed (${res.status})`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

/**
 * Register or update this device.
 *
 * ⚠ **Idempotent WHOLESALE REPLACE keyed on the token — there is no PATCH and no
 * GET.** Every call sends the full current state, and the app must persist its
 * own copy of what it last sent (`store/registration.ts`) because there is no way
 * to read the server's back.
 *
 * ⚠ 429 at 20/min. Debounce follow toggles; a reader scrolling the club browser
 * hits that trivially.
 */
export function registerDevice(body: PushRegistration): Promise<PushRegistrationView> {
  return send<PushRegistrationView>('PUT', '/cronogol/push/device', body);
}

/**
 * Alerts off for THIS device. Idempotent, silent on an unknown token.
 * Touches no account, no feed and no other device; a later register revives it.
 */
export function unregisterDevice(token: string): Promise<void> {
  return send<void>('DELETE', '/cronogol/push/device', { token });
}
