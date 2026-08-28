/**
 * What this device last sent to `PUT /cronogol/push/device`.
 *
 * ⚠ **There is no `GET /cronogol/push/device`.** The PUT response is the only
 * read-back of registered state, so the app IS the source of truth for its own
 * registration and must persist it. Without this there is no way to know whether
 * a write landed, and every launch would re-register blindly into a 20/min limit.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PushRegistration } from '@/lib/cronogol/push';

const STORAGE_KEY = 'altagama:push-registration';

/**
 * ⚠ **A SEPARATE key, deliberately — this must never join `PushRegistration`.**
 * That type is the wire body, and the DTO is `forbidNonWhitelisted`: one extra
 * field is a 400 on every registration, which is a total and silent failure of
 * push for that device. Keep it out of the body.
 */
const LINKED_USER_KEY = 'altagama:push-linked-user';

/** The last body the server ACKed, or null if we have never registered. */
export async function readLastRegistration(): Promise<PushRegistration | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PushRegistration) : null;
  } catch {
    return null;
  }
}

export async function writeLastRegistration(body: PushRegistration): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(body));
  } catch {
    // Storage unavailable: we re-register next launch, which is idempotent.
  }
}

export async function clearLastRegistration(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([STORAGE_KEY, LINKED_USER_KEY]);
  } catch {
    // Nothing to do.
  }
}

/**
 * The account id this device was last registered UNDER, or null if never.
 *
 * ⚠ Not the same question as "who is signed in". There is no unlink on the
 * backend — an anonymous re-register KEEPS an existing link — so this records
 * what the server already knows, which is the only thing worth diffing against.
 */
export async function readLastLinkedUser(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LINKED_USER_KEY);
  } catch {
    return null;
  }
}

export async function writeLastLinkedUser(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LINKED_USER_KEY, userId);
  } catch {
    // We re-link on the next launch, which is idempotent.
  }
}

/** Whether anything the server cares about changed. Field-wise, not deep-equal. */
export function registrationChanged(
  previous: PushRegistration | null,
  next: PushRegistration,
): boolean {
  if (!previous) return true;
  return (
    previous.token !== next.token ||
    previous.lang !== next.lang ||
    previous.environment !== next.environment ||
    previous.alertMoved !== next.alertMoved ||
    previous.alertPostponed !== next.alertPostponed ||
    previous.alertGoals !== next.alertGoals ||
    previous.clubSlugs.length !== next.clubSlugs.length ||
    previous.clubSlugs.some((slug, i) => slug !== next.clubSlugs[i])
  );
}
