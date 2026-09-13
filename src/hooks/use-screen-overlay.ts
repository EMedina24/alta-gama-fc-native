/**
 * A render slot ABOVE the screen — the scrim and panel of anything that has to
 * cover the page rather than sit in it (ADR 0163). Today that is the league
 * dropdown; a popover or a picker would use the same door.
 *
 * `ScreenScaffold` provides it and paints whatever is published as the last
 * sibling inside its root view, over the `ScrollView`. A control publishes its
 * overlay and takes it back down; nothing else in the app knows it exists.
 *
 * ⚠⚠ **This replaces `useCrownLift`, and the reason is worth keeping.** A crown
 * payload could not draw over the screen body on its own — the body is the
 * crown's SIBLING, and a child's z-index cannot pass its parent's siblings — so
 * the crown itself used to rise. But the crown's gradient is a fixed-height
 * LAYER that is deliberately taller than the crown and runs on behind the body
 * (ADR 0094/0095), and a lifted crown paints that overflow ON the body, hazing
 * the top of the screen. The lift therefore had to be released the instant its
 * own scrim cleared — and it could only be released by a React commit, which is
 * never "the instant" anything. Publishing over the scroll view instead means
 * there is no lift, no veil, and no race to lose.
 *
 * ⚠ It also means the scrim is OUTSIDE the `ScrollView` at last, so a drag on it
 * no longer scrolls the page under an open menu.
 *
 * ⚠⚠ **Publishing is loop-safe only because `payload` is the SCREEN's element.**
 * A control publishes from an effect; that sets state on the scaffold; the
 * scaffold re-renders — and React bails out of re-rendering `payload`, because
 * the screen created that element and its reference has not changed. If a future
 * change makes the scaffold build the payload itself, that bail-out disappears
 * and the effect becomes an infinite loop. Publish at event time instead if that
 * day comes.
 *
 * ⚠ It lives in `hooks/`, not beside `ScreenScaffold`, for the tier rule (ADR
 * 0013): the scaffold is a TEMPLATE and its consumers are MOLECULES, so a
 * molecule importing the template would be a dependency pointing upward. A hook
 * module is neutral ground both may read.
 *
 * ⚠ **One slot, last write wins.** Two controls publishing under one scaffold
 * would clobber each other. Only the league menu publishes today; a second
 * publisher needs this to become a keyed map first.
 *
 * ⚠ The default no-op means a control rendered OUTSIDE a scaffold opens into
 * nothing — a dead trigger with no error. It warns in dev rather than failing
 * silently, because the symptom gives no hint of the cause.
 */
import { createContext, useContext, type ReactNode } from 'react';

export type PublishOverlay = (node: ReactNode) => void;

export const ScreenOverlayContext = createContext<PublishOverlay>((node) => {
  if (__DEV__ && node) {
    console.warn(
      '[useScreenOverlay] Nothing published — no ScreenScaffold above this control. ' +
        'Its overlay will not render and the control will look dead.',
    );
  }
});

export function useScreenOverlay(): PublishOverlay {
  return useContext(ScreenOverlayContext);
}
