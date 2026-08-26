/**
 * The Notification Service Extension — crest artwork for SERVER pushes.
 *
 * ⚠ This target exists for exactly one reason: a REMOTE notification cannot
 * carry a local file, so the only way a push gets an attachment is for this
 * extension to download one before iOS displays it. The local kickoff reminder
 * does not use this target at all — it attaches a file the app already cached
 * (`src/features/push/crest-cache.ts`), because a local notification can never
 * run a service extension.
 *
 * ⚠ It only runs when the payload carries `mutable-content: 1`. `senpai-backend`
 * must set it; without that key this target is dead code and nothing reports it.
 * See `senpai-backend/HANDOFF-rich-notifications.md`.
 *
 * ⚠ **Swift lives here, outside `ios/`** (ADR 0025). Never `expo prebuild` and
 * commit `ios/` — that forfeits CNG permanently.
 */
module.exports = {
  type: 'notification-service',
  name: 'AltaGamaNotificationService',
  displayName: 'AltaGama FC Notifications',
  entitlements: {
    // Shared with the app and the content extension: this is where the two
    // single crests are left for the long look to read without a network call.
    'com.apple.security.application-groups': ['group.com.altagamafc.app'],
  },
};
