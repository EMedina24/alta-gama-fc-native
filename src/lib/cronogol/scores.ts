/**
 * The scoreboard: a DIFFERENT feature on a DIFFERENT source from the fixture
 * routes, swept roughly every four hours.
 *
 * ⚠ PORTED FROM `cronogol/lib/cronogol/scores.ts` (ADR 0018); only the `Locale`
 * import path changed.
 *
 * ⚠ The rule this file exists to enforce: **`statusText` returns `null` for a
 * `live` row**, and that is the only place liveness can be stopped. Deleting our
 * own "live" strings was not enough — `statusLabel` outranks our words and the
 * provider sends "1ª parte" / "2ª parte" / "Descanso", so a dictionary-only
 * purge leaves the wire printing period wording with no error anywhere.
 */
import type { Locale } from "@/lib/i18n/phrases";

import { abbreviate } from "./derive";
import type {
  ScoreboardEventView,
  ScoreboardStatus,
  ScoreboardTeamView,
} from "./types";

/**
 * Everything the score rail needs that the scoreboard does not return.
 *
 * No `server-only` here, deliberately — the same call `./derive` makes. All of
 * it is pure, and the rail's client leaves are entitled to reach for it.
 *
 * ⚠ None of this may be reached for by anything reading `FixtureView` or
 * `JornadaFixtureView`. The scoreboard is a different provider with a different
 * status vocabulary and no club identity we share; see the band at the foot of
 * `./types`.
 */

/**
 * The order the rail paints in: newest kickoff first.
 *
 * ⚠ Never on `date`. That is the source's editorial bucket and it demonstrably
 * disagrees with chronology — a 22:00 UTC kickoff filed under the following
 * day — so grouping on it would put yesterday's late match after today's early
 * one. `kickoffUtc` is the only honest key.
 *
 * Reversed from what the API sends, which is ascending across the whole span so
 * yesterday comes first. `focus: 'center'` means the head of this array is what
 * sits centre-stage before the drift starts, and the oldest match of two days
 * is the worst possible thing to put there.
 *
 * ⚠ There used to be a live-first key ahead of this one, and it went with the
 * live count it existed to serve: it was there so the rail did not open on eight
 * finished matches under a meta line advertising three live ones. With nothing
 * claiming liveness there is nothing to reconcile, and pulling `live` rows to
 * the front would itself be a liveness claim — a silent one, made by ordering.
 * See docs/gotchas/scoreboard-liveness.md.
 *
 * ⚠ No clock is read. A `Date.now()` comparison would make the rendered order
 * depend on when the route last regenerated — the same trap `nextUpIndex` in
 * `./derive` avoids by driving off `status` instead.
 */
export function sortRail(
  events: readonly ScoreboardEventView[],
): ScoreboardEventView[] {
  return [...events].sort(
    (a, b) => Date.parse(b.kickoffUtc) - Date.parse(a.kickoffUtc),
  );
}

/**
 * How far back a scores card looks, from the page's own clock.
 *
 * ⚠ **A rolling 24 hours, deliberately NOT a calendar day.** "Today" is a
 * timezone question and this runs on the server, which does not know the
 * reader's zone — `PreferencesProvider` is a client store, which is why
 * `ScoreKickoff` is a client leaf at all. A UTC day was the previous answer and
 * it is the one that broke: the bucket rolls at 20:00 in New York and 19:00 in
 * Buenos Aires, so the card emptied itself mid-evening while the day's results
 * were still the freshest thing on the page.
 *
 * A rolling window has no such edge. It costs a small imprecision at the tail —
 * a match played 23 hours ago is "yesterday" to most readers — which the row cap
 * absorbs on any day with six results in it.
 */
export const CONCLUDED_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * The recently **concluded** matches, newest kickoff first.
 *
 * ⚠ **Finished with both scores, and nothing else** — the same test
 * `/cronogol/scores/recent` applies server-side (`status = 'finished'` AND
 * neither score null). A card headed "today's scores" that carries a row with
 * two dashes in it is a fixture list, and the reader cannot tell which it is:
 * production served a `scheduled` match kicking off at 19:15 UTC *tomorrow*
 * beside a live one, and rendered in New York the two read as a 3:15 PM match
 * that had somehow finished 0–0.
 *
 * That excludes `live` too, which is the point rather than a side effect. A row
 * the source flagged in-play was in play at the last sweep, up to four hours
 * ago; its score is a number that has almost certainly moved since. See
 * docs/gotchas/scoreboard-liveness.md.
 *
 * ⚠ **The window is what preserves the empty state.** Without it a quiet day
 * silently backfills with yesterday's results under a "today" heading, instead
 * of the "No matches today" copy that card is designed to show.
 *
 * ⚠ A `finished` row with a kickoff in the future is dropped rather than
 * trusted. It cannot be both, and the source — not us — decided it was.
 */
export function concludedScores(
  events: readonly ScoreboardEventView[],
  now: number,
  windowMs: number = CONCLUDED_WINDOW_MS,
): ScoreboardEventView[] {
  const floor = now - windowMs;

  return sortRail(
    events.filter((event) => {
      if (event.status !== "finished") return false;
      if (event.score.home === null || event.score.away === null) return false;

      // Dropped rather than compared: every comparison against NaN is false, so
      // an unparseable kickoff would lose here and win nowhere.
      const kickoff = Date.parse(event.kickoffUtc);
      return !Number.isNaN(kickoff) && kickoff >= floor && kickoff <= now;
    }),
  );
}

/**
 * The most recent moment the SOURCE moved anything on this board.
 *
 * Exists because a status alone overstates what this data is: the ingest sweeps
 * four times a day, so a row reading "Live" was true whenever it was last read
 * — possibly this morning. The card cannot show a clock and must not imply one,
 * but the absence of a clock is not itself a disclosure.
 *
 * ⚠ **This is the source's stamp, not ours, and that is the honest one** — the
 * reasoning is in the migration that stores it. Our own write time only says
 * the job ran; a 6-hourly sweep rewrites rows that have not changed, so it
 * reads fresh for a score that is a day old. The direction of the error is what
 * settles it: we can only ever have read this value at or after the moment the
 * source set it, so it is never *newer* than our last read of the row. It can
 * overstate the age of our copy. It cannot understate it.
 *
 * ⚠ **Newest, not oldest.** The oldest stamp belongs to whichever match
 * finished first and then stopped moving; it describes that row, not the board.
 *
 * ⚠ Parsed, never string-compared. These carry a `+00:00` offset and a
 * sub-second part whose precision varies row to row — one production response
 * held `…56.79+00:00` beside `…56.791+00:00`. Lexical order over that happens
 * to agree with chronological order today, which is a property of the strings
 * we were sent rather than one of the format.
 *
 * `null` when no row carries one, which is ordinary rather than a fault: the
 * caller renders nothing rather than inventing an age.
 */
export function lastSourceUpdate(
  events: readonly ScoreboardEventView[],
): string | null {
  let newest: string | null = null;
  let newestMs = -Infinity;

  for (const event of events) {
    if (event.lastUpdateAt === null) continue;
    const ms = Date.parse(event.lastUpdateAt);
    // Dropped rather than compared: every comparison against NaN is false, so
    // an unparseable stamp would lose silently here and win nowhere.
    if (Number.isNaN(ms) || ms <= newestMs) continue;
    newest = event.lastUpdateAt;
    newestMs = ms;
  }

  return newest;
}

/**
 * The statuses where we print our own word and ignore the source's.
 *
 * The test is whether the source's label says anything the enum does not. For
 * `finished` it never does — the provider sends exactly "Finalizado" / "Ended",
 * which is `finished` spelled out — so keeping it bought nothing and cost the
 * mosaic's 60px status cell, where "Finalizado" rendered as "FINALIZ…". Ours is
 * "Final", which fits and says the same thing.
 *
 * ⚠ `live` is not in here either, but for the opposite reason — it prints no
 * word at all. See `statusText`. `scheduled` is absent too: that row overrides
 * the word with a kickoff *time* at the call site, which is a different fix for
 * a different problem (crowding) — see `TodayScores`.
 */
const OWN_WORD: ReadonlySet<ScoreboardStatus> = new Set(["finished"]);

/**
 * What the status row prints, or `null` when it must print nothing.
 *
 * The source's own wording wins, and the *other* language wins over our own
 * word: when `status` is `unknown`, `statusLabel` is the only thing that says
 * what happened to the match, so a Spanish "Descanso" in an English rail is
 * worse copy but better information than a generic fallback. Ours is the third
 * choice, for the rows where the source sent nothing at all — and the first
 * choice for the statuses in `OWN_WORD` above.
 *
 * ⚠ **`live` returns `null`, and here is the only place that can be enforced.**
 * The product has no live scores. The ingest sweeps four times a day, so a row
 * the source flagged `live` was in play at the last sweep — up to four hours
 * before anyone reads it — and by then the match has almost certainly finished.
 * Callers print the kickoff time instead: a fact that does not decay.
 *
 * Deleting our own `live` string was NOT enough to stop this, which is the trap
 * worth knowing: `statusLabel` outranks `ours`, and the provider sends
 * "1ª parte" / "2ª parte" / "Descanso". A dictionary-only purge leaves the wire
 * printing period wording, with no error anywhere to say so. See
 * docs/gotchas/scoreboard-liveness.md.
 *
 * Two things follow from that early return, both deliberate. It narrows
 * `event.status`, which is what lets `ours` drop `live` so the dictionary key
 * can be deleted outright rather than left as a dead string nothing renders.
 * And the return type becomes `string | null`, so a new call site cannot forget
 * the live case — it fails to compile, which is the correct failure.
 *
 * ⚠ `Locale` is exactly `"es" | "en"` and `statusLabel` is exactly
 * `{ es, en }`, which is what lets this index directly with no mapping table.
 * That is a coincidence, not a contract — adding a third language breaks this
 * line at compile time, which is the correct failure.
 */
export function statusText(
  event: ScoreboardEventView,
  locale: Locale,
  ours: Record<Exclude<ScoreboardStatus, "live">, string>,
): string | null {
  if (event.status === "live") return null;
  if (OWN_WORD.has(event.status)) return ours[event.status];

  const other: Locale = locale === "es" ? "en" : "es";
  return (
    event.statusLabel[locale] ?? event.statusLabel[other] ?? ours[event.status]
  );
}

/** Which side of a card reads at full strength. */
export type Emphasis = "full" | "muted";

/**
 * The winner/loser emphasis, applied to a side's name *and* its goal count.
 *
 * Score-driven rather than status-driven, so a match still in play at the last
 * sweep mutes its trailing side exactly as a finished one does — which is what
 * the design shows, and why `outcome()` in `./derive` cannot be borrowed for
 * this: it gates on `status === "finished"` and would silently switch the
 * emphasis off for every row that is not one.
 *
 * ⚠ A draw keeps BOTH sides full, and so does a match with no score. There is
 * no loser in a fixture nobody has played, and a null must never be reasoned
 * about as a zero.
 */
export function scoreEmphasis(score: ScoreboardEventView["score"]): {
  home: Emphasis;
  away: Emphasis;
} {
  const { home, away } = score;
  if (home === null || away === null || home === away) {
    return { home: "full", away: "full" };
  }
  return home > away
    ? { home: "full", away: "muted" }
    : { home: "muted", away: "full" };
}

/** The longest string that still reads as a club code in a 24px tile. */
const CODE_MAX = 4;

/**
 * The three-letter code under a crest that failed to load.
 *
 * ⚠ The scoreboard's `shortName` is not the tidy code the rest of the API's is.
 * Production returns nulls, and returns strings long enough to overflow the
 * monogram they would be rendered into — so it is only trusted when it is short
 * enough to be a code, and otherwise the name is derived, exactly as it is for
 * the clubs that send no `shortName` at all.
 *
 * No slug argument: `CLUB_CODES` is keyed by *our* API slugs, and this source
 * shares no identifier with them.
 */
export function scoreAbbr(team: ScoreboardTeamView): string {
  const code =
    team.shortName && team.shortName.length <= CODE_MAX ? team.shortName : null;
  return abbreviate(team.name, undefined, code);
}

/**
 * A stable identity for one set of events, used as the track's React `key`.
 *
 * Splide clones the slides it is given into the same `<ul>` React rendered, so
 * a different event set arriving in the same tree position must remount the
 * whole track rather than mutate a list Splide believes it owns. Changing the
 * key is what forces that: React unmounts, cleanup destroys the instance and
 * its clones, and a fresh one mounts over fresh DOM.
 *
 * Length plus both ends is enough — the rail is sorted, so any change to the
 * day's matches moves one of the three.
 */
export function railSignature(events: readonly ScoreboardEventView[]): string {
  return `${events.length}:${events[0]?.id ?? ""}:${events.at(-1)?.id ?? ""}`;
}
