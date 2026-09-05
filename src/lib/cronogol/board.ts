/**
 * The Today board's lead-card selectors: which match is in play, which was
 * the last result, from the reader's followed clubs. Pure — no native import —
 * so the rules can be run in a plain-JS harness like `push.ts`.
 *
 * ⚠ Everything here reads `GET /cronogol/fixtures`, never the scoreboard. The
 * scoreboard is a world feed with no crosswalk to our clubs, so it cannot say
 * which match is *yours* — and fuzzy-matching names is forbidden (ADR 0022,
 * ADR 0027). A fixture row carries `homeTeam.slug`, which is the only honest
 * join to the follow list.
 *
 * ⚠ A `live` fixture is a snapshot from the last ~3h sweep, and its goals were
 * true then. Nothing here reads a clock or implies a minute.
 */
import { dayGroups, type DayGroupable } from "./jornada";
import type { TeamRef, WindowFixtureView } from "./types";

/** True when either side is a followed club. */
export function involvesFollowed(
  fixture: WindowFixtureView,
  followed: readonly string[],
): boolean {
  return (
    (fixture.homeTeam !== null && followed.includes(fixture.homeTeam.slug)) ||
    (fixture.awayTeam !== null && followed.includes(fixture.awayTeam.slug))
  );
}

/**
 * The followed club's match flagged in play at the last sweep, or null.
 *
 * Earliest kickoff wins when two are in play at once — the one that started
 * first is the one most likely to have a score worth showing.
 */
export function liveFixture(
  fixtures: readonly WindowFixtureView[],
  followed: readonly string[],
): WindowFixtureView | null {
  const live = fixtures
    .filter((f) => f.status === "live" && involvesFollowed(f, followed))
    .sort((a, b) => Date.parse(a.kickoffUtc) - Date.parse(b.kickoffUtc));
  return live[0] ?? null;
}

/**
 * The most recent finished match of a followed club that carries a score.
 *
 * ⚠ `finished` with null goals is a real stored shape (a degraded ingest leaves
 * goals alone). It is skipped rather than rendered as a dash — a last-result
 * card with no result is not a last result.
 */
export function lastResult(
  fixtures: readonly WindowFixtureView[],
  followed: readonly string[],
): WindowFixtureView | null {
  const done = fixtures
    .filter(
      (f) =>
        f.status === "finished" &&
        f.goalsHome !== null &&
        f.goalsAway !== null &&
        involvesFollowed(f, followed),
    )
    .sort((a, b) => Date.parse(b.kickoffUtc) - Date.parse(a.kickoffUtc));
  return done[0] ?? null;
}

/**
 * W / D / L from the FOLLOWED club's perspective. Home wins the tie when both
 * sides are followed — a derby has to be read from one bench.
 *
 * ⚠ Valores de protocolo — `D` is *Draw* here. Render through
 * `phrases.formLetters`, where Spanish maps it to `E` and `L` to `D`.
 */
export function boardOutcome(
  fixture: WindowFixtureView,
  followed: readonly string[],
): "W" | "D" | "L" | null {
  const { goalsHome, goalsAway } = fixture;
  if (fixture.status !== "finished" || goalsHome === null || goalsAway === null) {
    return null;
  }
  const homeSide = fixture.homeTeam !== null && followed.includes(fixture.homeTeam.slug);
  const [mine, theirs] = homeSide ? [goalsHome, goalsAway] : [goalsAway, goalsHome];
  if (mine > theirs) return "W";
  if (mine < theirs) return "L";
  return "D";
}

/** An upcoming fixture read from the followed club's bench. */
export interface UpcomingRow {
  /** The followed side — its crest leads the row. */
  club: TeamRef;
  /** Null only when the opponent could not be resolved. */
  opponent: TeamRef | null;
  isHome: boolean;
}

/**
 * The followed side and its opponent. Home wins the tie when both sides are
 * followed — the same rule as `boardOutcome`. Null when the followed side is
 * unresolved (the row would have no crest to lead with).
 */
export function upcomingRow(
  fixture: WindowFixtureView,
  followed: readonly string[],
): UpcomingRow | null {
  if (fixture.homeTeam !== null && followed.includes(fixture.homeTeam.slug)) {
    return { club: fixture.homeTeam, opponent: fixture.awayTeam, isHome: true };
  }
  if (fixture.awayTeam !== null && followed.includes(fixture.awayTeam.slug)) {
    return { club: fixture.awayTeam, opponent: fixture.homeTeam, isHome: false };
  }
  return null;
}

/**
 * The crown DECK (ADR 0113): every fixture sharing the SOONEST kickoff's
 * calendar day in the reader's zone. The day rule is `dayGroups`' (ADR 0035's
 * grouping, reused verbatim): a TBD kickoff is a floating day keyed in UTC and
 * never merges with a confirmed one — so a confirmed lead never drags a TBD
 * fixture into the deck, and an all-TBD deck is the only mixed-looking case.
 *
 * Order is preserved: `deck[0]` is always the input's first item — the same
 * fixture the single NEXT UP card shows today. The caller passes fixtures
 * already filtered to followed clubs and future kickoffs; the clock stays at
 * the screen so this selector remains pure.
 */
export function nextUpDeck<T extends DayGroupable>(
  upcoming: readonly T[],
  zone: string,
): T[] {
  return dayGroups(upcoming, zone)[0]?.items ?? [];
}
