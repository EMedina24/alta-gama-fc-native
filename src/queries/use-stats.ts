/**
 * Season stats — a club's record, and one player's (ADR 0141).
 *
 * ⚠ **These are the slowest-moving numbers in the app, and they look like the
 * fastest.** They are not read at request time: a cron chain rebuilds them
 * every three hours, 25 minutes behind the events sweep, so the lag from a
 * final whistle is ~25 minutes at best and ~4 hours at worst. `STALE.stats`
 * (30 min) is chosen against that rebuild, not against how fresh a stats screen
 * feels — and no caller may put a "just now" on the result.
 *
 * ⚠ Both answer `null` on a 404 rather than throwing, like `useClubSquad`: an
 * unknown slug is the screen's empty state, not an error boundary. And a club
 * or player we know with nothing swept yet answers `200` with `seasons: []` —
 * a DIFFERENT state from `null`, needing its own copy.
 *
 * ⚠ `getPlayerStats` can also answer `409` for an ambiguous slug, which is
 * deliberately NOT narrowed and arrives here as an error. The global retry
 * policy in `./client` does not retry anything under 500, so it fails once and
 * stays failed rather than hammering a route that will never agree with itself.
 */
import { useQueries, useQuery } from '@tanstack/react-query';

import { getPlayerStats, getStatsLeaders, getTeamStats } from '@/lib/cronogol/client';
import type { PlayerStatsView, StatsMetric } from '@/lib/cronogol/types';
import { createLimiter } from '@/lib/limit';
import { keys } from './keys';
import { STALE } from './stale';

export function useTeamStats(slug: string) {
  return useQuery({
    queryKey: keys.teamStats(slug),
    queryFn: () => getTeamStats(slug),
    staleTime: STALE.stats,
    enabled: Boolean(slug),
  });
}

/**
 * ⚠ `slug` is nullable and `null` is the ordinary state, not an error: every
 * Premier League player's slug is null on the wire, and the picker has no
 * selection until the squad resolves. `enabled` is what keeps that from
 * becoming a request for `/cronogol/players/null/stats`.
 */
export function usePlayerStats(slug: string | null) {
  return useQuery({
    queryKey: keys.playerStats(slug ?? ''),
    queryFn: () => getPlayerStats(slug ?? ''),
    staleTime: STALE.stats,
    enabled: Boolean(slug),
  });
}

/**
 * One stats payload per addressable squad player — the Starting XI picker's
 * goals · assists column (ADR 0214).
 *
 * ⚠ The SAME query key as `usePlayerStats`, so the player card that opens
 * from a picker row is a cache read, and so is Season stats afterwards.
 *
 * ⚠ Throttled to four in flight (the handoff's number) by one module-level
 * gate shared across mounts: a LaLiga squad is ~25 requests, and a picker
 * opening must not queue them all ahead of whatever else the app is asking.
 *
 * ⚠ Callers pass slugs already through `statsSlug` — a league without player
 * stats passes none and this costs nothing.
 */
const statsGate = createLimiter(4);

export function useSquadStats(slugs: readonly string[]): ReadonlyMap<string, PlayerStatsView | null> {
  const results = useQueries({
    queries: slugs.map((slug) => ({
      queryKey: keys.playerStats(slug),
      queryFn: () => statsGate(() => getPlayerStats(slug)),
      staleTime: STALE.stats,
    })),
  });
  const out = new Map<string, PlayerStatsView | null>();
  results.forEach((result, i) => {
    if (result.data !== undefined) out.set(slugs[i], result.data);
  });
  return out;
}

/**
 * A competition's leaderboard — used to pick the player the Season stats screen
 * OPENS on (ADR 0141).
 *
 * ⚠ **The first squad row is the wrong default and looked like a bug.**
 * Barcelona's squad begins with a goalkeeper, who has no season block at all,
 * so the Players view opened on an empty state for the club with the most
 * complete data in the app. The top scorer is what the mock shows and what a
 * reader means by "this club's player".
 *
 * ⚠ One entry per LEAGUE, so twenty club pages share a single request.
 *
 * ⚠ `league` is required by the route — a missing one is a `400`, not a merged
 * table — so an unresolved league disables the query rather than guessing.
 */
export function useStatsLeaders(
  leagueApiSlug: string | undefined,
  metric: StatsMetric,
  limit = 100,
) {
  return useQuery({
    queryKey: keys.statsLeaders(leagueApiSlug ?? '', metric),
    queryFn: () => getStatsLeaders({ league: leagueApiSlug ?? '', metric, limit }),
    staleTime: STALE.stats,
    enabled: Boolean(leagueApiSlug),
  });
}
