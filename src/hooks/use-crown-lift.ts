/**
 * How a CROWN PAYLOAD asks the crown to rise above the screen body while it has
 * something open over it (ADR 0162) — today, the league dropdown's panel.
 *
 * ⚠⚠ **Always pair the `true` with a `false`.** The crown's gradient layer is
 * deliberately taller than the crown and runs on BEHIND the body (ADR
 * 0094/0095). Raise the crown and that overflow paints ON the body instead,
 * veiling the top of the screen in the fade's tail — on the Table that was the
 * band legend and the first two rows going hazy (simulator, 2026-09-13). A
 * caller holds the lift for exactly as long as its own scrim is up, because the
 * scrim is the only thing hiding the veil, and drops it on the same frame the
 * scrim finishes fading.
 *
 * ⚠ A control on the screen BODY needs none of this: the body already paints
 * after the crown, so a z-index among its own siblings is enough. Only a crown
 * payload has a parent to escape.
 *
 * ⚠⚠ **It lives here, not beside `ScreenScaffold`, for the tier rule** (ADR
 * 0013): the scaffold is a TEMPLATE and the league menu is a MOLECULE, so the
 * molecule importing the template would be a dependency pointing upward. A hook
 * module is neutral ground both may read. `ScreenScaffold` provides the value;
 * a payload consumes it.
 *
 * The default is a no-op, so a control rendered outside any scaffold — the
 * debug gallery, a future sheet — needs no guard at the call site.
 */
import { createContext, useContext } from 'react';

export const CrownLiftContext = createContext<(lifted: boolean) => void>(() => {});

export function useCrownLift(): (lifted: boolean) => void {
  return useContext(CrownLiftContext);
}
