/**
 * Every haptic in the app.
 *
 * ⚠ **The ONE file that imports `expo-haptics`.** It is a native module: a dev
 * client built before it was declared throws at import, and keeping it here
 * means that failure has one address. Every call swallows — a haptic that
 * cannot fire is not an error the reader should see.
 *
 * ⚠ It lived at `features/starting-xi/haptics.ts` until ADR 0081, when the
 * account sheet wanted one too. It moved rather than being copied, because the
 * single-address rule above is the whole point of the file and a second
 * importer would end it.
 *
 * Haptics are not decoration here. On the XI pitch they carry a state change
 * motion is too small to show (ADR 0065); on the account sheet they mark the
 * two moments where a tap commits to something — arming the delete, and
 * changing what a notification will do.
 */
import * as Haptics from 'expo-haptics';

import type { Effect } from '@/features/starting-xi/lineup';

/**
 * The builder's own moves (ADR 0065): `.light` on place, `.rigid` on swap,
 * `.warning` on clear — the handoff's three, and nothing on remove or select.
 */
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

/**
 * A preference changing under the finger (ADR 0081) — a lead-time chip.
 *
 * ⚠ Deliberately NOT fired by the alert switches beside them. `Switch` is the
 * platform `UISwitch` and iOS gives it its own feel; adding ours would double
 * it on the one control that already has one.
 */
export async function hapticToggle(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // As above.
  }
}

/**
 * A NEXT UP deck shuffle committing (ADR 0113) — the card crossing the point
 * of no return, not the drag itself. `.light`, the same weight as a token
 * placing: both are a small object landing where the finger sent it. Never
 * fired on a spring-back — an aborted swipe changed nothing.
 */
export async function hapticShuffle(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // As above.
  }
}

/**
 * The first press of the two-step account delete (ADR 0081). A Warning, the
 * same notification type the XI's `cleared` uses — this is the moment the
 * reader is told the next tap is final, and it should feel unlike every other
 * tap on the sheet.
 */
export async function hapticArmed(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    // As above.
  }
}
