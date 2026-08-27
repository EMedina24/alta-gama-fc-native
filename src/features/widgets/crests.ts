/**
 * Crest artwork for the widgets.
 *
 * ⚠⚠ **Pre-downloaded, never fetched by the extension** (ADR 0025 step 4). A
 * widget's timeline provider runs under a hard memory budget with no reliable
 * network — an `AsyncImage` in there draws an empty card and fills it in later,
 * or never. Every crest the widget draws has to be on disk before it runs.
 *
 * ⚠ The same App Group directory and the same `home`/`away` slot names the
 * long-look card uses, so a fixture already warmed by the reminder path costs
 * nothing here and `CrestView.swift` needs no second code path. The flip side is
 * that `pruneCrestCache` sweeps this directory too — see `./pins`.
 */
import { warmLongLookCrests } from '@/features/push/crest-cache';

import type { WidgetEntry } from './snapshot';

/**
 * Fetch the two crests for each snapshot entry, in parallel.
 *
 * ⚠ Best-effort and deliberately silent. A missing file costs artwork, not the
 * widget: `CrestView` falls back to a lettered tile it can draw from the
 * abbreviation already in the snapshot — and for Bundesliga and Serie A clubs
 * that tile is the EXPECTED output, not a failure. Their crests are SVG and
 * WebP, which do not decode on this device at all.
 *
 * ⚠ No budget of its own. `WIDGET_ENTRY_BUDGET` is 6, and the existing
 * `if (file.exists) return` skip inside `warmLongLookCrests` makes a settled
 * snapshot free on every foreground after the first.
 */
export async function warmWidgetCrests(entries: readonly WidgetEntry[]): Promise<void> {
  await Promise.all(entries.map((entry) => warmLongLookCrests(entry.fixtureId)));
}
