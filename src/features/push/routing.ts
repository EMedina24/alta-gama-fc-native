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

import { routeFor, type NotificationRoute } from './deep-link';

export type { NotificationRoute };
export { routeFor };

/** The tap that launched the app, if it was a notification. */
export async function initialRoute(): Promise<NotificationRoute | null> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    return response ? routeFor(response.notification.request.content.data) : null;
  } catch {
    return null;
  }
}

/** Taps while the app is running. Returns an unsubscribe. */
export function onNotificationTap(handler: (route: NotificationRoute) => void): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const route = routeFor(response.notification.request.content.data);
    if (route) handler(route);
  });
  return () => subscription.remove();
}
