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
  teamSquad: (slug: string) => ['team-squad', slug] as const,
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
} as const;
