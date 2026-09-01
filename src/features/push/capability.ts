/**
 * **THE SEAM.** Everything the Apple Developer account gated lives here
 * (ADR 0023). The licence landed 2026-08-25 and this is now implemented; ADR 0024
 * records what changed.
 *
 * ⚠ Do not scatter `if (PUSH_AVAILABLE)` through the app. A screen must never
 * know whether push exists — it changes preferences, and `use-push-sync` decides
 * whether there is anywhere to send them.
 */
import { ExtensionStorage } from '@bacons/apple-targets';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import LiveActivity from '@/modules/live-activity';
import { normaliseActivityToken } from '@/lib/cronogol/push';

/**
 * ⚠ **Simulators cannot register for remote notifications**, so there is no APNs
 * token to be had there — `getDevicePushTokenAsync()` rejects. Everything else
 * (local reminders, routing, `xcrun simctl push`) works on a simulator; only
 * registration needs real hardware.
 */
export const PUSH_AVAILABLE = true;

/**
 * The widget target landed in ADR 0047 — both home-screen sizes and the Lock
 * Screen accessories.
 *
 * ⚠ Still a seam, and it still matters: a widget reload is a no-op on Android
 * and on a simulator without the App Group provisioned, and no screen should
 * ever learn the difference.
 */
export const WIDGETS_AVAILABLE = true;

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
 * Whether this device can show a match Live Activity (ADR 0055).
 *
 * ⚠ **Two gates, both real and both runtime.** iOS 18 for the broadcast channel
 * the activity subscribes to, and the reader's own per-app Live Activities
 * setting, which they can switch off in Settings at any time. Neither is a build
 * flag, so unlike `PUSH_AVAILABLE` and `WIDGETS_AVAILABLE` this is a FUNCTION —
 * a constant would be read once at import and go stale the moment the reader
 * changes their mind.
 *
 * ⚠ A device that fails either keeps the ADR 0053 banners. It does not lose the
 * feature, it gets the older shape of it.
 */
export function liveActivitiesAvailable(): boolean {
  try {
    return LiveActivity.isSupported();
  } catch {
    // No native module: Expo Go, a web build, or a bundle predating ADR 0057.
    return false;
  }
}

/**
 * This device's ActivityKit push-to-start token, or null.
 *
 * ⚠ **Null is the ordinary answer, not a failure.** Below iOS 18, on a
 * simulator, with activities switched off, or simply before the first emission,
 * there is no token — and the caller treats "no token" as "this device cannot
 * show a card", which is the truth. Exactly `getDeviceToken()`'s posture.
 *
 * ⚠ Normalised HERE, once, so `buildRegistration` stays pure and nothing
 * downstream has to know the shape. See `normaliseActivityToken` for why it is
 * not `normaliseToken` — the two tokens are different lengths and running the
 * 64-hex check over this one discards every token silently.
 */
export function getPushToStartToken(): string | null {
  try {
    const raw = LiveActivity.getPushToStartToken();
    return raw ? normaliseActivityToken(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Fire `onToken` whenever the push-to-start token changes.
 *
 * ⚠⚠ **The token rotates, and a stale one starts nothing.** It changes on
 * reinstall and on restore-from-backup, exactly like the APNs device token — and
 * the failure is silent, because a start push to a dead token is accepted by
 * APNs and simply never produces a card. `use-push-sync` re-registers on it.
 *
 * ⚠ Returns the unsubscribe. The native side begins observing at module
 * creation, not on the first subscriber, so a token minted before React mounted
 * is already cached and `getPushToStartToken()` will answer it.
 */
export function onPushToStartToken(onToken: (token: string) => void): () => void {
  try {
    const subscription = LiveActivity.addListener('onPushToStartToken', ({ token }) => {
      const normalised = normaliseActivityToken(token);
      if (normalised) onToken(normalised);
    });
    return () => subscription.remove();
  } catch {
    return () => {};
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

/**
 * Reload widget timelines after the snapshot changes.
 *
 * ⚠ **Called with no `kind`, on purpose.** `ExtensionStorage.reloadWidget(name)`
 * maps to `WidgetCenter.shared.reloadTimelines(ofKind:)` and the bare call to
 * `reloadAllTimelines()`. Passing a kind would introduce a string that has to
 * equal `AppIntentConfiguration(kind:)` in two Swift files with nothing
 * validating either — trap 14's twin, and its failure is silent: the widget
 * keeps rendering its last timeline and never sees a follow change. There are
 * two widgets and both want reloading anyway.
 *
 * ⚠ **The caller must only reach here when the snapshot actually changed.**
 * WidgetKit rations reloads (roughly 40–70 a day for an actively used widget)
 * and spending the budget freezes the widget for the rest of the day with
 * nothing in any log. `snapshotKey()` is that guard; see `use-push-sync.ts`.
 *
 * ⚠ Kept in this file rather than moved to `features/widgets/` to be tidy — the
 * seam is one file, and splitting it is how `if (WIDGETS_AVAILABLE)` starts
 * spreading through the app.
 */
export async function reloadWidgets(): Promise<void> {
  if (!WIDGETS_AVAILABLE) return;
  try {
    ExtensionStorage.reloadWidget();
  } catch {
    // No target on this platform, or the native module is absent in Expo Go.
  }
}
