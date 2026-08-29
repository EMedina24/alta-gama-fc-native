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
   * Goals, red cards and full time (ADR 0053).
   *
   * ⚠⚠ **THE BACKEND DTO MUST CARRY THIS BEFORE THIS APP SHIPS IT.** The DTO is
   * `forbidNonWhitelisted`, so an undeclared field is a 400 on EVERY
   * registration — not a dropped field, a total and silent loss of push for the
   * device. `senpai-backend` declared it in the same change; if a build starts
   * failing to register, check that it is deployed before anything here.
   */
  alertGoals: boolean;
  /**
   * ⚠ **REQUIRED IN PRACTICE, optional in the schema.** The DTO defaults a
   * missing value to `production`, and a development build registered as
   * `production` receives nothing, silently, with no error anywhere. Wire it to
   * the build profile, never to `__DEV__` — `__DEV__` is false in a
   * release-configuration dev-client build, which is exactly what an internal
   * EAS build is.
   */
  environment: ApnsEnvironment;
  /**
   * This device's ActivityKit **push-to-start** token (ADR 0055).
   *
   * ⚠ **A different token from `token` above, and a different SHAPE.** That one
   * is the 64-hex APNs device token. This one is per device and per activity
   * TYPE, it is what lets the server start a Live Activity on a locked phone
   * with the app closed, and it is materially longer — see
   * `normaliseActivityToken`.
   *
   * ⚠ Optional, and absent is the normal case: below iOS 18, on a simulator, or
   * with Live Activities switched off in Settings there is no token to send. The
   * DTO must treat absent as "this device cannot show a card", never as an error.
   *
   * ⚠⚠ **THE BACKEND DTO MUST CARRY THIS BEFORE THIS APP SHIPS IT** — the same
   * ordering trap `alertGoals` documents above, with the same consequence.
   */
  activityToken?: string;
}

export interface PushRegistrationView {
  clubSlugs: string[];
  alertMoved: boolean;
  alertPostponed: boolean;
  alertGoals: boolean;
  lang: string;
  environment: string;
  /** Whether a bearer linked this row to an account — never whose. */
  linked: boolean;
}

const HEX64 = /^[0-9a-f]{64}$/;

/** ⚠ Bounded, not fixed. See `normaliseActivityToken`. */
const ACTIVITY_TOKEN = /^[0-9a-f]{64,512}$/;

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

/**
 * ⚠⚠ **A push-to-start token is NOT 64 hex characters, and reusing
 * `normaliseToken` for it silently drops every one of them.**
 *
 * An APNs *device* token is 32 bytes and its length is fixed. An ActivityKit
 * push-to-start token is not that shape at all — it is materially longer and
 * Apple does not document a fixed size, so pinning an exact length here would
 * turn a future change on their side into a feature that stops working with no
 * error anywhere.
 *
 * Bounded rather than open: hex only, and a ceiling, so a garbage value is
 * rejected here instead of becoming a 400 on the registration that also carries
 * the follow list. ⚠ The ceiling must match the backend's `@Matches`.
 */
export function normaliseActivityToken(raw: string): string | null {
  const cleaned = raw.replace(/[<>\s]/g, '').toLowerCase();
  return ACTIVITY_TOKEN.test(cleaned) ? cleaned : null;
}

/**
 * ⚠ **A bearer here is OPTIONAL, but a STALE one is fatal.**
 *
 * The route accepts anonymous callers — onboarding registers before any account
 * exists — but an expired token is a **401 anyway**, deliberately: optional means
 * a MISSING credential is acceptable, not a bad one. So this must be handed a
 * freshly-resolved token or none at all. Never a cached string.
 */
async function send<T>(
  method: 'PUT' | 'DELETE',
  path: string,
  body: unknown,
  token: string | null,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
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
 *
 * ⚠ **A bearer LINKS this row to the account, and the link is one-way.**
 * Re-registering anonymously afterwards KEEPS it — there is no unlink operation,
 * so signing out changes nothing server-side. Only registering while signed in as
 * a different user moves it. `linked` in the response says whether, never whose.
 */
export function registerDevice(
  body: PushRegistration,
  token: string | null = null,
): Promise<PushRegistrationView> {
  return send<PushRegistrationView>('PUT', '/cronogol/push/device', body, token);
}

/**
 * Alerts off for THIS device. Idempotent, silent on an unknown token.
 * Touches no account, no feed and no other device; a later register revives it.
 */
export function unregisterDevice(token: string): Promise<void> {
  // ⚠ Anonymous on purpose. The APNs token in the body is the whole authority —
  // this turns off THIS device and touches no account, so a bearer would add a
  // way to fail (an expired one is a 401) for nothing it needs.
  return send<void>('DELETE', '/cronogol/push/device', { token }, null);
}
