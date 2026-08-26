/**
 * The signed-in half of the API.
 *
 * ⚠ **The only part of this client that sends a bearer.** Every read in
 * [`client.ts`](./client.ts) is public and stays that way — adding auth there
 * would buy nothing and cost the rule below.
 *
 * ⚠ **An expired token is a 401, always — it never degrades to anonymous.** That
 * is deliberate on the backend's side, so a write cannot succeed while quietly
 * belonging to nobody. Which means every call here needs the refresh-once,
 * retry-once discipline in `withAuth`, ported from
 * `cronogol/components/subscribe-card/use-club-subscription.ts`.
 *
 * ⚠ CORS is the one thing that does NOT carry over from the web client: a native
 * request sends no `Origin` and has no preflight, so the backend's allowed-header
 * list is irrelevant here. The bearer contract is otherwise identical.
 */
import { API_BASE, CronogolApiError } from './client';
import type { AccountView } from './types';
import { getAccessToken, refreshAccessToken, signOut } from '@/store/session';

const REQUEST_TIMEOUT_MS = 10_000;

/** Signed out, or the session could not be revived. The caller renders, not throws. */
export class NotSignedInError extends Error {
  constructor() {
    super('No session');
    this.name = 'NotSignedInError';
  }
}

async function call<T>(
  method: 'GET' | 'PATCH' | 'DELETE',
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (res.status === 401) throw new CronogolApiError(401, 'unauthorised');
  if (!res.ok) throw new CronogolApiError(res.status, `${method} ${path} failed (${res.status})`);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

/**
 * Run an authenticated call, surviving exactly one expired token.
 *
 * ⚠ **Once, never a loop.** A 401 that survives a fresh token is not a stale
 * token — it is a deleted user, a revoked session, or a project key change, and
 * retrying it is an infinite loop against a rate-limited route.
 *
 * ⚠ The second 401 signs out. Leaving a dead session in place renders an account
 * sheet with an identity that no longer exists and a Delete button that 401s.
 */
async function withAuth<T>(run: (token: string) => Promise<T>): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new NotSignedInError();

  try {
    return await run(token);
  } catch (cause) {
    if (!(cause instanceof CronogolApiError) || cause.status !== 401) throw cause;

    const fresh = await refreshAccessToken();
    if (!fresh) {
      await signOut();
      throw new NotSignedInError();
    }

    try {
      return await run(fresh);
    } catch (retryCause) {
      if (retryCause instanceof CronogolApiError && retryCause.status === 401) {
        await signOut();
        throw new NotSignedInError();
      }
      throw retryCause;
    }
  }
}

export function getAccount(): Promise<AccountView> {
  return withAuth((token) => call<AccountView>('GET', '/cronogol/me', token));
}

export interface AccountPatch {
  /**
   * ⚠ **REQUIRED on every call, even when only the name changed.** An omitted
   * value is a 400, by design: it makes an empty body an error rather than a save
   * that silently does nothing. Send the toggle's current on-screen value.
   */
  notifyFixtureChanges: boolean;
  /** Omit to leave unchanged. ⚠ An explicit `null` is a 400 — clearing has no
   *  defined meaning. Capped at 60 characters and trimmed server-side. */
  displayName?: string;
  timeZone?: string;
}

export function patchAccount(patch: AccountPatch): Promise<AccountView> {
  return withAuth((token) => call<AccountView>('PATCH', '/cronogol/me', token, patch));
}

/**
 * Delete the account — the Guideline 5.1.1(v) path.
 *
 * ⚠ **204 and idempotent**: a retry after a timeout also answers 204, because the
 * JWT stays signature-valid for a while after the user is gone. Treat the second
 * call as success, not as a bug.
 *
 * ⚠ **This does NOT stop push on this device.** `device_tokens.user_id` is
 * `ON DELETE SET NULL`, so the registration survives, unlinked and still
 * delivering — deliberately, so deleting an account does not silently kill
 * alerts. The caller decides whether to `DELETE /cronogol/push/device` alongside.
 *
 * ⚠ Server-side it revokes every claimed calendar feed FIRST, permanently. Those
 * `.ics` URLs keep answering 200 with an empty calendar and the entry stays in
 * the user's calendar app until they remove it there. No server can change that,
 * so the confirmation copy has to say so.
 */
export function deleteAccount(): Promise<void> {
  return withAuth((token) => call<void>('DELETE', '/cronogol/me', token));
}
