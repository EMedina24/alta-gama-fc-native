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
 * ⚠ In-memory only, and deliberately: on a cold launch nothing is pinned until
 * the first snapshot is built, and the prune that runs before it would sweep the
 * App Group down to the reminder queue. That is correct — a snapshot has not
 * been built yet, so there is nothing the widget is drawing to protect.
 */
let pins: readonly string[] = [];

export function pinWidgetCrests(fixtureIds: readonly string[]): void {
  pins = fixtureIds;
}

export function widgetCrestPins(): readonly string[] {
  return pins;
}
