/**
 * The followed clubs' own schedules, re-read in the board's neutral shape
 * (ADR 0132).
 *
 * `GET /cronogol/fixtures` is league-scoped BY DESIGN — no cups, no European
 * ties, no friendlies, no segunda (see `FixtureWindowView`'s caveat in
 * `./types`). So a board built from it alone announced Levante (league, four
 * days later) as NEXT UP while Barcelona's actual next match was a Champions
 * League tie — and five tracked segunda clubs never appeared at all. This
 * module is the deliberate amendment to `board.ts`'s "everything here reads
 * `GET /cronogol/fixtures`" claim: per followed club,
 * `GET /cronogol/teams/{slug}/fixtures` (team-scoped, every competition) is
 * converted to `WindowFixtureView` and merged UNDER the window rows.
 *
 * ⚠ The join is by FIXTURE ID and SLUG, never by name — ADR 0022/0027 stand
 * untouched. An opponent the team route names but cannot slug stays slug-less;
 * nothing here ever looks a club up by its display name.
 *
 * ⚠ Pure, like `board.ts` — imports only sibling modules with no native
 * dependency, so the whole selection is exercisable in a plain-node harness.
 */
import { findLeagueByApiSlug } from "./leagues";
import type {
  FixtureView,
  TeamFixturesView,
  TeamRef,
  WindowFixtureView,
} from "./types";

/**
 * The `leagueSlug` a team-route row wears (ADR 0132). `''` matches no
 * `League.apiSlug`, so `findLeagueByApiSlug` answers undefined and the row can
 * never claim a league's artwork, tint or capabilities — and the widget's
 * Swift live gate (`leagueSlug == "laliga"`, ADR 0084) stays honestly false,
 * so a cup tie can never open the rationed live poll.
 */
export const TEAM_WINDOW_LEAGUE = "";

/**
 * The opponent as a slug-less `TeamRef`. `slug: ''` is a deliberate non-key:
 * `involvesFollowed`, the club-catalogue joins and `CLUB_CODES` all miss on it
 * and fall to their null/name paths — and `abbreviate()` derives a code from
 * the name, so the card still gets its three letters. Null when the wire
 * carries no opponent at all (a real stored shape), which every card already
 * renders as the unknown side.
 */
export function opponentRef(fixture: FixtureView): TeamRef | null {
  if (fixture.opponent === null) return null;
  return {
    slug: TEAM_WINDOW_LEAGUE,
    name: fixture.opponent,
    shortName: null,
    logoUrl: fixture.opponentLogoUrl,
    logoUrls: fixture.opponentLogoUrls,
  };
}

/**
 * One club-perspective fixture, re-read as the neutral shape the board
 * selectors speak: the club on its `homeAway` side, `goalsFor`/`goalsAgainst`
 * unfolded to `goalsHome`/`goalsAway`.
 *
 * Sentinels, each audited against every reader on the board path:
 * `leagueSlug` — `TEAM_WINDOW_LEAGUE` (see above); `season: 0` — read by
 * nothing this side of the club page; `matchweek: null` — a competition
 * without our round routes, exactly what the field's own doc allows.
 */
export function toWindowFixture(fixture: FixtureView, club: TeamRef): WindowFixtureView {
  const home = fixture.homeAway === "H";
  const opponent = opponentRef(fixture);
  return {
    id: fixture.id,
    homeTeam: home ? club : opponent,
    awayTeam: home ? opponent : club,
    competition: fixture.competition,
    competitionName: fixture.competitionName,
    round: fixture.round,
    kickoffUtc: fixture.kickoffUtc,
    kickoffTbd: fixture.kickoffTbd,
    venue: fixture.venue,
    venueCity: fixture.venueCity,
    status: fixture.status,
    goalsHome: home ? fixture.goalsFor : fixture.goalsAgainst,
    goalsAway: home ? fixture.goalsAgainst : fixture.goalsFor,
    leagueSlug: TEAM_WINDOW_LEAGUE,
    season: 0,
    matchweek: null,
  };
}

/**
 * A whole team-route response as window rows, kickoff ascending (the window
 * route's order — NOT the jornada's TBD-first order, which no board consumer
 * expects).
 *
 * ⚠ `lastSyncedAt === null` answers `[]` — trap 1. An opponent-only club's
 * response is a handful of matches somebody else scheduled, and a partial
 * schedule must never claim a "next" or a "last".
 */
export function teamWindowRows(view: TeamFixturesView): WindowFixtureView[] {
  if (view.team.lastSyncedAt === null) return [];
  const club: TeamRef = {
    slug: view.team.slug,
    name: view.team.name,
    shortName: view.team.shortName,
    logoUrl: view.team.logoUrl,
    logoUrls: view.team.logoUrls,
  };
  return view.fixtures
    .map((fixture) => toWindowFixture(fixture, club))
    .sort((a, b) => Date.parse(a.kickoffUtc) - Date.parse(b.kickoffUtc));
}

/** The side to keep when two halves describe one row: a resolved slug wins. */
function resolvedSide(base: TeamRef | null, other: TeamRef | null): TeamRef | null {
  if (base !== null && base.slug !== TEAM_WINDOW_LEAGUE) return base;
  if (other !== null && other.slug !== TEAM_WINDOW_LEAGUE) return other;
  return base ?? other;
}

/**
 * The union of every followed club's converted rows, one row per fixture id.
 *
 * ⚠⚠ **The complementary merge is the point, not a nicety** (trap 49). Two
 * followed clubs meeting each other appear in BOTH clubs' windows, and each
 * half knows only its own club's slug on its own side — dropping either half
 * whole would leave one club's slug unresolved, and every reader that filters
 * by owner (the widget's `involves`, `involvesFollowed` itself) would miss the
 * side the dedupe discarded. Folding by id and taking the resolved slug per
 * SIDE gives the derby row both real slugs. Everything else (goals, status,
 * kickoff) stays the first half's — the two halves describe one fixture and
 * the merge never arbitrates between them.
 */
export function mergeTeamRows(
  perClub: readonly (readonly WindowFixtureView[])[],
): WindowFixtureView[] {
  const byId = new Map<string, WindowFixtureView>();
  for (const rows of perClub) {
    for (const row of rows) {
      const held = byId.get(row.id);
      if (held === undefined) {
        byId.set(row.id, row);
        continue;
      }
      byId.set(row.id, {
        ...held,
        homeTeam: resolvedSide(held.homeTeam, row.homeTeam),
        awayTeam: resolvedSide(held.awayTeam, row.awayTeam),
      });
    }
  }
  return [...byId.values()].sort(
    (a, b) => Date.parse(a.kickoffUtc) - Date.parse(b.kickoffUtc),
  );
}

/**
 * Dedupe-by-id union: every `primary` row, then each `secondary` row whose id
 * the primary side does not hold. The window route is ALWAYS primary — its
 * rows carry two full `TeamRef`s and a real `leagueSlug`, so for pure-league
 * data every team row dedupes out and the board is byte-identical to what it
 * was before ADR 0132. No sort; the caller owns order.
 */
export function mergeWindows(
  primary: readonly WindowFixtureView[],
  secondary: readonly WindowFixtureView[],
): WindowFixtureView[] {
  const held = new Set(primary.map((fixture) => fixture.id));
  return [...primary, ...secondary.filter((fixture) => !held.has(fixture.id))];
}

/**
 * Half-open `[from, to)` slice on the kickoff INSTANT — the same comparison
 * the window route's server-side `gte`/`lt` makes, TBD rows included (their
 * stored midnight-UTC stamp is what the server compares too).
 *
 * ⚠⚠ **This is a bug guard, not a convenience.** `upcomingMine`'s predicate is
 * `kickoffTbd || kickoff > now`, and the upcoming WINDOW structurally never
 * contains a past TBD row — but a team window reaching 14 days back is full of
 * them, and unsliced they would sail through the `kickoffTbd ||` half into the
 * NEXT UP deck as `--:--` cards for matches long over. Slicing on the instant
 * keeps the merged input shaped exactly like the window the predicate was
 * written against.
 */
export function sliceWindow(
  rows: readonly WindowFixtureView[],
  fromMs: number,
  toMs: number,
): WindowFixtureView[] {
  return rows.filter((row) => {
    const kickoff = Date.parse(row.kickoffUtc);
    if (Number.isNaN(kickoff)) return false;
    return kickoff >= fromMs && kickoff < toMs;
  });
}

/**
 * The non-league competitions whose finished-match timelines are VERIFIED on
 * the route the card calls (`GET /cronogol/fixtures/{id}/events`), keyed on
 * the EXACT wire `competitionName` — a cup row's `leagueSlug` is the `''`
 * sentinel, so the name is the only key the wire offers. The same string
 * `competitionMarkKind` keys on, but deliberately a SEPARATE fact: having
 * artwork and having a verified timeline are different claims, and the Copa
 * del Rey will get a mark before it gets a proven events feed.
 *
 * UEFA Champions League — verified against production 2026-09-09
 * (`handoff_ucl-events/EVIDENCE.md`): the live session's full-time hand-off
 * wrote the timeline for all 3 of 3 finished ties involving a followed club,
 * every event carrying a `teamSlug`.
 */
const EVENTS_VERIFIED_COMPETITIONS = new Set(["UEFA Champions League"]);

/**
 * Whether the events disclosure may open for this fixture (ADR 0132, absorbing
 * the raw gate the last-result card carried; the non-league branch opened for
 * the UCL by ADR 0137).
 *
 * League rows keep the original exact semantics: the league's own capability
 * flag, and an UNKNOWN league stays enabled — that is what a segunda row
 * (league competition, sentinel slug) inherits, matching how the card treated
 * an unrecognised `leagueSlug` before this function existed.
 *
 * A NON-league row opens only for the allowlist above. Its timelines come from
 * the live session's full-time hand-off, not the league-only finished-match
 * sweep — so a UCL result's events land within minutes of full time, and a tie
 * whose live session missed full time has none, ever (the panel's "not
 * published yet" copy is honest there). ⚠ Other cups travel the same hand-off
 * path in theory but none has been observed; an always-dead disclosure is the
 * failure ADR 0105 exists to prevent, so they stay closed until one is seen.
 */
export function matchEventsCapable(
  fixture: Pick<WindowFixtureView, "leagueSlug" | "competition" | "competitionName">,
): boolean {
  if (fixture.competition !== "league") {
    return EVENTS_VERIFIED_COMPETITIONS.has(fixture.competitionName ?? "");
  }
  return findLeagueByApiSlug(fixture.leagueSlug)?.matchEvents !== false;
}
