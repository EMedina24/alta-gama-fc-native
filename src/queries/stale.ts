/**
 * Cache lifetimes, bucketed by how fast the UPSTREAM data moves — not by which
 * screen wants it.
 *
 * ⚠ PORTED FROM the `REVALIDATE` table in `cronogol/lib/cronogol/client.ts`
 * (ADR 0017). Next cached at the `fetch` layer; React Query caches per query, so
 * the same numbers become `staleTime`.
 *
 * ⚠ **There is deliberately no default.** A default is how a new endpoint
 * silently inherits somebody else's cadence. Adding a query means choosing a
 * bucket and being able to say why.
 */
export const STALE = {
  /**
   * Clubs and squads. Moves on transfer windows, not on match days.
   * The squad route's own header is `max-age=300`; a whole day is still honest
   * for a client, because a registration change nobody has made yet cannot be
   * stale.
   */
  catalogue: 24 * 60 * 60 * 1000,

  /**
   * Fixtures, jornadas, standings, scores. Everything that moves when a match
   * is played or a kickoff is rescheduled.
   */
  feed: 15 * 60 * 1000,

  /**
   * In-play match state, from `GET /cronogol/live`. Moves every ~30s
   * server-side while a match is being played; anything longer renders a minute
   * that is visibly wrong on screen.
   *
   * ⚠ **`feed` does not fit and reusing it would be the bug.** Fifteen minutes
   * is thirty stale cycles here — the card would sit on a minute half an hour
   * behind the match. A third bucket is the file's own remedy: adding a query
   * means choosing one and being able to say why.
   *
   * ⚠ **Never take this below 10 seconds.** The route's own header is
   * `max-age=10` and the underlying data moves every ~30s, so a faster poll
   * doubles the request count to be handed back the identical body.
   */
  live: 15 * 1000,

  /**
   * Season stats — `GET /cronogol/{teams,players}/{slug}/stats` and
   * `/cronogol/stats/leaders` (ADR 0141).
   *
   * ⚠ **`feed` is too fast and `catalogue` is too slow, in the same direction
   * for the same reason: neither describes what moves this data.** These rows
   * are not read from fixtures at request time — they are rebuilt by a cron
   * that runs every three hours, 25 minutes behind the events sweep, which is
   * itself 22 minutes behind the fixtures sweep. So a refetch at 15 minutes
   * spends a request to be handed the identical body eleven times out of
   * twelve, and a refetch at 24 hours would sit on yesterday's totals through
   * eight rebuilds.
   *
   * Half an hour sits inside the rebuild period without chasing it. The
   * route's own header is `max-age=300`, so anything under ~5 minutes buys
   * literally nothing.
   *
   * ⚠ **Nothing on this screen may present these numbers as live.** The
   * end-to-end lag from final whistle is ~25 minutes at best and ~4 hours at
   * worst; no "just now", no ticking minute, no snapshot into a widget or a
   * share image — the totals are a cache of a pure function over stored
   * events, and a backfill revises them retroactively.
   */
  stats: 30 * 60 * 1000,
} as const;

/** Keep unused data around a while: tab switches should not re-fetch. */
export const GC_TIME = 60 * 60 * 1000;
