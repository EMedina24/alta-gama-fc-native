/**
 * Which fixtures the widget snapshot currently depends on.
 *
 * ⚠⚠ **This exists to stop `pruneCrestCache` deleting the widget's artwork.**
 * The App Group crest directory serves both the long-look card and the widgets,
 * but they are different selections over different windows — see the ⚠⚠ block on
 * that function's App Group sweep for the full argument. This module is a
 * one-variable seam so `crest-cache.ts` can read the widget's keep-list without
 * importing the widget feature's real work (and its React Query types) into the
 * notification path.
 *
 * ⚠ **Set SYNCHRONOUSLY, before any `await`,** in the same effect that re-arms
 * the reminders. If the prune wins that race the crests are simply re-downloaded
 * on the next warm — self-healing, but a visible flash of lettered tiles.
 *
 * ⚠⚠ **`null` means NOT YET KNOWN, and that is different from an empty pin set.**
 * This module used to initialise to `[]`, and the reasoning was that on a cold
 * launch there is no snapshot yet so there is nothing the widget is drawing to
 * protect. That is true of the WIDGET and false of the App Group, which the
 * long-look card and the Live Activity also read. The 7-day `useUpcoming` query
 * normally resolves before the 21-day `useWidgetWindow` one, so the re-arm — and
 * with it `pruneCrestCache` — routinely ran while `pins` was still the
 * initialiser, sweeping the container down to the reminder queue. A `widgetWindow`
 * query that merely FAILS left it that way for the whole session.
 *
 * ⚠ So the prune now declines to sweep the App Group at all until a snapshot has
 * been built at least once. Keeping too much is a disk-space problem; deleting
 * too much is artwork missing from a card ninety minutes later (ADR 0111).
 */
let pins: readonly string[] | null = null;

export function pinWidgetCrests(fixtureIds: readonly string[]): void {
  pins = fixtureIds;
}

/** ⚠ `null` means NOT YET KNOWN, which is not the same as empty. */
export function widgetCrestPins(): readonly string[] | null {
  return pins;
}

/** ⚠ Test seam only. Nothing in the app un-pins. */
export function resetWidgetCrestPins(): void {
  pins = null;
}
