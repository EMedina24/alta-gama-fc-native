/**
 * Which fixtures might have a Live Activity started on them, and the keep-list
 * that stops the crest prune deleting their artwork (ADR 0111).
 *
 * ⚠⚠ **The Live Activity is the ONE crest consumer whose demand set is chosen by
 * the SERVER.** `LiveActivityService` push-to-starts a card at T−10 to T−7 with
 * the app closed, so neither of the two client-side selections is running at the
 * moment the artwork is needed — and `CrestView` reads the App Group and never
 * the network (ADR 0025 step 4, ADR 0085 §1). The crest therefore has to be on
 * disk from an EARLIER foreground, put there by a selection that anticipates the
 * server's.
 *
 * ⚠ Neither existing selection does that job:
 *
 *  - The reminder artwork set is the soonest 12 fixtures, and it exists only
 *    while `alertReminder` is on. A reader who turned kickoff reminders off gets
 *    no crest from this path at all — and they still get cards, because ADR 0055
 *    §5 hangs activity consent on `alertGoals`, a different switch.
 *  - The widget set is ≤ 6 entries chosen as "one fixture per followed club" for
 *    what the WIDGET DRAWS. On a busy matchday in-play fixtures consume its
 *    budget without gating anything, so a followed club kicking off tonight can
 *    fall outside it.
 *
 * ⚠ **No native import in this file, on purpose** — the selection is pure so it
 * runs in a plain-JS harness (HANDOFF working rules). The download lives in
 * `crest-cache.ts`, which owns every write into the App Group.
 */
import { involvesFollowed } from '@/lib/cronogol/board';
import { KICKOFF_HOLD_MS } from '@/lib/cronogol/live';
import type { WindowFixtureView } from '@/lib/cronogol/types';

/**
 * How far ahead a fixture is treated as "could start a card".
 *
 * ⚠ **Two days, not two hours, and the difference is the whole point.** The card
 * starts at T−10 minutes, but nothing about the app runs then. The window has to
 * be wide enough that an ORDINARY foreground — opening the app yesterday evening
 * — has already warmed tomorrow's match.
 */
export const ACTIVITY_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * How many fixtures travel.
 *
 * ⚠ Eight covers a full weekend slate for a reader following several clubs and
 * still bounds the cold case. It matters because the re-arm runs on EVERY
 * foreground (trap 16) — though a settled cache is free, since
 * `warmLongLookCrests` skips a file already on disk.
 */
export const ACTIVITY_CREST_BUDGET = 8;

/**
 * Followed clubs' fixtures that could have a card started on them soon.
 *
 * ⚠⚠ **`kickoffTbd` and `postponed` fixtures are INCLUDED, and that is the one
 * place this selection deliberately disagrees with both others.** `selectReminders`
 * and `selectWidgetFixtures` drop them, so such a fixture is in no write set and
 * no keep-list — its crest is deleted if present and never written if absent. The
 * backend does not drop it: `LiveActivityService` reasons explicitly about a
 * postponed fixture reaching the pre-kickoff start once it is reinstated, and a
 * TBD kickoff that gets confirmed is an ordinary match by the time it kicks off.
 *
 * ⚠ `cancelled` IS dropped — nothing restarts a cancelled match.
 *
 * ⚠ In-play fixtures stay, on the same `KICKOFF_HOLD_MS` the widget uses: a card
 * running right now is exactly the one whose artwork must not be pruned.
 */
export function selectActivityFixtures(
  fixtures: readonly WindowFixtureView[],
  followed: readonly string[],
  now: Date,
  budget: number = ACTIVITY_CREST_BUDGET,
): string[] {
  const from = now.getTime() - KICKOFF_HOLD_MS;
  const to = now.getTime() + ACTIVITY_WINDOW_MS;

  return fixtures
    .filter((fixture) => {
      if (fixture.status === 'cancelled') return false;
      const kickoff = Date.parse(fixture.kickoffUtc);
      if (Number.isNaN(kickoff) || kickoff <= from || kickoff > to) return false;
      return involvesFollowed(fixture, followed);
    })
    .sort((a, b) => Date.parse(a.kickoffUtc) - Date.parse(b.kickoffUtc))
    .map((fixture) => fixture.id)
    .filter((id, index, ids) => ids.indexOf(id) === index)
    .slice(0, budget);
}

/**
 * The keep-list, read by `pruneCrestCache`'s App Group sweep.
 *
 * ⚠⚠ **A THIRD selection over a THIRD horizon, which is trap 17 exactly.** The
 * sweep keeps the reminder queue ∪ the widget pins; a set that does not join that
 * union is deleted on the very next foreground, silently, and the failure only
 * shows up ninety minutes later on somebody's lock screen.
 *
 * ⚠ In-memory and `null` until set, mirroring `features/widgets/pins.ts` — see
 * `activityCrestPinsReady` there for why "not yet known" and "known to be empty"
 * have to be different answers.
 */
let pins: readonly string[] | null = null;

export function pinActivityCrests(fixtureIds: readonly string[]): void {
  pins = fixtureIds;
}

/** ⚠ `null` means NOT YET KNOWN, which is not the same as empty. */
export function activityCrestPins(): readonly string[] | null {
  return pins;
}

/** ⚠ Test seam only. Nothing in the app un-pins. */
export function resetActivityCrestPins(): void {
  pins = null;
}
