/**
 * Season-stats derivations — everything the Season stats screen computes that
 * `GET /cronogol/teams/{slug}/stats` and `GET /cronogol/players/{slug}/stats`
 * do not serve (ADR 0141).
 *
 * ⚠ **Pure — no native import, no React, no `Date`.** It runs in a plain-JS
 * harness, which is the same reason `./events` gives: the band-denominator rule
 * and the kickoff-order rule were both provable against real captured payloads
 * before a screen existed.
 *
 * ⚠⚠ **Nothing here ever turns a `null` into a `0`.** Every function returns
 * `T | null` and the caller branches. A null on these routes means "we do not
 * know", and the two reasons are independent — the competition holds no
 * trustworthy events, or the season is too thinly swept — but the reader
 * cannot tell either from a zero (ADR 0143).
 *
 * ⚠ Served, never recomputed here: `goalInvolvements`, `goalDifference`,
 * `penaltyConversion`, `scoringRun.length`, the venue W/D/L splits.
 */
import type { League } from './leagues';
import type {
  GoalBandsView,
  PlayerSeasonStatsView,
  PlayerSeasonTotalsView,
  PlayerStatsView,
  ScoringRunView,
  StatsCoverageView,
  StatsTimelineEntryView,
  TeamSeasonStatsView,
  TeamSeasonTotalsView,
  TeamStatsView,
} from './types';

/**
 * The minute bands, in order, exactly as the wire spells them.
 *
 * ⚠ Read by key with a fallback, never by position — a band with no goals may
 * be absent from the record rather than present as `0`.
 */
export const GOAL_BANDS = [
  '1-15',
  '16-30',
  '31-45',
  '46-60',
  '61-75',
  '76-90',
  '90+',
] as const;

export type GoalBand = (typeof GOAL_BANDS)[number];

/** The bands that are after the interval — the second-half half of the split. */
const SECOND_HALF: readonly GoalBand[] = ['46-60', '61-75', '76-90', '90+'];

/** The bands the design calls "late" — the 22%-after-75' figure. */
const LATE: readonly GoalBand[] = ['76-90', '90+'];

/* ── Choosing a block ─────────────────────────────────────────────────────── */

/**
 * The one competition-season this screen renders.
 *
 * ⚠⚠ **`seasons` is one block per COMPETITION-season, not per season.**
 * Barcelona answers 2026 champions-league, 2026 laliga AND 2025
 * champions-league in a single payload today, so `seasons[0]` renders a cup
 * record under a league heading. ADR 0141: the screen shows the club's own
 * league for the current season and offers no picker.
 *
 * ⚠ Matched on `League.apiSlug` (`laliga`), never on `League.slug`
 * (`la-liga`) — the wire's `competition` is an API slug.
 *
 * `null` is a real answer: a club whose league we could not resolve, a season
 * the sweep has not reached, or a club that plays in no league we track.
 */
export function pickTeamSeason(
  stats: TeamStatsView | null | undefined,
  league: League | undefined,
  season: number,
): TeamSeasonStatsView | null {
  if (!stats || !league) return null;
  return (
    stats.seasons.find(
      (block) => block.season === season && block.competition === league.apiSlug,
    ) ?? null
  );
}

/** The player half of `pickTeamSeason`, matched the same way. */
export function pickPlayerSeason(
  stats: PlayerStatsView | null | undefined,
  league: League | undefined,
  season: number,
): PlayerSeasonStatsView | null {
  if (!stats || !league) return null;
  return (
    stats.seasons.find(
      (block) => block.season === season && block.competition === league.apiSlug,
    ) ?? null
  );
}

/* ── The MERGED block: one season, every competition ─────────────────────── */

/**
 * The all-competitions block for one season — what the HEADLINE FIGURES read
 * (ADR 0149).
 *
 * ⚠⚠ **No `league` argument, and that is the point.** `pickTeamSeason` above
 * needs one because `seasons` is keyed by competition-season; `seasonTotals` is
 * keyed by season alone, because a merged block is not per-competition. Asking
 * for "the merged laliga block" is a category error.
 *
 * ⚠ This does NOT retire `pickTeamSeason`. The two are picked side by side and
 * feed different halves of the screen: the figures come from here, the CHARTS
 * stay on the per-competition block, because most of them cannot merge —
 * matchweeks collide, and every event-derived merged field is refused while any
 * one contributing competition sits below the coverage floor.
 *
 * `null` is a real answer: a payload captured before §120.15 shipped
 * (2026-09-10) has no `seasonTotals` at all, and a season the sweep has not
 * reached has no row.
 */
export function pickTeamTotals(
  stats: TeamStatsView | null | undefined,
  season: number,
): TeamSeasonTotalsView | null {
  if (!stats) return null;
  return (stats.seasonTotals ?? []).find((block) => block.season === season) ?? null;
}

/** The player half of `pickTeamTotals`. ⚠ Season only, for the same reason. */
export function pickPlayerTotals(
  stats: PlayerStatsView | null | undefined,
  season: number,
): PlayerSeasonTotalsView | null {
  if (!stats) return null;
  return (stats.seasonTotals ?? []).find((block) => block.season === season) ?? null;
}

/**
 * The competitions the FIGURES count and the CHARTS leave out.
 *
 * ⚠⚠ **This is ADR 0148's line, inverted (ADR 0149).** 0148 had the numbers name
 * what they left out, because the screen showed one competition's block and
 * Valverde read `0 GOALS` two days after scoring in the Champions League. The
 * merged block closed that: the figures now count everything, so they leave
 * nothing to name. What is still per-competition is the CHARTS — and an
 * unlabelled league-only chart under an all-competitions headline is the same
 * class of error pointing the other way, which is why this function survived
 * rather than being deleted with the line it used to feed.
 *
 * ⚠ Returns `[]` when the merged block holds ONE competition, which is the
 * common case outside Europe: Bayern's merged block IS its Bundesliga block, so
 * there is nothing to disclaim and no line to draw. Also `[]` when the league is
 * unresolved or the payload predates the merge — silence, never a guess.
 *
 * ⚠ These are API competition SLUGS. A caller that cannot name one must render
 * nothing rather than leak `champions-league` to a reader (0148's rule, still).
 */
export function chartsExclude(
  totals: { competitions: readonly string[] } | null | undefined,
  league: League | undefined,
): string[] {
  if (!totals || !league) return [];
  return totals.competitions.filter((slug) => slug !== league.apiSlug);
}

/* ── The timeline: one array, three charts ───────────────────────────────── */

/**
 * The cumulative-goals line — a running sum of `gf` over the array.
 *
 * ⚠⚠ **Plotted on the ARRAY INDEX, never on `mw`.** Matchweeks sort by number,
 * which is not chronological: a postponement really does put matchweek 2 before
 * matchweek 1, and Barcelona's live 2026 timeline reads `2, 1, 3, 4` today
 * (verified 2026-09-10). A line drawn on a matchweek axis disagrees with the
 * `scoringRun` sitting on the same card, which is chronological.
 *
 * ⚠ The last value equals `goalsFor` exactly, always — `timeline` is built over
 * every finished fixture, not only the ones whose events reconciled.
 */
export function cumulativeGoals(
  timeline: readonly StatsTimelineEntryView[],
): number[] {
  const out: number[] = [];
  let total = 0;
  for (const entry of timeline) {
    total += entry.gf;
    out.push(total);
  }
  return out;
}

/** One matchweek's goals, split by venue. `mw` is the label, not the order. */
export interface MatchweekGoals {
  mw: number;
  home: number;
  away: number;
}

/**
 * Goals per matchweek, home and away — the two-tone bar chart.
 *
 * ⚠ **Entries with a null `mw` are DROPPED**, which is every Champions League
 * knockout round: they carry a round name and no matchday. A UCL "goals per
 * matchweek" chart is therefore a league-phase chart, and the cumulative line
 * beside it — which keeps them — will legitimately end higher than these bars
 * sum to. That is the data, not a bug.
 *
 * Ordered by matchweek NUMBER, because this chart's axis genuinely is the
 * matchweek; the chronology lives in `cumulativeGoals` and `scoredStrip`.
 *
 * ⚠⚠ **NEVER pass a MERGED timeline (ADR 0149).** Matchweek numbers are
 * per-competition NAMESPACES, so grouping a merged array by `mw` folds two
 * unrelated nights into one bar. Barcelona's merged 2026 timeline reads
 * `mw [2, 1, 3, 4, 1]` today — LaLiga matchday 1 and Champions League matchday 1
 * — and this function would answer a single matchday-1 bar of both clubs' goals
 * added together. TypeScript cannot stop it: `StatsMergedTimelineEntryView`
 * extends the per-competition entry, so a merged array is assignable here. The
 * guard is the harness, which asserts the wrong answer this returns for the
 * merged array so the trap stays proven rather than merely described.
 *
 * ⚠ This is the same reason `PlayerSeasonTotalsView` has no `goalsByMatchweek`
 * at all — the backend declined to invent one and so does this.
 */
export function goalsByMatchweek(
  timeline: readonly StatsTimelineEntryView[],
): MatchweekGoals[] {
  const byWeek = new Map<number, MatchweekGoals>();
  for (const entry of timeline) {
    if (entry.mw === null) continue;
    const row = byWeek.get(entry.mw) ?? { mw: entry.mw, home: 0, away: 0 };
    if (entry.home) row.home += entry.gf;
    else row.away += entry.gf;
    byWeek.set(entry.mw, row);
  }
  return [...byWeek.values()].sort((a, b) => a.mw - b.mw);
}

/** One cell of the scored-in strip. */
export interface RunCell {
  scored: boolean;
  /** Inside the club's longest scoring run — the lime cells. */
  inRun: boolean;
}

/**
 * The squares strip: one cell per finished fixture, in kickoff order.
 *
 * ⚠ `scoringRun.startIndex`/`endIndex` index INTO `timeline`, so the highlight
 * is a slice and needs no matching logic — never re-derive the run by walking
 * the array, which would disagree with `scoringRun.length` the moment a
 * competition mixes into the block.
 */
export function scoredStrip(
  timeline: readonly StatsTimelineEntryView[],
  run: ScoringRunView | null,
): RunCell[] {
  return timeline.map((entry, index) => ({
    scored: entry.gf > 0,
    inRun:
      run !== null && index >= run.startIndex && index <= run.endIndex,
  }));
}

/* ── Bands, and the denominator that is not the goal total ───────────────── */

/**
 * The banded total — the ONLY correct denominator for a share of goals by
 * minute.
 *
 * ⚠⚠ **`goalsByBand` sums to ≤ the goal total, never to it.** A goal with no
 * recorded minute counts in `goals`/`goalsFor` and is dropped from the bands,
 * so `late / goals` silently understates every time a minute is missing. This
 * is the band-denominator trap from `CRONOGOL-API.md` §6, and it is the reason
 * this function exists rather than the caller reaching for `season.goals`.
 */
export function bandTotal(bands: GoalBandsView | null): number | null {
  if (!bands) return null;
  let total = 0;
  for (const band of GOAL_BANDS) total += bands[band] ?? 0;
  return total;
}

/**
 * The share of banded goals scored after 75' — `0`–`1`, or `null`.
 *
 * `null` when the bands are absent (no trustworthy events) AND when they are
 * present but empty: a share of nothing is not `0%`, it is unanswerable.
 */
export function lateShare(bands: GoalBandsView | null): number | null {
  const total = bandTotal(bands);
  if (bands === null || total === null || total === 0) return null;
  let late = 0;
  for (const band of LATE) late += bands[band] ?? 0;
  return late / total;
}

/** First-half and second-half goals from the bands. `null` together. */
export interface HalfSplit {
  first: number;
  second: number;
}

export function halfSplit(bands: GoalBandsView | null): HalfSplit | null {
  const total = bandTotal(bands);
  if (bands === null || total === null || total === 0) return null;
  let second = 0;
  for (const band of SECOND_HALF) second += bands[band] ?? 0;
  return { first: total - second, second };
}

/** Every band in wire order, absent keys read as 0. `null` in, `null` out. */
export function bandSeries(
  bands: GoalBandsView | null,
): { band: GoalBand; goals: number }[] | null {
  if (!bands) return null;
  return GOAL_BANDS.map((band) => ({ band, goals: bands[band] ?? 0 }));
}

/* ── Small scoreline derivations ─────────────────────────────────────────── */

/**
 * Goals per match — the "2.7 per match" line.
 *
 * ⚠ The denominator is `coverage.fixturesTotal`, which is CLUB FIXTURES
 * PLAYED. It is not appearances and it is not the league's round count: this
 * screen may never print a per-90 or a per-appearance figure, because no source
 * publishes lineup events.
 */
export function perMatch(
  goals: number,
  coverage: StatsCoverageView,
): number | null {
  if (coverage.fixturesTotal <= 0) return null;
  return goals / coverage.fixturesTotal;
}

/** Goals from open play — the doughnut's centre value. */
export function openPlayGoals(season: PlayerSeasonStatsView): number {
  return season.goals - season.penaltyGoals;
}

/**
 * Whether this block's event-derived half may be shown at all.
 *
 * One gate, read once, so that the seven cards cannot disagree about it: the
 * fields are nulled as a GROUP on the backend precisely so a real card count
 * never sits beside a null comeback count.
 */
export function hasEvents(coverage: StatsCoverageView): boolean {
  return coverage.sufficient;
}

/* ── The scoring run's label ─────────────────────────────────────────────── */

/**
 * How to caption a scoring run — either two matchweeks or two kickoffs.
 *
 * ⚠ `fromMatchweek`/`toMatchweek` are null on a cup run, so a screen that
 * templates "MD{from} → MD{to}" prints "MD null → MD null" on every Champions
 * League block. The caller renders `kind: 'dates'` with its own locale
 * formatter — dates never get formatted in here, because this module holds no
 * `Date`.
 */
export type RunLabel =
  | { kind: 'matchweeks'; from: number; to: number }
  | { kind: 'dates'; fromKickoffUtc: string; toKickoffUtc: string };

/**
 * @param namespaced Whether the run spans MORE THAN ONE competition — true for a
 * merged block holding several (ADR 0149).
 *
 * ⚠⚠ **A merged run must never be captioned with matchweeks, and this was caught
 * on a device rather than in review.** Barcelona's merged run spans LaLiga
 * matchday 2 through Champions League matchday 1, and the honest-looking template
 * rendered it **"MD2 → MD1"** — a run that appears to travel backwards through the
 * season. Matchweek numbers are per-competition namespaces, so the two ends are
 * not on one scale and no arrow between them means anything. Kickoffs are, so a
 * namespaced run captions with DATES — the same fallback a cup run already takes,
 * for the same underlying reason.
 */
export function runLabel(
  run: ScoringRunView | null,
  namespaced = false,
): RunLabel | null {
  if (!run) return null;
  if (!namespaced && run.fromMatchweek !== null && run.toMatchweek !== null) {
    return { kind: 'matchweeks', from: run.fromMatchweek, to: run.toMatchweek };
  }
  return {
    kind: 'dates',
    fromKickoffUtc: run.fromKickoffUtc,
    toKickoffUtc: run.toKickoffUtc,
  };
}

/* ── The player picker's shortlist ───────────────────────────────────────── */

/**
 * Whether a squad row can address `GET /cronogol/players/{slug}/stats`.
 *
 * ⚠⚠ Two independent gates, and both are real: the LEAGUE must publish player
 * stats at all (`League.playerStats`, ADR 0144 — a capability that cannot be
 * inferred from an empty `200`), and the PLAYER must actually carry a slug.
 * The second is not redundant: every Premier League player's slug is `null` on
 * the wire, which is why the league flag is false there in the first place, and
 * a null slug anywhere else would build the URL `/cronogol/players/null/stats`.
 */
export function statsSlug(
  player: { slug: string | null },
  league: League | undefined,
): string | null {
  if (!league?.playerStats) return null;
  return player.slug ?? null;
}
