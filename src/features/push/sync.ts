/**
 * Keeps the server's idea of this device in step with the preferences store.
 *
 * ⚠ This module is COMPLETE. It builds the exact wire body, debounces, diffs
 * against what was last sent, and handles the error cases. The only thing it
 * cannot do today is obtain a token — `getDeviceToken()` answers null, so
 * `syncPushRegistration` returns `'no-token'` and nothing else changes.
 *
 * `buildRegistration` is a pure function and is exercised by `_debug` today, so
 * the body is known-correct before an APNs token has ever existed.
 */
import {
  MAX_CLUB_SLUGS,
  normaliseToken,
  registerDevice,
  unregisterDevice,
  type PushRegistration,
} from '@/lib/cronogol/push';
import type { Locale } from '@/lib/i18n/phrases';
import type { Preferences } from '@/store/preferences';
import {
  clearLastRegistration,
  readLastLinkedUser,
  readLastRegistration,
  registrationChanged,
  writeLastLinkedUser,
  writeLastRegistration,
} from '@/store/registration';
import { getAccessToken, getSessionUserId } from '@/store/session';
import { apnsEnvironment, getDeviceToken } from './capability';

/**
 * ⚠ 20/min on this route, and a reader scrolling the club browser toggling
 * follows would blow through it. Every write goes through a trailing debounce.
 */
const DEBOUNCE_MS = 1_500;

export type SyncResult = 'sent' | 'unchanged' | 'no-token' | 'failed';

/**
 * The wire body for a given device state. Pure — no I/O, no clock.
 *
 * ⚠ `clubSlugs` is capped at `MAX_CLUB_SLUGS`: the DTO rejects a longer array
 * outright, so the 21st follow would fail the whole registration rather than
 * being dropped. Truncating keeps the first 20 the reader chose.
 *
 * ⚠ There is no `alertReminder` on the wire. Kickoff reminders are never sent by
 * the server, by design — the app schedules them locally. That switch is local
 * state and must not leak into this body, where it would be an undeclared field
 * and a 400.
 */
export function buildRegistration(
  prefs: Preferences,
  locale: Locale,
  token: string,
): PushRegistration | null {
  const normalised = normaliseToken(token);
  if (!normalised) return null;

  return {
    token: normalised,
    platform: 'ios',
    lang: locale,
    clubSlugs: [...prefs.followed].slice(0, MAX_CLUB_SLUGS),
    alertMoved: prefs.alertMoved,
    alertPostponed: prefs.alertPostponed,
    alertGoals: prefs.alertGoals,
    environment: apnsEnvironment(),
  };
}

let timer: ReturnType<typeof setTimeout> | null = null;

/**
 * Send the current state, if it differs from the last accepted one.
 *
 * Call sites, per `.claude/PUSH-AND-ACCOUNTS.md`: after permission is granted, on
 * every cold launch (tokens rotate on restore and reinstall), and on every follow
 * or alert-switch change.
 */
export async function syncPushRegistration(
  prefs: Preferences,
  locale: Locale,
): Promise<SyncResult> {
  const token = await getDeviceToken();
  if (!token) return 'no-token';

  const body = buildRegistration(prefs, locale, token);
  if (!body) return 'failed';

  /**
   * ⚠ **Only a NEW sign-in is worth a re-register — not a sign-out.**
   *
   * A bearer links the row to the account, and the link is permanent: there is no
   * unlink, and an anonymous re-register keeps it. So going signed-in → signed-out
   * changes nothing the server would record, and firing a call for it would spend
   * one of 20/min to tell it something it already knows. Signing IN, or switching
   * accounts, is the case that must not be missed.
   */
  const userId = getSessionUserId();
  const linkChanged = userId !== null && userId !== (await readLastLinkedUser());

  const previous = await readLastRegistration();
  if (!registrationChanged(previous, body) && !linkChanged) return 'unchanged';

  /**
   * ⚠ Resolved HERE, per call, never cached. `getAccessToken` refreshes an
   * expired token; a stale one would be a 401 even though this route accepts
   * anonymous callers, and push would fail silently for that device.
   */
  const bearer = userId ? await getAccessToken() : null;

  try {
    const view = await registerDevice(body, bearer);
    // ⚠ Persist what the SERVER echoed, not what we sent: it collapses duplicate
    // slugs, so trusting our own array would re-send forever.
    await writeLastRegistration({ ...body, clubSlugs: view.clubSlugs });
    // ⚠ Recorded from the RESPONSE's `linked`, so a bearer the server rejected
    // does not leave us believing the row is linked and never retrying.
    if (userId && view.linked) await writeLastLinkedUser(userId);
    return 'sent';
  } catch {
    // Never throw into a render. A failed write retries on the next change or launch.
    return 'failed';
  }
}

/** Trailing-debounced `syncPushRegistration`, for rapid follow toggling. */
export function schedulePushSync(prefs: Preferences, locale: Locale): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void syncPushRegistration(prefs, locale);
  }, DEBOUNCE_MS);
}

/**
 * Alerts off for this device.
 *
 * ⚠ Does NOT touch calendars. A feed the reader subscribed to stays in their
 * calendar app until they delete it there — the copy has to say so.
 */
export async function disablePushForDevice(): Promise<void> {
  const token = await getDeviceToken();
  if (token) {
    const normalised = normaliseToken(token);
    if (normalised) {
      try {
        await unregisterDevice(normalised);
      } catch {
        // Idempotent and silent on an unknown token; nothing to recover.
      }
    }
  }
  await clearLastRegistration();
}
