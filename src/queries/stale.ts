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
} as const;

/** Keep unused data around a while: tab switches should not re-fetch. */
export const GC_TIME = 60 * 60 * 1000;
