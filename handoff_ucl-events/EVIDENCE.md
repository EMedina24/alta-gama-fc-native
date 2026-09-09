# Evidence — what production served on 2026-09-09 for Real Madrid 2–1 Inter (Tue 8 Sep)

Every request below was made against `https://crono-gol.com` from the backend session on
2026-09-09 ~15:30Z, unauthenticated, exactly as the app would. Player names are public; nothing
else personal is reproduced.

## Ids

| What | Id |
| --- | --- |
| Club-centric fixture (`FixtureView.id`, what the card holds) | `0d457708-8ed5-406a-8d3f-c5686cfb887d` |
| Champions League table row (`ucl_fixtures.id`, render path only) | `cdc22efc-d1b2-49fe-8cad-0b075a10d960` |

## `GET /cronogol/fixtures/0d457708-…/events` — the route the app calls

```
HTTP/2 200
content-type: application/json; charset=utf-8
cache-control: public, max-age=60
```

`{ fixtureId, events, count }` — **16 events**: goal 3 · card 4 · substitution 9.

Goals, with the fields the side derivation reads:

```
minute 14  teamSlug real-madrid   player { name: "Mbappé",         slug: "kylian-mbappe-lottin" }  related { name: "Brahim" }
minute 23  teamSlug real-madrid   player { name: "Valverde",       slug: "valverde-1" }
minute 77  teamSlug inter-inter   player { name: "Carlos Augusto", slug: null }
```

`teamSlug` over all 16: `real-madrid` 7 (2 goals, 1 card, 4 subs) · `inter-inter` 9 (1 goal, 3 cards,
5 subs) · null 0.

One event's key set: `id, minute, minuteExtra, period, player, related, subtype, teamSlug, type`.

## `GET /cronogol/ucl/fixtures/cdc22efc-…/events` — the new route (not for this app)

Same headers, the same 16 events, the same three goals. Exists so the web app's `/og/*.png` routes
can draw foreign ties; documented as render-path only.

## Who wrote the rows — Render production log, 2026-09-08

```
21:03:18Z [LiveSessionService] Live events hand-off wrote 16 event(s) for fixture 0d457708-8ed5-406a-8d3f-c5686cfb887d at full time
```

The same hand-off wrote 21 and 19 events for the other two Spanish ties that evening (Lille v Betis,
Dortmund v Villarreal). Database: `match_events` for this fixture — 16 rows, first written
2026-09-08 21:03:18Z, provider `laliga`; all 3 finished UCL twins have rows (3 of 3).

## The fixture on the wire — `GET /cronogol/teams/real-madrid/fixtures` (46 rows), this row

```
competition      "cup"
competitionName  "UEFA Champions League"
round            "Jornada 1"
homeAway         (home)
goalsFor 2  goalsAgainst 1   status "finished"
opponent         "Inter"           ← a NAME. No opponent slug on this route.
opponentLogoUrl  https://…/team-assets/crests/85d9…a38.png
venue            "Bernabéu"
```

Stored: `fixtures.competition = 'cup'`, `competition_name = 'UEFA Champions League'`, league row
"UEFA Champions League" with a **null slug**, `matchweek null`.

## Why the app shows nothing — the two checks

1. `matchEventsCapable({ competition: 'cup', leagueSlug: '' })` → `false` (the first line of the
   function). `LastResultCard` receives `matchEvents={false}` → no `EventsDisclosure`.
2. Were the gate open: `eventSide({ teamSlug: 'inter-inter' }, { slug: 'real-madrid' }, { slug: '' })`
   → `null`, because `opponentRef()` has no slug to carry. Nine of sixteen rows would draw with no
   crest.

## Backend references

- `senpai-backend/CRONOGOL.md` §116 (the Champions League tables), §116.7 (what the backfill taught).
- `senpai-backend/CRONOGOL-API.md` and `cronogol/cronogol-api.md`: the `GET /cronogol/fixtures/{id}/events`
  section carries a dated paragraph on this (2026-09-09); the UCL routes have their own sections.
- `senpai-backend/.claude/cronogol/frontend-gaps.md` **D11** — this exact gap, from the backend side,
  with the `opponentSlug` follow-up.
- `senpai-backend/.claude/cronogol/verification-log.md`, the 2026-09-09 "Champions League timelines"
  entry — the raw run.
