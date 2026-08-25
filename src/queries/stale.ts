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
} as const;

/** Keep unused data around a while: tab switches should not re-fetch. */
export const GC_TIME = 60 * 60 * 1000;
