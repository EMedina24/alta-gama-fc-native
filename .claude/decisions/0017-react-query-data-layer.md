# 0017 — React Query, with the web app's cache buckets as `staleTime`

- **Date:** 2026-08-24
- **Status:** Accepted
- **Decided by:** Ed Medina

## Context
`cronogol` caches at the `fetch` layer, because Next does: every read passes a
`revalidate` bucket chosen by **how fast the upstream data moves**, not by which
screen wants it. That mechanism does not exist in React Native, but the buckets
were the valuable part and they transfer.

## Decision
`@tanstack/react-query` v5 owns caching. The buckets move to
[src/queries/stale.ts](../../src/queries/stale.ts) as `staleTime`:

| Bucket | Value | What |
| --- | --- | --- |
| `catalogue` | 24 h | clubs, squads — moves on transfer windows |
| `feed` | 15 min | fixtures, jornadas, standings, scores |

**There is deliberately no default.** A default is how a new endpoint silently
inherits somebody else's cadence. Adding a query means choosing a bucket.

Retry is **off for every 4xx** ([queries/client.ts](../../src/queries/client.ts)):
a 400 from this API means our own query was wrong — an undeclared param, a
matchweek out of range — and retrying makes the same mistake three times. A 429
on the push routes is a rate limit a retry actively worsens.

Query keys live in [queries/keys.ts](../../src/queries/keys.ts) and always use a
league's **`apiSlug`**, never our `slug`. Mixing them gives two cache entries for
one request, and the wrong one returns `[]` rather than 404 — so it reads as a
coverage gap, not a bug.

## Consequences
- Request dedupe matters more than it looks: the Table screen needs both
  `/cronogol/standings` and a jornada index per league for its caption, and the
  Matchdays screen wants the same index.
- `gcTime` is an hour so a tab switch does not re-fetch.
- `refetchOnWindowFocus` is off — on a phone, focus changes constantly.

## Alternatives considered
- **Plain `useEffect` + state** — no dedupe, no cache, and every screen
  reimplements loading and error handling.
- **SWR** — equivalent; React Query's key factory and retry predicate fit the
  per-endpoint 404 policy this API needs.
