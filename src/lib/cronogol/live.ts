/**
 * In-play state from `GET /cronogol/live`, joined onto the fixtures already on
 * screen. Pure — no native import — so every rule here can be run in a plain-JS
 * harness the way `./board` and `./push` are.
 *
 * ⚠⚠ **This is not `./scores` and it does not soften it.** That file suppresses
 * liveness on `/cronogol/scores`, which is still a ~4-hourly, opta-keyed
 * snapshot with no crosswalk to our clubs; `statusText` there still returns
 * `null` for a `live` row and `concludedScores` still filters those rows out.
 * All of that stays. What changed is that a SECOND route exists whose liveness
 * is honest, and this file is the only place that may reason about it.
 * See `.claude/LIVE-SCORES.md` §1.
 *
 * ⚠ **Nor is it `./board`.** That module answers "which of my clubs is playing"
 * off the ~3h fixture sweep, and it still does. This one answers "and what is
 * actually happening in it", for the LaLiga subset the route covers.
 *
 * ⚠ **`League.live` in `./leagues` is a different word.** It means "this league
 * is shipped in the app" and has nothing to do with a match being played.
 * Nothing here reads it.
 */
import { involvesFollowed, liveFixture } from "./board";
import type { LiveMatchView, WindowFixtureView } from "./types";

/**
 * How old a live row may be before it is treated as absent.
 *
 * ⚠ **This exists because of the CACHE, not the network.** React Query holds a
 * body for `GC_TIME` (an hour), so a cold remount can hand the screen an
 * hour-old response before the first fetch resolves — and a minute rendered off
 * that is a frozen number presented as current, which is the whole failure this
 * feature could introduce. Rows that old are dropped and the caller falls back
 * to the fixture sweep, which at least says how old it is.
 */
export const LIVE_MAX_AGE_MS = 10 * 60 * 1000;

/**
 * How long without a fresh `lastSeenAt` before the data is called stalled.
 *
 * The backend re-reads every ~30s and the client polls every ~15s, so two
 * minutes is four missed sweeps — long enough to absorb ordinary jitter and a
 * slow request, short enough that a dead session is named within a minute of
 * anyone noticing the minute stopped moving.
 */
export const STALL_AFTER_MS = 2 * 60 * 1000;

/**
 * The live rows worth trusting, keyed by OUR fixture id.
 *
 * ⚠ **One map for the whole app.** The route returns every live match in a
 * single response, which is why `keys.live()` takes no argument — a per-fixture
 * key would turn one request into N for data that arrives together anyway.
 *
 * ⚠ An unparseable or stale `lastSeenAt` drops the row rather than being
 * compared: every comparison against `NaN` is false, so a bad stamp would lose
 * one test and win the other.
 */
export function liveById(
  matches: readonly LiveMatchView[],
  now: number,
): Map<string, LiveMatchView> {
  const byId = new Map<string, LiveMatchView>();

  for (const match of matches) {
    const seen = Date.parse(match.lastSeenAt);
    if (Number.isNaN(seen) || now - seen > LIVE_MAX_AGE_MS) continue;
    byId.set(match.fixtureId, match);
  }

  return byId;
}

/** What the board's lead card is showing, and which truth window it is in. */
export interface BoardLive {
  fixture: WindowFixtureView;
  /**
   * The live row, or `null` when this is the fixture sweep's own `live` flag —
   * a snapshot up to ~3h old, which the card must caption accordingly.
   */
  live: LiveMatchView | null;
}

/**
 * The match to lead the board with, and whether it is genuinely live.
 *
 * **Two tiers, in this order:**
 *
 * 1. a followed club's fixture that `/cronogol/live` says is in play right now;
 * 2. failing that, `liveFixture()` — the fixture sweep's own `live` flag.
 *
 * ⚠ **Tier 1 does NOT require `fixture.status === 'live'`.** The live route sees
 * kick-off within ~30s; the fixture sweep can be three hours behind it. Gating
 * tier 1 on the sweep would mean the honest feed could only ever confirm what
 * the stale one already said, which is the opposite of the point.
 *
 * ⚠ **Tier 2 is not dead code and must not be removed as a simplification.**
 * The route is LaLiga-only. A followed Premier League, Serie A, Bundesliga or
 * Segunda club has no tier-1 row and never will today — it gets exactly the card
 * it gets now, with the caption that states its age.
 *
 * Earliest kickoff wins within tier 1, the same rule `liveFixture` uses: the
 * match that started first is the one furthest along and most worth leading with.
 */
export function boardLive(
  fixtures: readonly WindowFixtureView[],
  followed: readonly string[],
  byId: ReadonlyMap<string, LiveMatchView>,
): BoardLive | null {
  const playing = fixtures
    .filter((fixture) => {
      if (!involvesFollowed(fixture, followed)) return false;
      return byId.get(fixture.id)?.status === "live";
    })
    .sort((a, b) => Date.parse(a.kickoffUtc) - Date.parse(b.kickoffUtc));

  const first = playing[0];
  if (first !== undefined) {
    // Non-null by the filter above; narrowed here rather than asserted.
    const live = byId.get(first.id);
    if (live !== undefined) return { fixture: first, live };
  }

  const swept = liveFixture(fixtures, followed);
  return swept === null ? null : { fixture: swept, live: null };
}

/**
 * The minute of play, or `null` when there is nothing honest to print.
 *
 * ⚠ Null unless the row is actually `live`: the API sends no minute before
 * kick-off or after full time, and a `status: 'unknown'` row is one whose
 * in-play state the upstream did not recognise — the score is still true there,
 * the minute is not. **Never render `0'`.**
 *
 * ⚠ **The number INCLUDES stoppage time.** `94` means "90+4"; there is no split
 * to make, `injuryTime` is always null for LaLiga, and composing one would
 * invent a distinction the source did not send. Render `94′`.
 */
export function liveMinute(match: LiveMatchView): number | null {
  if (match.status !== "live") return null;
  return match.minute;
}

/**
 * Whether the live data has stopped moving.
 *
 * `lastSeenAt` is the whole test, and it is honest precisely because it advances
 * every ~30s whether or not the SCORE moved — so a frozen stamp means we stopped
 * looking, rather than that nothing happened.
 *
 * ⚠⚠ **`polling` is deliberately NOT read, reversing 0048 decision 4.**
 * `.claude/LIVE-SCORES.md` §4 presents `polling: false` beside a non-empty
 * `matches` as the one failure mode this feature has, and 0048 trusted it as
 * authoritative. **Production contradicted that within a day.** Racing v Elche
 * on 2026-08-28 served `polling: false` on every sample across 17:05–17:35 UTC
 * while the rows moved perfectly — minute 4 → 22, score 0-0 → 2-0, `lastSeenAt`
 * advancing normally throughout. The flag reported a stall that was not
 * happening, and the card said so on a match that was updating every thirty
 * seconds.
 *
 * A freshness signal that cries wolf is worse than none: it teaches the reader
 * to ignore the one line on the card that is load-bearing. `lastSeenAt` measures
 * the thing we actually care about — whether our copy is moving — and it
 * measured it correctly the whole time the flag was wrong.
 *
 * ⚠ **This is not permission to stop caring about the two silences.** If the
 * backend's `polling` becomes trustworthy, the right change is to reinstate it
 * as a SECOND tell beside this one, not to swap back. See 0049.
 *
 * ⚠ An unparseable stamp counts as stalled. Erring toward "this may be out of
 * date" is the only direction an honesty signal may err in.
 */
export function isStalled(match: LiveMatchView, now: number): boolean {
  const seen = Date.parse(match.lastSeenAt);
  if (Number.isNaN(seen)) return true;
  return now - seen > STALL_AFTER_MS;
}

/**
 * Whole minutes since we last looked, for the stalled caption. `null` when the
 * stamp cannot be read — the caller then says the score may be out of date
 * without inventing a number for how far.
 */
export function minutesSinceSeen(match: LiveMatchView, now: number): number | null {
  const seen = Date.parse(match.lastSeenAt);
  if (Number.isNaN(seen)) return null;
  return Math.max(0, Math.floor((now - seen) / 60_000));
}
