/**
 * How an article opens — the ONE seam (ADR 0064).
 *
 * Phase 1: the reader's default browser, via `Linking.openURL`. Phase 2 swaps
 * this body for `expo-web-browser`'s `openBrowserAsync` (an in-app
 * `SFSafariViewController` the reader can close without leaving the app); the
 * dependency is already installed for Google sign-in. Every open in the app —
 * the sheet's button and a first-party row's direct tap — goes through here so
 * that swap is one line.
 *
 * ⚠ Never `article.id` in here: it is purged at 30 days. The URL is the handle.
 */
import { Linking } from 'react-native';

export async function openArticle(url: string): Promise<void> {
  await Linking.openURL(url);
}
