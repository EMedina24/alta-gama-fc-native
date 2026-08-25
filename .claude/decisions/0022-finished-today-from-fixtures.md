# 0022 — `FINISHED TODAY` is built from `/cronogol/fixtures`, not the scoreboard

- **Date:** 2026-08-24
- **Status:** Accepted
- **Decided by:** Ed Medina

## Context
SPEC §3.1 specifies a `FINISHED TODAY` section carrying "full-time scores from
**every tracked league**, grouped by league with the league mark as the group
header", and says LaLiga clubs use `logoUrl` crests.

The obvious source is `GET /cronogol/scores`, and the web app's own score rail
reads it — `cronogol/components/score-rail/score-card.tsx` renders
`<Crest src={team.crestUrl} fallback={scoreAbbr(team)} …>`.

It cannot serve this section. Verified against production:

- It is a **world** scoreboard. `?days=2` returned Liga Argentina, Primeira Liga
  Portugal and friendlies alongside ours, and `tournament.name` is the source's
  free text, not our league slug.
- `CRONOGOL-API.md` states flatly: *"there is **no relationship** between an event
  here and a club in `GET /cronogol/teams`: no shared ids, no slug, no crosswalk.
  Do not try to join them."* So there is no route from a scoreboard row to
  `logoUrl`.
- Its only crest is `crestUrl`, hot-linked from the provider's CDN — the one place
  in the API where an image is not on our own storage, documented as liable to
  404 without notice.

## Decision
`FINISHED TODAY` reads **`GET /cronogol/fixtures`** over a `[local midnight, now]`
window (`todayBounds`). That payload carries `leagueSlug`, `homeTeam.logoUrl` /
`logoUrls` on **our** storage, `goalsHome`/`goalsAway` and `status` — so the
league group header is correct by construction and the crests are ours.

`GET /cronogol/scores` is still read, for exactly one job: the in-progress tile
and its `lastUpdateAt` age line.

## Consequences
- Verified on production: a 36-hour window returned 19 finished fixtures across
  five leagues, all with crests; the live board renders Serie A, LaLiga EA Sports,
  LaLiga Hypermotion and the Premier League as real groups.
- ⚠ **Send `from`/`to` yourself.** The server's default `from` is UTC midnight and
  it picks no timezone, so a caller that omits them draws UTC days — a reader in
  Auckland gets a window starting half a day in their past.
- ⚠ `to` is **EXCLUSIVE** here and **inclusive** on `/cronogol/teams/{slug}/fixtures`.
- This trades the scoreboard's ~4h sweep for the fixture sync's ~3h lag — strictly
  fresher, and SPEC's own "settled a few minutes after the whistle" foot line fits
  the fixture route better than it fit the scoreboard.
- The `Crest src + monogram fallback` pattern from the web app is still ported and
  still correct — it is what the scoreboard-backed in-progress tile uses, where
  the provider hot-link is the only image that exists.

## Alternatives considered
- **Hot-link the scoreboard crest** — works natively (no CORS), but contradicts
  the handoff's never-hot-link-a-provider rule and cannot group by tracked league.
- **Fuzzy-match scoreboard names to our clubs** — explicitly forbidden by the API
  doc, and a wrong match is a visible, confident lie.
- **Cut the section** — it is what carries a quiet day and the whole no-clubs state.
