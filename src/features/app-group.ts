/**
 * The App Group — the only channel this app has to its extensions.
 *
 * ⚠ **One constant, three consumers.** The notification service extension, the
 * notification content extension and the widgets all read out of this container,
 * and the identifier is repeated in `app.json`'s `ios.entitlements` and in
 * every `targets/<name>/expo-target.config.js`. A mismatch is silent on every side: the
 * container simply resolves to `null` and every crest becomes a lettered tile.
 *
 * ⚠ This lives outside `features/push/` on purpose. It used to be a private
 * constant in `crest-cache.ts`, and the widgets needed it — a widget importing
 * from the push feature is exactly the coupling the capability seam exists to
 * prevent.
 */
import { Directory, Paths } from 'expo-file-system';

/** Matches `ios.entitlements` in `app.json` and every target config. */
export const APP_GROUP = 'group.com.altagamafc.app';

/**
 * The shared container, or `null`.
 *
 * ⚠ `null` is a NORMAL answer, not an error: Android has no such thing, and a
 * simulator without the group provisioned answers the same way. Every caller
 * degrades — the extensions fall back to artwork they can draw themselves.
 */
export function groupContainer(): Directory | null {
  return Paths.appleSharedContainers[APP_GROUP] ?? null;
}
