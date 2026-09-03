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
  /**
   * Whether a finished fixture here can ever grow an events timeline. False
   * hides the events disclosure outright: Puerto Rico's federation enters no
   * player events at all, so `/cronogol/fixtures/{id}/events` answers
   * `count: 0` forever and a chevron would promise data that cannot arrive.
   * ⚠ NOT "events observed today" — a league can serve an empty array on one
   * real match (trap 32) and still keep `true`; a missing match's timeline is
   * the disclosure's own pending copy, a missing CAPABILITY is this flag.
   */
  matchEvents: boolean;
  /**
   * True for a season named by ONE calendar year (Puerto Rico's `2026`),
   * false for the European cross-year form (`2026/27`). Feeds
   * `leagueSeasonLabel`; nothing else may branch on it.
   */
  calendarYearSeason: boolean;
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
    matchEvents: true,
    calendarYearSeason: false,
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
    matchEvents: true,
    calendarYearSeason: false,
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
    matchEvents: true,
    calendarYearSeason: false,
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
    matchEvents: true,
    calendarYearSeason: false,
    hasHalves: false,
    zone: 'Europe/Rome',
    zones: [
      { kind: 'ucl', from: 1, to: 4 },
      { kind: 'uel', from: 5, to: 6 },
      { kind: 'conf', from: 7, to: 7 },
      { kind: 'rel', from: 18, to: 20 },
    ],
  },
  {
    /**
     * ⚠ Puerto Rico is TWO leagues, not one. `lpr-pro-apertura` and
     * `lpr-pro-clausura` are separate championships with separate tables that
     * both run inside one calendar year — the `laliga`/`segunda` relationship,
     * not a two-half season. Only CLAUSURA is registered on the backend today
     * (2026-09-02); Apertura joins as a sibling entry when its league row
     * exists, and asking for it before then returns an empty table, not a 404.
     *
     * ⚠ The first league here whose source cannot feed the whole app. The
     * federation publishes a standings table and a schedule and nothing else:
     * no matchweek on any fixture (so `rounds: false` keeps it off Matchdays),
     * no player events ever (`matchEvents: false`), and it can never appear on
     * `/cronogol/live`. Squads are the best of any league — a real portrait on
     * essentially every player. The capability table this mirrors is
     * `senpai-backend/CRONOGOL-API.md` §"Puerto Rico"; there is no
     * capabilities field on the wire, so it is copied by hand.
     *
     * ⚠ `live: true` is not a claim about live SCORES — it means the league
     * has clubs to browse, which Puerto Rico does. Live scores are gated by
     * the data (`/cronogol/live` simply never carries a row) and by the
     * widget's own `laliga` check.
     */
    slug: 'lpr-pro-clausura',
    apiSlug: 'lpr-pro-clausura',
    // ⚠ NOT the wire's `LPR Pro Masculina Clausura`. This league serves NO
    // artwork, so it is the first to render the chip's text branch (ADR 0031)
    // — the name has to fit a 36pt chip, and "LPR Apertura" must sit beside it.
    name: 'LPR Clausura',
    order: 5,
    // ⚠ Eleven, and `bandsApply` compares the table's `clubs` against it — a
    // wrong number silently drops the rank badges and the club-page strip.
    clubCount: 11,
    live: true,
    rounds: false,
    matchEvents: false,
    calendarYearSeason: true,
    hasHalves: false,
    zone: 'America/Puerto_Rico',
    // No continental qualification and no relegation published. Empty says
    // "no bands"; omitting it would not compile, which is the point.
    zones: [],
  },
];

export const DEFAULT_LEAGUE = LEAGUES[0];
export const LIVE_LEAGUES = LEAGUES.filter((l) => l.live);
/**
 * The leagues that have a matchweek index behind them.
 *
 * ⚠ Every screen built on rounds must take THIS list, not `LEAGUES`. Puerto
 * Rico answers `/cronogol/jornada/...` with `200` and `matchweeks: []` rather
 * than a 404, so an ungated screen does not fail — it draws a full pager whose
 * every round is empty, which reads as twenty broken rounds.
 */
export const ROUND_LEAGUES = LEAGUES.filter((l) => l.rounds);

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

/**
 * The league catalogue as a filter row's options, in editorial order.
 *
 * ⚠ `LeagueRef.logoUrls` is keyed SEMANTICALLY (`primary`/`icon`/`wordmark`/
 * `onDark`/`onLight`), the opposite of `TeamView`'s size keys. `icon` is the
 * icon-only cut and is LaLiga's alone today; `primary` is the full lockup, which
 * carries its own wordmark. Picking wrong is a layout mistake, not a resolution
 * one — so the order lives here once rather than at each screen that draws the row.
 *
 * ⚠ `onDark` comes FIRST because every surface in this app is dark (the theme's
 * `light` is an alias of `dark`). It exists for the Premier League alone, whose
 * `primary` became a PURE WHITE mark on 2026-08-08 — correct for a dark UI, and
 * the one league whose `logoUrl` cannot be dropped onto an arbitrary background.
 * Today `onDark` EQUALS `primary`, so this changes nothing; it is insurance for
 * the next time that artwork changes ink, which it already has once.
 *
 * Artwork is optional: a league with none renders as its name (ADR 0031), and
 * the row is still usable while `useLeagueArtwork` is in flight. Puerto Rico
 * is the first league to actually take that branch — it serves no artwork.
 *
 * `leagues` narrows the row to a capability's subset — `ROUND_LEAGUES` on the
 * Matchdays screen. It defaults to the whole catalogue, so a caller that has no
 * capability to respect reads exactly as before.
 */
export function leagueOptions(
  artwork: Record<string, { logoUrl?: string | null; logoUrls?: Record<string, string> | null }>
    | undefined,
  leagues: readonly League[] = LEAGUES,
): { slug: string; name: string; logoUrl: string | null }[] {
  return [...leagues].sort(byEditorialOrder).map((league) => {
    const art = artwork?.[league.apiSlug];
    return {
      slug: league.slug,
      name: league.name,
      logoUrl:
        art?.logoUrls?.onDark ??
        art?.logoUrls?.icon ??
        art?.logoUrls?.primary ??
        art?.logoUrl ??
        null,
    };
  });
}

/** `2026` → `"2026/27"`. */
export function seasonLabel(season: number): string {
  return `${season}/${String((season + 1) % 100).padStart(2, '0')}`;
}

/**
 * The season as THIS league names it: `"2026/27"` for a European league,
 * `"2026"` for one whose championship starts and finishes inside one year.
 *
 * ⚠ Puerto Rico's Clausura runs February–June 2026 and is called the 2026
 * season. Printing `2026/27` beside a Ponce player would be a straightforward
 * factual error, not a formatting preference.
 *
 * An unknown league keeps the European form — the same string this app printed
 * before the parameter existed, so a caller that cannot resolve a league (a
 * club in no table, a table still loading) is never worse off than it was.
 */
export function leagueSeasonLabel(league: League | undefined, season: number): string {
  return league?.calendarYearSeason ? String(season) : seasonLabel(season);
}
