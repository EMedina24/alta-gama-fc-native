# 0018 — The ported `lib/cronogol/` layer mirrors the web app path for path

- **Date:** 2026-08-24
- **Status:** Accepted
- **Decided by:** Ed Medina

## Context
[0012](./0012-native-ios-port-of-cronogol.md) says functionality is ported from
`cronogol` and that it stays the reference implementation.
`cronogol/lib/cronogol/` is where that functionality actually lives, and most of
its value is **not** the code — it is several hundred lines of caveat comments
recording what the wire does, which is repeatedly not what the field names
suggest.

## Decision
`src/lib/cronogol/` mirrors `cronogol/lib/cronogol/` **path for path and name for
name**, so `diff` between the two stays a one-line operation for the life of the
app. Do not rename these files to something prettier.

| File | Port |
| --- | --- |
| `types.ts` | verbatim (two comment mentions of `next/link` reworded) |
| `derive.ts` | **verbatim** — it had no framework dependency to strip |
| `standings.ts` | **verbatim** |
| `scores.ts` | verbatim; only the `Locale` import path changed |
| `client.ts` | rewritten: no `server-only`, no `notFound()`, no `next.revalidate`; timeout added; `*ForRender` and news reads dropped |
| `leagues.ts` | rewritten: dictionary-typed copy fields dropped, `order` and `zone` added |
| `jornada.ts` | reworked: `dayGroups` is generic over the data instead of carrying a rendered row |
| `fixture-window.ts` | reduced to the bounds half; the week grid has no counterpart here |
| `feed.ts` | rewritten small, host pinned |

`src/lib/cronogol/*` stays **pure** — no React, no hooks. React Query hooks live
in `src/queries/`. That separation is what lets the widget bridge and any
background task reuse the client without dragging a QueryClient in.

## Consequences
- **Upstream fixes are portable.** A caveat discovered on the web is a diff away.
- Three things were kept verbatim from `client.ts` and each is load-bearing:
  `CronogolApiError`, `readErrorMessage` (a validation `message` is a `string[]`;
  take `[0]` only), and `toQuery`'s drop-undefined filter — which is the only
  thing standing between us and a 400 on every request, because
  `/cronogol/fixtures` and `/cronogol/standings` carry `forbidNonWhitelisted` DTOs.
- The per-endpoint 404 policy is preserved: `findTeamFixtures`/`getTeamSquad`
  answer `null`, `getSeasonJornadas` throws (a 404 there is a bug in our own
  league config), and the collection routes have no 404 branch at all because
  they answer `200` with an empty array.
- `CronogolApiError` assigns its field explicitly rather than via a TS parameter
  property, so the module runs in a plain-JS harness — which is how the layer was
  verified against production before any screen existed.
- **`feed.ts` pins its own host** and never derives from `API_BASE`. A `webcal://`
  host is copied onto a subscriber's device permanently; a developer pointing the
  API at `localhost:3001` must not be able to mint a feed URL from it.
- League config (`zones`, `clubCount`) sits in `lib/cronogol/leagues.ts`, not
  `constants/` — it is contract-adjacent data checked against wire fields by
  `bandsApply`, not a design token.
