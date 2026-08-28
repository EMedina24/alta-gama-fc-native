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
      "lastSeenAt": "2026-08-27T20:07:31.402+00:00",

      // ⚠⚠ NOT SERVED YET — backend §98 is written but its migration is
      // unapplied and it has never run against a real match. Shape is frozen
      // enough to plan against; do not ship a render path until §6 says it is
      // deployed.
      "events": [
        { "type": "goal", "subtype": null, "minute": 20, "minuteExtra": null,
          "period": "FirstHalf",
          "player": { "name": "Yassir Zabiri", "slug": "yassir-zabiri" },
          "related": null, "teamSlug": "racing" }
      ]
    }
  ],
  "count": 1,
  "polling": true
}
```

Types are in `senpai-backend/CRONOGOL-API.md` under *live (added 2026-08-27)*,
ready to copy into `src/lib/cronogol/types.ts` verbatim. The `events` types are
there too, under the same heading — `LiveMatchEventView`,
`LiveMatchEventPersonView`, `LiveMatchEventTypeView`.

### ⚠ `events`, when it lands (backend §98)

Same field names as `/cronogol/fixtures/{id}/events` **minus its stored-row
`id`**, so `MatchEvents` renders both with no second component. Four things that
differ from the durable route and will bite if assumed away:

| | |
| --- | --- |
| `[]` | means "no events **or** not fetched yet" — the two are **not** distinguished. `score` is the tell: a non-zero score with `[]` means a fetch has not landed, not that the goals were unattributed. |
| `player.slug` | **often `null` while live** — resolves only when the person matches a squad row the backend holds. Render `name`; treat `slug` as an optional link, never an identity. |
| `teamSlug` on an own goal | the **scorer's** team, not the side that benefited. Passed through from the source, not derived — do not infer which score it moved. Unverified upstream. |
| lifetime | these **vanish with the row** at full time. `/cronogol/fixtures/{id}/events` is the record afterwards, and §98 writes it at the whistle rather than up to 3h later. |

⚠ `type` can be `"unknown"` — render the minute and the name, skip the icon.

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

### Wiring `events` when §98 deploys

⚠ **No app change is needed to find out.** Two landing shapes, and the backend
does both:

1. **`match_events` at the whistle** — the expanded row fills in from
   `/cronogol/fixtures/{id}/events` **with zero app change**, just sooner than
   the ~3h it takes today.
2. **Inline on `/cronogol/live`** — one line passing `match.events` into
   `MatchEvents.supplied`, since the shapes match.

⚠ The two are not alternatives: (1) is the durable record after full time and
(2) is what fills the timeline *during* the match. Expect both, and expect the
inline array to disappear when the row does.

⚠⚠ **Do not add a second query for this.** The events arrive on the live payload
you are already polling; a per-fixture events fetch during a match would be N
requests per cycle for data you were handed.

---

## 6. What this does NOT give you

- ⭐ **APNs goal push — BUILT 2026-08-28, shipped dark.** This entry read "no
  push" for one day. There is still **no websocket, no SSE and no webhook**, and
  the app still POLLS while it is open — none of that changed. What changed is
  that a locked phone can now be told: `senpai-backend` dispatches
  `match_goal` / `match_red_card` / `match_full_time` from inside the live
  session's own 30s loop ([0053](./decisions/0053-live-match-push-alerts.md),
  backend decision 0033), gated by `alertGoals`.
  ⚠ **It delivers nothing until `CRONOGOL_LIVE_PUSH_ENABLED` is flipped**, which
  waits on a matchday of dry-run logs. Until then the detector runs and logs and
  no device is touched.
  ⚠ Live Activities remain deferred — [0054](./decisions/0054-live-activities-still-deferred.md)
  and [LIVE-ACTIVITIES.md](./LIVE-ACTIVITIES.md).
- ⭐⭐ **LIVE MATCH EVENTS — DEPLOYED AND CONSUMED, 2026-08-28.** This entry was
  ⛔ for a single day. `/cronogol/live` now carries an `events` array per match,
  and the Today board's in-progress card renders it
  ([0051](./decisions/0051-live-match-events-inline.md)). Confirmed in
  production at 19:07 UTC. The ⛔ entry is kept below, struck through, because
  its reasoning is why the card was built to survive the absence in the first
  place.

  ⚠ **It took two deploys.** The first was red: the backend shipped the
  migration and the code that reads `events`, but not the regenerated
  `database.types.ts`, and the column had not been applied to the database.

- ⛔ ~~**No live match EVENTS — today.**~~ No scorer, no card, no substitution as it
  happens. `/cronogol/live` carries no timeline, and
  `/cronogol/fixtures/{id}/events` is a 3-hourly sweep, so the timeline the
  expanded row renders ([0045](./decisions/0045-match-events-expanded-row.md),
  [0046](./decisions/0046-match-events-grouping-tabs.md)) does **not** fill in
  during a match. A live scoreline beside an empty timeline is the expected
  shape, and worth handling explicitly so it does not read as a bug.

  > ⭐⭐ **DEPLOYED 2026-08-28, and the app consumes it.**
  > `CRONOGOL.md` §98 / `decisions/0032`. `/cronogol/live` carries an `events`
  > array per match, and the durable timeline is written **at the whistle**
  > instead of up to three hours later.
  >
  > ⚠ ~~Do not build against it until it is live.~~ It is live. The migration was
  > applied and the second deploy is green; the first was red for exactly the
  > reason the migration's own header warns about — code committed without the
  > regenerated `database.types.ts`, against a column that was not yet there.
  >
  > **How the app takes it** ([0051](./decisions/0051-live-match-events-inline.md)):
  > `suppliedEvents: match?.events` on the live path — one expression, and
  > `MatchEvents` renders it with the same tabs and rows as the durable route.
  > ⚠ `undefined` on the sweep path is what falls back to
  > `/cronogol/fixtures/{id}/events`; `[]` is a real answer and must not be
  > defaulted to.
  > ⚠ Shapes match that route minus its stored-row `id`, which is why
  > `eventKey()` keys **both** sources — the panel swaps source at full time and
  > an id-vs-index split would remount every row at that moment.
  >
  > ⚠⚠ **Still unverified against a real scorer.** No LaLiga match had scored
  > while this was wired — Tenerife v Sporting sat 0-0 at 6′ with `events: []`.
  > The triggers, the full-time hand-off, and "the event set grows during play"
  > remain inferred. `/_debug/gallery` proves the rendering, not the feed.
  >
  > ⚠ `player.slug` is often `null` while live, and `teamSlug` on an own goal is
  > the **scorer's** team, not the side that benefited — passed through, not
  > derived.
  >
  > <details><summary>The evidence it was built on</summary>
  >
  > **Verified possible on 2026-08-28.** The
  > upstream publishes the timeline *during* play: sampled on Racing Santander v
  > Elche at 31 minutes, `FirstHalf`, 2-0, the events route returned both goals
  > with the scorer named (Yassir Zabiri, 14' and 20'). Backend plan is
  > `senpai-backend/.claude/cronogol/live-phase-2.md` strand A, speccing
  > `CRONOGOL.md` §98: `/cronogol/live` gains an `events` array, and the durable
  > timeline lands **at the whistle** instead of up to three hours later.
  >
  > </details>
  >
  > ⭐ **The app surface is BUILT and waiting, 2026-08-28** —
  > [0050](./decisions/0050-match-events-on-the-in-progress-card.md). The Today
  > board's in-progress card expands into the same `MatchEvents` panel the
  > last-result card and the matchday rows use, on the existing
  > `/cronogol/fixtures/{id}/events`, polling every 60s (`STALE.liveEvents`)
  > while the panel is open on a live match and the tab is focused.
  >
  > ⚠ **This is not building against §98.** It reads only the route that exists
  > today, which is why the panel currently shows *"aren't published yet"* for a
  > whole match — confirmed against a 3-0 at 51 minutes on 2026-08-28, where the
  > route served `{"events":[],"count":0}`. **That empty panel is the explicit
  > handling this section asked for**, not a defect.
  >
  > ⚠ The backend's choice of where live events land decides our next move, and
  > only one of the three costs anything: writing to `match_events` (its options
  > 1 and 2) fills this panel with **no app change**; serving them inline on
  > `/cronogol/live` (option 3) means passing them to `MatchEvents.supplied`,
  > the prop 0050 added for exactly that fork.

- ⛔⛔ **No player STATISTICS, live or otherwise — and match events are not
  them.** This distinction is load-bearing in the backend and is, in its own
  words, "the claim most likely to be lost in retelling"
  (`senpai-backend/.claude/decisions/0030`,
  `src/providers/match-event-provider.ts`).

  - **Match events** = discrete things that happened in one match — a goal, a
    card, a substitution. Available, and §98 above will make them live.
  - **Player statistics** = season aggregates — appearances, season goal totals,
    minutes played, pass accuracy, xG. **These do not exist at any price point
    we have found**, on any source, live or historical
    (`senpai-backend/.claude/cronogol/player-data-findings.md`). They are not
    coming with §98 and are not a backlog item; they are a purchase.

  ⚠ So the Players tab and a squad page can show identity — name, position,
  photo, age — and never a stat line. A live match will be able to show *who
  scored*; it will not show *how many they have scored this season*.

- ⛔ **No half-time score, no possession, no shots, no lineups.**
- ⛔ **Nothing outside LaLiga.**
