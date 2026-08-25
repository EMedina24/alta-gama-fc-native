/**
 * **THE SEAM.** Everything the Apple Developer account gated lives here
 * (ADR 0023). The licence landed 2026-08-25 and this is now implemented; ADR 0024
 * records what changed.
 *
 * ⚠ Do not scatter `if (PUSH_AVAILABLE)` through the app. A screen must never
 * know whether push exists — it changes preferences, and `use-push-sync` decides
 * whether there is anywhere to send them.
 */
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

/**
 * ⚠ **Simulators cannot register for remote notifications**, so there is no APNs
 * token to be had there — `getDevicePushTokenAsync()` rejects. Everything else
 * (local reminders, routing, `xcrun simctl push`) works on a simulator; only
 * registration needs real hardware.
 */
export const PUSH_AVAILABLE = true;

/** Flipped with the widget target. See GO-LIVE.md §4. */
export const WIDGETS_AVAILABLE = false;

export type PermissionOutcome = 'granted' | 'denied' | 'unavailable';

/**
 * How a notification behaves while the app is foregrounded.
 *
 * ⚠ Banners stay ON in the foreground. A kickoff reminder that arrives while the
 * reader is looking at the club page is still the reminder they asked for, and
 * silently swallowing it is how "I never got an alert" reports start.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Ask for notification permission.
 *
 * ⚠ Asked AFTER the primer explains it, never on cold launch — iOS grants exactly
 * one system prompt per install and spending it before the reader knows what they
 * are agreeing to spends it badly.
 *
 * ⚠ Re-asking after a denial does NOT re-prompt: iOS answers from the stored
 * decision. `getPermissionsAsync` first means we can tell "not asked yet" from
 * "asked and refused" and route the second to Settings rather than a dead button.
 */
export async function requestPushPermission(): Promise<PermissionOutcome> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return 'granted';
    if (!existing.canAskAgain) return 'denied';

    const { granted } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    });
    return granted ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}

/**
 * This device's RAW APNs token, or null.
 *
 * ⚠ `getDevicePushTokenAsync()`, **never** `getExpoPushTokenAsync()`. The backend
 * talks to APNs directly with its own p8 key and validates a 64-hex string; an
 * Expo push token is a different thing entirely and is a 400 there.
 *
 * ⚠ Returns null rather than throwing on a simulator or without permission — the
 * caller treats "no token" as "nothing to register", which is the truth.
 */
export async function getDeviceToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  try {
    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) return null;
    const token = await Notifications.getDevicePushTokenAsync();
    return typeof token.data === 'string' ? token.data : null;
  } catch {
    // No entitlement, no network at registration time, or a simulator.
    return null;
  }
}

/**
 * The APNs environment this build talks to.
 *
 * ⚠ **This is decided by the PROVISIONING PROFILE, not by whether it is a "dev
 * build".** The `aps-environment` entitlement is `development` only for a
 * *Development* profile; **Ad Hoc and App Store profiles both carry
 * `production`** — and EAS `distribution: "internal"` is ad-hoc. So an EAS
 * `development` build issues a PRODUCTION token.
 *
 * Proven the hard way on 2026-08-25: a token from the `development` profile
 * answered `400 BadDeviceToken` against APNs sandbox and reached production.
 * `eas.json` now sets this to `production` for every non-simulator profile.
 *
 * ⚠ **Not `__DEV__`** either — that is false in a release-configuration
 * dev-client build, which is exactly what an internal EAS build is.
 *
 * ⚠ Getting this wrong is SILENT: the device registers fine, the backend
 * dispatches to the wrong host, and every push fails with no error surfaced
 * anywhere in the app.
 */
export function apnsEnvironment(): 'sandbox' | 'production' {
  return process.env.EXPO_PUBLIC_APNS_ENV === 'production' ? 'production' : 'sandbox';
}

/** Reload widget timelines after the snapshot changes. No-op without a target. */
export async function reloadWidgets(): Promise<void> {
  if (!WIDGETS_AVAILABLE) return;
  // GO-LIVE step 4: WidgetCenter.shared.reloadAllTimelines() via a native module.
}
