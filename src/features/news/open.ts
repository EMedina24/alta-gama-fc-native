/**
 * How an article opens — the ONE seam (ADR 0064, phase 2 now in effect).
 *
 * `expo-web-browser`'s `openBrowserAsync`: an in-app `SFSafariViewController`
 * presented as a page sheet, so the reader swipes it away and lands back on
 * the news list. `Linking.openURL` survives only as the fallback for a
 * non-http scheme, which `openBrowserAsync` rejects on iOS. Every open in the
 * app — the sheet's button and a first-party row's direct tap — goes through
 * here.
 *
 * ⚠ Never `article.id` in here: it is purged at 30 days. The URL is the handle.
 */
import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { Colors } from '@/constants/theme';

/**
 * iOS refuses a second `SFSafariViewController` while one is presented, so a
 * double-tap on a row must be a no-op until the first browser is dismissed
 * (`openBrowserAsync` resolves on dismissal).
 */
let opening = false;

export async function openArticle(url: string): Promise<void> {
  if (!/^https?:\/\//.test(url)) {
    await Linking.openURL(url);
    return;
  }
  if (opening) return;
  opening = true;
  try {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      controlsColor: Colors.dark.accent,
      toolbarColor: Colors.dark.card,
      dismissButtonStyle: 'done',
      enableBarCollapsing: true,
    });
  } finally {
    opening = false;
  }
}
