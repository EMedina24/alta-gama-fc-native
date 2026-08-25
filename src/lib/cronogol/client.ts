/**
 * CronoGol API client.
 *
 * ⚠ PORTED FROM `cronogol/lib/cronogol/client.ts` (ADR 0018). What changed and
 * what deliberately did not:
 *
 * - **Gone:** `import "server-only"`, `notFound()`, and `next: { revalidate }`.
 *   Next cached at the `fetch` layer; here React Query owns caching, so the
 *   revalidate buckets moved to `src/queries/stale.ts` as `staleTime` values.
 * - **Kept verbatim:** `CronogolApiError`, `readErrorMessage` and `toQuery`.
 *   Those three are load-bearing — see their own comments.
 * - **Added:** a request timeout. The web version had none because it ran on a
 *   server; a phone on a train needs one.
 * - **Dropped:** the `*ForRender` variants (they existed for OG-image routes) and
 *   the news reads (no news surface in the v1 design — add them back with the
 *   screen, not before).
 */

import type {
  FixtureWindowView,
  JornadaView,
  SeasonJornadasView,
  ScoreboardDayView,
  StandingsView,
  TeamFixturesView,
  TeamSquadView,
  TeamView,
} from './types';

/**
 * ⚠ Must stay `EXPO_PUBLIC_`-prefixed to reach the client bundle. Defaults to
 * production so a missing env var is a working app, not a blank one.
 *
 * ⚠ This is the API host ONLY. Calendar feed URLs are built in `feed.ts` from
 * their own separately pinned constant and must never derive from this — see
 * that file for why.
 */
export const API_BASE = process.env.EXPO_PUBLIC_CRONOGOL_API_URL ?? 'https://crono-gol.com';

const REQUEST_TIMEOUT_MS = 10_000;

export class CronogolApiError extends Error {
  /** ⚠ Assigned explicitly rather than as a TS parameter property: that syntax
   *  needs a real TS emit, which rules the module out of plain-JS test harnesses
   *  for no benefit. */
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'CronogolApiError';
    this.status = status;
  }
}

/**
 * `message` is a string for 404 and a string[] for validation errors. Normalise
 * before anything tries to render it.
 *
 * Only the first entry of the array: one bad value can produce several
 * complaints about the same field — `?limit=abc` answers with all three of
 * "must not be greater than 100", "must not be less than 1" and "must be an
 * integer number" — and joining them reads as three separate problems.
 *
 * ⚠ What comes back is the backend's own English validation prose naming the
 * parameter it dislikes. Never put this on screen: every reachable case is a bug
 * in our own query, not something the reader did. UI copy is chosen from
 * `error.status` through i18n. This string is for logs.
 */
async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    const message = (body as { message?: unknown } | null)?.message;
    if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
    if (typeof message === 'string') return message;
  } catch {
    // 5xx returns a generic body with no internal detail.
  }
  return `Request failed with status ${res.status}`;
}

/**
 * Validation is strict: an unrecognised query param returns 400 rather than
 * being ignored, so undefined entries have to be dropped, not stringified.
 *
 * ⚠ This is not a tidiness filter. `/cronogol/fixtures` and `/cronogol/standings`
 * both carry query DTOs with `forbidNonWhitelisted`, so a single stringified
 * `undefined` — or a cache-buster, or a `utm_source` — is a 400 on every call.
 */
type QueryValue = string | number | boolean | undefined;

function toQuery(params: Readonly<Record<string, QueryValue>>) {
  return new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
}

async function get<T>(path: string, query: URLSearchParams): Promise<T> {
  const qs = query.toString();
  const res = await fetch(`${API_BASE}${path}${qs ? `?${qs}` : ''}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new CronogolApiError(res.status, await readErrorMessage(res));
  }

  return res.json() as Promise<T>;
}

/** Narrows a 404 to `null` for the reads whose caller owns the empty state. */
async function getOrNull<T>(path: string, query: URLSearchParams): Promise<T | null> {
  try {
    return await get<T>(path, query);
  } catch (error) {
    if (error instanceof CronogolApiError && error.status === 404) return null;
    throw error;
  }
}

// ---------------------------------------------------------------- teams

export type GetTeamsParams = {
  /**
   * ⚠ A `League.apiSlug` — `laliga`, not the URL slug `la-liga`. Since
   * 2026-08-05 this takes the API's own spelling; the hyphenated display name
   * matches nothing and returns `[]`, not 404. Upper-case is a 400.
   */
  league?: string;
  /** Also return opponent-only clubs. Default false. */
  includeUntracked?: boolean;
};

/** Sorted by name. ~100 clubs and growing — never hardcode the league list. */
export async function getTeams(params: GetTeamsParams = {}): Promise<TeamView[]> {
  return get<TeamView[]>('/cronogol/teams', toQuery(params));
}

export type GetFixturesParams = {
  /** ⚠ INCLUSIVE here — unlike `to` on `/cronogol/fixtures`, which is exclusive. */
  from?: string;
  /** ⚠ INCLUSIVE. See above. The two routes differ on purpose. */
  to?: string;
  competition?: string;
};

/**
 * A club's own season, from that club's perspective: `goalsFor`/`goalsAgainst`
 * and `homeAway`, not home/away columns.
 *
 * 404 answers `null` — an unknown slug is the caller's empty state to render,
 * not an error boundary. (The web version had a second `notFound()` variant for
 * Next's 404 page; there is no such concept here.)
 */
export async function findTeamFixtures(
  slug: string,
  params: GetFixturesParams = {},
): Promise<TeamFixturesView | null> {
  return getOrNull<TeamFixturesView>(
    `/cronogol/teams/${encodeURIComponent(slug)}/fixtures`,
    toQuery(params),
  );
}

/**
 * Identity fields only — shirt, name, position group. There are no statistics
 * and never will be.
 *
 * ⚠ A tracked club with no registered squad answers `200 { players: [] }`, which
 * is a different state from the `null` a 404 produces. Both need copy.
 */
export async function getTeamSquad(slug: string): Promise<TeamSquadView | null> {
  return getOrNull<TeamSquadView>(
    `/cronogol/teams/${encodeURIComponent(slug)}/squad`,
    toQuery({}),
  );
}

// ---------------------------------------------------------------- jornadas

/**
 * The matchweek index — one request instead of one per matchweek.
 *
 * ⚠ `matchweeks` is ordered by NUMBER, which is not date order. Size a pager
 * from `totalMatchweeks` (38 primera / 42 segunda / 34 Bundesliga — derived from
 * the club count, so never write the number down) and sort on `firstKickoffUtc`
 * before doing anything time-shaped. See `jornada.ts`.
 *
 * A 404 here genuinely means an unknown league slug — a bug in our own config —
 * so it throws rather than answering null.
 */
export async function getSeasonJornadas(
  leagueApiSlug: string,
  season: number,
): Promise<SeasonJornadasView> {
  return get<SeasonJornadasView>(
    `/cronogol/jornada/${encodeURIComponent(leagueApiSlug)}/${season}`,
    toQuery({}),
  );
}

/**
 * One matchweek, neutral perspective: `homeTeam`/`awayTeam` and
 * `goalsHome`/`goalsAway`. Deliberately a different shape from a club fixture.
 *
 * ⚠ `n` must be pre-validated against `totalMatchweeks`: outside 1–60 is a 400,
 * and inside it an unplayed round is `200 { fixtures: [] }`, not an error.
 */
export async function getJornada(
  leagueApiSlug: string,
  season: number,
  matchweek: number,
): Promise<JornadaView> {
  return get<JornadaView>(
    `/cronogol/jornada/${encodeURIComponent(leagueApiSlug)}/${season}/${matchweek}`,
    toQuery({}),
  );
}

// ---------------------------------------------------------------- windows

export type GetFixtureWindowParams = {
  /** ⚠ INCLUSIVE. Always send it — see below. */
  from?: string;
  /**
   * ⚠ **EXCLUSIVE** — the window is `[from, to)`. The club-fixtures route's `to`
   * is inclusive. They differ on purpose.
   */
  to?: string;
  league?: string;
  limit?: number;
};

/**
 * Every league in one date window. This is what the Today board's FINISHED TODAY
 * section is built from — it carries `leagueSlug` and our own mirrored crests,
 * which `/cronogol/scores` does not.
 *
 * ⚠ **Always send your own `from`/`to`.** The server's default `from` is UTC
 * midnight and it picks no timezone, ever — so a caller that omits them silently
 * draws UTC days and a reader in Auckland gets a window starting half a day in
 * their past.
 *
 * ⚠ This route has a query DTO: an undeclared param is a 400, as is `to <= from`,
 * a span over 31 days, an upper-case league, or `limit` outside 1–500.
 */
export async function getFixtureWindow(
  params: GetFixtureWindowParams,
): Promise<FixtureWindowView> {
  return get<FixtureWindowView>('/cronogol/fixtures', toQuery(params));
}

// ---------------------------------------------------------------- standings

export type GetStandingsParams = {
  /** ⚠ Unknown slug is `200 { tables: [] }`, not a 404 — this narrows a collection. */
  league?: string;
  season?: number;
  /**
   * The table as of this matchday, cumulative through it.
   * ⚠ NOT clamped to the league's real length — `50` against a 38-week league
   * quietly serves the final table.
   */
  matchweek?: number;
};

/**
 * ⚠ Omit `league` and every published league returns in `tables` — a league-tab
 * UI is ONE request.
 *
 * ⚠ `tables` is ordered by league SLUG ascending, which is stable and diffable
 * but **not editorial**. A design that wants LaLiga first sorts it itself
 * (`League.order` in `leagues.ts`).
 *
 * ⚠ A league with no stored rows is ABSENT from `tables`, not present and empty.
 * Build a tab strip from the league catalogue if the tabs must be stable.
 */
export async function getStandings(params: GetStandingsParams = {}): Promise<StandingsView> {
  return get<StandingsView>('/cronogol/standings', toQuery(params));
}

// ---------------------------------------------------------------- scoreboard

export type GetScoresParams = {
  /** `YYYY-MM-DD` only. A full ISO datetime, `20260806` or `2026-02-31` are 400s. */
  date?: string;
  /**
   * ⚠ **2 is the only value the UI should send.** Only the newest two buckets
   * are kept fresh; 3–7 return rows the ingest stopped updating, and the larger
   * cap exists for operators.
   */
  days?: number;
};

/**
 * The scoreboard. A DIFFERENT feature on a DIFFERENT source from everything
 * above, refreshed roughly every four hours.
 *
 * ⚠ There is **no crosswalk** between an event here and a club in
 * `/cronogol/teams` — no shared ids, no slug. Do not join them. Crests are
 * hot-linked from the source's CDN and may 404: always render the monogram
 * fallback. Nothing here is live; see `scores.ts` for the rule that enforces it.
 *
 * No 404 branch: a quiet day is `200 { count: 0 }`.
 */
export async function getScores(params: GetScoresParams = {}): Promise<ScoreboardDayView> {
  return get<ScoreboardDayView>('/cronogol/scores', toQuery(params));
}
