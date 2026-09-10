/**
 * Query keys, in one place.
 *
 * ⚠ Every key that hits a league route uses `apiSlug` (`laliga`), never our own
 * `slug` (`la-liga`). Mixing them gives two cache entries for one request, and
 * the wrong one silently returns `[]` rather than 404 — so it looks like a
 * coverage gap, not a bug.
 */
export const keys = {
  teams: (leagueApiSlug?: string) => ['teams', leagueApiSlug ?? 'all'] as const,
  teamFixtures: (slug: string) => ['team-fixtures', slug] as const,
  /**
   * One followed club's cross-competition window (ADR 0132) — the Today
   * board's cup/segunda feed.
   *
   * ⚠ NOT `teamFixtures` — that key is the club page's whole-season, no-params
   * read of the same route; sharing the entry would hand one caller the
   * other's window. Keyed to the DAY like `fixtureWindow`, so a re-render
   * mints no new entry and a refetch re-reads bounds inside the `queryFn`.
   */
  teamWindow: (slug: string, fromDay: string) => ['team-window', slug, fromDay] as const,
  teamSquad: (slug: string) => ['team-squad', slug] as const,
  /**
   * A club's season record (ADR 0141). Keyed on the CLUB slug alone: one
   * request carries every competition-season the sweep holds, and the screen
   * picks its block out of the payload with `pickTeamSeason`.
   */
  teamStats: (slug: string) => ['team-stats', slug] as const,
  /**
   * One player's season record.
   *
   * ⚠ Keyed on the SLUG, because the slug is the only thing the route takes —
   * even though `playerId` is the stable identity. Two people can share a slug
   * (the route answers `409`), so this key is an address, not an identity;
   * never join a cache entry here to a squad row by it.
   */
  playerStats: (slug: string) => ['player-stats', slug] as const,
  /**
   * A competition's leaderboard for one metric (ADR 0141).
   *
   * ⚠ Keyed on the LEAGUE, not on a club, deliberately: the route ranks a whole
   * competition, so every club page in LaLiga shares one cache entry rather
   * than firing twenty identical requests to each pick its own top scorer out
   * of the same list.
   */
  statsLeaders: (leagueApiSlug: string, metric: string) =>
    ['stats-leaders', leagueApiSlug, metric] as const,
  seasonJornadas: (leagueApiSlug: string, season: number) =>
    ['season-jornadas', leagueApiSlug, season] as const,
  jornada: (leagueApiSlug: string, season: number, matchweek: number) =>
    ['jornada', leagueApiSlug, season, matchweek] as const,
  standings: (leagueApiSlug?: string) => ['standings', leagueApiSlug ?? 'all'] as const,
  /**
   * ⚠ Keyed on the USER ID, so signing out evicts the previous account rather
   * than serving its name to whoever signs in next.
   */
  account: (userId: string) => ['account', userId] as const,
  fixtureWindow: (from: string, to: string) => ['fixture-window', from, to] as const,
  /**
   * One match's timeline. Keyed on OUR fixture id — the same `id` already on
   * `JornadaFixtureView` / `WindowFixtureView` / `FixtureView`, so a row opened
   * on Today and the same row opened on Matchdays share one cache entry.
   */
  fixtureEvents: (id: string) => ['fixture-events', id] as const,
  /**
   * What is being played right now — `GET /cronogol/live`.
   *
   * ⚠ **One key for the WHOLE APP, and it takes no argument.** The route
   * returns every live match in a single response, so a per-fixture key would
   * turn one request into N for data that arrives together anyway. The join
   * happens client-side, on `fixtureId`, in `lib/cronogol/live.ts`.
   *
   * ⚠ No league argument either: the app deliberately asks for everything the
   * route covers rather than pinning `laliga`, which would silently cap
   * coverage the day the backend widens it.
   */
  live: () => ['live'] as const,
  /**
   * The global news feed — `GET /cronogol/news`. One key, no argument: the
   * widget and the Today card / News screen all read the whole feed (ADR
   * 0061, 0064) — one feed, three consumers, one request.
   */
  news: () => ['news'] as const,
  /** The feed sliced to one news-league id (`?league=`) — the screen's chips. */
  newsLeague: (leagueId: string) => ['news', 'league', leagueId] as const,
  /**
   * The News screen's infinite feed (ADR 0129/0130) — same route, paged by
   * keyset (`?before=`). `'all'` for the global feed. Shares the `'news'`
   * prefix so a broad invalidation reaches it; the two keys above keep their
   * exact shape for the widget writer, the Today card and the link sheet.
   */
  newsFeed: (leagueId: string) => ['news', 'feed', leagueId] as const,
  /** `GET /cronogol/news/leagues` — the chip set, server-ordered. */
  newsLeagues: () => ['news-leagues'] as const,
} as const;
