/**
 * Where a tapped notification lands.
 *
 * ⚠ Two entry points, and missing either loses taps:
 * - **Cold start** — the app was not running. `getLastNotificationResponseAsync`
 *   is the only way to see that tap; a listener registered after launch has
 *   already missed it.
 * - **Warm** — the app was backgrounded. The listener catches it.
 *
 * The parsing itself lives in `deep-link.ts`, which imports nothing native and is
 * therefore testable without a build.
 */
import * as Notifications from 'expo-notifications';

import { ACTION_OPEN_CLUB } from './categories';
import { routeFor, type NotificationRoute } from './deep-link';

export type { NotificationRoute };
export { routeFor };

/**
 * Does this response want a destination at all?
 *
 * ⚠ **A dismissal arrives here as a response.** With `customDismissAction` off
 * iOS does not send one today, but the identifier is part of the API and a
 * future category option turns it on — routing a swipe-away to the club page
 * would open the app from a gesture that means "go away".
 *
 * The default tap and our one action button are deliberately the same
 * destination: the action exists to make the target explicit on the long look,
 * not to lead somewhere else.
 */
function wantsRoute(actionIdentifier: string): boolean {
  if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) return true;
  return actionIdentifier === ACTION_OPEN_CLUB;
}

/** The tap that launched the app, if it was a notification. */
export async function initialRoute(): Promise<NotificationRoute | null> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (!response || !wantsRoute(response.actionIdentifier)) return null;
    return routeFor(response.notification.request.content.data);
  } catch {
    return null;
  }
}

/** Taps while the app is running. Returns an unsubscribe. */
export function onNotificationTap(handler: (route: NotificationRoute) => void): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    if (!wantsRoute(response.actionIdentifier)) return;
    const route = routeFor(response.notification.request.content.data);
    if (route) handler(route);
  });
  return () => subscription.remove();
}
