/**
 * The competition catalogue — things that have a table but are NOT leagues.
 *
 * Today that is one entry: the UEFA Champions League league phase (ADR 0150).
 *
 * ⚠ **Deliberately separate from `./leagues`, and the web app made the same
 * call first.** `cronogol/lib/og/competitions.ts` keeps `champions-league` out
 * of its own `LEAGUES` because that array drives six public surfaces at once;
 * ours drives four (`LIVE_LEAGUES`, `ROUND_LEAGUES`, `leagueOptions`,
 * `findLeagueByApiSlug`) and none of them has anything to serve a 36-club
 * continental league phase. Six fields say it plainly:
 *
 * | `League` field | What it would say for the UCL |
 * | --- | --- |
 * | `roundCount() = 2*(clubCount-1)` | **70**, against a real 8 |
 * | `zones` / `ZoneKind` | `'ucl'` there means "this DOMESTIC rank qualifies
 * |   | for the Champions League" — a different question entirely |
 * | `apiSlug` | `/cronogol/standings?league=champions-league` answers
 * |   | `200 { tables: [] }`, not a 404 — it reads as a coverage gap |
 * | `rounds` | no matchweek index route exists; `ROUND_LEAGUES` would put it
 * |   | on the Matchdays pager, where every round would be empty (trap 55) |
 * | `live` | `LIVE_LEAGUES` would put it on the Clubs rail, and half its
 * |   | clubs are not in `GET /cronogol/teams` at all |
 * | `hasHalves` / `calendarYearSeason` / `zone` | meaningless here |
 *
 * ⚠ **Pure — no native import, one type import.** The band and caption logic
 * below is the whole reason this module exists rather than living in the
 * organism: `scripts/ucl-standings-harness.mjs` requires it in plain node and
 * proves the guards against a captured production payload. Same rule as
 * `./derive` and `./team-window`.
 */
import type { ZoneKind } from "./leagues";
import type {
  JornadaFixtureView,
  UclFixtureListItem,
  UclRoundSummary,
  UclStandingsRowView,
  UclStandingsView,
} from "./types";

/**
 * Which league-phase band a rank falls in.
 *
 * ⚠ **A different union from `ZoneKind`, on purpose.** `ZoneKind`'s `'ucl'`
 * answers "does this domestic finishing position qualify for the Champions
 * League"; these answer "what has this club's league phase produced". The API
 * doc calls that out by name and tells the client not to reach for `zoneFor`.
 * Keeping them apart is also what stops `League.zones` from accepting
 * `{ kind: 'r16' }` — a build error that should exist, existing.
 */
export type CupBandKind = "r16" | "playoff" | "out";

/** Inclusive 1-based rank range. Uses the wire's `rank`, never an array index. */
export interface CupBand {
  kind: CupBandKind;
  from: number;
  to: number;
}

export interface Competition {
  /** Our own stable key — the tab key and nothing else. Never sent to the API. */
  slug: string;
  /**
   * Reader-facing name, and the chip's `accessibilityLabel`.
   *
   * ⚠ **Always the formal form.** "UCL" is an identifier in this codebase and
   * never reaches a reader — see the brand table in `.claude/ECOSYSTEM.md`.
   */
  name: string;
  /*
   * ⚠ **No `mark` field, and that is the decision.** There is no wire artwork
   * for this — `GET /cronogol/leagues` serves no `champions-league` row — so
   * the chip draws the bundled lockup. But the lookup already exists:
   * `competitionMarkKind()` in `atoms/competition-mark` keys on the EXACT wire
   * string, and `name` above IS that string. Holding a second copy of the
   * answer here would let the two disagree, and importing the atom's type
   * would point this module UP into `components/`, which would also cost the
   * harness its plain-node require. The screen resolves it at the call site;
   * a competition we hold no mark for degrades to its spelled name, which is
   * ADR 0133's own fallback rule.
   */
  /**
   * Editorial sort key, on the same scale as `League.order`.
   *
   * ⚠ **Fractional on purpose.** Ed placed the chip SECOND, after LaLiga, and
   * `order` is a sort key rather than an index — so 1.5 slots it between
   * LaLiga (1) and the Premier League (2) without renumbering five league
   * entries to insert one competition. Do not "tidy" it into an integer.
   */
  order: number;
  /**
   * The FULL FIELD, and the band guard's comparand.
   *
   * ⚠ Not a coverage number: `UclStandingsView.clubs` comes from the stored
   * entrant roster, so a short table means the roster sync is incomplete. Either
   * way `cupBandsApply` refuses to band it.
   */
  clubs: number;
  /**
   * Rounds in the league phase — the caption's denominator.
   *
   * ⚠ **Never `roundCount()`.** That is `2 * (clubs - 1)`, which for 36 clubs
   * is **70**. Each club plays eight of the other thirty-five, once.
   */
  matchdays: number;
  /**
   * The qualification bands.
   *
   * ⚠⚠ **Still CONFIGURATION, and trap 20 still holds.** Trap 20 forbids
   * position arithmetic because which DOMESTIC rank earns which European
   * ticket is coefficient-driven, per-season and per-federation — not
   * derivable from a table, not on the wire, and `leagues.ts` records that our
   * own values are unconfirmed for 2026/27.
   *
   * 1-8 / 9-24 / 25-36 is a different kind of fact: the competition's own
   * published format. There is no allocation to look up and no federation to
   * consult. So it is expressed the same declarative way `League.zones` is —
   * required rather than optional, and **no component anywhere writes
   * `rank <= 8`**. If the format changes, the slice changes and nothing else
   * does.
   */
  bands: readonly CupBand[];
}

export const UCL_LEAGUE_PHASE: Competition = {
  slug: "champions-league",
  // ⚠ Byte-for-byte what the wire calls it, because `competitionMarkKind()`
  // matches on strict equality. Change this string and the chip loses its mark.
  name: "UEFA Champions League",
  order: 1.5,
  clubs: 36,
  matchdays: 8,
  bands: [
    { kind: "r16", from: 1, to: 8 },
    { kind: "playoff", from: 9, to: 24 },
    { kind: "out", from: 25, to: 36 },
  ],
};

export const COMPETITIONS: readonly Competition[] = [UCL_LEAGUE_PHASE];

/** True only while `A` and `B` share no member. `never` — and a build error — otherwise. */
type Disjoint<A, B> = Extract<A, B> extends never ? true : never;

/**
 * ⚠⚠ **Compile-time proof that `ZoneKind` was never widened to carry these.**
 *
 * The tempting simplification is one union for every band, and it costs three
 * real guarantees: `League.zones` would start accepting `{ kind: 'r16' }`,
 * `zoneFor` could return `'r16'` for a domestic league, and
 * `copy.table.zoneLabels` would demand strings for three kinds no domestic
 * legend can ever show. One colour MAP is shared (`BAND_COLOR` keys on the
 * union of the two); the two unions themselves stay shut.
 *
 * Add a cup kind to `ZoneKind` and this line stops compiling, which is the
 * point — a comment asking someone not to would not.
 */
export const CUP_BANDS_ARE_NOT_ZONES: Disjoint<CupBandKind, ZoneKind> = true;

export function findCompetition(slug: string): Competition | undefined {
  return COMPETITIONS.find((c) => c.slug === slug);
}

/**
 * The band a finishing position falls in, or null outside the field.
 *
 * Ranges rather than a chain of comparisons — the `zoneFor` shape, for the same
 * reason: a band that spans sixteen positions says so, instead of being encoded
 * as the gap between two thresholds.
 *
 * ⚠ Takes a `rank` off the wire, which is 1-based and contiguous. Never an
 * array index.
 */
export function cupBandFor(rank: number, competition: Competition): CupBandKind | null {
  const band = competition.bands.find((b) => rank >= b.from && rank <= b.to);
  return band?.kind ?? null;
}

/**
 * May this table be banded at all?
 *
 * ⚠⚠ **Three clauses, and the API doc only names the first.** The doc says
 * "refuse to band a table whose `clubs` is not 36, because the order below a
 * missing club is wrong in a way that looks entirely normal". True, and not
 * enough:
 *
 * 1. `clubs === 36` — the server's own assertion about the entrant roster.
 * 2. `rows.length === 36` — because `clubs` is an assertion and `rows` is the
 *    thing actually being painted. A short array under a correct `clubs` is
 *    exactly the shape the doc's warning describes.
 * 3. `lastMatchUtc !== null` — **the clause the doc omits, and trap 20's second
 *    clause applied here.** Between the July rollover and the first September
 *    kickoff the route serves 36 clubs on zero. That is a *correct* table, and
 *    its ties fall to a club-slug sort — so banding it would paint nine real
 *    clubs "Eliminados" purely on where their slugs sort. That is precisely the
 *    failure that painted Sevilla, Valencia and Villarreal into relegation on
 *    the web app: every number right and the colour a lie. This payload carries
 *    no `matchesPlayed`, so `lastMatchUtc` — a kickoff, null until one has
 *    happened — is the proxy.
 *
 * When it is false: no rail on any row and no legend. The numbers are still the
 * numbers; nothing claims a place.
 */
export function cupBandsApply(view: UclStandingsView, competition: Competition): boolean {
  return (
    view.clubs === competition.clubs &&
    view.rows.length === competition.clubs &&
    view.lastMatchUtc !== null
  );
}

/**
 * The bands actually present in a table, in the order they first appear.
 *
 * The legend lists these rather than the competition's full three, so it can
 * never caption a colour nobody can see. Row order means it reads top-down.
 */
export function usedCupBands(
  rows: readonly UclStandingsRowView[],
  competition: Competition,
): CupBandKind[] {
  const seen: CupBandKind[] = [];
  for (const row of rows) {
    const band = cupBandFor(row.rank, competition);
    if (band && !seen.includes(band)) seen.push(band);
  }
  return seen;
}

/**
 * The crown caption for a cup table: `Tras la jornada 1 de 8 · 36 clubes`.
 *
 * ⚠ **`view.matchday` is the SERVER'S and is printed verbatim.** It is the last
 * COMPLETE round, derived on the backend, and the doc forbids recomputing it so
 * that a caption and a poster can never name different rounds. The domestic
 * branch says the same sentence from `completedMatchweek`, which walks a
 * matchweek index — there is no such index here, and none is coming.
 *
 * ⚠ **`null` degrades to the club count**, the way trap 2 / ADR 0100 already
 * bless for a domestic table. Here it is the COMMON state, not an edge: the
 * league phase runs Tuesday to Thursday, so a round is half-played on two
 * nights in three.
 *
 * Takes the copy functions rather than a language, so this module stays pure
 * and the harness can prove the denominator is 8 and not 70.
 */
export function cupCaption(
  view: UclStandingsView,
  competition: Competition,
  copy: {
    afterMatchday: (n: number, total: number) => string;
    clubCount: (n: number) => string;
  },
): string {
  const clubs = copy.clubCount(view.clubs);
  return view.matchday === null
    ? clubs
    : `${copy.afterMatchday(view.matchday, competition.matchdays)} · ${clubs}`;
}

/* ── The league phase as a MATCHDAY ──────────────────────────────────────────
   `GET /cronogol/ucl/jornada/{season}/{n}` returns the competition's own shape.
   The Matchdays screen draws `JornadaFixtureView` rows, so the conversion lives
   here — pure, and beside the band rules it already owns (ADR 0156).          */

/**
 * One `UclFixtureListItem` as the neutral row the fixture list draws.
 *
 * The same move `./team-window` makes for a club's own schedule: convert at the
 * edge, so every organism below keeps ONE row type and no component learns
 * which competition it is drawing.
 *
 * ⚠⚠ **`id` is the COMPETITION'S id, never `fixture.fixtureId`.** They are
 * different keys into different tables and neither works on the other's route
 * (verified both directions, 2026-09-11). The twin is present on only 5 of 18
 * matchday-1 fixtures, so routing anything through it serves a quarter of the
 * competition; this id resolves for all of them. Whatever consumes the row must
 * therefore ask the UCL events route — see `getUclFixtureEvents`.
 *
 * ⚠ `competition: 'cup'` and a `round` carried verbatim. The number is on the
 * parent payload and is never parsed back out of the label — that string is the
 * provider's display copy and is null on half the club-route rows.
 *
 * ⚠ `homeTeam`/`awayTeam` pass their NULLS through. A pre-draw knockout side is
 * a real state on the shared type, and the list already renders a null side;
 * substituting a placeholder name here would invent a club.
 */
export function uclFixtureRow(item: UclFixtureListItem): JornadaFixtureView {
  const { fixture } = item;
  return {
    id: fixture.id,
    homeTeam: item.home,
    awayTeam: item.away,
    competition: "cup",
    competitionName: fixture.competitionName,
    round: fixture.round,
    kickoffUtc: fixture.kickoffUtc,
    kickoffTbd: fixture.kickoffTbd,
    venue: fixture.venue,
    venueCity: fixture.venueCity,
    status: fixture.status,
    goalsHome: fixture.goalsHome,
    goalsAway: fixture.goalsAway,
  };
}

/**
 * Has this round been played out?
 *
 * ⚠ **`finished === fixtures`, because there is no `complete` flag and that is
 * deliberate.** On the domestic contract `complete` means COVERAGE — "we hold
 * every match of this round" — and all 38 LaLiga matchweeks report it true in
 * July with nobody having kicked a ball (trap 2's cousin). The cup route
 * refuses to serve the ambiguous word and hands over both counts instead, so
 * the question has to be asked explicitly. This one asks "has it been played".
 */
export function uclRoundPlayed(round: UclRoundSummary): boolean {
  return round.fixtures > 0 && round.finished === round.fixtures;
}

/**
 * The round a reader should land on: the first not yet played out, else the last.
 *
 * ⚠ **Walks in NUMBER order and stops at the first unplayed round**, rather than
 * picking by clock the way `currentMatchweek` does. The league phase is a fixed
 * eight-round ladder played strictly in order — there is no deferred-opener case
 * to defend against (trap 2 is a domestic problem, born of LaLiga matchday 1
 * finishing after matchday 2) — and `firstKickoffUtc` is PROVISIONAL while
 * `kickoffsTbd > 0`, so the clock is the weaker signal here, not the stronger.
 *
 * Null for an empty index, which is the pre-season state.
 */
export function uclOpeningRound(rounds: readonly UclRoundSummary[]): number | null {
  if (rounds.length === 0) return null;
  const byNumber = [...rounds].sort((a, b) => a.matchday - b.matchday);
  const next = byNumber.find((round) => !uclRoundPlayed(round));
  return (next ?? byNumber[byNumber.length - 1]).matchday;
}
