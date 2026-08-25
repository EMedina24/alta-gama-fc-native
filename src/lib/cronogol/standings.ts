/**
 * Standings derivations — the qualification bands, and the "after matchday N"
 * caption.
 *
 * ⚠ PORTED VERBATIM FROM `cronogol/lib/cronogol/standings.ts` (ADR 0018). Two
 * functions here are the difference between a table that informs and one that
 * lies, and both have their reasoning inline: `bandsApply` (why a colour is
 * suppressed) and `completedMatchweek` (why the caption is measured against the
 * table's own `lastMatchUtc` and not the wall clock).
 */
import type { League, ZoneKind } from "./leagues";
import type { StandingsRowView, StandingsTableView } from "./types";

/**
 * Everything the standings page derives that the API does not serve: which band
 * a row falls in, which bands the legend should list, and whether either
 * question may be asked of this table at all.
 *
 * Deliberately free of `server-only` and of every fetch — this is arithmetic
 * over a payload the page already holds, and the same reasoning `./jornada`
 * gives applies: a client leaf may one day want `zoneFor` for a row it tints
 * itself.
 *
 * The bands themselves live on `League.zones` in `./leagues`, beside the club
 * count they are checked against.
 */

/**
 * The band a finishing position falls in, or null for mid-table.
 *
 * Ranges rather than a chain of comparisons, so a league that runs its Europa
 * places across two positions (Serie A's fifth and sixth) says exactly that
 * instead of being encoded as the gap between two thresholds.
 *
 * ⚠ Takes a `rank` off the wire, which is 1-based and contiguous — never an
 * array index.
 */
export function zoneFor(rank: number, league: League): ZoneKind | null {
  const zone = league.zones.find((band) => rank >= band.from && rank <= band.to);
  return zone?.kind ?? null;
}

/**
 * May this table be banded at all?
 *
 * ⚠ **The one guard the whole feature rests on.** `clubs` counts the clubs we
 * hold a fixture for, and it under-reports exactly when coverage is worst: a
 * match between two untracked clubs is fetched by nobody, so both clubs lose a
 * match from `played`, `points` and `goalDifference` with nothing in the
 * payload looking wrong. Ranks computed over a short table are positions in a
 * different league from the one whose bands we hold.
 *
 * Getting that wrong is not a cosmetic error — it is a rail down the side of a
 * row saying a club is relegated, or in the Champions League, when it is not.
 * So a short table renders with no rail and no legend: the numbers are still
 * the numbers, and nothing claims a place.
 *
 * ⚠ Compared against `League.clubCount` — the league's own top flight — and
 * **not** against the length of `GET /cronogol/teams`, which for LaLiga is 25
 * because five relegated clubs are still followed into segunda.
 *
 * ⚠ **And nothing is banded before a ball is kicked**, which is the second
 * clause and was not obvious until the page was built. Between the July
 * rollover and the first kickoff every club is on zero, which is a *correct*
 * table and not an empty state — but clubs level on every criterion are finally
 * separated by club slug, so the order is alphabetical and means nothing.
 * Verified against production on 2026-08-15: banding it painted Sevilla,
 * Valencia and Villarreal into the relegation places and left Real Madrid
 * sixteenth, purely because of where their slugs sort. Every one of those
 * numbers was right and the colour was a lie.
 */
export function bandsApply(table: StandingsTableView, league: League): boolean {
  return table.clubs === league.clubCount && table.matchesPlayed > 0;
}

/**
 * The bands actually present in a table, in the order they first appear.
 *
 * The legend lists these rather than the league's full four, so a table that
 * has been truncated — or a league whose config genuinely has no Conference
 * route — never captions a colour that is nowhere on the screen. Row order
 * means it reads top-down: Champions League, Europa, Conference, relegation.
 */
export function usedZones(
  rows: readonly StandingsRowView[],
  league: League,
): ZoneKind[] {
  const seen: ZoneKind[] = [];
  for (const row of rows) {
    const zone = zoneFor(row.rank, league);
    if (zone && !seen.includes(zone)) seen.push(zone);
  }
  return seen;
}

/**
 * The matchday a table is "after", from the league's own matchweek index.
 *
 * ⚠ **Not on the standings response, and not divisible out of it.**
 * `matchesPlayed / (clubs / 2)` equals the matchday only while nobody holds a
 * game in hand, which is untrue for most of a real season — a single
 * postponement makes it read a matchday behind for weeks.
 *
 * ⚠ **And NOT `matchweeks[].complete`, which `cronogol-api.md` recommends for
 * exactly this caption.** That field is *coverage* — "we hold every match of
 * this round" — not "this round has been played", and its own type comment in
 * `./types` says so. The two readings disagree by a whole season: verified
 * against production on 2026-08-15, LaLiga returned `complete: true` on all 38
 * matchweeks while the standings route returned `matchesPlayed: 0`, so the
 * documented rule would have captioned a table where nobody has kicked a ball
 * "after matchday 38 of 38". See docs/gotchas/jornada-complete-is-coverage.md.
 *
 * So it is read off the clock instead, and **contiguously**: the highest N where
 * every round up to and including N has had its last kickoff. Walking up and
 * stopping at the first unfinished round is the point — matchweek order is not
 * chronological, and LaLiga's opening round runs 15–27 August against the
 * second's 20–24 thanks to a deferred opener, so "the highest finished round"
 * would announce matchday 2 while matchday 1 is still being played.
 *
 * Null before the first round finishes, which is the honest answer rather than
 * a zero: every club is on zero then and the table is not "after" anything.
 *
 * ⚠ **Measured against the table's own `lastMatchUtc`, not against the wall
 * clock.** Two reasons, and the second is the load-bearing one. It is the more
 * accurate question — `lastMatchUtc` is the kickoff of the last match this
 * table counts, so "as of when" is precisely what it answers, and a caption
 * derived from it can never claim a round the numbers beside it do not include.
 * And it keeps this pure: reading `Date.now()` from a Server Component's render
 * is a React purity violation the linter rejects, and a prerendered page has no
 * business asking the clock for something its payload already states.
 */
export function completedMatchweek(
  matchweeks: readonly { matchweek: number; lastKickoffUtc: string | null }[],
  /** `StandingsTableView.lastMatchUtc`. Null before a ball is kicked. */
  asOfUtc: string | null,
): number | null {
  if (asOfUtc === null) return null;
  const asOf = Date.parse(asOfUtc);

  const byNumber = [...matchweeks].sort((a, b) => a.matchweek - b.matchweek);

  let completed: number | null = null;
  for (const week of byNumber) {
    // A round with no kickoff stored is not a round we can call finished.
    if (week.lastKickoffUtc === null) break;
    if (Date.parse(week.lastKickoffUtc) > asOf) break;
    completed = week.matchweek;
  }
  return completed;
}

/**
 * Goal difference as a table prints it: `+7`, `-3`, `0`.
 *
 * Zero is bare rather than `+0` — it is the one value that is neither, and a
 * signed zero reads as a rounding artefact.
 */
export function signedGoalDifference(goalDifference: number): string {
  return goalDifference > 0 ? `+${goalDifference}` : String(goalDifference);
}
