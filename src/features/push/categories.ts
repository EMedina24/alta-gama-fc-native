/**
 * Notification categories — the identifiers that unlock the long look.
 *
 * ⚠⚠ **A category identifier is a THREE-WAY contract and nothing validates it.**
 * The same string has to appear in all three of these or the designed card
 * silently does not render, with no error anywhere:
 *
 * 1. here, in `setNotificationCategoryAsync`;
 * 2. on the wire — `aps.category` from `senpai-backend`, and
 *    `categoryIdentifier` on every locally scheduled reminder;
 * 3. in `UNNotificationExtensionCategory` in the content extension's Info.plist
 *    (`targets/notification-content/expo-target.config.js`).
 *
 * ⚠ **`kickoff_reminder` is device-local and never reaches the backend.** The
 * server sends exactly two types; the reminder is scheduled on this device
 * (ADR 0024). It still needs a category, because the content extension keys off
 * one — but do not add it to any push DTO.
 *
 * ⚠ **One action, deliberately.** The design draws a second, `Mute this club`.
 * It is not built: muting needs an unfollow, a re-registration and a reminder
 * re-arm, and a background action cannot promise iOS will keep JS alive long
 * enough to finish the round-trip. The mute lives on the club page and the
 * alerts sheet, where it can be confirmed.
 */
import * as Notifications from 'expo-notifications';

import { PUSH_AVAILABLE } from './capability';

/** ⚠ Protocol values — never translated, never derived. See the header. */
export const CATEGORY_REMINDER = 'kickoff_reminder';
export const CATEGORY_MOVED = 'kickoff_moved';
export const CATEGORY_POSTPONED = 'fixture_postponed';

export const NOTIFICATION_CATEGORIES = [
  CATEGORY_REMINDER,
  CATEGORY_MOVED,
  CATEGORY_POSTPONED,
] as const;

/** The one action. Read back off `response.actionIdentifier` in `routing.ts`. */
export const ACTION_OPEN_CLUB = 'open_club';

/**
 * Register all three categories. Idempotent, so the cold-launch effect can call
 * it unconditionally.
 *
 * ⚠ The button title is localised, so this re-runs when the language changes —
 * iOS caches the category by identifier and a stale registration keeps the old
 * language on the button until the app re-registers it.
 */
export async function registerNotificationCategories(openClub: string): Promise<void> {
  if (!PUSH_AVAILABLE) return;

  const actions = [
    {
      identifier: ACTION_OPEN_CLUB,
      buttonTitle: openClub,
      options: { opensAppToForeground: true },
    },
  ];

  try {
    await Promise.all(
      NOTIFICATION_CATEGORIES.map((identifier) =>
        Notifications.setNotificationCategoryAsync(identifier, actions, {
          // The card draws its own header; the system title would double it.
          showTitle: false,
          showSubtitle: false,
        }),
      ),
    );
  } catch {
    // A failed registration costs the action button and the custom card, not
    // the notification. Never worth failing a launch over.
  }
}
