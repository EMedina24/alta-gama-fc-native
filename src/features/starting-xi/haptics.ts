/**
 * Haptics carry the builder's state change (ADR 0065): the pitch is too small
 * for motion to read as confirmation. `.light` on place, `.rigid` on swap,
 * `.warning` on clear — the handoff's three, and nothing on remove or select.
 *
 * ⚠ The ONE file that imports `expo-haptics`. It is a native module: a dev
 * client built before it was declared throws at import, and keeping it here
 * means that failure has one address. Every call swallows — a haptic that
 * cannot fire is not an error the reader should see.
 */
import * as Haptics from 'expo-haptics';

import type { Effect } from './lineup';

export async function hapticFor(effect: Effect): Promise<void> {
  try {
    switch (effect) {
      case 'placed':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      case 'swapped':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
        return;
      case 'cleared':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      default:
        return;
    }
  } catch {
    // No haptic engine (simulator), or the module is missing from this build.
  }
}

/**
 * The export's receipt (ADR 0074): a Success notification the moment the PNG
 * is in Photos. Not an `Effect` — those are the builder's own moves — so it
 * has its own door here rather than widening that union.
 */
export async function hapticSaved(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // As above.
  }
}
