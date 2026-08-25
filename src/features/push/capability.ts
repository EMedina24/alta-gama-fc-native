/**
 * **THE SEAM.** Everything the Apple Developer account gates lives behind this
 * one file (ADR 0023).
 *
 * Every other module — the registration builder, the reminder scheduler, the
 * sync effect — is written, wired and complete. They call the adapters below,
 * which currently answer "not available". When the licence lands, this file is
 * the ONLY one that changes; see `.claude/GO-LIVE.md` for the four-step recipe.
 *
 * ⚠ Do not scatter `if (pushAvailable)` through the app. A screen must never know
 * whether push exists — it changes preferences, and the sync effect decides
 * whether there is anywhere to send them.
 */

/**
 * Whether this build can obtain an APNs token.
 *
 * `false` because `expo-notifications` is not installed and, more fundamentally,
 * the `aps-environment` entitlement needs a paid membership. Flipping this
 * without doing the rest of GO-LIVE.md just makes the adapters throw.
 */
export const PUSH_AVAILABLE = false;

/** Whether this build has a widget extension and an App Group to write into. */
export const WIDGETS_AVAILABLE = false;

export type PermissionOutcome = 'granted' | 'denied' | 'unavailable';

/**
 * Ask for notification permission.
 *
 * ⚠ Asked AFTER the primer explains it, never on cold launch — iOS grants exactly
 * one system prompt and spending it before the reader knows what they are
 * agreeing to spends it badly.
 *
 * Today: answers `unavailable` without prompting, so the primer can still record
 * intent honestly rather than pretending to have asked.
 */
export async function requestPushPermission(): Promise<PermissionOutcome> {
  if (!PUSH_AVAILABLE) return 'unavailable';
  // GO-LIVE step 3:
  //   const { status } = await Notifications.requestPermissionsAsync();
  //   return status === 'granted' ? 'granted' : 'denied';
  throw new Error('PUSH_AVAILABLE is true but requestPushPermission is not implemented');
}

/**
 * This device's RAW APNs token, or null.
 *
 * ⚠ `getDevicePushTokenAsync()`, **never** `getExpoPushTokenAsync()` — the
 * backend talks to APNs directly with its own p8 key and validates a 64-hex
 * string. An Expo push token is a different thing entirely and is a 400 here.
 */
export async function getDeviceToken(): Promise<string | null> {
  if (!PUSH_AVAILABLE) return null;
  // GO-LIVE step 3:
  //   return (await Notifications.getDevicePushTokenAsync()).data;
  throw new Error('PUSH_AVAILABLE is true but getDeviceToken is not implemented');
}

/**
 * The APNs environment this build talks to.
 *
 * ⚠ **Not `__DEV__`.** That is false in a release-configuration dev-client build,
 * which is precisely what an internal EAS build is — and registering such a build
 * as `production` means it receives nothing, silently. Read an EAS profile var.
 */
export function apnsEnvironment(): 'sandbox' | 'production' {
  return process.env.EXPO_PUBLIC_APNS_ENV === 'production' ? 'production' : 'sandbox';
}

/** Reload widget timelines after the snapshot changes. No-op without a target. */
export async function reloadWidgets(): Promise<void> {
  if (!WIDGETS_AVAILABLE) return;
  // GO-LIVE step 4: WidgetCenter.shared.reloadAllTimelines() via a tiny native module.
}
