/**
 * What auth can do on this build, in one place.
 *
 * ⚠ Same job as [`features/push/capability.ts`](../push/capability.ts), and the
 * same rule: **do not scatter these checks through the app.** A screen asks this
 * module, or it asks nothing.
 */
import * as AppleAuthentication from 'expo-apple-authentication';

import { AUTH_CONFIGURED } from '@/store/session';

/**
 * **Whether signing in is REQUIRED to use the app.**
 *
 * ⚠ `false` today: v1.1 ships sign-in as an optional upgrade, and every screen
 * works signed-out exactly as it did in the anonymous v1 (ADR 0038). The whole
 * point of this constant is that making it mandatory later is a one-line change
 * plus copy — `AuthGate` in the root layout already reads it and already knows
 * where to send a signed-out reader.
 *
 * ⚠ Flipping this to `true` also makes Guideline 5.1.1(v) unavoidable and turns
 * the sign-in sheet into a blocking screen — check the gate's own comment before
 * doing it.
 */
export const AUTH_REQUIRED = false;

/** Whether the sign-in sheet can be offered at all. */
export const AUTH_AVAILABLE = AUTH_CONFIGURED;

/**
 * Whether Sign in with Apple can run here.
 *
 * ⚠ Not a constant. It is false on a simulator without a signed-in Apple ID and
 * on any device below the OS minimum, and Guideline 4.8 only obliges us to OFFER
 * Apple — drawing a button that throws on tap is worse than drawing none.
 */
export function appleAvailable(): Promise<boolean> {
  return AppleAuthentication.isAvailableAsync().catch(() => false);
}
