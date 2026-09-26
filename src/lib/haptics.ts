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

import type { XiEffect } from '@/features/starting-xi/xi-state';

/**
 * The builder's own moves (ADR 0215). Haptics carry the builder — there is no
 * sound (the handoff's chime needs an audio module the app does not ship):
 *
 * - `.light` — a player landing: placed, a lineup loaded;
 * - `.rigid` — two things trading places: swapped, mirrored;
 * - `.soft` — a player stepping back to the bench;
 * - selection tick — removed, the shape changed;
 * - Warning — the pitch cleared (after its confirm);
 * - Success — a lineup saved (`hapticSaved`, the export's receipt too).
 *
 * `deleted` is silent: the confirm Alert was the moment.
 */
export async function hapticFor(effect: XiEffect): Promise<void> {
  try {
    switch (effect) {
      case 'placed':
      case 'loaded':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      case 'swapped':
      case 'mirrored':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
        return;
      case 'benched':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        return;
      case 'removed':
      case 'reshaped':
        await Haptics.selectionAsync();
        return;
      case 'cleared':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      case 'saved':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
 * A NEXT UP deck shuffle completing (ADR 0113) — the card CLEARING THE
 * VIEWPORT, not the drag and not the deck swap a spring-tail later. `.light`,
 * the same weight as a token placing: both are a small object landing where
 * the finger sent it. Never fired on a spring-back — an aborted swipe
 * changed nothing.
 */
export async function hapticShuffle(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // As above.
  }
}

/**
 * A story saved on the news reel (ADR 0129) — `.light`, the same weight as a
 * token placing: a small object landing where the finger sent it.
 *
 * ⚠ Fired on save ON only, never on un-save: removing a bookmark is the reader
 * changing their mind, not the world changing under their finger — the same
 * doctrine as `hapticShuffle`'s "never on a spring-back".
 */
export async function hapticSaveStory(): Promise<void> {
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

/**
 * A Board card LIFTING under the finger (ADR 0174) — the moment the hold wins
 * and the row leaves the stack. `.rigid`, the XI's `swapped` weight: it is the
 * heaviest thing in the mode and the only one that reports a state the reader
 * cannot see yet (the hold has completed; the finger now moves a card).
 *
 * ⚠ It is also the accommodation. The lift is a 150 ms hold with no progress
 * indicator; without this the reader learns the delay by failing at it.
 */
export async function hapticLift(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
  } catch {
    // As above.
  }
}

/**
 * Two Board cards swapping mid-drag (ADR 0174) — `.light`, and deliberately
 * lighter than the lift: several fire in one drag, and at `.rigid` a travel
 * across four neighbours buzzes.
 */
export async function hapticReorder(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // As above.
  }
}
