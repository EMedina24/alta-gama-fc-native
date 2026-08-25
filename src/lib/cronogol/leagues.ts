/**
 * The league catalogue.
 *
 * ⚠ PORTED FROM `cronogol/lib/cronogol/leagues.ts` (ADR 0018), minus the
 * dictionary-typed copy fields (`countryKey`, `roundCopyKey`, `roundUnit`) which
 * were tied to the web app's `server-only` dictionaries, and plus `order`.
 *
 * `GET /cronogol/leagues` exists and serves artwork and tints, but it cannot
 * serve `zones` or `clubCount` — see below — so this file stays the source of
 * truth for the parts the wire refuses to carry.
 */

/** Which European competition a rank qualifies for, or relegation. */
export type ZoneKind = 'ucl' | 'uel' | 'conf' | 'rel';

/** Inclusive 1-based rank range. Uses the wire's `rank`, never an array index. */
export interface Zone {
  kind: ZoneKind;
  from: number;
  to: number;
}

export interface League {
  /** Our own stable key. Used in routes and preference storage. */
  slug: string;
  /**
   * ⚠ What the API takes. Differs from `slug` only for LaLiga (`laliga` vs
   * `la-liga`) and always will. Sending the wrong one returns `[]`, not a 404 —
   * so it fails silently and looks like a coverage gap.
   */
  apiSlug: string;
  /**
   * Our display name. ⚠ NOT the API's `name`, which is the provider's own copy
   * (`LALIGA EA SPORTS`). Key on `slug`, always.
   */
  name: string;
  /**
   * Editorial order for tab strips. ⚠ `GET /cronogol/standings` returns `tables`
   * ordered by league SLUG ascending — stable and diffable, but not editorial.
   * The design wants LaLiga first (Spain is the market), so we sort on this.
   */
  order: number;
  /**
   * The league's real top flight.
   *
   * ⚠ NOT the size of the tracked set. LaLiga tracks 25 clubs — the primera 20
   * plus five relegated clubs followed into segunda — but the *league* is 20.
   * `bandsApply` compares the standings' `clubs` against this to decide whether
   * the table is complete enough to paint bands on, so a wrong number here
   * paints a lie or suppresses a correct one.
   */
  clubCount: number;
  /** False renders "coming soon" rather than an empty grid. Ligue 1 is next. */
  live: boolean;
  /** Whether the league has published matchweek rounds. */
  rounds: boolean;
  /** Whether ida/vuelta halves are a meaningful division for this league. */
  hasHalves: boolean;
  /**
   * IANA zone the league plays in. "A midweek round is midweek *where the league
   * is*" — used by `isMidweek`, never for rendering a kickoff to the reader.
   */
  zone: string;
  /**
   * Qualification bands.
   *
   * ⚠ **Configuration, never arithmetic.** `GET /cronogol/standings` serves no
   * `zone` field and says so deliberately: which ranks mean Champions League,
   * Europa, Conference or relegation varies by season and by federation
   * decision, and a league can be reallocated a slot mid-year. The handoff's
   * `pos <= 4 / <= 6 / = 7 / >= 18` was labelled a placeholder in the handoff itself.
   *
   * ⚠ **Required rather than optional**, so a league arriving here is a build
   * error until someone has looked its bands up. An empty array says "no bands",
   * which is a different statement from having forgotten.
   *
   * ⚠ **Not confirmed for 2026/27.** These are the allocations as understood on
   * 2026-08-15, and every European count is coefficient-driven — the fifth
   * Champions League place Spain and England hold is earned per season, not
   * permanent. This is the only thing on the standings screen asserting
   * something about a club's season. Check it before launch.
   */
  zones: readonly Zone[];
}

export const LEAGUES: readonly League[] = [
  {
    slug: 'la-liga',
    apiSlug: 'laliga',
    name: 'LaLiga',
    order: 1,
    clubCount: 20,
    live: true,
    rounds: true,
    hasHalves: true,
    zone: 'Europe/Madrid',
    zones: [
      { kind: 'ucl', from: 1, to: 5 },
      { kind: 'uel', from: 6, to: 6 },
      { kind: 'conf', from: 7, to: 7 },
      { kind: 'rel', from: 18, to: 20 },
    ],
  },
  {
    slug: 'premier-league',
    apiSlug: 'premier-league',
    name: 'Premier League',
    order: 2,
    clubCount: 20,
    live: true,
    rounds: true,
    hasHalves: false,
    zone: 'Europe/London',
    zones: [
      { kind: 'ucl', from: 1, to: 5 },
      { kind: 'uel', from: 6, to: 6 },
      { kind: 'conf', from: 7, to: 7 },
      { kind: 'rel', from: 18, to: 20 },
    ],
  },
  {
    // ⚠ 18 clubs, so 34 matchdays and 9 matches a round — the only league here
    // where a pager sized at 38 runs off the end of the season.
    slug: 'bundesliga',
    apiSlug: 'bundesliga',
    name: 'Bundesliga',
    order: 3,
    clubCount: 18,
    live: true,
    rounds: true,
    hasHalves: false,
    zone: 'Europe/Berlin',
    zones: [
      { kind: 'ucl', from: 1, to: 4 },
      { kind: 'uel', from: 5, to: 5 },
      { kind: 'conf', from: 6, to: 6 },
      { kind: 'rel', from: 17, to: 18 },
    ],
  },
  {
    // ⚠ The only league whose clubs carry a ground: `venue.city` on all 20 and
    // `venue.capacity` on 17. Every other league is null on both, so a component
    // rendering either must tolerate null or it renders for Italy alone.
    slug: 'serie-a',
    apiSlug: 'serie-a',
    name: 'Serie A',
    order: 4,
    clubCount: 20,
    live: true,
    rounds: true,
    hasHalves: false,
    zone: 'Europe/Rome',
    zones: [
      { kind: 'ucl', from: 1, to: 4 },
      { kind: 'uel', from: 5, to: 6 },
      { kind: 'conf', from: 7, to: 7 },
      { kind: 'rel', from: 18, to: 20 },
    ],
  },
];

export const DEFAULT_LEAGUE = LEAGUES[0];
export const LIVE_LEAGUES = LEAGUES.filter((l) => l.live);

/** The season every route is pinned to. Baked into permanent `webcal://` URLs. */
export const SEASON = 2026;

export function findLeague(slug: string): League | undefined {
  return LEAGUES.find((l) => l.slug === slug);
}

export function findLeagueByApiSlug(apiSlug: string): League | undefined {
  return LEAGUES.find((l) => l.apiSlug === apiSlug);
}

/**
 * How many rounds this league's season has: `2 * (clubCount - 1)`.
 *
 * ⚠ Use this as the denominator in an "after matchday N of M" caption, NOT the
 * standings payload's `matchesTotal` — that is `clubs * (clubs - 1)`, a count of
 * *matches* (380), on a different scale entirely. Printing one as the other is
 * how "matchday 24 of 380" reaches a screen.
 *
 * ⚠ It is a claim about the *round pages*, not about any one club's fixture
 * count: LaLiga's tracked set spans two divisions, 38 in primera and 42 in
 * segunda. Prefer the API's own `totalMatchweeks` wherever it is in hand.
 */
export function roundCount(league: League): number {
  return 2 * (league.clubCount - 1);
}

/** Editorial order, for a tab strip. The API's own order is alphabetical. */
export function byEditorialOrder(a: League, b: League): number {
  return a.order - b.order;
}

/** `2026` → `"2026/27"`. */
export function seasonLabel(season: number): string {
  return `${season}/${String((season + 1) % 100).padStart(2, '0')}`;
}
