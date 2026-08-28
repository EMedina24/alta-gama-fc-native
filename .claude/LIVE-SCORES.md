# Live scores — `GET /cronogol/live`

**Added to the backend 2026-08-27** (`senpai-backend/CRONOGOL.md` §97,
`decisions/0031`). **Consumed by the Today board since 2026-08-27** —
[decisions/0048](./decisions/0048-live-scores-on-the-today-board.md).

This is the first genuinely live data the product has ever had, and it arrives
into a codebase that was **deliberately built to deny liveness exists**. Read §1
before touching anything in `src/lib/cronogol/scores.ts`.

---

## 1. ⚠⚠ This does NOT un-suppress the scoreboard

`scores.ts` returns `null` from `statusText()` for any `live` row, and
`concludedScores()` filters `live` out entirely. Its docblocks call that the
rule the file exists to enforce, and **all of it stays exactly as it is.**

The reasoning behind that suppression was never "liveness is bad" — it was that
`/cronogol/scores` sweeps **every four hours**, so a row flagged `live` was in
play at the last sweep and the match has almost certainly finished since.
**That is still true of `/cronogol/scores`, and nothing about this change makes
it less true.**

`/cronogol/live` is a **different route on a different cadence** — refreshed
every ~30 seconds *while a match is being played*. Liveness is honest there and
only there.

| | `/cronogol/scores` | `/cronogol/live` |
| --- | --- | --- |
| Refresh | every ~4h | every ~30s, during matches only |
| Joins to a fixture | ❌ never (opta-keyed) | ✅ `fixtureId` + team slugs |
| Minute of play | ❌ | ✅ |
| Coverage | every competition the source carries | **LaLiga only** |
| Liveness trustworthy | **no — keep suppressing** | yes |

⚠ **Do not merge the two into one "scores" concept.** They have different
sources, different identifiers, different vocabularies and different truth
windows. The existing band at the foot of `src/lib/cronogol/types.ts` says this
about the scoreboard already; it now needs to say it about three things rather
than two.

---

## 2. The route

```
GET https://crono-gol.com/cronogol/live
GET https://crono-gol.com/cronogol/live?league=laliga
```

`Cache-Control: public, max-age=10`. Unauthenticated. `league` is optional and
takes an **API slug** (`laliga`), never our own slug (`la-liga`) — the same trap
`queries/keys.ts` already documents. An unknown slug returns an empty list, not
a 400. ⚠ Any *other* query parameter is a **400**, not a no-op.

```jsonc
{
  "matches": [
    {
      "fixtureId": "b28488c1-8f4c-40fe-afd8-3a5f0df2363a",
      "home": { "slug": "barcelona",     "name": "FC Barcelona",  "shortName": "BAR" },
      "away": { "slug": "athletic-club", "name": "Athletic Club", "shortName": "ATH" },
      "kickoffUtc": "2026-08-27T19:00:00+00:00",
      "status": "live",
      "minute": 67,
      "injuryTime": null,
      "score": { "home": 1, "away": 0 },
      "halftime": { "home": null, "away": null },
      "lastSeenAt": "2026-08-27T20:07:31.402+00:00"
    }
  ],
  "count": 1,
  "polling": true
}
```

Types are in `senpai-backend/CRONOGOL-API.md` under *live (added 2026-08-27)*,
ready to copy into `src/lib/cronogol/types.ts` verbatim.

---

## 3. ⭐ `fixtureId` is the point

Every entry carries **our own `fixtures.id`** — the same `id` already on
`JornadaFixtureView`, `WindowFixtureView` and `FixtureView`, and the same one
`keys.fixtureEvents(id)` is keyed on.

So a row already on screen can be *upgraded* with live state rather than
replaced by a parallel list:

```ts
const live = useLive();                       // one query, whole app
const liveById = new Map(live.matches.map((m) => [m.fixtureId, m]));
// then, per fixture row:
const state = liveById.get(fixture.id);       // undefined = not live
```

⚠ **This is the capability `/cronogol/scores` structurally does not have** —
scoreboard rows are opta-keyed and share no identifier with us, which is why
`scoreAbbr()` exists and derives a monogram from a name. Nothing like that is
needed here: use `home.slug` / `away.slug` and the crest machinery the rest of
the app already uses.

---

## 4. Rules for rendering

- ⚠⚠ **An empty `matches` array is the NORMAL answer.** Most of the time nothing
  is being played. Ordinary empty state, never an error.
- ⚠⚠ **LaLiga only.** A Premier League, Serie A, Bundesliga or Segunda match
  returns nothing here. **Keep the existing non-live rendering as the fallback**
  — do not replace it with something that assumes live data will arrive.
- ⚠ **`minute` is null unless `status === 'live'`.** Null before kickoff, null
  once finished. Render nothing — never `0'`.
- ⚠ **`minute` INCLUDES stoppage time.** `94` means "90+4". There is no split
  and `injuryTime` is always `null` for LaLiga. Render `94'`, never `90+4'`.
- ⚠ **`score` is null before kickoff.** Render `vs`, never `0 - 0` — the same
  rule the rest of this API carries, and `scoreEmphasis()` already treats a null
  correctly (both sides full; a null is never reasoned about as a zero).
- ⚠ **`halftime` is always `{null, null}` today.** In the shape for a second
  source; render nothing.
- ⚠ **`status` can be `'unknown'`.** The upstream's in-play vocabulary is only
  partly observed and an unrecognised state is reported honestly rather than
  guessed. Render the score, omit the minute.
- ⚠⚠ **Rows DISAPPEAR when the match ends.** This route serves in-play matches
  only. The final score arrives on `/cronogol/fixtures` (within ~3h) and
  `/cronogol/scores` (within ~4h). **A row vanishing is not an error, and this
  is not a results feed** — do not build "recent results" on it.

### `polling`, and the two silences

`polling` says whether the backend currently has a session refreshing these
rows.

- `polling: false` + **empty** `matches` → nothing is being played. Normal.
- `polling: false` + **non-empty** `matches` → matches are live but nothing is
  refreshing them. **This is the one failure mode this feature has**, and
  without this field it looks identical to the line above.

`lastSeenAt` is **"we looked", not "it changed"** — it advances every ~30s during
a live match whether or not the score moved. That makes it the honest freshness
signal, and it is the right thing to drive a stalled-data indicator from.

⚠ Not the same as the scoreboard's `lastUpdateAt`, which is the *source's* stamp.
`lastSourceUpdate()` in `scores.ts` must not be pointed at this.

---

## 5. The client shape — BUILT, 2026-08-27

⭐ **This section was a proposal and is now a description.** Everything below
shipped as suggested; [decisions/0048](./decisions/0048-live-scores-on-the-today-board.md)
is the entry it asked for and carries the reasoning.

**What was built:** `LiveStatus` / `LiveMatchView` / `LiveView` in a new *Live*
band in `types.ts` · `getLive()` in `client.ts` · `STALE.live` · `keys.live()` ·
`useLive(enabled)` in `queries/use-live.ts` · the pure selectors in
`lib/cronogol/live.ts` · the two-path in-progress card in `match-board.tsx` ·
seven states in `/_debug/gallery`.

**What was deliberately NOT built:** the Matchdays rows and the club page (the
two other surfaces keyed on `fixtureId`), `FINISHED TODAY`, the upcoming cards,
and Live Activities. `scores.ts` is untouched, as §1 requires.

**Two rules 0048 added that are not in the proposal below**, both learned while
building it:

- ⚠ **A ten-minute age cutoff on `lastSeenAt`, applied before the map is built.**
  React Query holds a body for an hour, so a cold remount can hand the screen a
  stale response before the first fetch resolves — and a minute rendered off that
  is a frozen number presented as current. Those rows fall through to the fixture
  sweep's card instead, which at least states its age.
- ⚠ **The selection is two-tier, and tier 1 does not consult the fixture sweep.**
  The live route sees kick-off within ~30s and the sweep can be three hours
  behind it, so requiring `fixture.status === 'live'` would let the honest feed
  only ever confirm what the stale one already said.

The original proposal follows, unchanged.

**`src/queries/stale.ts`** — neither existing bucket fits. `feed` is 15 minutes,
which is 30 stale cycles. A third bucket is warranted, and the file explicitly
says a new endpoint must choose one and be able to say why:

```ts
/**
 * In-play match state. Moves every ~30s server-side while a match is played.
 * Anything longer renders a minute that is visibly wrong on screen.
 */
live: 15 * 1000,
```

**`src/queries/keys.ts`** — one key for the whole app, not one per fixture. The
route already returns every live match in one response, so a per-fixture key
would turn one request into N:

```ts
live: () => ['live'] as const,
```

**Polling.** `refetchInterval` of ~15s, and ⚠ **only while a screen that shows
it is mounted and focused**. A background interval is a request every 15 seconds
for the life of the process, on cellular, for data that is empty most of the
day. React Query's `refetchInterval` keeps running when the app backgrounds
unless told otherwise — pair it with `refetchIntervalInBackground: false` and
gate it on `useFocusEffect`.

⚠ **Do not poll faster than 10s.** The route's cache is `max-age=10` and the
underlying data moves every 30s, so a 5s poll doubles the request count and
returns the identical body.

**Where it belongs.** `Today` is the obvious first surface, and the match rows on
`Matchdays` and the club page are the second — all three already render fixture
rows keyed by the id this route joins on.

---

## 6. What this does NOT give you

- ⛔ **No push.** There is no websocket, no SSE, no webhook, and no APNs
  goal push. The app polls. `PUSH-AND-ACCOUNTS.md`'s "goal/score pushes do not
  exist" is still true — but its stated *reason* ("no live feed") is now out of
  date, and Live Activities are a real phase-2 option that were not viable
  before this landed.
- ⛔ **No live match EVENTS.** No scorer, no card, no substitution as it happens.
  `/cronogol/fixtures/{id}/events` is a 3-hourly sweep, so the timeline the
  expanded row renders ([0045](./decisions/0045-match-events-expanded-row.md),
  [0046](./decisions/0046-match-events-grouping-tabs.md)) does **not** fill in
  during a match. A live scoreline beside an empty timeline is the expected
  shape, and worth handling explicitly so it does not read as a bug.
- ⛔ **No half-time score, no possession, no shots, no lineups.**
- ⛔ **Nothing outside LaLiga.**
