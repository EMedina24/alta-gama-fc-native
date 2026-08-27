# Match events — the backend contract

**The data half of this folder.** `MATCH-EVENTS.md` beside it is the design: anatomy,
glyphs, geometry, copy. This is what the API actually serves, where the two disagree, and
what to write in `src/lib/cronogol/`.

**Backend:** `CRONOGOL.md` §95 · `.claude/decisions/0030-match-events.md` ·
`CRONOGOL-API.md` → *"`GET /cronogol/fixtures/{id}/events`"*. Written 2026-08-26, against a
live backfill of 1,005 events across 60 fixtures.

> ## ⚠ This supersedes the last line of `MATCH-EVENTS.md`
>
> That document ends: *"**No events endpoint exists.** This is the first surface needing
> per-minute match data; it gates on that feed, not on UI work."*
>
> **It exists now.** The gate is lifted for finished matches in five leagues. It is **not**
> lifted for in-progress matches — see §4, which is the one design rule that cannot be
> built as written.

---

## 1. The endpoint

```
GET /cronogol/fixtures/{fixtureId}/events
```

`{fixtureId}` is the `id` already on `JornadaFixtureView`, `WindowFixtureView` and
`FixtureView` — no new lookup, no new identifier.

```jsonc
{
  "fixtureId": "4b1e0f2a-…",
  "count": 21,
  "events": [
    { "id": "0a7c…", "type": "goal", "subtype": "normal",
      "minute": 40, "minuteExtra": null, "period": "FirstHalf",
      "teamSlug": "real-madrid",
      "player":  { "name": "Mbappé",   "slug": "mbappe" },
      "related": { "name": "Valverde", "slug": "valverde" } },

    { "id": "1b8d…", "type": "card", "subtype": "yellow",
      "minute": 45, "minuteExtra": 2, "period": "FirstHalf",
      "teamSlug": "real-sociedad",
      "player":  { "name": "Aramburu", "slug": "jon-aramburu" },
      "related": null },

    { "id": "2c9e…", "type": "substitution", "subtype": "tactical",
      "minute": 77, "minuteExtra": null, "period": "SecondHalf",
      "teamSlug": "real-madrid",
      "player":  { "name": "Camavinga",  "slug": "camavinga" },
      "related": { "name": "Bellingham", "slug": "bellingham" } }
  ]
}
```

`200` with `events: []` for a real fixture we have not swept · `404` for an id that does not
exist · `Cache-Control: public, max-age=60`.

---

## 2. Reconciling the design's `MatchEvent` with what is served

`MATCH-EVENTS.md` §Data specifies a shape. Six of its seven fields map cleanly; two need
work in the app, and one cannot be built.

| Design field | Served as | Notes |
| --- | --- | --- |
| `player: string` | `player.name` | ✅ Direct. Plus a `player.slug` the design does not ask for — see §6. |
| `assist?: string` | `related.name` **when `type === 'goal'`** | ✅ |
| `replaced?: string` | `related.name` **when `type === 'substitution'`** | ✅ **One field, two meanings** — the API disambiguates by `type`, the design has two fields. |
| `penalty?: boolean` | `subtype === 'penalty'` | ✅ |
| `secondYellow?: boolean` | `subtype === 'second-yellow'` | ✅ |
| `minute: string` `"63"` \| `"90+2"` | `minute: number` + `minuteExtra: number \| null` | ⚠ **Compose it.** §3. |
| `kind: 'goal'\|'yellow'\|'red'\|'sub'` | `type` (6 values) + `subtype` | ⚠ **Not 1:1.** §5. |
| `side: 'home' \| 'away'` | `teamSlug: string \| null` | ⚠⚠ **Derive it, and the derivation differs per surface.** §7. |

---

## 3. ⚠ `minute` is a number and stoppage time is a separate field

The design wants `"90+2"` *verbatim, never normalised to 46*. That instinct is right and the
API preserves it — but as two fields:

```ts
const label = ev.minuteExtra ? `${ev.minute}+${ev.minuteExtra}` : String(ev.minute);
//  minute 45, minuteExtra 2   → "45+2"
//  minute 90, minuteExtra 4   → "90+4"
//  minute 63, minuteExtra null → "63"
```

⚠ **Never render `minute + minuteExtra`.** `45+2` is the 45th minute plus two; `47` is a
minute that did not happen.

⚠ **`minuteExtra` is populated by Serie A only** — 65 of 1,005 events. LaLiga and the
Premier League fold stoppage into `minute`, so a 90+4 goal arrives from *them* as
`minute: 94, minuteExtra: null`. **You cannot infer a competition's convention from one
match**, and there is nothing to normalise: we do not know, from the payload, whether a
LaLiga `94` was 90+4. Render what you are given.

⚠ `minute` is never null on any of the 1,005 rows stored, but it is **typed nullable** and
should be handled — render the event without a minute rather than at `0`.

---

## 4. ⛔ In-progress matches have no events, and design rule 3 cannot be built

> *`MATCH-EVENTS.md` rule 3: "In-progress matches show events up to the last sync, under the
> same age note as the score."*

**Not available.** The ingest selects `status = 'finished'` **and** a settled scoreline, and
runs three-hourly. A match in progress has an empty array, indistinguishable from one that
ended ten minutes ago.

This is not a polling problem you can solve on the client — there is nothing to poll. Live
events are a separate backend project, the same one live scores gate on
(`ios-app-audit.md` §4.4). Until then:

- **The live board card's expanded footer has no content.** Rule 1 already covers it — *"a
  match with no published events shows no chevron"* — so the correct build is: no chevron on
  an in-progress match, exactly as for an upcoming one.
- The two surfaces that DO work today are `FINISHED TODAY` and the matchday day rows.

⚠ And on a finished match, an empty array **still does not mean a goalless game** — it means
we have not swept it yet. A 4-1 that ended twenty minutes ago returns `count: 0`. Rule 1
handles this correctly by construction; do not add copy that says "no goals".

---

## 5. ⚠ `type` has six values and the design draws four

| `type` | `subtype` seen | Rows | Design glyph |
| --- | --- | ---: | --- |
| `goal` | `normal` · `penalty` · `own` | 149 | ✅ goal disc |
| `card` | `yellow` · `red` · `second-yellow` | 263 | ✅ yellow / red box |
| `substitution` | `tactical` · `injury` · **null** | 579 | ✅ arrow pair |
| `var` | `goal-awarded` · `goal-not-awarded` · `penalty-awarded` · `penalty-not-awarded` · `card-upgrade` | 11 | ❌ **not drawn** |
| `missed-penalty` | `saved` · `missed` · `post` | 3 | ❌ **not drawn** |
| `unknown` | anything | 0 | ❌ **not drawn** |

**A product decision, not an engineering one:** filter `var` and `missed-penalty` out, or
draw them. 14 rows in 60 matches — roughly one every four games, and a disallowed goal is
arguably the most interesting thing that can happen in a match. Filtering is a defensible v1;
**silently dropping them without deciding is not**, because a VAR row explains a scoreline
that otherwise looks wrong.

⚠⚠ **`unknown` will happen and must render.** It is `0` today because the mapper was tuned
against 792 sampled events — and two values still escaped it and were caught only by the
first production backfill. `unknown` means the source described something we have no name
for yet. Render a neutral row with the minute and the player; **never drop it** — dropping
is how a goal disappears.

⚠ **`subtype` is an open string, not a union.** Switch on `type`; treat `subtype` as a
label. A closed type would reject real data the day a seventh VAR name appears.

⚠ **`substitution.subtype` is null on 189 of 579 rows** — the Premier League does not
distinguish tactical from injury. Do not render "Tactical" as a default; the design's arrow
pair needs no reason, so this only matters if you were planning to caption it.

**Mapping to the design's four kinds:**

```ts
type Kind = 'goal' | 'yellow' | 'red' | 'sub';

function toKind(ev: MatchEventView): Kind | null {
  if (ev.type === 'goal') return 'goal';
  if (ev.type === 'substitution') return 'sub';
  if (ev.type === 'card') return ev.subtype === 'yellow' ? 'yellow' : 'red';
  return null; // var · missed-penalty · unknown — see above before returning null
}
```

⚠ `second-yellow` maps to the **red** glyph and sets the design's `Second yellow` detail
line. It is a sending-off, not a booking.

---

## 6. ⭐ `player.slug` — a link the design did not ask for

Every person carries `slug`, which is `TeamSquadView`'s player slug. ADR 0033 already ships a
player detail sheet; a scorer's name in the timeline can open it.

⚠⚠ **`slug` is null for every Serie A and Bundesliga person, always** — squads are ingested
for LaLiga and the Premier League only, and that boundary is not scheduled to move.
Measured: **474 of 1,005 rows linked (47%)**; a LaLiga Primera match linked **21 of 21**, a
Segunda match **0 of 13**.

So: **plain text when `slug` is null, tappable when it is not.** Never hide the event, and
never make the whole timeline conditional on links resolving.

---

## 7. ⚠⚠ Deriving `side` — and it is different on each surface

The API says **which club** (`teamSlug`), not which side of the card. The design needs
`'home' | 'away'` for the crest column. Two surfaces, two derivations:

**Matchday rows and the board** — `JornadaFixtureView` / `WindowFixtureView` carry
`homeTeam: TeamRef | null` and `awayTeam: TeamRef | null`, so this is direct:

```ts
const side = ev.teamSlug === fixture.homeTeam?.slug ? 'home'
           : ev.teamSlug === fixture.awayTeam?.slug ? 'away'
           : null;
```

**Club fixture lists** — `FixtureView` is **team-relative**: it has `homeAway` and
`opponent`, and `opponent` is a **name, not a slug**. There is nothing to compare
`teamSlug` against. Derive from the slug you requested:

```ts
// `requestedSlug` is the club whose fixtures you asked for.
const isOurs = ev.teamSlug === requestedSlug;
const side = isOurs
  ? (fixture.homeAway === 'H' ? 'home' : 'away')
  : (fixture.homeAway === 'H' ? 'away' : 'home');
```

⚠ **`teamSlug` is typed nullable, though it is populated on all 1,005 rows stored today.**
It can legitimately be null on a VAR decision belonging to neither side, and on a club with
no crosswalk row for the event's provider. Both derivations must tolerate it — render the
row with no crest rather than guessing a side — but do not build an empty state around a
case that has never occurred.

---

## 8. What to add in `src/lib/cronogol/`

Following the conventions already in place — `getOrNull` because the route 404s, `STALE.feed`
because events move when a match is played, a key in `keys.ts`.

**`types.ts`** — copy the block from `CRONOGOL-API.md`'s TypeScript section verbatim
(`MatchEventTypeView`, `MatchEventPersonView`, `MatchEventView`, `FixtureEventsView`).

**`client.ts`**

```ts
/**
 * One finished match's timeline — goals with assists, cards, substitutions.
 *
 * ⚠ `null` means no such fixture. `{ events: [] }` means we hold none YET —
 * finished-only, three-hourly. Neither means the match was goalless.
 */
export async function getFixtureEvents(
  fixtureId: string,
): Promise<FixtureEventsView | null> {
  return getOrNull<FixtureEventsView>(
    `/cronogol/fixtures/${encodeURIComponent(fixtureId)}/events`,
    toQuery({}),
  );
}
```

**`queries/keys.ts`** — `fixtureEvents: (id: string) => ['fixture-events', id] as const`

**`queries/stale.ts`** — **`STALE.feed`** (15 min). Not `catalogue`: a finished match's
events are effectively immutable, but a VAR retraction rewrites the set and the sweep can
land after the first read. The route's own header is `max-age=60`.

⚠ **Fetch on expand, never with the list.** One request per opened row. `MATCH-EVENTS.md`
allows only one row open at a time, so this is at most one in-flight request per surface —
and pre-fetching a matchday would be ten requests for nine panels nobody opened.

---

## 9. Coverage today

60 fixtures back-filled, season to date, 2026-08-26.

| League | Fixtures | Goals | `player.slug` resolves |
| --- | ---: | ---: | --- |
| LaLiga | 18 | 45 | ✅ |
| Segunda | 22 | 50 | ⛔ no squads |
| Premier League | 10 | 30 | ✅ |
| Serie A | 10 | 24 | ⛔ no squads |
| **Bundesliga** | **0** | **0** | ⛔ no squads |

⚠ **The Bundesliga has nothing** — its 2026/27 season opens 2026-08-28. It is also the one
league whose events come from a *secondary* source, so its data is the least verified. Do
not treat an empty German panel as a bug before that has been checked.

⚠ **Segunda is covered here but absent from `GET /cronogol/fixtures`**, which is
league-competitions-only and excludes it. Segunda events are reachable from the matchday and
club surfaces, not from the board.

**Verified:** goal events reconcile to the stored scoreline on **60/60** fixtures, and one
match per league was cross-checked against an independent rendering — every scorer, every
assister and every minute agreed. Details in the backend's
`.claude/cronogol/verification-log.md`, dated 2026-08-26.

---

## 10. What this is not

- **No player statistics.** No appearance counts, no season goal totals, no minutes played,
  no top-scorer or assist table. Not "not yet on the client" — they do not exist at any
  provider, and deriving them from these rows would under-count differently per league.
- **No lineups.** No starting XI, no bench, no formation.
- **No live events.** §4.
- **No shot maps, no ratings, no possession.**

`GET /cronogol/teams/{slug}/squad` is still identity and bio only, and the note on
`getTeamSquad` in `client.ts` — *"there are no statistics and never will be"* — is still true
of **season** statistics. Per-match events are a different surface; that comment is worth a
one-line amendment so the next reader does not take it as covering both.
