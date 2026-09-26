# CronoGol API — front-end handoff

Everything the Next.js app needs to talk to `senpai-backend`. Verified against production
2026-07-28; the news endpoints and the Supabase custom domain verified 2026-08-01; the **jornada**
endpoints added 2026-08-04, with the fixture data behind them read from production 2026-08-03; the
**Premier League** verified 2026-08-05; **live scores** verified 2026-08-06; the **Bundesliga**
verified 2026-08-07; **league logos** and the **Serie A** roster verified 2026-08-08.

**Base URL:** `https://crono-gol.com` — live and verified 2026-07-28.
**Local:** `http://localhost:3001` (the backend runs on 3001 so Next keeps 3000)

> ⚠ **`crono-gol.com` is the backend, exclusively.** The front end lives on its own separate domain —
> do not plan to serve any page from this one. The reason is in the Subscribing section: the host in a
> `webcal://` link is permanent, so this domain is committed to the API for as long as any subscriber
> exists.
>
> `https://senpai-backend-3j75.onrender.com` also still answers and always will, but is not the URL to
> code against.
>
> ⚠ **Since 2026-09-14 that hostname answers `404` for every `/cronogol/*` route** — the same JSON
> 404 the API root gives — **except calendar-feed `GET`s** (`/cronogol/feed/….ics`), which keep
> working there for any subscriber who already holds that host. The public API is `crono-gol.com`,
> now behind our own Cloudflare zone; nothing about the response shapes changed.

The backend is the **only** gateway. The browser never talks to Supabase or the football API directly —
no database keys ship to the client, and the response shapes are stable across a provider switch.

---

## ⚠ Read this before building any UI

### 1. A non-empty fixture list can still be incomplete

Teams appear in the database in two ways:

|                   | `tracked`         | `lastSyncedAt` | What its fixtures mean                                       |
| ----------------- | ----------------- | -------------- | ------------------------------------------------------------ |
| **Registered**    | `true`            | a timestamp    | Its **complete** schedule was fetched                        |
| **Opponent-only** | `true` or `false` | **`null`**     | Only the matches where it happened to face a registered team |

Example of the shape: an opponent-only club returns just the matches where it happened to face a
tracked club — a handful, not a season.

> **`lastSyncedAt === null` means "do not present this as a schedule."** Show an empty/pending state, not
> six fixtures. This is the single easiest way to ship a convincing-looking bug.

**✅ As of 2026-07-28 all 20 tracked teams are fully synced** and none has `lastSyncedAt: null`. The
rule still matters — opponent-only clubs exist in the database and `includeUntracked=true` returns
them — but every club in the default `/cronogol/teams` list has a complete schedule.

### 2. Everything is season **2026/27**, and results are now landing

> ⚠ **Since 2026-09-22 (CRONOGOL.md §144), `laliga` and `premier-league` also hold 2024/25 and
> 2025/26.** Standings, matchweeks and season stats exist for those years (`?season=2024`,
> `?season=2025`; player pages carry up to three `seasons[]` rows). Two things stay on the CURRENT
> season by default so nothing you built moves: `GET /cronogol/teams/{slug}/fixtures` without
> `from`/`to`/`season`, and every `.ics` feed. The other four leagues are still one season deep.

⚠ **This replaces the old "the data is season 2024/25" caveat.** All 20 clubs moved to a new source on
2026-07-28. ⚠ **It also replaces this section's own "nothing has been played yet" caveat**, which was
true until the season kicked off on **2026-08-15** and is now the opposite of what the API sends. A
results view is no longer an empty state to design around.

|                             | now                                                                 |
| --------------------------- | ------------------------------------------------------------------- |
| Season                      | **2026/27 — the current one**                                       |
| Kickoffs                    | Aug 2026 → May 2027 (Jun 2027 for segunda)                          |
| Status                      | `scheduled` until played, then `finished` — **both are normal now** |
| `goalsFor` / `goalsAgainst` | Real numbers on a played match, `null` on every other               |
| Fixtures per club           | 38 (top flight) · 42 (segunda — see below)                          |

Verified against production 2026-08-15, `GET /cronogol/jornada/laliga/2026/1` (home-away, so
`goalsHome`/`goalsAway`; a club route serves the same matches as `goalsFor`/`goalsAgainst`):

```jsonc
{ "kickoffUtc": "2026-08-15T17:30:00+00:00", "status": "finished",  "goalsHome": 3,    "goalsAway": 0 },
{ "kickoffUtc": "2026-08-15T19:30:00+00:00", "status": "finished",  "goalsHome": 2,    "goalsAway": 1 },
{ "kickoffUtc": "2026-08-16T15:00:00+00:00", "status": "scheduled", "goalsHome": null, "goalsAway": null }
```

**Consequences worth designing for:**

- **`null` is not `0`.** If your card renders `0-0` for null, every unplayed match reads as a goalless
  draw. Distinguish "not played" from "0" — this warning outlived the empty-season caveat above it and
  is now _more_ load-bearing, not less, because both shapes appear in the same list.
- **⚠ A result is not immediate, and there is no live path to make it so.** The fixture sweep is the
  only writer of `status` and the goals, and it runs **every three hours** (tightened from daily on
  2026-08-15). Expect a final score within roughly one to three hours of full time, plus whatever your
  own cache adds. Do not build a UI that implies a result appears at the whistle.
  **⭐ AMENDED 2026-08-29 for LaLiga, and ONLY LaLiga.** A LaLiga fixture is now flipped to
  `finished` with its final score by the live session, within about 30 seconds of the whistle —
  the sweep is no longer its only writer. **Premier League, Serie A, Bundesliga and segunda are
  unchanged and still take up to three hours**, because the live session covers LaLiga only.
  **⭐ AMENDED 2026-09-14 for EVERY league.** A league match still unsettled two hours after
  kickoff is now force-refreshed by a three-minute tick, at most once per hour per league. So for
  Serie A, the Bundesliga, segunda and Honduras expect the final score **typically within 10–40
  minutes of full time** (the tick lands at kickoff + 2h; a provider's cache can add up to 30
  min), not three hours. The 3-hourly sweep remains the worst case, so anything that already
  degrades gracefully needs no change — and the whistle-time path is still LaLiga and the Premier
  League (live-tracked since 2026-09-04) only.
  ⚠ Two consequences worth designing for: a "final score" UI can be immediate for LaLiga and must
  still degrade gracefully elsewhere, and a LaLiga match now leaves `GET /cronogol/live` and reads
  `finished` here at effectively the same moment, so the two routes no longer disagree for hours.
  ⚠ The **events timeline** (`GET /cronogol/fixtures/{id}/events`) has behaved this way since
  2026-08-28 — it is handed off at full time. This aligns the score with it.
- **`status: "live"` is a snapshot, not a ticker.** Every in-play state — first half, half time, extra
  time, penalties — collapses to `live`, and the goals on it were true at the last sweep. There is no
  minute on THIS route and no way to derive one.
  **⭐ As of 2026-08-27 there is a minute — on `GET /cronogol/live`**, which carries in-play state for
  matches being played right now and, unlike `/cronogol/scores`, **does join to a fixture**
  (`fixtureId` plus both team slugs). LaLiga only for now. See *`GET /cronogol/live`*.
- **⚠ `finished` with `null` goals is a real stored shape, not a bug.** When our upstream degrades, the
  ingest deliberately leaves the stored goals alone rather than writing null over them — so a match can
  read `finished` with no score until the next healthy sweep. Fall back to the kickoff time or a dash;
  never to `0-0`. The standings endpoint excludes such a row for the same reason.

> **⚠ 35 of 38 fixtures have `kickoffTbd: true`** (39 of 42 in segunda). The full season is published
> at the draw, but kick-off times are only confirmed a few weeks ahead. **This is the normal state of a
> current-season schedule, not an edge case — build the all-day rendering path first, not last.**

### 2b. ⚠ Five tracked LaLiga-side clubs are in the second division

`girona`, `las-palmas`, `leganes`, `mallorca` and `valladolid` were relegated, so they return **42
`segunda-division` fixtures** — real data, correctly labelled, but not La Liga. Their
`competitionName` is `LALIGA HYPERMOTION`; `competition` is still `league`.

**If your UI says "La Liga", it is wrong for those five clubs.** Either read `competitionName` rather
than assuming, or filter the team list. This is why `?league=laliga` returns **25** and not 20.

⚠ **Corrected 2026-08-07.** This section used to add that Málaga, Racing, Deportivo, Levante and Elche
were "not in the API at all". They have been tracked since 2026-08-04 — see the three-leagues section
below. The paragraph outlived the gap it described.

⚠ **This is a LaLiga-only wrinkle.** The Premier League's 20, the Bundesliga's 18 and Serie A's 20 are
each exactly their own top flight, with no second-division clubs carried alongside.

### 3. Scores are from the requested team's perspective

`goalsFor` / `goalsAgainst`, **not** home/away. `homeAway: "A"` with `goalsFor: 0, goalsAgainst: 1` is a
1-0 away defeat. Don't re-derive from a scoreboard orientation.

### 4. ⚠ A jornada is *published but unscheduled*, not missing

LaLiga confirms kickoff **times** one jornada at a time, roughly two to three weeks ahead. The
**fixtures themselves exist for the whole season already.**

Verified on production 2026-08-03 — Real Madrid's 38 league fixtures:

| | |
| --- | --- |
| Jornadas 1–3 | confirmed times |
| Jornadas 4–38 | `kickoffTbd: true`, **but each still carries a date** |

So a future matchweek renders as ten dated rows showing `--:--`. **Never an empty state, never a
spinner, never "not available yet."** The page is correct and complete; only the clock is pending.

This is why there are **two** flags and not one:

- `complete` — **coverage.** Do we hold all ten matches? If false, we are missing data.
- `kickoffsConfirmed` — **schedule.** Has LaLiga published the times? If false, that is *normal* for
  most of the season and must not be styled as an error.

They are routinely different, in both directions.

### 5. ⚠ Jornada order is NOT chronological

Real Madrid's **jornada 2 falls on 22 Aug and its jornada 1 on 26 Aug** — the opener was deferred.
Observed on live data, not hypothetical.

`matchweek` is a **label, not a position on a timeline.** Consequences:

- A "next jornada" arrow steps the **number**, not time.
- A jornada's date span can be far wider than a weekend — jornada 1 above spans 14–26 Aug. Never
  hardcode a 3-day window; use `firstKickoffUtc`/`lastKickoffUtc`.
- Sorting matchweeks by number is not sorting them by date. If you want a time axis, sort on
  `firstKickoffUtc`.

---

---

## ⚠ What this backend does **not** do

Read before scoping UI work. Each of these appears in the design handoff; none exists. Full analysis,
with what would close each, is in the backend repo at `.claude/cronogol/frontend-gaps.md`.

### The Champions League is six read routes and two calendar feeds

*Was two until 2026-09-11, when the league-phase table joined them (§123) and then the
fixture list (§124).*

The competition-wide Champions League data (`ucl_*` tables, CRONOGOL.md §116, §123, §124):

```
GET /cronogol/ucl/jornada/{season}              the season index — 8 matchdays + the knockout stages
GET /cronogol/ucl/jornada/{season}/{matchday}   one league-phase round
GET /cronogol/ucl/stage/{season}/{stage}        one knockout stage, both legs
GET /cronogol/ucl/standings                     the league-phase table
GET /cronogol/ucl/fixtures/{id}                 one match, with both clubs
GET /cronogol/ucl/fixtures/{id}/events          one match's timeline
```

⚠⚠ **THE LIST ROUTES ARE WHAT MAKE THE LAST TWO USABLE AT ALL.** Until 2026-09-11 nothing a client
could call ever produced a `ucl_fixtures` id: the crosswalk runs one way — `UclFixtureView.fixtureId`
points *outward* to the club-centric twin, and nothing points back — so calling
`/cronogol/ucl/fixtures/{id}` with an id taken off a club's fixture list answers **404**. Take ids
from a list response; do not try to derive one.

⚠⚠ **Do NOT try to find cup ties on a club's fixture list instead.** It was measured: 81 of 144
identifiable, 49 unresolvable, 14 duplicated. The reason is structural — a club's `competition: 'cup'`
rows mix the Champions League with the Copa del Rey, the FA Cup, the DFB-Pokal and the EFL Cup, and
**no field says which competition a row belongs to**.

Plus two subscribable calendars (§125):

```
GET /cronogol/feed/ucl/{season}.ics              the whole competition
GET /cronogol/feed/ucl/jornada/{season}/{n}.ics  one league-phase round
```

**There is still no bracket, no "matches for this club", and no club page, and the fixture window
`GET /cronogol/fixtures` still excludes every UEFA tie** (`slug is not null` scope). The shape of
these routes is provisional.

⚠ **The table is the LEAGUE PHASE only.** Knockout rounds live in the same `ucl_fixtures` table and
are excluded from it by construction — a play-off leg credited to a league-phase table would leave
every number plausible and the order wrong.

### Match events are not statistics — and since 2026-09-09 there IS a stats API, for some of it

*Added 2026-08-26 with `GET /cronogol/fixtures/{id}/events`; split 2026-09-09 when
`GET /cronogol/players/{slug}/stats` shipped.*

The events route serves **discrete events from one match**. It is not a
statistics API. There is now a separate stats API — see **Season stats** below —
and the line between them matters, because half of what this section used to
deny is now served and the other half never will be.

- ✅ **Season totals now exist**, on their own routes:
  `GET /cronogol/players/{slug}/stats`, `GET /cronogol/teams/{slug}/stats` and
  `GET /cronogol/stats/leaders`. Goals, assists, penalty goals, cards, braces,
  hat-tricks, goal timing and scoring streaks, per season and per competition.
  ⚠ **Do not compute them from the events route yourself.** The under-count this
  section warned about is real and the fix is not a filter you can write in the
  app: a fixture we have not swept is indistinguishable from a player who did not
  play, so the backend gates each fixture on its timeline reconciling to its
  stored scoreline and publishes the denominator beside every number.
- ✅ **Appearances, minutes played and per-90 ARE served since 2026-09-21** (CRONOGOL.md §143), on
  `GET /cronogol/players/{slug}/stats` — `appearances`, `starts`, `subAppearances`, `unusedSub`,
  `minutes`, `goalsPer90`, `assistsPer90` and an appearance-based scoring streak, derived by the
  season-stats sweep from the stored teamsheets. ⚠ Three things to read before labelling a column
  "apps": the block is `null` (never 0) where no teamsheets stand behind it; `coverage.fixturesCounted`
  is still CLUB FIXTURES and `coverage.fixturesWithLineups` is the appearance denominator; and the
  per-90 rates are `null` unless `coverage.appearancesKnown`. Serie A and the Bundesliga have no
  player rows, so nothing per player there. See the stats section.
- ⛔ **Still no per-player match ratings and no shot maps.** Some sources carry
  them; none is stored, and none is buyable at any price point this backend holds.
- ✅ **Lineups ARE served since 2026-09-21** — starting eleven, bench, formation (Premier League and
  Serie A only), manager and substitution minutes, on `GET /cronogol/fixtures/{id}/lineups`, with a
  `coverage` object stating what is present. See that route's section.
- **No live events.** The sweep is 3-hourly and reads only fixtures already
  marked finished. A match in progress has no timeline, and an empty array on a
  match that ended an hour ago is expected. This is not a gap waiting to be
  closed by polling — live scores are a separate backend project.
- ⚠ **`player.slug` is null for every Serie A and Bundesliga person** and will
  stay null until those leagues have squads ingested. It is not a bug and not a
  data-quality issue; it is the same LaLiga-and-Premier-League-only boundary
  that `GET /cronogol/teams/{slug}/squad` has.

### Crest imagery is drawn to fixed slots, and only for a fixture

*Added 2026-08-25 with the notification crest route.*

- **`GET /cronogol/fixtures/{id}/crest.png` takes no size**, and no caller-supplied text of any kind.
  Three named slots exist (`pair` 256×256, `home`/`away` 128×128) and a fourth size needs a fourth
  named slot from the backend — it is a small change, but it is not a parameter you can guess.
- **There is no crest IMAGE route for a club, a league or a match-up** — only for a fixture that exists.
  Crest URLs for a club come from `logoUrl`/`logoUrls` on the team objects, as they always have —
  and, *as of 2026-09-17*, **every crest URL in a competition in one call** from
  `GET /cronogol/crests?league=|club=` (below). That route returns URLs, never bytes.
- **Those bytes are not embeddable from the web app.** `Cross-Origin-Resource-Policy: same-origin`
  is set globally, so an `<img>` on `altagamafc.com` pointing at `crono-gol.com` will be blocked.
  Ask if the web app wants it.
- **Bundesliga and Serie A will show a lettered tile forever**, in every surface this route feeds.
  Their clubs publish SVG and WebP respectively and neither decodes; this is not a gap waiting to be
  closed and must not be "fixed" by hot-linking a provider.

### `Article.sources` and `Article.aiAssisted` are deliberately NOT rendered

*Decided 2026-08-10, superseding the "blocking" note this section carried earlier.*

The story publish path writes both on every entry — `sources` carries publisher, title, url and
publishedOn per source, and `aiAssisted` is `true`. **The article page and the news card render
neither, on purpose.** There is no per-article AI badge and no visible citation list.

⚠ **`sources` is one entry PER PUBLISHER, not per article** — *changed 2026-08-16, backend
`CRONOGOL.md` §71.* It used to be one entry per source article, so a story built from nine MARCA
pieces carried nine near-identical `ArticleSource` components. It now carries one per publisher,
keeping that publisher's **earliest** article — the same rule the citation footer inside `body` has
always used. Expect **1–3 entries** on a typical story.

⚠ This is a change of shape, not of policy. Nothing renders the field today so no page changes, but
if the decision above is ever reversed: a design that assumed "one entry per article we read" is now
wrong, and a design that read the count as "how many articles this story was built from" was always
wrong — that number lives in the backend's `story_sources` table and is not exposed. Entries
published before 2026-08-16 still carry the per-article list and are **not** backfilled, so the two
shapes coexist in the CMS.

**The AI disclosure lives once, in the site footer**, covering the site rather than the item. That is
the one thing owed in this repo: a footer statement, worded in the dictionaries alongside the sponsor
disclosure it parallels.

⚠ **Do not add them to `ARTICLE_FIELDS`.** The data is complete in the CMS precisely so this is
reversible without a backfill, but rendering it is a product decision that was made and declined —
see `.claude/decisions/0013` in the backend repo. Anything that reintroduces per-article disclosure
should start from that record, because it also carries the EU AI Act reasoning: the human-review
carve-out in Art. 50(4) is what makes footer-level disclosure sufficient, and it depends on a person
approving every story.

Verified and unchanged: `getArticle(slug)` does **not** filter by topic and `generateStaticParams`
takes every published slug, so a story renders at `/articles/{slug}` with **no routing change**.

### Articles are localized in the CMS — `es` and `en` on ONE entry

*New 2026-08-11. Backend `CRONOGOL.md` §47, `.claude/decisions/0015`.*

Stories are now written **twice** — Spanish first, then English as a separate pass from the same
facts. Both live on **one** Hygraph entry with two localizations, so there is still one `slug`, one
URL and one set of images per story.

**Query with `locales:` or you will get the wrong language.**

```graphql
article(where: { slug: $slug }, stage: PUBLISHED, locales: $locales) { … }
```

| Page | Ask for | Why |
| --- | --- | --- |
| `/es/` | `[es, en]` | ⚠ A fallback **chain**, not a preference. Every article published before 2026-08-11 has no `es` slot at all; a bare `[es]` would 404 the whole archive. Their `en` slot holds Spanish, so the fallback lands correctly. |
| `/en/` | `[en]` | ⚠ Alone, deliberately. Falling back to `es` here is indistinguishable from a real English article at the call site, and the page could not then tell the reader what it gave them. |

⚠⚠ **The `en` slot does not mean the content is English.** Hygraph's default locale is `en` and its
required fields cannot be blank, so a story with no English edition **fills that slot with Spanish**.
This is not an edge case: it is every article published before 2026-08-11, plus any story whose
English pass was held by the editorial gate.

**`Article.language` is the discriminator, and it must be selected.** It is a plain validated string,
upper-case, per-localization:

```jsonc
// /en/ , a story that HAS been written in English
{ "slug": "ramirez-…-13845ab3", "language": "EN", "headline": "Ramírez says the Ceuta fixture …" }

// /en/ , a story that has NOT — the same slot, Spanish prose, honestly labelled
{ "slug": "ramirez-…-13845ab3", "language": "ES", "headline": "Ramírez asegura que el partido …" }
```

`language !== "EN"` on an English page means **say so to the reader.** Serving Spanish prose under an
English URL with no notice is the failure this field exists to prevent. Set `lang="es"` on the article
element too, or a screen reader keeps English pronunciation through Spanish text.

⚠ **`slug` is NOT localized**, and is always derived from the **Spanish** headline — so a story's URL
never depends on whether its English pass succeeded. Do not build a localized-slug router.

⚠ **`photography` and the image `caption` / `credit` are NOT localized either.** Hygraph component
fields cannot be. A Spanish caption (*"Ilustración: …"*) will appear on the English page. Known, on
the list, not a bug to report.

**Gemini hero update — implemented 2026-09-13, deployment not verified here:** The backend's
`gemini` story-image route uses the publisher photo as a visual reference and includes the article
headline in its prompt. The existing image `credit` remains a string; an example value is
`Ilustración: AltaGama FC · referencia fotográfica: MARCA`. If the publisher name is unavailable,
the suffix is `referencia fotográfica del artículo fuente`. The photo URL is recorded in the backend
asset's provenance. Missing or invalid reference photos yield no new hero. Existing images are reused
until explicitly regenerated. There are no new response fields, frontend types or client parameters.

Localized: `headline`, `standfirst`, `body`, `byline`, `role`, `language`. Everything else is shared.

### The story feed card has no image; the publisher name is now the brand

*Added 2026-08-10. Publisher name fixed 2026-08-11.*

- Story media is unbuilt, so `imageUrl` is null on every story row and `images` is empty on the entry.
- ~~`publisher.name` still reads `"CronoGol"`~~ — **fixed 2026-08-11.** `publisher.name` is now
  `"AltaGama FC"` on every first-party card, matching the byline on the article page. One database
  row; the API shape did not change, so nothing here needed a code change.

  ⚠ **`AltaGama FC` — no space — is the canonical brand, and `Alta Gama FC` is retired.** Both
  spellings shipped at once until 2026-08-11: the space form in article bylines and this app's copy,
  the no-space form in every email. Every brand literal in this repo is the no-space one.

  ⚠ **`Alta Gama Fixture Club` is a SEPARATE mark and stays as it is** — the `%s — …` title template
  in `app/[lang]/layout.tsx`, the attribution rail, and the `LogoLockup` wordmark whose lifted F and
  C tie "FC" to "Fixture Club". Seeing both forms on one article page is intended. ⚠ The two
  `meta.title` strings in `en.ts`/`es.ts` carry the long form and sit among the short-form strings
  that changed — a mechanical find-and-replace over those files breaks the page title in both
  locales.

  ⚠ **`publisher.id` is still `"cronogol"` and is not changing.** It is the key, not the label —
  `?publisher=cronogol` is the documented filter value. **Never render `publisher.id`**; it is stable
  precisely so the name is free to change, and anything keyed off it will show the old brand.

  ⚠ **`author` is `null` on every first-party row, deliberately.** A second attribution beside the
  publisher name renders as "AltaGama FC — AltaGama FC". `articleByline()`'s
  `author || publisher.name` fallback is why the card showed the old name **twice**, and why one row
  fixed both slots.

### The fixture window has no follow state, no day grouping, and no cups

*Added 2026-08-08 with `GET /cronogol/fixtures`.* The "NEXT 7 DAYS" band is served, but four things
its design assumes are not:

- **No `followed` flag.** The prototype's `[…, league, followed]` tuple has nothing behind it, and
  neither does "4 involve your clubs" or the "N clubs followed" pill. The endpoint is anonymous —
  that is what keeps it `public, max-age=60` instead of `no-store`. Match on `homeTeam.slug` /
  `awayTeam.slug` against your own set. ⚠ That set is browser-local, so a signed-in reader on a
  second device sees no dots.
- **No day grouping and no timezone.** A flat list in kickoff order. Bucketing into columns is yours,
  because only you know whose days you are drawing. ⚠ And it needs **one** rule: the existing
  `dayGroups` keys floating rows in UTC and confirmed rows in the viewer's zone, so a day holding one
  of each yields two headers with the same label. Right on a jornada page, wrong on a week grid — and
  it will hit most days, because **88% of stored fixtures are `kickoffTbd`, and 100% from October
  onward**.
- **No cups, no European ties, no friendlies, and no segunda.** "Across all leagues" means the four
  *league* competitions. ⚠ **Five tracked clubs therefore never appear at all** — Girona, Las Palmas,
  Leganés, Mallorca and Valladolid all play in segunda. And in the pre-season the band hides real
  matches: 13 of the 15 fixtures in the window on 2026-08-08 were excluded friendlies.
- **It can legitimately be empty.** See `nextKickoffUtc`.

### There are no article bodies, and no article detail data

News is **headline + excerpt + image + a link out to the publisher**. There is no body, no image
gallery, no captions or credits, no "revised on", no slug, no reading time, and no byline *role*.
`author` is a bare string and `categories` is the topic list.

⚠ **First-party editorial does not change this.** Articles we write ourselves are stored in the same
shape — the only difference is `publisher.isFirstParty` and that `url` points at us rather than out.

#### ⚠ `categories` on a first-party row is the EDITORIAL KIND, and there are now TWO

*Added 2026-08-10 with the story pipeline.* Until now every first-party row carried
`["matchday-briefing"]` and nothing said a second value would ever appear.

| value | what it is |
| --- | --- |
| `matchday-briefing` | The per-club weekly briefing. **English.** |
| `story` | An angled news story, written on detection from clustered coverage. **Spanish.** |

Both are first-party, both live at `/articles/{slug}`, and both render through the existing article
route — a story needs no new page and no routing change. Exactly one value per first-party row; the
array shape is inherited from aggregated rows, which can carry several.

```jsonc
{
  "title": "Robbie Ure viaja a Sevilla para el reconocimiento médico",
  "url": "https://altagamafc.com/articles/robbie-ure-viaja-a-sevilla-a1b2c3d4",
  "imageUrl": null,                     // ⚠ null on EVERY story today — see below
  "publisher": { "id": "cronogol", "isFirstParty": true },
  "categories": ["story"]
}
```

⚠ **`imageUrl` is `null` on every story, and that is expected rather than broken.** Story media is
unbuilt; briefings have a composed hero and stories do not. Render the designed empty band — not a
spinner, and not a fallback that implies a failure.

⚠ **A story is in Spanish while a briefing is in English, and nothing on the wire says so.** There is
no `language` field on the article view. If the two ever need different treatment, `categories` is the
only discriminator; a language field is a backend change to ask for rather than infer.

> ⚠ **Still true as of 2026-08-11, and deliberately.** Stories now have an English edition in the CMS
> (see *Articles are localized* below), but **this feed is unchanged**: one row per story, carrying
> the **Spanish** headline and excerpt, on `/es/` and `/en/` alike. The backend pins its Hygraph sweep
> to Spanish specifically to keep that promise. A localized news feed is a separate backend change —
> ask for it; do not infer it from the article page having gained one.

⚠ **There is no way to filter the feed by category.** `?category=story` is a **400**, not a no-op —
the validation pipe is `forbidNonWhitelisted`, so an undeclared query parameter fails the whole
request. Filter client-side on `categories`, or ask for the parameter.

⚠ **Article `id`s expire.** Articles are purged on a rolling 30-day window, so an article URL is not a
durable permalink. An article detail screen would need a backend milestone, not a field.

### Four leagues have fixtures: LaLiga, the Premier League, the Bundesliga and Serie A

⚠ **The tracked club set changed 2026-08-04.** Five clubs promoted into primera (Elche, Levante,
Málaga, Racing, Deportivo) were never tracked, which left **20 of 380 matches missing across 18 of 38
jornadas**. They are now tracked — the LaLiga side of `GET /cronogol/teams` is **25** clubs, the
current primera 20 plus five relegated clubs still followed in segunda. Read `competitionName` rather
than assuming every club in the list plays in primera.

**The Premier League is LIVE and VERIFIED as of 2026-08-05.** All 20 clubs of the 2026/27 season are
registered and synced from the league's own data platform: 380/380 league fixtures across all 38
matchweeks, plus each club's cup ties and preseason friendlies. `GET /cronogol/teams` returns **45**
clubs (25 LaLiga-side + 20 PL) — filter with `?league=` if a screen is league-scoped
(`?league=premier-league` → exactly the 20). The jornada routes accept `premier-league` as the league
slug. **Read the PL caveats section below before rendering any PL kickoff time** — its `kickoffTbd`
works differently from LaLiga's.

**The roster verification gate has PASSED** (dated entry in the backend's verification log,
2026-08-05: the 20 clubs cross-checked club-for-club against an authoritative table, promoted trio
confirmed). Whether the picker shows the Premier League is now purely a product decision — nothing
technical blocks it.

**The Bundesliga is LIVE and VERIFIED as of 2026-08-07.** All 18 clubs of the 2026/27 season are
registered and synced from the DFL's own data platform: **306/306 league fixtures across all 34
matchdays**, with mirrored crests. `GET /cronogol/teams` returns **63** clubs (25 LaLiga-side + 20 PL +
18 Bundesliga) — filter with `?league=bundesliga` for exactly the 18. The jornada routes accept
`bundesliga` as the league slug, and `/cronogol/feed/{slug}.ics` works for every German club.

**The roster verification gate has PASSED** (dated entry in the backend's verification log,
2026-08-07: the 18 clubs cross-checked club-for-club against an authoritative table — all three
promoted clubs present, none of the three relegated). Whether the picker shows the Bundesliga is now
purely a product decision; nothing technical blocks it.

⚠ **Read the Bundesliga caveats section below before rendering any German kickoff time or club page.**
Three things behave differently from both other leagues, and the first one affects most of the season.

⚠ **German club slugs use German transliteration**, matching bundesliga.com's own URLs — `1-fc-koeln`,
`fc-bayern-muenchen`, `borussia-moenchengladbach` (`oe`/`ue`, not `o`/`u`, and not the English
exonyms `cologne`/`munich`). The full list:

```
1-fc-koeln              1-fc-union-berlin       1-fsv-mainz-05
bayer-04-leverkusen     borussia-dortmund       borussia-moenchengladbach
eintracht-frankfurt     fc-augsburg             fc-bayern-muenchen
fc-schalke-04           hamburger-sv            rb-leipzig
sc-freiburg             sc-paderborn-07         sv-elversberg
sv-werder-bremen        tsg-hoffenheim          vfb-stuttgart
```

**Serie A is LIVE and VERIFIED as of 2026-08-08.** All 20 clubs of the 2026/27 season are registered
and synced from the Lega Serie A's own data platform: **380/380 league fixtures across all 38
giornate**, with mirrored crests. `GET /cronogol/teams` returns **83** clubs (25 LaLiga-side + 20 PL +
18 Bundesliga + 20 Serie A) — filter with `?league=serie-a` for exactly the 20. The jornada routes
accept `serie-a` as the league slug, and `/cronogol/feed/{slug}.ics` works for every Italian club.

**The roster verification gate has PASSED** (dated entry in the backend's verification log,
2026-08-08: the 20 clubs cross-checked club-for-club against an authoritative table — the promoted
trio Venezia, Frosinone and Monza all present, and the relegated trio Cremonese, Verona and Pisa all
absent). Whether the picker shows Serie A is now purely a product decision; nothing technical blocks it.

⚠ **Read the Serie A caveats section below before rendering an Italian club page.** Two things behave
differently from all three other leagues, and one of them is a capability nothing else has.

**Segunda is LIVE as of 2026-08-09.** All 22 clubs of the 2026/27 Segunda División are registered and
synced from LALIGA's own platform: **462/462 league fixtures across all 42 matchweeks**, exactly 11 per
matchweek. `GET /cronogol/teams` now returns **100** clubs — filter with `?league=segunda` for exactly
the 22. The jornada routes accept `segunda` as the league slug, and `/cronogol/feed/{slug}.ics` works
for every Segunda club.

⚠ **`?league=laliga` now returns 20 clubs, not 25.** Girona, Las Palmas, Leganés, Mallorca and
Valladolid were relegated and were still filed under LaLiga; they now answer to `?league=segunda`. If
you hard-coded 25 anywhere, or assumed those five appear in a LaLiga list, that changes today. Their
club slugs are unchanged, so every existing club URL and `.ics` feed keeps working.

⚠ **The slug is `segunda`, never `laliga-hypermotion`.** HYPERMOTION is a sponsor name — the same
competition was LaLiga SmartBank until 2023 — and this value sits in permanent calendar feed URLs.

⚠ **Roughly 90% of Segunda kickoff times are provisional** — 418 of 462 fixtures carry
`kickoffTbd: true`, far more than any other league we publish. Render the `timesPending` treatment as
the default state for this competition rather than the exception, and do not present a Segunda kickoff
time as firm unless `kickoffTbd` is false.

⚠ **Segunda has no `accentColor`** — match cards render with no tint bar, exactly as Serie A does.

⚠ **Segunda has NOT had a roster verification gate.** The other three leagues each carry a dated
club-for-club cross-check against an authoritative table. What is verified here is internal
consistency — 462 fixtures, 42 × 11, zero duplicate pairings, every club sync clean — which proves the
competition is complete and self-consistent, **not** that it is the correct 22 for 2026/27. Treat a
promoted/relegated-club discrepancy as plausible until that check is recorded.

⚠ **Seven Segunda club slugs are provider-shaped** and will look inconsistent beside the rest:
`burgos-cf`, `cd-castellon`, `club-deportivo-eldense`, `cordoba-club-de-futbol`, `fc-andorra`,
`r-sociedad-b`, `rc-celta-fortuna`. They are permanent — display `name` and `shortName` are the fields
to render, never the slug.

⚠ **Italian club slugs are the short, familiar forms** — `inter` (not `internazionale`), `milan`,
`roma`, `juventus`. The `name` field, however, is the Lega's own registered form, so `inter` is named
**`Internazionale`** and the two deliberately disagree. Render `name`; route on `slug`. The full list:

```
atalanta        bologna         cagliari        como            fiorentina
frosinone       genoa           inter           juventus        lazio
lecce           milan           monza           napoli          parma
roma            sassuolo        torino          udinese         venezia
```

**Ligue 1 is now the only league in the picker with no fixture data.**

⚠ `GET /cronogol/news/leagues` can return other leagues — that is the **news** dimension, and a league
having news does not mean it has fixtures. Do not drive a club picker from it. ⚠ This cuts the other
way too, now: the Premier League has fixtures but **no news source** — PL club news tabs are empty,
and `?league=premier-league` on the news endpoints returns whatever cross-league coverage exists, not
dedicated PL feeds.

### League logos — new 2026-08-08

Every league we serve now carries its own mark, mirrored into our storage. Nothing hot-links a
league's CDN, exactly as with club crests.

**Where it appears — two places, both additive:**

```jsonc
// GET /cronogol/jornada/bundesliga/2026/1  → the `league` object
"league": {
  "slug": "bundesliga",
  "name": "Bundesliga",
  "logoUrl": "https://altagamafc.crono-gol.com/storage/v1/object/public/team-assets/leagues/f18a0….png",
  "logoUrls": { "primary": "https://…/f18a0….png" }
}

// GET /cronogol/news/leagues  → each entry
{ "id": "laliga", "name": "LALIGA", "shortName": "LaLiga",
  "logoUrl":  "https://…/08826….png",   // ⚠ changed 2026-08-08 — now the LL monogram
  "logoUrls": { "primary": "https://…/08826….png", "icon": "https://…/08826….png",
                "wordmark": "https://…/77f04….png" } }
```

⚠⚠ **`logoUrls` on a LEAGUE is not the same kind of map as `logoUrls` on a TEAM, and picking wrong
costs you differently.** A club's variants are one image at several sizes — the wrong key is a
resolution mistake. A league's are **different artwork**:

| Key | What it is | Present for |
| --- | --- | --- |
| `primary` | the league's main mark — **always equals `logoUrl`** | every league that has any logo |
| `icon` | icon-only mark, no wordmark | LaLiga (identical to `primary` since 2026-08-08) |
| `wordmark` | the wide `LALIGA` lettering lockup | **LaLiga only** |
| `onDark` | the mark for a DARK surface — equals `primary` | **Premier League only** |
| `onLight` | the mark for a LIGHT surface | **Premier League only** |

**A caller that ignores `logoUrls` entirely and reads `logoUrl` is always correct — except on a light
surface for the Premier League. See the two ⚠⚠ notes below.**

⚠⚠ **UPDATED 2026-08-08 — both LaLiga's and the Premier League's primary mark changed.** If you
cached either URL or sized a slot around it, re-check it:

| League | `primary` was | `primary` is now | What changed for layout |
| --- | --- | --- | --- |
| LaLiga | the wide `LALIGA` wordmark, 3009×1001 | the **LL monogram**, 959×960 | **3:1 → 1:1.** A header slot sized for the wordmark now gets a square mark. The wordmark is still available as `wordmark`. |
| Premier League | the purple mark, 941×1117 | the **white mark**, 957×1159 | Aspect is unchanged; the **ink colour** is not. See below. |

⚠⚠ **The Premier League's `primary` is now a PURE WHITE mark, and it is invisible on a white or light
background.** That is deliberate — it is the correct mark for a dark UI. It also means the Premier
League is the one league whose `logoUrl` you cannot drop onto an arbitrary background.

```ts
// ✅ Theme-correct for every league. onDark/onLight exist only for the PL, so
//    the fallback chain is what makes this work everywhere else.
const leagueLogo = (l: LeagueRef, theme: 'dark' | 'light') =>
  (theme === 'dark' ? l.logoUrls?.onDark : l.logoUrls?.onLight) ?? l.logoUrl;
```

⚠ The supplier's filenames name the **ink**, not the background — `PL_LOGO_COMPACT_LIGHT_RGB` is the
*white* mark, for dark surfaces. The API keys deliberately invert that to name the background
(`onLight` = "use this on a light background"), because "the light logo" is ambiguous in exactly the
way that ships a white logo onto a white page.

**⚠ `logoUrl` is null for most leagues, and that is normal.** Only four have artwork — LaLiga, Premier
League, Bundesliga, Serie A. Cup and UEFA competitions arrive from fixture payloads with no logo, and
Ligue 1 sits in the news registry without one. **Render the name or `shortName` alone when it is
null** — do not show a placeholder box.

**⚠ A logo is not a signal that a league has fixtures.** Five of the nine entries in
`GET /cronogol/news/leagues` have no fixtures here at all, and four of those have no logo either — but
the two facts are unrelated and must not be read off each other. Drive the picker from
`GET /cronogol/teams`, never from this list.

⚠ An earlier version of this paragraph named Serie A as the example of "a logo but no fixtures". It
landed the same day and now has 380.

**Other things worth knowing:**

- **⚠ Dark-surface legibility — UPDATED 2026-08-08, and the Premier League is now FIXED.** This list
  previously measured all four marks on `#141312`, `#1f1e1d` and `#2b2928` and found three degraded
  and one unusable. The Premier League has since been given a proper light-on-dark mark:

  | League | On a dark surface | |
  | --- | --- | --- |
  | LaLiga | ✅ red mark, fully legible | ink `rgb(255,75,68)` — unchanged by the primary swap; the LL monogram is the same red as the wordmark |
  | **Premier League** | ✅ **FIXED — pure white mark** | was ⛔ dark purple. `primary`/`onDark` is now `rgb(255,255,255)`; the purple survives as `onLight` |
  | Serie A | ⚠ the blue triangle survives; the "SERIE A" wordmark under it **disappears** | unchanged — no light variant supplied |
  | Bundesliga | ⚠ the red box survives; the "BUNDESLIGA" wordmark under it **disappears** | unchanged — no light variant supplied |

  ⚠ **The Premier League fix inverts its own risk.** Its primary is now invisible on a *light*
  surface rather than a dark one. That is why `onLight` exists — see the theme snippet above.

  ⚠ **The files themselves were never the problem.** All assets are genuinely transparent (verified
  2026-08-08 by rendering each over magenta); nothing has a baked-in white box. The issue was ink
  colour, which a client cannot fix without recolouring a league mark — a trademark problem, not a
  styling choice.

  **The ask stands, now narrowed to two: a light-on-dark variant for the Bundesliga and Serie A.**
  Supply the artwork and it lands the same way the PL's did.

  ⚠ **Naming — this differs from what was requested here, deliberately.** This list asked for a
  `logoUrls.light` key. What shipped is **`onDark` / `onLight`**, naming the *background* the mark is
  for rather than the ink it is made of. The reason: the supplier's own file is called
  `PL_LOGO_COMPACT_LIGHT_RGB` and it is the **white** mark, so "the light logo" already means two
  opposite things in one sentence — and that ambiguity is exactly what ships a white logo onto a white
  page. `onDark`/`onLight` cannot be read backwards. **Say so if you would still rather have `light`**;
  it is one migration and nothing is built on it yet.
- **Formats are mixed** — PNG for LaLiga, the Premier League and the Bundesliga; SVG for Serie A. Size
  them with CSS, do not assume a raster.
- **URLs are content-addressed and immutable.** A logo that changes gets a *new* URL and the API
  starts returning it; the old object is never overwritten. Safe to cache hard on your side, but read
  the URL from the API rather than hardcoding it.
- **Cached hard, as you'd hope.** Assets return `cache-control: public, max-age=31536000` and are
  served from CDN cache. Combined with content-addressed URLs, a logo is safe to cache aggressively
  client-side.

#### ✋ Two asks on league artwork — raised 2026-08-08, both backend-side

Neither is a bug and neither blocks anything shipping; both are things only the backend can do,
because the URLs are content-addressed and the front end deliberately reads whatever `logoUrl`
returns rather than naming files. Doing them upstream means **no front-end release** either time.

**1. Serve `LL_RGB_h_color` as LaLiga's `primary`.** That is the file the design side wants — LaLiga's
own brand-kit name for the horizontal, full-colour lockup. Today `primary` is a red `LALIGA` wordmark
(`77f0497b…png`, 3009×1001). If they are already the same artwork, say so here and this closes; if
not, remirror and the mark updates on its own.

⚠ The front end cannot do this one. It has no copy of the file, `public/` is empty by design, and
hardcoding a path would be the single asset in the app that goes stale silently when a mark is
redrawn — exactly what "read the URL from the API" above exists to prevent.

**2. Add a light-on-dark variant of every league mark.** Suggested shape, additive and null-safe:

```jsonc
"logoUrls": {
  "primary": "https://…/….png",   // as today — drawn for light backgrounds
  "icon":    "https://…/….png",   // as today — LaLiga only
  "light":   "https://…/….png",   // NEW: for dark backgrounds. Null/absent where none exists.
}
```

This product is dark-themed throughout (`#141312` / `#1f1e1d` / `#2b2928`), and the marks are drawn
for white. Measured over all three surfaces: LaLiga carries, the Bundesliga and Serie A keep their
icons but lose their wordmarks, and **the Premier League's dark-purple crest is effectively
invisible**. The client renders them unboxed and un-filtered on purpose — a plate boxes the mark, and
`invert()`/`brightness()` would flatten four brand palettes into whatever the filter produces, which
is a trademark problem rather than a styling choice. So a real light asset is the only clean fix.

### Bundesliga caveats — TBD, venues, and coverage

Three differences from LaLiga and the Premier League. The first changes how most of the season looks;
the second removes a field you may already render; the third is a coverage gap.

**1. ⚠⚠ `kickoffTbd` is SOURCE-STATED, and most of the season is provisional.**

Unlike the PL — where the backend *derives* TBD from a six-week policy because the source has no such
notion — the DFL states it per fixture, and the backend passes that through. Consequences:

- **~85% of the season is `kickoffTbd: true` at the start of a season.** **Measured live on
  2026-08-07: 261 of 306.** Normal, not a data problem: German kickoff times firm up as the
  broadcaster selects them, roughly five matchdays at a time. Matchday 1 is fully confirmed.
- **The inverse of the PL rule holds.** A PL fixture six months out is TBD *as a class*; a Bundesliga
  fixture six months out with `kickoffTbd: false` genuinely has a confirmed time. Do not apply a
  distance-from-today heuristic to German fixtures — the flag is authoritative.
- A TBD fixture's `kickoffUtc` is **midnight UTC of its local (Berlin) date**, the same placeholder
  convention as the other leagues. Render it as an all-day or date-only entry and **never** show
  "00:00". The `.ics` already does this.
- Expect a lot of TBD → confirmed transitions through the season. Each one is a real change and
  reaches `.ics` subscribers.

**2. ⛔ `venue` and `venueCity` are NULL on every Bundesliga fixture, and `team.venue` is null too.**

Not a gap that will be filled shortly, and not a bug to report. The DFL's payloads carry no stadium
anywhere — not on the match, not on the club. The backend deliberately refuses to infer "the home
club's ground", because that is wrong for a ground-share, wrong for a club playing elsewhere during
stadium works, and wrong for every neutral-venue final — a stadium pin in the wrong city is the kind
of error nobody reports and everybody notices.

**Do not build a location line, a map pin, a "getting there" block or a capacity figure for German
fixtures.** If a layout requires a venue, it needs a fallback that is not an empty string.

**3. Coverage is the league PLUS the Champions League — no domestic cups.**

⚠ **Changed 2026-09-10. This section used to say "Coverage is LEAGUE-ONLY" and that is no longer
true.** A Bundesliga club page carries its 34 league matchdays **and its Champions League ties** —
8 league-phase matches for each of the four entrants (Bayern, Dortmund, RB Leipzig, Stuttgart).

Still absent: **no DFB-Pokal, no Supercup, no Europa League, no Conference League, no preseason
friendlies, and no 2. Bundesliga.** The domestic cups are reachable from the source and are a backend
config decision rather than a limitation, so they can change. The Europa and Conference Leagues are
**not** reachable from this source at all.

A German Champions League fixture arrives shaped like any other cup row:

```jsonc
{
  "homeAway": "H",
  "opponent": "Bodö/Glimt",        // ⚠ German-localised — "SSC Neapel", "FC Kopenhagen"
  "competition": "cup",
  "competitionName": "UEFA Champions League",
  "round": null,                    // ⚠ no label, unlike LaLiga's "Jornada 1"
  "kickoffUtc": "2026-09-10T19:00:00+00:00",
  "kickoffTbd": false,              // ⚠ false, unlike ~85% of German LEAGUE fixtures
  "venue": null,
  "venueCity": null
}
```

⚠ **Three differences from the same tie as served on a LaLiga club's page**, all deliberate:

- **`round` is `null`.** The DFL states a bare integer and no display label, and the backend refuses to
  fabricate one. LaLiga states `"Jornada 1"`. Do not key layout on `round` being present — a
  Champions League eyebrow built from `round` renders empty for the German half of the same tie.
- **`kickoffTbd` is `false` on every Champions League row**, where most German *league* rows are `true`
  most of the season. UEFA fixes these dates far in advance.
- **`venue` and `venueCity` are `null`**, as on every German fixture.

⚠ **Read `competitionName`, not `competition`, to identify the competition.** These rows carry
`competition: "cup"` and a null `leagueSlug`, exactly like the LaLiga-served ties, and the string is
byte-identical across both sources — which is what lets one gate cover both.

**Also worth knowing:**

- **One club IS renamed: `sc-freiburg` is served as `SC Freiburg`.** Confirmed against production
  2026-08-08.

  ⚠ **The name changed under us, so both readings were right when taken.** On 2026-08-07 this endpoint
  genuinely returned `Sport-Club Freiburg` — measured, and it rendered that way in a build the same
  afternoon. On 2026-08-08 it returns `SC Freiburg`. The override was added in between rather than one
  of the two measurements being sloppy. Worth stating plainly because it is the first display name
  here that has ever moved: **club names are not stable identifiers, slugs are.** Anything keying,
  caching or snapshotting on `name` will drift silently.

  The backend carries this one override because the DFL's registered name is what nobody — not the
  club, not a table, not a broadcaster — actually uses. Every OTHER club is verbatim. Expect German
  registered names throughout — `1. FSV Mainz 05`, `Bayer 04 Leverkusen`, `FC Bayern
  München`, `Borussia Mönchengladbach` (with the umlaut — the *name* keeps diacritics even though the
  *slug* transliterates them). If the UI wants the short broadcast form, it has to shorten it itself
  or read `shortName`; nothing upstream does it.

- **The matchweek is called a "Matchday"**, not a "Jornada" or a "Matchweek". `X-WR-CALNAME` and the
  `.ics` download filename use the league's own English wording; mirror it in the UI.
- **⚠⚠ The RETRACTION is itself wrong — re-measured 2026-08-08. `matchweek` does not exist on a
  fixture.** A note here claimed the retraction that `matchweek` "is populated on 306/306 Bundesliga
  fixtures, 1–34". It is not, and the field is not merely null: **the key is absent from the fixture
  object entirely.** `GET /cronogol/teams/{slug}/fixtures` returns exactly these keys —

  ```
  competition · competitionName · goalsAgainst · goalsFor · homeAway · id · kickoffTbd
  kickoffUtc · opponent · opponentLogoUrl · opponentLogoUrls · round · status · venue · venueCity
  ```

  — and there is no `matchweek` among them, for **any** league. Checked club-for-club across LaLiga
  (`real-madrid`), the Premier League (`arsenal`), the Bundesliga (`fc-bayern-muenchen`,
  `borussia-dortmund`, `rb-leipzig`) and Serie A (`inter`, `juventus`, `napoli`) on 2026-08-08:
  0 populated out of 34, 38, 38 and 42 respectively.

  What *is* true, and was true before the retraction: the matchday number lives only on the jornada
  routes — as the top-level `matchweek` of `GET /cronogol/jornada/{league}/{season}/{n}` and in the
  index's `matchweeks[]`. **Those routes and the per-round `.ics` do work for the Bundesliga**, which
  is the one thing the retraction got right. A club page that wants to label a fixture with its round
  has to join to the index; there is nothing on the row to read.

  ⚠ The same wrong claim is repeated for Serie A ("`matchweek` populated 1–38 on all 380") in the
  Serie A caveats. It is wrong there for the same reason. Do not write `fixture.matchweek`.
- **`round` is `null` on every German fixture** — the DFL states a bare integer and the backend will
  not fabricate a display label. Nothing to render; the round pages carry the number instead.
- **`shortName` is the three-letter code** (`FCB`, `BVB`, `S04`), not a shortened name.
- **`country` is `null` on all 18 clubs** — the same gap the PL has on 9 of 20. Do not render a
  country line for German clubs.
- **Crests are ours, and they are SVG.** Mirrored into our storage like every other league, so nothing
  hot-links to bundesliga.com. `logoUrls` has a single `svg` key — there are no size variants for
  German clubs, so a component picking `medium` must fall back to `svg` before it falls back to
  `logoUrl`, which for an opponent-only club is still the provider's file.
- **`colorPrimary` and `colorSecondary` are IDENTICAL on all 18 clubs** — not merely "frequently";
  measured across the full roster 2026-08-07 (Dortmund is `#FFD900`/`#FFD900`, and so is everyone else
  in their own colour). That is what the source states, not a bug. **A gradient built from the pair
  renders flat for every German club**, so check for equality before using them as two stops.
- **League news works** via the existing ESPN coverage, unlike the Premier League. But there are **no
  per-club German feeds**, so an individual club's news tab will be empty or thin.
- **Live/in-play statuses are unverified.** Only `PRE_MATCH` and `FINAL_WHISTLE` have ever been
  observed from this source; every in-play status mapping is an educated guess until a real matchday.
  An unrecognised status falls back to `scheduled`, never `finished`.

### Serie A caveats — venue data, the `round` label, and coverage

Three differences from the other three leagues. The first is the only place any league gives you more
than the others; the second will look like a bug and is not.

**1. ⭐⭐ Serie A is the ONLY league with venue city and capacity. Everything else is still null.**

This is the first and so far only source that states each club's ground. For Italian clubs:

```jsonc
// GET /cronogol/teams?league=serie-a → team.venue
{
  "name": "Giuseppe Meazza",
  "city": "Milano",          // ⭐ non-null — Serie A ONLY
  "capacity": 80018,         // ⭐ non-null — Serie A ONLY
  "latitude": null,          // ⚠ still null everywhere, including Serie A
  "longitude": null,
  "imageUrl": "https://…/stadiums/….webp"
}
```

- **A component that renders capacity or city MUST tolerate null**, or it will render for Serie A and
  break for LaLiga, the Premier League and the Bundesliga. This asymmetry is not temporary and is not
  a gap in the others — those sources do not state the data at all.
- **`latitude` and `longitude` remain null on every club in every league, Serie A included.** The
  source publishes them as empty strings, which the backend deliberately maps to null rather than
  through `Number()` — that would yield `0`, and pin every Italian ground at 0°N 0°E in the Gulf of
  Guinea. **Do not build a map pin.** A city name is not a coordinate.
- **18 venues for 20 clubs, and that is correct.** Inter and Milan share the Giuseppe Meazza; Roma and
  Lazio share the Olimpico. Two clubs can legitimately return the same venue object.
- **Measured 2026-08-08 across the 20 clubs:** `venue` non-null 20/20, `venue.city` 20/20,
  **`venue.capacity` 17/20**. Three clubs state a name and city with no capacity. Null there means
  "not stated", not zero.
- Fixture-level `venue` and `venueCity` are populated too, and they describe **that match's** ground —
  correct for a neutral-venue tie, unlike a club's home ground copied onto its fixtures.

**2. ⚠ `round` is `"Campionato"` on EVERY league fixture — it is the stage, not the matchday.**

Italian fixtures have a non-null `round` where German ones have null, but it is not what LaLiga's
`round` is. LaLiga states `"Jornada 2"`; the Lega states the *stage* name, which is the constant
string `"Campionato"` for all 380 league fixtures.

- ⚠ **"Use `matchweek` for the giornata number, populated 1–38 on all 380 fixtures" is WRONG** — that
  is what this bullet used to say. Re-measured 2026-08-08 across `inter`, `juventus` and `napoli`:
  **`matchweek` is not a key on a club fixture in any league**, Serie A included (0 of 38 each). See
  the same correction under the Bundesliga caveats. The giornata number is on the jornada routes only.
- **Rendering `competitionName · round` yields "Serie A · Campionato"**, which is redundant, and
  rendering `round` alone captions all 38 rows of every Italian club page with a word that
  distinguishes nothing. The backend passes it through verbatim because the port documents `round` as
  the provider's own display label, and inventing one would be worse — so **suppressing it is the
  client's job.** The rule that works across all four leagues: a `round` with no number in it is only
  worth printing when `competition !== "league"`, where it is a cup round's own name ("Round of 16").
  Inside a league it is either a parseable matchday label (LaLiga's "Jornada 2") or noise.

**3. Coverage is LEAGUE-ONLY — with the Champions League arriving separately.**

⚠ **Changing 2026-09-10.** Inter, Napoli, Como and Roma will carry their 8 Champions League ties, as
`competition: "cup"` / `competitionName: "UEFA Champions League"`, the same shape as a LaLiga or
German club's. ⛔ **Not live yet** — it waits on a migration; until then the paragraph below is still
true in full. Check for a `cup` row before assuming either way.

⚠⚠ **This is NOT the same mechanism as the Bundesliga's, and the difference is visible to you.** The
DFL publishes the Champions League itself, so German clubs get their ties from their own source. The
Lega feed carries **no** European competition at all — seven competitions, all Italian — so these rows
are *projected* from the competition-wide tables. Two consequences:

- They carry a **null `leagueSlug`**, as every UEFA tie already does. Key on `competitionName`.
- They will **never** appear in `GET /cronogol/live`, in a Live Activity, or in a push notification,
  for any Italian club. A Serie A club's European night is **fixtures-and-result only** — do not build
  a live card for one and expect it to tick.

Everything else below stays true: no Coppa Italia, no Supercoppa, no Europa League, no Conference
League, no preseason friendlies.

Serie A club pages show the 38 league giornate and **nothing else** — no Coppa Italia, no Supercoppa,
no UEFA ties, no preseason friendlies. Same posture and same reasoning as the Bundesliga. It is a
backend config decision rather than a source limitation (the cup data is reachable, and the source
even names a friendlies competition), so it can change; assume league-only until this section says
otherwise.

**Also worth knowing:**

- **The matchweek is called a "Giornata"**, not a "Jornada" or a "Matchday". `X-WR-CALNAME` and the
  `.ics` download filename use the Italian wording (`Serie A · Giornata 1`); mirror it in the UI.
- **`name` and `slug` deliberately disagree for some clubs.** `inter` is `Internazionale`, `milan` is
  `Milan`, `roma` is `Roma`, `juventus` is `Juventus`. Names are provider-verbatim; slugs are the
  short familiar forms a fan would type and are permanent.
- **`shortName` is the three-letter code** (`INT`, `JUV`, `MIL`), not a shortened name — matching the
  Bundesliga and the Premier League.
- **Crests are ours, and they are WebP.** Mirrored into our storage, so nothing hot-links to
  legaseriea.it. ⚠⚠ **`logoUrls` keys are `teamLogo` and `teamLogoLight` — THEME names, not sizes**,
  and this is the first league where that is true. A preference chain written for
  `xsmall`/`small`/`medium`/`svg` finds none of them and must fall back to `logoUrl`. See "Wiring up
  Serie A" below for the exact trap and the fix.
- ⚠ **`teamLogoLight` is not a usable dark-mode asset.** Measured 2026-08-08 across all 20 clubs:
  **it is byte-identical to `teamLogo` on 17 of them** (they mirror to the same content-addressed
  object, so the URLs are literally equal). Only Frosinone, Juventus and Napoli differ. Do not build a
  theme switch on it — compare the two strings and treat equality as "no variant".
- **`colorPrimary` and `colorSecondary` are null on every Italian club** — the source states no
  colours at all. ⚠ Not unique to Serie A: the Premier League is also 0/20. LaLiga (25/25) and the
  Bundesliga (18/18) are the ones that have them. Any club-coloured surface needs a neutral default.
- ⚠ **`country` is unreliable in EVERY league — do not build on it.** Measured 2026-08-08: LaLiga
  **0/25**, Bundesliga **0/18**, Premier League **11/20**, Serie A **10/20**. Where a club row was
  adopted from an earlier provider it keeps that provider's identity fields, and several sources never
  stated a country at all. This is long-standing and not a Serie A regression.
- **Most of the season is `kickoffTbd: true`** — 330 of 380 at the start of the season, the same
  source-stated flag the Bundesliga has. Render TBD fixtures as all-day; never show "00:00".
- **League news works** via the existing ESPN `ita.1` coverage. As with the Bundesliga there are **no
  per-club Italian feeds**, so an individual club's news tab will be empty or thin.
- **Live/in-play statuses are unverified.** Only `UPCOMING`/`PRE_MATCH` and `FINISHED`/`FULL_TIME`
  have ever been observed from this source; every in-play mapping is an educated guess until the
  season starts on **2026-08-22**. An unrecognised status falls back to `scheduled`, never `finished`.
- **No player PERFORMANCE statistics**, even though this source has them and no other does.
  Deliberately unbuilt. ⚠ Serie A *does* get club stats from 2026-09-09
  (`GET /cronogol/teams/{slug}/stats`) — but **no player stats**, because its events carry a name
  string and no stable person id, so two players sharing a name would merge silently.

### Wiring up Serie A — a checklist

Nothing here needs a new endpoint or a new type. Serie A is the fourth league through the same
contract, so the work is: add the slug, and handle two things that are genuinely new.

**1. The picker and the league-scoped calls.** `serie-a` works everywhere a league slug does:

```ts
GET /cronogol/teams?league=serie-a                 // 20 clubs
GET /cronogol/jornada/serie-a/2026/1               // 10 fixtures
GET /cronogol/feed/jornada/serie-a/2026/1.ics      // X-WR-CALNAME: "Serie A · Giornata 1"
GET /cronogol/feed/inter.ics                       // per-club, as any other league
```

⚠ **Do not hardcode the four slugs.** `GET /cronogol/teams` returns every tracked club with its
league, and the league list is database-driven — Ligue 1 will appear the same way, with no front-end
release. A hardcoded array is the thing that will need editing again.

**2. ⚠⚠ THE CREST TRAP — read this one properly.** Every other league keys `logoUrls` by *size*
(`xsmall`, `medium`, `svg`). Serie A keys it by *theme*: `teamLogo`, `teamLogoLight`. A preference
chain that walks size names finds nothing and — depending on how it is written — either falls through
to `logoUrl` (fine) or picks the first value it happens to iterate (**not** fine: on 3 clubs that is
the light-background mark, which is close to invisible on a light surface).

```ts
// ✅ Correct: name every key you accept, in order, and end at logoUrl.
const CREST_ORDER = [
  'svg',                      // Bundesliga — vector, so it is right at every size
  'medium', 'small', 'xsmall',// LaLiga / Premier League rasters
  'teamLogo',                 // Serie A — the standard mark
] as const;

export function crestSrc(team: TeamView): string | null {
  const urls = team.logoUrls ?? {};
  for (const key of CREST_ORDER) if (urls[key]) return urls[key];
  return team.logoUrl ?? null;   // always the safe last resort
}

// ⛔ Wrong: Object.values(team.logoUrls ?? {})[0]
//    Iteration order is not preference order, and for Serie A it can hand you
//    `teamLogoLight` — a light mark on a light background.
```

⚠ **`teamLogoLight` is byte-identical to `teamLogo` on 17 of 20 clubs** (measured 2026-08-08 — they
mirror to the same content-addressed object, so the strings are equal). It is **not** a dependable
dark-mode asset. If you want one, compare the strings first:

```ts
const dark = team.logoUrls?.teamLogoLight;
const hasRealVariant = dark && dark !== team.logoUrls?.teamLogo;   // true for 3 clubs only
```

**3. ⭐ Venue data exists here and nowhere else — make the component null-tolerant FIRST.**

```tsx
// ✅ Works for all four leagues. Serie A fills in; the others render nothing extra.
{team.venue && (
  <dl>
    <dt>Ground</dt><dd>{team.venue.name}</dd>
    {team.venue.city && <><dt>City</dt><dd>{team.venue.city}</dd></>}
    {team.venue.capacity != null && (
      <><dt>Capacity</dt><dd>{team.venue.capacity.toLocaleString('it-IT')}</dd></>
    )}
  </dl>
)}
```

⛔ **Do not add a map.** `latitude`/`longitude` are null on every club in every league, Serie A
included — the source publishes them as empty strings and the backend refuses to read those as `0`.
A city name is not a coordinate.

**4. The matchweek label.** Serie A's is **"Giornata"** (LaLiga "Jornada", Premier League "Matchweek",
Bundesliga "Matchday"). Keyed by league slug, so keep it as data, not four branches:

```ts
const MATCHWEEK_LABEL: Record<string, string> = {
  laliga: 'Jornada', 'premier-league': 'Matchweek',
  bundesliga: 'Matchday', 'serie-a': 'Giornata',
};
const label = MATCHWEEK_LABEL[leagueSlug] ?? 'Jornada';
```

⚠ Use `fixture.matchweek` for the number. **Do not derive it from `round`** — Serie A's `round` is the
constant string `"Campionato"`, not a matchday label.

**5. `name` and `slug` deliberately disagree.** Route on `slug`, display `name`. The clearest case is
`inter` → **`Internazionale`**. A club page that titles itself from the slug will say "Inter" where the
rest of the app says "Internazionale".

**6. Timezone for league-local questions.** Serie A's own zone is **`Europe/Rome`** — needed only when
you mean the league's local day ("is this a midweek round?"), never for display, which uses the
reader's zone.

**7. Nothing to change for:** `.ics` feeds, news (Italian league news already flows through the
existing ESPN coverage), account/followed-club flows, or the fixture and team types. The contract did
not move.

### Premier League caveats — kickoffs, TBD, and naming

The PL source has **no notion of an unconfirmed kick-off time**: fixtures not yet picked for TV show a
plausible Saturday 15:00. The backend therefore derives `kickoffTbd` by policy — a *scheduled* fixture
whose kickoff lies more than ~6 weeks out is TBD **as a class**, matching how the league actually
firms times up (TV selections land in batches). Consequences you will see in the data:

- **Deep in the season, most PL fixtures are `kickoffTbd: true`** — normal, not a data problem. They
  flip to confirmed (with a real time) as their window approaches. Render TBD as all-day, exactly as
  for LaLiga.
- A TBD fixture's `kickoffUtc` is midnight UTC of its provisional **date** — same shape as LaLiga's
  placeholders, so existing all-day rendering works unchanged.
- ⚠ A fixture *inside* the window showing 15:00 Saturday is a real, confirmed 15:00 — do not
  second-guess it.
- Cup fixtures appear as rounds are drawn; preseason **friendlies are included** (they are the one
  thing this source has that LaLiga's never did).
- The matchweek unit is called **"Matchweek"**, not "Jornada", in PL calendar feeds: the jornada
  `.ics` for `premier-league` is named `Premier League · Matchweek {n}` and downloads as
  `premier-league-{season}-matchweek-{n}.ics`. The JSON routes are unchanged in shape — only the
  calendar-facing strings differ.
- `round` is always `null` on PL fixtures (the source has no display label); `matchweek` carries the
  integer. Derive any label yourself ("Matchweek 4").
- ⚠ Live statuses are unverified until the PL season starts (2026-08-21). Expect `scheduled` /
  `finished` / `postponed` to be reliable and treat anything else as provisional until then.
- ⚠ **`country` is `null` on 9 of the 20 PL clubs** (the ones that already existed as opponent rows
  before registration). Do not key any UI off `country` — the league slug is the grouping signal.
- **`logoUrls` keys are per-league vocabulary and per-URL hosting is mixed.** LaLiga clubs carry
  `xsmall`/`small`/…; PL clubs carry `"20"`/`"25"`/`"50"`/`"70"`/`"100"`/`"svg"` (pixel sizes + a
  vector). Some variants are on our asset host, others hot-link the league's CDN — all are valid,
  stable URLs; treat the whole map as opaque data and pick by key when you know the league, else use
  `logoUrl`.
- ⚠⚠ **`logoUrls` is a SPARSE map — never assume a key exists** (changed 2026-08-06). Sizes the
  provider does not actually serve are now **omitted** rather than returned as a broken URL. In
  practice the 20 real PL clubs still carry all six keys, while friendly and European opponents
  routinely lack `"70"` and `"svg"`, and a few clubs return `{}`.

  This is a **fix, not a regression**, and it is worth understanding why: those keys used to be present
  and 403. Because a size-preference chain takes the first key it finds, a dead `"svg"` outranked the
  working `"100"` PNG sitting beside it, and **26 clubs rendered as placeholder initials while holding a
  perfectly good crest**. An absent key falls through to the next size; a dead key does not.

  - `{}` (empty object) means "the provider named sizes and none of them exist" — distinct from `null`,
    which means it named none. Both should fall back to `logoUrl`.
  - `logoUrl` itself is `null` for a club whose provider serves no crest at any size. Seven clubs today
    — `auckland`, `strasbourg`, `famalicao`, `al-ula`, `johor-darul-ta-zim`, `k-league-xi`,
    `como-1065`. **Keep the initials placeholder for these**; it is the correct rendering, not a bug.
  - Some of those seven now carry a crest sourced from a different provider and mirrored onto our
    storage. Nothing about the shape changes when that happens.

### ✅ Premier League — verified against production, 2026-08-05

Everything below is a live response, not a design intention.

```jsonc
// GET /cronogol/teams?league=premier-league — 20 clubs. One entry:
{
  "slug": "arsenal",
  "name": "Arsenal",
  "shortName": "ARS",
  "country": null,             // ⚠ null on 9 of 20 — see caveat above
  "logoUrl": "https://altagamafc.crono-gol.com/.../crests/f06144....png",
  "logoUrls": { "20": "…", "25": "…", "50": "…", "70": "…", "100": "…", "svg": "…" },
  "colorPrimary": null,        // ⚠ the PL source publishes no club colours — null for all 20
  "colorSecondary": null,
  "venue": { "name": "Emirates Stadium", "city": "London", "capacity": 60704,
             "latitude": null, "longitude": null, "imageUrl": null, "imageUrls": null },
  "tracked": true,
}

// GET /cronogol/jornada/premier-league/2026 — the matchweek index (trimmed):
{
  "league": { "slug": "premier-league", "name": "Premier League" },
  "season": 2026,
  "expectedCount": 10,
  "totalMatchweeks": 38,
  "matchweeks": [
    { "matchweek": 1, "count": 10, "complete": true, "kickoffsConfirmed": true,
      "firstKickoffUtc": "2026-08-21T19:00:00+00:00",   // 20:00 London — real time
      "lastKickoffUtc": "2026-08-24T19:00:00+00:00" },
    { "matchweek": 12, "count": 10, "complete": true, "kickoffsConfirmed": false,
      "firstKickoffUtc": "2026-11-28T00:00:00+00:00",   // midnight placeholder — DATE only
      "lastKickoffUtc": "2026-11-28T00:00:00+00:00" },
  ],
}
// As of 2026-08-05, matchweeks 1–4 are kickoffsConfirmed and 5–38 are not.
// That ratio is the selection window working — it moves through the season.

// GET /cronogol/teams/arsenal/fixtures — one CONFIRMED and one TBD row (logos trimmed):
{
  "homeAway": "H", "opponent": "Coventry City",
  "competition": "league", "competitionName": "Premier League",
  "round": null,                              // ⚠ ALWAYS null for PL — derive "Matchweek N" yourself
  "kickoffUtc": "2026-08-21T19:00:00+00:00",  // 20:00 BST, converted — render in user's zone
  "kickoffTbd": false,
  "venue": "Emirates Stadium", "venueCity": "London",
  "status": "scheduled", "goalsFor": null, "goalsAgainst": null,
}
{
  "homeAway": "A", "opponent": "Brighton and Hove Albion",
  "competition": "league", "competitionName": "Premier League",
  "round": null,
  "kickoffUtc": "2026-09-19T00:00:00+00:00",  // ⚠ midnight = date-only placeholder
  "kickoffTbd": true,                         //   render all-day, exactly like LaLiga TBD
  "venue": "American Express Stadium", "venueCity": "Falmer",
  "status": "scheduled", "goalsFor": null, "goalsAgainst": null,
}

// And a played preseason friendly — the fixture class LaLiga never had:
{
  "homeAway": "A", "opponent": "Girona",
  "competition": "friendly", "competitionName": "Friendly",
  "kickoffUtc": "2026-08-01T18:00:00+00:00",
  "status": "finished", "goalsFor": 4, "goalsAgainst": 1,
}
```

`GET /cronogol/feed/jornada/premier-league/2026/1.ics` serves
`X-WR-CALNAME:Premier League · Matchweek 1`; club feeds carry ~40+ events each (league + cups +
friendlies), TBD fixtures as all-day `VALUE=DATE` entries.

### ✅ Bundesliga — verified against production, 2026-08-07

Everything below is a live response, not a design intention. Read the Bundesliga caveats section
above first — this block shows what those caveats look like in the payload.

```jsonc
// GET /cronogol/teams?league=bundesliga — 18 clubs. One entry:
{
  "slug": "fc-bayern-muenchen",     // ⚠ German transliteration, not "bayern-munich"
  "name": "FC Bayern München",      // provider-verbatim, diacritics intact
  "shortName": "FCB",               // the three-letter code, not a shortened name
  "country": null,                  // ⚠ null on ALL 18
  "logoUrl": "https://altagamafc.crono-gol.com/.../crests/fe1e0599….svg",
  "logoUrls": { "svg": "…" },       // ⚠ ONE key. No size variants for any German club.
  "colorPrimary": "#DC052D",
  "colorSecondary": "#DC052D",      // ⚠ identical to primary on ALL 18 — a gradient renders flat
  "venue": null,                    // ⚠ null on ALL 18 — the DFL publishes no stadium anywhere
  "tracked": true,
}

// GET /cronogol/jornada/bundesliga/2026 — the matchday index (trimmed):
{
  "league": { "slug": "bundesliga", "name": "Bundesliga" },
  "season": 2026,
  "expectedCount": 9,               // ⚠ NINE, not ten — 18 clubs
  "totalMatchweeks": 34,            // ⚠ 34, not 38
  "matchweeks": [
    { "matchweek": 1, "count": 9, "complete": true, "kickoffsConfirmed": true,
      "firstKickoffUtc": "2026-08-28T18:30:00+00:00",   // 20:30 Berlin — real time
      "lastKickoffUtc":  "2026-08-30T15:30:00+00:00" },
    { "matchweek": 12, "count": 9, "complete": true, "kickoffsConfirmed": false,
      "firstKickoffUtc": "2026-11-28T00:00:00+00:00",   // midnight placeholder — DATE only
      "lastKickoffUtc":  "2026-11-28T00:00:00+00:00" },
  ],
}
// As of 2026-08-07, matchdays 1–4 and 34 are kickoffsConfirmed; the other 29 are not.
// 306 fixtures indexed in total, of which 261 are kickoffTbd — the ~85% the caveats describe.
// ⚠ Matchday 34 being confirmed is not an anomaly: the final day kicks off simultaneously
//   and the league fixes it a season ahead. Do not treat confirmation as monotonic in n.

// GET /cronogol/teams/fc-bayern-muenchen/fixtures — 34 fixtures, ALL competitionName "Bundesliga".
// ⚠⚠ SUPERSEDED 2026-09-10 — Bayern now returns 42: the 34 below PLUS 8 Champions League ties.
//    The rows below are still accurate for the league half; the counts and the "ALL" are not.
//    See the amended coverage caveat above.
// One CONFIRMED and one TBD row:
{
  "homeAway": "H", "opponent": "VfB Stuttgart",
  "competition": "league", "competitionName": "Bundesliga",
  "round": null,                              // ⚠ always null
  "matchweek": null,                          // ⚠⚠ ALSO always null — the number is only on the index
  "kickoffUtc": "2026-08-28T18:30:00+00:00",
  "kickoffTbd": false,                        // source-stated, so this genuinely is a real time
  "venue": null, "venueCity": null,           // ⚠ null on every German fixture
  "status": "scheduled", "goalsFor": null, "goalsAgainst": null,
}
{
  "homeAway": "A", "opponent": "FC Augsburg",
  "competition": "league", "competitionName": "Bundesliga",
  "round": null, "matchweek": null,
  "kickoffUtc": "2026-10-10T00:00:00+00:00",  // ⚠ midnight = date-only placeholder
  "kickoffTbd": true,                         //   render all-day, never "00:00"
  "venue": null, "venueCity": null,
  "status": "scheduled", "goalsFor": null, "goalsAgainst": null,
}
```

`GET /cronogol/feed/jornada/bundesliga/2026/1.ics` serves `X-WR-CALNAME:Bundesliga · Matchday 1` and
downloads as `bundesliga-2026-matchday-1.ics`.

⚠⚠ **The two paragraphs that stood here are SUPERSEDED as of 2026-09-10.** They said club feeds carry
"exactly **34 events** each — league only, no cups and no friendlies" and that "**All 18 clubs return
34 league fixtures and nothing else** — every `competitionName` is `Bundesliga`". Both were true when
written (2026-08-07) and are now wrong for the four Champions League entrants:

| Club | League | + Champions League | Feed events |
| --- | --- | --- | --- |
| `fc-bayern-muenchen`, `borussia-dortmund`, `rb-leipzig`, `vfb-stuttgart` | 34 | 8 | **42** |
| the other 14 | 34 | — | 34 |

⚠ **So the "read `competitionName` rather than assuming" advice is no longer a habit — it is
load-bearing.** A German club feed can now contain two competition names, and code that assumed
`Bundesliga` for every German row will mislabel eight matches a season for four of the biggest clubs.
There is still no second-division contamination.

⚠ **Per-club German news is empty.** `GET /cronogol/teams/fc-bayern-muenchen/news` returned 0
articles; `GET /cronogol/news?league=bundesliga` does return coverage. League news works, club news
does not — the inverse of the Premier League's situation.

### ✅ Serie A — verified against production, 2026-08-08

Everything below is a live response, not a design intention. Read the Serie A caveats first — this
block is what they look like in the payload.

```jsonc
// GET /cronogol/teams?league=serie-a — 20 clubs. One entry, in full:
{
  "slug": "inter",                  // ⚠ the short familiar form…
  "name": "Internazionale",         // …and the registered name. They disagree on purpose.
  "shortName": "INT",
  "country": null,                  // ⚠ 10 of 20 — do not build on it in any league
  "logoUrl": "https://altagamafc.crono-gol.com/.../crests/6686a0a8….webp",
  "logoUrls": {                     // ⚠⚠ THEME keys, not sizes — the only league like this
    "teamLogo":      "https://…/6686a0a8….webp",
    "teamLogoLight": "https://…/6686a0a8….webp"   // ⚠ same URL — identical on 17 of 20
  },
  "colorPrimary": null,             // ⚠ null on all 20, like the Premier League
  "colorSecondary": null,
  "venue": {
    "name": "Giuseppe Meazza",
    "city": "Milano",               // ⭐ non-null on 20/20 — Serie A ONLY
    "capacity": 80018,              // ⭐ non-null on 17/20 — Serie A ONLY
    "latitude": null, "longitude": null,   // ⛔ null everywhere. Do not build a map.
    "imageUrl": "https://…/stadiums/….webp"
  },
  "tracked": true,
}

// GET /cronogol/jornada/serie-a/2026 — the giornata index (trimmed):
{
  "league": {
    "slug": "serie-a",
    "name": "Serie A",
    "logoUrl":  "https://…/leagues/4c459d82….svg",   // ⚠ new 2026-08-08 — see League logos
    "logoUrls": { "primary": "https://…/4c459d82….svg" }
  },
  "season": 2026,
  "expectedCount": 10,
  "totalMatchweeks": 38,
  // 380 fixtures indexed, of which 660/760 club-side rows are kickoffTbd (= 330/380).
}

// GET /cronogol/teams/inter/fixtures — 38 fixtures, ALL competitionName "Serie A".
// The exact key set, which is the thing most worth copying:
{
  "id": "…", "homeAway": "H", "opponent": "Monza",
  "competition": "league", "competitionName": "Serie A",
  "round": "Campionato",                      // ⚠ the STAGE, constant on all 380. Not a giornata.
  // ⚠⚠ there is NO `matchweek` key here, in any league. See the caveats.
  "kickoffUtc": "2026-08-22T16:30:00+00:00",
  "kickoffTbd": false,
  "venue": "Giuseppe Meazza", "venueCity": "Milano",   // ⭐ populated on 760/760
  "status": "scheduled", "goalsFor": null, "goalsAgainst": null,
  "opponentLogoUrl": "…", "opponentLogoUrls": { "teamLogo": "…", "teamLogoLight": "…" },
}
```

`GET /cronogol/feed/jornada/serie-a/2026/1.ics` serves `X-WR-CALNAME:Serie A · Giornata 1` and
downloads as `serie-a-2026-giornata-1.ics`. Club feeds carry exactly **38 events** — league only, the
same coverage posture as the Bundesliga.

⚠ **All 20 clubs return 38 league fixtures and nothing else** — checked club-for-club, 760 club-side
rows, every `competitionName` `Serie A`. No second-division contamination and no cups.

⚠ **Per-club Italian news is empty**, like the Bundesliga's: `GET /cronogol/news?league=serie-a`
returns coverage, `GET /cronogol/teams/{slug}/news` does not.

### ✅ `GET /cronogol/leagues` now exists

*Added 2026-08-08 with the fixture window.* It returns every competition we hold fixtures for, with
its name, logo set and accent colour. **Do not hardcode the four slugs** — this list has grown three
times in four days (Premier League 08-05, Bundesliga 08-07, Serie A 08-08) and Ligue 1 is next.

⚠ Hardcode only what genuinely cannot come from the API: a league's *route shape* and its *round
vocabulary* are product decisions, not data (`/giornata/serie-a/{n}` and "Giornata" are ours to
choose, and no payload states them).

### A feed is per club. There is no combined "everything followed" feed

`feed_selections` is keyed to exactly one club, structurally. A user following five clubs gets **five**
`.ics` URLs, not one. An export scope offering "everything followed" cannot be satisfied today.

The jornada feed is not a substitute: it is one matchweek of one league, not a user's own set.

### ✅ Followed clubs ARE stored now, for signed-in users

*Added 2026-09-01 (decision 0041).* This section used to say *"There is no follow endpoint and no
followed-clubs list. Following is client state."* That is no longer true for a signed-in user:
`GET`/`PUT /cronogol/me/follows` hold the account's follows and roam them across devices. See
**Account follows** in the Accounts chapter for the shape and the merge rules.

Two halves of the old text still stand, and both matter:

- **Anonymous devices are still client state.** No account, no sync. A device that has never signed
  in keeps its own list and nothing reconciles it.
- **Follows are still NOT feeds.** `feed_selections` and `account_follows` are separate, and neither
  affects the other — following a club creates no `.ics` feed, and unfollowing one revokes no
  calendar somebody has already subscribed to. The section above ("A feed is per club") is unchanged.

⚠ **Follows are not the push fan-out either.** Push still goes to whatever each device registered in
`PUT /cronogol/push/device`; account follows are the roaming *source* a client reconciles from and
then re-registers. A follow added on one device reaches another device's notifications only after
that other device syncs and re-registers.

⚠ **The web app has not adopted these endpoints yet.** Its "followed" is still derived from claimed
feeds, so the web and the native app currently hold two different truths. Adopting them here is its
own scoped work, not a side effect of this change.

### There are no reminder offsets

Nothing emits a calendar `VALARM`. A "remind me 1h before" control has no backend behind it.

⚠ And it would be **wrong for most of the season if built naively**: an hour before an all-day event
fires at 23:00 the night before, and most fixtures are all-day until their times are confirmed. Google
also ignores `VALARM` in subscribed calendars. The reliable place for this is the user's own
per-calendar alert setting.

### ⚠ A timezone selector cannot change a subscription

The `.ics` deliberately carries **no timezone at all**. One feed URL serves every subscriber
identically and the calendar client converts to the viewer's own zone.

So a timezone control can only change **what your page displays**. Putting one beside a feed URL
implies it changes the subscription, which it cannot.

### The `.ics` filename is server-set

`real-madrid.ics`, `laliga-2026-jornada-4.ics`. It is built from database values, never from the
request — a filename taken from a URL parameter can break out of the quoted `Content-Disposition`
header. Do not promise a different name in the copy.

### There is no live-score PUSH — but there is now a live route (2026-08-27)

⭐ **`GET /cronogol/live` exists.** It carries `status`, `score` and a **`minute`** for matches in
progress, refreshed every ~30 seconds while a match is being played, and every entry carries
`fixtureId` and both team slugs so you can attach it to a fixture already on screen. Poll it; its
cache is 10 seconds.

⚠ **Still no push of any kind** — no websocket, no SSE, no webhook. And **LaLiga only** today: a match
in another league returns nothing from this route, so keep the existing rendering as the fallback
rather than replacing it.

⚠ ~~`polling: false` with a non-empty `matches` array means matches are live but nothing is refreshing
them — the one failure this feature has.~~ **NO LONGER REACHABLE, 2026-08-29.** The route now drops any
match nothing has refreshed in the last ten minutes, so a stalled or dropped session empties the array
instead of freezing it. `polling: false` with an empty array means nothing is being played — which is
now the only shape it takes.

⚠ **Why this mattered more than it looked.** Nothing wrote a terminal state to the live table when a
match left its window, and the row was not deleted for three days — so a match the session lost track
of (extra time, penalties, a dropped lease, a deploy at the wrong moment) could be served here as in
progress for **days**, not minutes. If you built a defence against `polling: false` with matches
listed, you can keep it as a belt-and-braces check, but it should now never fire.

⚠ **`lastSeenAt` is still the freshness signal to render**, and it is now enforced server-side rather
than left to you: nothing older than ten minutes reaches you at all. A card saying "as of HH:MM" is
still the honest presentation.

### The scoreboard is not real-time

`GET /cronogol/scores` is refreshed by a job that runs **every four hours**, from a third-party source.
There is no websocket, no SSE, no webhook, and polling it faster than its 60-second cache buys nothing.
A `status: "live"` row is a snapshot from the last sweep — build a scoreboard, not a match centre. See
*Live scores* for the other four consequences (null scores before kick-off, the `unknown` status,
hot-linked crests, and the fact that the whole feature is provisional and can be switched off).

### The scoreboard does not join to clubs, fixtures or jornadas

Scoreboard events carry the source's own club names and Opta ids. There is **no** slug, no `TeamView`
id, and no crosswalk to `GET /cronogol/teams` — the two come from different providers and describe
different sets of matches. `?team=` on `/cronogol/scores/recent` is fuzzy free text, not an identifier.
If you need a specific tracked club's schedule or results, `GET /cronogol/teams/{slug}/fixtures` is the
route with our own licensed data behind it.

### The standings table has no zones, no home/away split, and does not update live

*Added 2026-08-14 with `GET /cronogol/standings`. Form guide and matchday selector added 2026-08-15.*
The table is served — rank, club, crest, MP/W/D/L/GF/GA/GD/Pts, and a last-five `form` guide. Four
things a standings mock usually implies are **not** in it:

- **No qualification or relegation zones.** There is no `zone` field and no colour banding. Which
  ranks mean Champions League, Europa, Conference or relegation is not derivable from a table — it
  varies by season and by federation decision, and a league can be reallocated a slot mid-year. **The
  front end owns that banding**, which is a deliberate split, not a gap to file.
- **No home/away splits.** `laliga.com` offers Total / Home / Away tabs; this serves the combined
  table only. ⚠ Unlike the zones above this is a **real gap, not a split** — the backend already knows
  which side each club played, so it is buildable — but it reshapes every row rather than adding one
  field. Ask before designing a tab strip against it.
- **The table does not move during a match.** Only `finished` fixtures are counted, on purpose: no
  federation publishes a table that shifts mid-match, and the route is cached for 300s anyway. A live
  score belongs to `GET /cronogol/scores`, which is a different feature with a different source.
- **No per-club detail behind a row.** There is no standings-scoped endpoint for one club's results.
  `GET /cronogol/teams/{slug}/fixtures` is the route for that.

#### ⚠ A finished match takes up to ~3 hours to reach the table — EXCEPT in LaLiga

*Added 2026-08-15. Amended 2026-08-29.* This is the caveat most likely to be mistaken for a bug,
because the symptom is a club sitting on **0 played with a result that is already public everywhere
else** — including on this same API's `GET /cronogol/scores`, which will show the final score first.

⭐ **LaLiga no longer waits.** The table counts fixtures with `status = "finished"`, and a LaLiga
fixture reaches that state within ~30 seconds of the whistle, so a LaLiga table moves at full time.
⚠ **Everything below still describes the Premier League, Serie A, Bundesliga and segunda**, where the
3-hourly sweep is still the only writer and the wait is unchanged.

⭐ **AMENDED 2026-09-14 — NARROWED for every league.** A three-minute tick now force-refreshes any
league match still unsettled two hours after kickoff, at most once per hour per league, and then
re-scrapes the published tables (Puerto Rico, Honduras). **Expect the table to move typically
within 10–40 minutes of full time in every league**, not three hours. The paragraph below is now
the worst case (a provider cache, a match that ran long, a refresh that landed inside the hourly
cap), not the normal one. LaLiga and the Premier League still move at the whistle.

The table counts `finished` fixtures, and fixtures are refreshed by a sweep that runs **every three
hours** (00:00, 03:00 … 21:00 UTC). A match ending at 19:20 UTC is counted by the 21:00 sweep. Until
then the row is honestly reporting what the fixture store says, which is that the match has not been
played.

⚠ **It was up to ~24 hours until 2026-08-15**, when the sweep ran once daily — so a Saturday evening
result appeared on Sunday morning. If you built anything that works around that delay, it can go.

What follows for the front end:

- **Do not treat `matchesPlayed: 0` on a matchday as an error state.** Early in a season it is also
  simply true. There is no "table is updating" signal to render, and inventing one from a clock would
  be guessing.
- **`lastMatchUtc` is the honest freshness signal** — it is the kickoff of the newest match actually
  counted, so comparing it to now tells you how settled the table is. It is `null` before a league's
  first match.
- **Do not reconcile it against `GET /cronogol/scores`.** The two run on different schedules from
  different sources and are *expected* to disagree for a few hours after full time. The scoreboard is
  the fast, provisional surface; the table is the settled one. Showing both on one screen is fine —
  deriving one from the other is not.

⚠ **No position-movement arrows** either ("up two since last matchday"). That is a diff of two tables
and you can now fetch both, but nothing computes it here — and `laliga.com` does not render one.

#### ⚠ Two entries here were reversed on 2026-08-15

Both were written into this file as *not served*, so they are corrected rather than quietly deleted:

- **The form guide IS served now**, on `rows[].form`. The old advice to derive it per club is
  withdrawn — see the endpoint section, which also explains why deriving it from
  `GET /cronogol/fixtures` produces chips that **disagree with the points column beside them**.
- **`?matchweek=` IS served now** — but read the next paragraph before assuming it is the caption you
  wanted, because it is a different feature that happens to share the word.

#### ⚠ "After matchday 24 of 38" is still NOT on this response

`?matchweek=` is an **input** that changes which matches are counted, not a number this route reports.
There is no field that tells you which matchday the live table is at, and **you cannot divide your way
to one**: `matchesPlayed / (clubs / 2)` equals the matchday only while nobody holds a game in hand,
which is untrue for most of a real season — a postponement makes it read a matchday behind for weeks.

That header still comes from `GET /cronogol/jornada/{league}/{season}`: `totalMatchweeks` is the 38,
and the highest `matchweeks[]` entry with `complete: true` is the 24. One extra request per league.

⚠ **The "38" is per league and must never be hardcoded.** It is `2 * (clubs - 1)`: 38 in LaLiga, the
Premier League and Serie A, **34 in the Bundesliga** (18 clubs), **42 in segunda** (22).

⚠ **And the one caveat worth designing around:** `clubs` on each table can be lower than the league's
real size. The table is derived from fixtures the backend tracks, and a match between two untracked
clubs is fetched by nobody — both those clubs then show one fewer played match, with nothing in the
payload looking wrong. Show the table, but do not build UI that asserts "20 of 20 played" from it.

### Crests: use `logoUrl`, do not hot-link the provider

We mirror every crest to our own storage and serve it from `logoUrl` / `logoUrls`. Hot-linking
`assets.laliga.com` works, but re-introduces the dependency the mirror exists to remove and swaps a
year-long cache for their one hour.

⚠ **`logoUrls` can be `null` while `logoUrl` is set.** True for the 20 Serie A and 18 Bundesliga clubs
since 2026-09-18 (their crest is a single operator-sourced 1500×1500 PNG, CRONOGOL.md §136) and for any
club backfilled through `backfill-crest`. Always resolve `logoUrls` → `logoUrl`, never `logoUrls` alone.

---

### ⭐ Puerto Rico (LPR) — ⚠⚠ NOT SERVED YET, and it will be missing things every other league has

Added 2026-09-02. **No route returns Puerto Rican data today** — the clubs are not registered yet — so
nothing below is buildable now. It is here so that the day it appears, none of it is a surprise, and
because two of the gaps are permanent rather than "not yet".

**Why it exists at all:** api-football does not cover Puerto Rico *at all* — zero countries matching
`PR`, zero leagues matching `Puerto`, checked against the production key. It is scraped from the
federation's own Genius Sports pages, which is why its shape differs from the other five.

**Two league slugs, not one:** `lpr-pro-apertura` and `lpr-pro-clausura`. They are separate
championships with separate tables that both run inside one calendar year — treat them as two leagues,
exactly like `laliga` and `segunda`.

| Capability | Puerto Rico | Every other league |
| --- | --- | --- |
| Fixtures, kickoff, venue | ✅ | ✅ |
| Club crests | ✅ | ✅ |
| Standings table | ✅ (and see below) | ✅ |
| Squads, portraits, DOB, nationality | ✅ | ✅ |
| `matchweek` / the jornada route | ❌ **never** | ✅ |
| Live scores, goal push, Live Activities | ❌ **never** | LaLiga only |
| Player statistics | ❌ **never** | ❌ (everywhere) |
| Preseason friendlies | ❌ | partial |

⚠⚠ **`matchweek` is `null` on every Puerto Rican fixture, so `GET /cronogol/jornada/…` does not work
for these two leagues.** This is not a backlog item. The federation's "rounds" are the two *halves* of
a double round-robin (55 matches each), not jornadas — there is no weekly grouping in the data to read,
and deriving one from kickoff dates would be inventing a number. **A jornada control must be hidden for
these leagues, or fall back to a date-grouped view.**

⚠⚠ **There are no live scores and none are coming.** `GET /cronogol/live` will never return a Puerto
Rican match. There is no live state in the source at all — the string that looks like an in-play
indicator is static template markup present in *every* match block, including matches months away. The
real API that carries live data is behind a commercial agreement the federation has and we do not.

⚠⚠ **No player statistics, and unlike the other leagues these cannot be bought.** Everywhere else "no
stats" is a price problem. Here the federation's operator enters lineups and team scores but **no
player events at all** — every goals/cards/minutes figure is empty league-wide, while the standings
credit one club with 85 goals. Squads themselves are good: person id, date of birth, nationality,
position, shirt number and a real portrait for essentially every player.

⚠ **One club will legitimately return an empty squad.** Guaynabo Masculino has no players entered by
the federation despite sitting mid-table with twenty matches played. Expect **`200` with
`players: []`** — not a 404, not an error. Do not render it as a loading state.

⚠ **No preseason friendlies.** The source publishes only its own competitions, so a quiet July is real
data rather than a sync failure.

#### ⭐ Two things that are BETTER here

- **`form` is populated.** Puerto Rico's table is read from the federation's *published* standings
  rather than derived from fixtures, and it carries the last five results. This is why `form` is
  **optional rather than nullable** on `StandingsRowView` — for the derived leagues it is simply
  absent, and that has not changed.
- **`rank` reflects the federation's own order.** For derived leagues, clubs level on every official
  criterion are separated by an arbitrary (but stable) slug sort — `rank` documents that. For Puerto
  Rico the published position breaks that tie instead, so `rank` is the league's own answer.

⚠ **`?matchweek=` returns an empty table for these leagues, deliberately.** A published table states
only *today*; answering "what did the table look like after matchday 12" with a current snapshot would
be confidently wrong and would look right. Historical tables need per-matchweek fixture results, which
this source does not publish.

### ⭐ Honduras (Liga Nacional / "Liga Hondubet") — ⚠⚠ NOT SERVED YET, and its gaps differ from Puerto Rico's

Added 2026-09-12. **No route returns Honduran data today** — the clubs are not registered and the
migration is not applied — so nothing below is buildable now. It is here so that the day it appears,
none of it is a surprise.

**Why it exists:** scraped from the league's own WordPress site (`lnphn.com`), the same way Puerto
Rico is scraped from the federation's pages. Read the Puerto Rico block above first: Honduras is the
same *kind* of source, and the differences below are the interesting part.

**One league slug in v1:** `liga-nacional-apertura`. Honduras plays an Apertura and a Clausura inside
one season year, so a second slug (`liga-nacional-clausura`) is modelled and **not yet served** —
treat them as two leagues when it arrives, exactly like `lpr-pro-apertura` / `lpr-pro-clausura`.

| Capability | Honduras | Puerto Rico | Every other league |
| --- | --- | --- | --- |
| Fixtures, kickoff | ✅ | ✅ | ✅ |
| Venue | ⚠ ~6% of fixtures | ✅ | ✅ |
| Club crests | ✅ | ✅ | ✅ |
| Standings table | ✅ | ✅ | ✅ |
| **`matchweek` / the jornada route** | ⭐ **✅ yes** | ❌ never | ✅ |
| Squads (shirt, position, DOB, height) | ✅ | ✅ | ✅ |
| Player nationality | ❌ **never** | ✅ | ✅ |
| Player portraits | ❌ **never** | ✅ | ✅ |
| Live scores, goal push, Live Activities | ❌ | ❌ never | LaLiga + PL |
| Player statistics | ❌ | ❌ never | ❌ (everywhere) |
| Preseason friendlies | ❌ | ❌ | partial |

#### ⭐ The jornada routes WORK here — the opposite of Puerto Rico

`matchweek` is populated on every Honduran fixture, as a clean integer 1–16, so
`GET /cronogol/jornada/liga-nacional-apertura/{season}` and
`GET /cronogol/jornada/liga-nacional-apertura/{season}/{n}` both work, and so does the jornada `.ics`
feed. **This is the first scraped league where they do.** If you built a date-grouped fallback for
Puerto Rico, Honduras does not need it.

⭐ **`rank` reflects the federation's own order**, for the same reason it does in Puerto Rico: the
table is read from the league's published standings rather than derived, so the published position
settles ties we would otherwise be guessing at.

#### ⚠ Four things to get right

⚠ **`form` is DERIVED here, not published** — the opposite of Puerto Rico. The Honduran table carries
no form column, so the five-result guide you see is computed from fixtures. It is still populated and
still correct; it just is not the federation's own statement, and it can disagree with a table that
was published mid-round.

⚠ **`venue` is `null` on roughly 94% of fixtures.** The source populates a stadium on about one
fixture in sixteen. This is the source, not a gap we are filling later — **do not render an empty
venue as a loading state**, and do not build a layout that assumes one.

⚠⚠ **A far-future kickoff time is provisional, and nothing in the payload says so.** Jornadas whose
times are not yet set are published at a placeholder `19:00`, and `kickoffTbd` is `false` on them
because a placeholder row is shaped exactly like a real one. Near-term fixtures are reliable; a
November kickoff in September is a guess. Consider showing a date without a time beyond the current
jornada.

⚠ **Some players never appear in a squad response.** The source leaves `Posición` blank for a large
minority — 62 of 359 league-wide when measured — and a player with no position is dropped. A Honduran
squad will therefore be smaller than the club's real roster. Not a bug you can work around from the
front end.

⚠ **No live scores.** `GET /cronogol/live` will never return a Honduran match. Unlike Puerto Rico this
is not because the data does not exist — it does, and in detail — but because it sits behind a
licensed feed we have no agreement for. Treat it as permanent for planning purposes.


## CORS

Add the **front end's** origin to `CRONOGOL_ALLOWED_ORIGINS` (Render dashboard, comma-separated, no
spaces).

**Allowed in production right now** — verified 2026-07-28:

```
https://altagamafc.com          ← the front end
https://cronogoal.netlify.app   ← the old deployment, until it is retired
```

⚠ `crono-gol.com` is this API's own host, **not** a front-end origin, so it is deliberately not on the
list.

⚠ **`https://www.altagamafc.com` is NOT allowed, and that is correct.** It 301s to the apex, so no page
is ever served from that origin. A browser does treat them as different origins — the rule is to list
each one you _actually serve_, not each one that resolves. Same for `http://`, which also redirects.

- **Server Components / route handlers / server actions** send no `Origin` — CORS never applies. These
  work regardless of the allowlist.
- **Client components** calling `fetch` do need the allowlist.

> The failure mode is confusing: **server-rendered pages work, client-side fetches fail.** If you see
> that, the origin is missing from the allowlist — it is not a broken deploy.

`localhost` and `127.0.0.1` are _different origins_ to a browser. Cookies/credentials are not
supported (`Access-Control-Allow-Credentials` is deliberately never sent) — authentication is a
**bearer token**, see [Accounts](#accounts).

**Allowed request headers:** `content-type`, `authorization`, `x-feed-edit-secret`.
**Allowed methods:** `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`.

⚠ **Since 2026-09-14 every `GET`/`HEAD` answers `Access-Control-Allow-Origin: *`, whatever the
`Origin`** — including none. The allowlist above still governs every write and every preflight
(those still echo the exact origin, or nothing). Why: the public reads are now cached at the edge
(Cloudflare, see `cf-cache-status` on the response) and Cloudflare ignores `Vary: Origin`, so an
origin-dependent header would have been served from cache to the wrong origin. `*` is safe here
because credentials are never allowed (see above) and a bearer token in `Authorization` works with
`*`. Nothing to change on the client; a client-side `fetch` from an allowlisted origin behaves
exactly as before.

**Caching, since 2026-09-14.** Every read's `Cache-Control` is unchanged (`public, max-age=10` on
`/live`, `60` on the fixture, jornada, scores and news reads, `300` on tables, `900` on `.ics`) and is
now honoured at the edge as well as in the browser, and by a small in-process cache with the same
TTL. Two consequences: a fresh write can take up to one `max-age` to show, exactly as the header
always promised; and **do not add cache-busting query strings** — validation rejects undeclared
params with a 400 on the DTO'd routes anyway, and on the others they only fragment the cache.


**`stale-if-error`, since 2026-09-14 — a `200` no longer means "fresh".** Every public read now also
carries `stale-if-error` (RFC 5861), so when the origin answers **5xx** an intermediary holding an
expired copy may serve that copy instead of the error:

| Routes | Header |
| --- | --- |
| `/cronogol/live` | `public, max-age=10, stale-if-error=300` |
| fixtures, scores, events, jornadas, news, team fixtures, UCL match reads | `public, max-age=60, stale-if-error=86400` |
| leagues, standings, squads, stats, news leagues, UCL standings | `public, max-age=300, stale-if-error=86400` |
| `.ics` feeds | `public, max-age=900, stale-if-error=86400` |
| `crest.png` | `public, max-age=86400, stale-if-error=86400` |

**What this changes for a client.** During a backend outage the reads keep answering `200` with the
last good body for up to a day, rather than failing — which is the point. The cost is that a
successful response is no longer proof of freshness, and **a client that shows a timestamp, a live
minute or a "live" badge has to decide what to do about that.** The practical signal is the `Age`
response header on an edge hit; ⚠ this has not yet been observed during a real outage, so treat the
exact `cf-cache-status` value as unconfirmed and key off `Age` rather than a Cloudflare-specific
string.

⚠ **`/cronogol/live` is deliberately the exception, at five minutes rather than a day.** A day-old
fixture list is merely old; a day-old in-play payload renders a match minute that is simply wrong.
Past five minutes that route is allowed to fail, so a client can show an error state instead of a
confident stale score.

**What does not change:** the `max-age` values, the status codes, the bodies, and the 4xx behaviour.
`stale-if-error` is triggered by origin **5xx only** — a 404 for an unknown slug is still a 404.

⚠ **Next.js `fetch` note.** The App Router's own data cache keys off `revalidate`, not off
`stale-if-error`; this header is honoured by the CDN in front of the route, not by `fetch()`'s
in-process cache. A server component that already has a `revalidate` bucket keeps exactly the
behaviour it has today.

> ⚠ Sending any other custom header fails the **preflight**, which the browser reports as a generic CORS
> error rather than as the 400/401 you would expect. If a signed-in fetch fails but the same request
> works from `curl`, check the header name before anything else.

---

## Endpoints

All read endpoints are **public — no auth header**.

### `GET /cronogol/teams`

| Query              | Type                | Notes                                                                  |
| ------------------ | ------------------- | ---------------------------------------------------------------------- |
| `league`           | `string`            | A league **slug** — `laliga`, `premier-league`, `bundesliga` or `serie-a`. Unknown league → `[]`, not 404. ⚠ Changed 2026-08-05: this used to match a hyphenated display name (`la-liga`); it now takes the same slugs the jornada routes do, and `la-liga` no longer matches anything |
| `includeUntracked` | `'true' \| 'false'` | Default `false`. `true` also returns opponent-only clubs               |

```jsonc
// 200 — array, sorted by name
[
  {
    "slug": "alaves",
    "name": "Deportivo Alavés",
    "shortName": "ALA",
    "country": null,
    "logoUrl": "https://altagamafc.crono-gol.com/storage/v1/object/public/team-assets/crests/<sha>.png",
    "logoUrls": {
      "xsmall": "https://altagamafc.crono-gol.com/.../crests/<sha>.png", // 150px — same as logoUrl
      "small": "https://altagamafc.crono-gol.com/.../crests/<sha>.png", // 310px
      "medium": "https://altagamafc.crono-gol.com/.../crests/<sha>.png", // 420px
      "large": "https://assets.laliga.com/assets/.../large/...png", // 740px — still hot-linked
      "xlarge": "https://assets.laliga.com/assets/.../xlarge/...png", // 900px — still hot-linked
    },
    "colorPrimary": "#0f39b8",
    "colorSecondary": "#ffffff",
    "venue": {
      "name": "Bernabéu",
      "imageUrl": "https://altagamafc.crono-gol.com/.../crests/<sha>.png",
      "imageUrls": { "xsmall": "…", "small": "…", "medium": "…" },
      // ⚠ null on every club today — see the note under Rendering
      "city": null,
      "capacity": null,
      "latitude": null,
      "longitude": null,
    },
    "tracked": true,
    "lastSyncedAt": "2026-07-28T06:16:10.636+00:00",
  },
]
```

Returns all **83** tracked clubs by default — 25 LaLiga-side, 20 Premier League, 18 Bundesliga,
20 Serie A (measured 2026-08-08). Pass `?league=` for one league's roster. `Cache-Control: public, max-age=60`.

> ### ⚠ Changed 2026-07-29 — names, crests and new fields
>
> This section previously said _"names and logos are still the ones the previous data source
> supplied"_. That is no longer true. Clubs are now described by whichever source is authoritative for
> them, and every crest the UI renders is served from **our** Supabase Storage bucket.
>
> **`slug` did not change and never will** — it is your URL and it is baked into every subscriber's
> `webcal://` link. Nothing you have linked to breaks.
>
> - **`name` is now the display name**, not the legal one: `Deportivo Alavés` rather than `Alaves`,
>   `Levante UD` rather than `Levante Unión Deportiva SAD`. Accents are now correct. If you cached or
>   hard-coded club names, refresh them.
> - **`shortName` is now the 3-letter code** — `RMA`, `ALA`, `MLL`. It was `null` on every club before,
>   so anything deriving a monogram from `name` can now read this instead.
> - **`logoUrls`, `colorPrimary`, `colorSecondary`, `venue` are new.** All nullable; all additive.
> - **`opponentLogoUrls`** joins `opponentLogoUrl` on every fixture.

#### Crest hosting — and what it does _not_ change

Crests for the sizes a UI actually uses (`xsmall`, `small`, `medium`) are now copied into **our own**
Supabase Storage bucket rather than hot-linked from a provider CDN. Objects are content-addressed and
immutable, served with `cache-control: max-age=31536000`, so a URL that works never stops working and
you can cache it as hard as you like.

> ⚠ **Re-hosting is not licensing.** This changes _where_ a crest is served from, nothing about the
> right to display it. Club badges are trademarks; if a design deliberately avoids them in favour of
> lettered monograms, that decision is untouched by any of this — and `shortName` now gives you a real
> club code to build those monograms from.

**Only if you render crests with `next/image`**, its host allowlist and any CSP `img-src` need the
storage host. Plain `<img>` needs neither.

```ts
// next.config.ts
images: {
  remotePatterns: [
    // ⚠ BOTH storage hosts, deliberately — see "The storage host is changing".
    {
      protocol: "https",
      hostname: "wtxuryktmryzhepxafqd.supabase.co",
      pathname: "/storage/v1/object/public/team-assets/**",
    },
    {
      protocol: "https",
      hostname: "altagamafc.crono-gol.com",
      pathname: "/storage/v1/object/public/team-assets/**",
    },
    // Only needed if you use logoUrls.large / .xlarge, which stay hot-linked.
    { protocol: "https", hostname: "assets.laliga.com" },
  ],
}
```

`media.api-sports.io` can be dropped once a sync has run for every club. **Keep a fallback for a failed
image load** regardless: `logoUrl` is still nullable, and a club whose crest has not been mirrored yet
serves its provider URL in the meantime.

#### The storage host moved to `altagamafc.crono-gol.com` — ✅ complete 2026-08-01

The Supabase project gained a custom domain, and every stored crest and venue image was re-mirrored
onto it the same day. **Verified after the backfill:** 0 of 20 tracked clubs, 0 of 218 total clubs and
0 venues still reference the old host.

The old `wtxuryktmryzhepxafqd.supabase.co` host **keeps working indefinitely** — Supabase never retires
it, and the identical object answers 200 on both — so any URL already cached, bookmarked or sitting in
a CDN stays valid forever.

> **Never hardcode, parse, or string-match the storage host.** Render whatever `logoUrl` /
> `logoUrls` / `opponentLogoUrl` give you. Anything checking `url.includes("supabase.co")` — a CSP
> rule, an image-proxy allowlist, a test fixture — is now wrong for every club, and would have been
> wrong for *some* of them mid-migration.

⚠ **Keep BOTH hosts in `remotePatterns` and any CSP `img-src` anyway.** It costs nothing, and it
covers a rolled-back deploy, a warm CDN, and a club whose crest is re-mirrored in future. The two are
interchangeable, not sequential.

### `GET /cronogol/teams/{slug}/fixtures`

| Query         | Type                                                      | Notes                            |
| ------------- | --------------------------------------------------------- | -------------------------------- |
| `from`        | ISO 8601                                                  | Inclusive lower bound on kickoff |
| `to`          | ISO 8601                                                  | Inclusive upper bound            |
| `status`      | `scheduled \| live \| finished \| postponed \| cancelled` |                                  |
| `competition` | `league \| cup \| friendly \| other`                      |                                  |
| `season`      | `number`                                                  | Starting year (`2025` = 2025/26). Since 2026-09-22 (§144). |
| `limit`       | `number` 1–500                                            | Default `200`                    |

⚠ **Default window (2026-09-22, §144).** With none of `from`, `to`, `season` given, the list is the
club's **current season** — not everything stored. The list is ascending with a 200-row cap and the
backend now holds three seasons for LaLiga and the Premier League, so an unbounded read would return
2024/25 first and lose this season past the cap. Pass `season` for one past year, or `from`/`to` for
a date range (either disables the default). `?season=abc` is a 400.

```jsonc
// 200
{
  "team": {
    "slug": "real-madrid",
    "name": "Real Madrid",
    "shortName": "RMA",
    "country": null,
    "logoUrl": "https://altagamafc.crono-gol.com/.../crests/<sha>.png",
    "logoUrls": {
      "xsmall": "…",
      "small": "…",
      "medium": "…",
      "large": "…",
      "xlarge": "…",
    },
    "colorPrimary": "#0f39b8",
    "colorSecondary": "#ffffff",
    "venue": {
      "name": "Bernabéu",
      "imageUrl": "…",
      "imageUrls": { "small": "…" },
      "city": null,
      "capacity": null, // ⚠ null today
      "latitude": null,
      "longitude": null,
    },
    "lastSyncedAt": "2026-07-28T06:18:11.114+00:00",
    "tracked": true,
  },
  "count": 1, // fixtures returned, AFTER limit
  "fixtures": [
    {
      "id": "5355ba8f-6092-411b-a1fd-0bf7e0a7e1da",
      "homeAway": "A",
      "opponent": "RCD Espanyol",
      "opponentLogoUrl": "https://altagamafc.crono-gol.com/.../crests/<sha>.png",
      "opponentLogoUrls": { "xsmall": "…", "small": "…" },
      "competition": "league",
      "competitionName": "LALIGA EA SPORTS",
      "round": "Jornada 2",
      "kickoffUtc": "2026-08-22T19:30:00+00:00",
      "kickoffTbd": false,
      "venue": "RCDE Stadium",
      "venueCity": "Cornellà de Llobregat",
      "status": "scheduled",
      "goalsFor": null, // not played yet — NOT a 0-0
      "goalsAgainst": null,
    },
  ],
}
```

Always sorted by `kickoffUtc` ascending. `Cache-Control: public, max-age=60`.

**`404` for an unknown slug** — deliberate, unlike some other endpoints on this host.

### `GET /cronogol/teams/{slug}/squad`

One club's registered squad. `Cache-Control: public, max-age=300`. **404** for an unknown slug;
**200 with `players: []`** for a tracked club we hold no squad for.

⚠ **Served to the shape asked for in the app repo's `docs/features/club-players-tab.md`**, including
the two things that brief argued belong in the backend: `position` is mapped here to the four-value
union so no two clients can disagree about it, and every player carries a stable `id`.

⚠⚠ **THIS ROUTE STILL CARRIES NO STATISTICS, AND MOST OF THEM STILL DO NOT EXIST.** Split
2026-09-09:

- ✅ **Goals, assists, penalty goals, cards, braces, hat-tricks, goal timing and scoring streaks**
  are served, per season — but on `GET /cronogol/players/{slug}/stats`, never here. Use
  `player.slug` from this route as the link target.
- ⛔ **Shots, xG, possession, passes, saves and duels do not exist**, not for any club, not for any
  season, not behind a query parameter. They are not at LaLiga, api-football or the Premier League at
  any price point this backend holds; getting them is a new paid provider, not a new field.
- ✅ **Appearances, minutes played and per-90 rates are served since 2026-09-21** — on
  `GET /cronogol/players/{slug}/stats` (CRONOGOL.md §143), never here. Derived from the stored
  teamsheets (`GET /cronogol/fixtures/{id}/lineups`, §142); LaLiga, Segunda and the Premier League
  only, since Serie A and the Bundesliga have no player rows.

```jsonc
// 200 — GET /cronogol/teams/real-madrid/squad
{
  "team": {
    "slug": "real-madrid",
    "name": "Real Madrid",
    "shortName": "RMA",
    "crestUrl": "https://altagamafc.crono-gol.com/storage/v1/object/public/team-assets/crests/….png"
  },
  "season": 2026,
  "lastSyncedAt": "2026-08-18T13:11:56.458+00:00",
  "players": [
    {
      "id": "15165",
      "shirt": 5,
      "name": "Jude Bellingham",
      "shortName": "Bellingham",
      "position": "MID",
      "nationality": { "code": "ENG", "name": "England" },
      "age": 23,
      "heightCm": 186,
      "foot": null,
      "weightKg": 75,
      "dateOfBirth": "2003-06-29",
      "placeOfBirth": "Stourbridge",
      "photoUrl": "https://altagamafc.crono-gol.com/storage/v1/object/public/team-assets/players/04dfe0….png",
      "international": false,
      "optaId": "p244855",
      "loan": false,
      "loanedOut": false
    },
    {
      "id": "560",
      "shirt": 1,
      "name": "Thibaut Courtois",
      "shortName": "Courtois",
      "position": "GK",
      "nationality": { "code": "BEL", "name": "Belgium" },
      "age": 34,
      "heightCm": 200,
      "foot": null,
      "weightKg": 96,
      "dateOfBirth": "1992-05-11",
      "placeOfBirth": "Bree",
      "photoUrl": "https://altagamafc.crono-gol.com/storage/v1/object/public/team-assets/players/0c3c9f….png",
      "international": true,
      "optaId": "p60772",
      "loan": false,
      "loanedOut": false
    }
  ]
}
```

Real Madrid's 25 band as `GK 2 · DEF 10 · MID 7 · FWD 6`.

#### ⚠ Three answers to things the brief asked for

**⭐ `foot` IS REAL AS OF 2026-08-20 — this section used to say it never would be.** The type is now
`"left" | "right" | "both" | null`. The Premier League serves it for ~88% of its players; **LaLiga
still publishes none, so every Spanish player is `null` permanently.** The column was cut on the old
advice — **bring it back for English clubs**, rendering an empty cell as normal.

⚠ **`"both"` is a real value, not a placeholder for unknown** — 23 of the Premier League's 960
players. `SquadPlayerView["foot"]` is no longer typed `null`, so rendering a value now compiles.

**`photoUrl` exists, and the brief predates it.** The feature doc says *"No headshots, and the photo
circle is not a slot waiting on a URL… If real ones ever arrive, the 36px row height is the thing to
revisit first."* Real ones have arrived: **396 of 500** LaLiga players carry a mirrored 256×278
portrait. ⚠ **The miss rate is far higher for the Premier League — closer to one in two** — because
its CDN has no photograph of most academy players, and ⚠ **its portraits are 110×140, not 256×278.**
Size the element; do not assume the intrinsic size.
⚠ The other **~1 in 5 are null**, concentrated on recent signings, because LaLiga serves a grey
silhouette that the backend detects and drops rather than storing a fake. Build the fallback first.

⚠ **A non-null `photoUrl` is no longer always the league's own portrait** (backend §86, 2026-08-22).
An operator can upload a stopgap portrait through the ops console for exactly the players above —
the recent signings the leagues leave blank — and the weekly sweep replaces it with the official one
the week the league finally publishes. Two consequences for a client: the DTO deliberately does
**not** say which kind it is serving (no provenance field is exposed, and none is planned), and an
uploaded portrait has **no guaranteed dimensions** — one more reason to size the element rather than
trusting the intrinsic 256×278 / 110×140.

**`id` is the stable per-player id the brief asked for.** It is the *person* id — stable across
seasons **and** clubs, so it survives a transfer. (The registration id is season-scoped and would
have broken every August.) Rows can stop keying on position-plus-index.

#### ⚠ Four things that will cost you a bug

**1. `nationality.code` is alpha-3 — but the home nations are FIFA codes, not ISO.** `ENG`, `SCO`,
`WAL`, `NIR`. ISO 3166-1 has no alpha-3 for them at all, and both providers return `GB-ENG`. A
consumer validating this field against an ISO alpha-3 list rejects exactly the players an English
club's squad is full of. Two of Real Madrid's 25 are `ENG`; **384 of the Premier League's 960 are**,
so on an English club page this is most of the list rather than an edge case.

**2. `season` can be null**, where the brief's type has it non-null. Null is the honest answer for a
tracked club with no stored squad — the same case the brief asks to be a 200 rather than a 404.
`lastSyncedAt` is null alongside it.

**3. `lastSyncedAt` is FRESHNESS, NOT TRANSFER NEWS.** It advances on every weekly sweep whether or
not anything changed.

**4. ⚠⚠ This is the LEAGUE'S REGISTRATION LIST, not the club's squad page, and they legitimately
differ.** Verified 2026-08-19 against realmadrid.com's official 2026/27 numbering: **25 of 25 stored
players matched on name and number, zero disagreed** — and the club additionally listed one player
(#27) not yet registered with the league. A tab promising "the full squad" on announcement day will
be missing a new signing for a few days. Say "registered squad", or accept the lag.

**5. ⚠⚠ A PREMIER LEAGUE CLUB RETURNS 31–64 PLAYERS, NOT ~25 — plan the layout for it.** LaLiga
registers a first team. The Premier League registers **the academy too**, in the same list, and
**nothing in that source separates them**: no flag, no type filter (the obvious `type=first-team` is
silently ignored upstream), and a shirt-number cut is measurably wrong — capping at 25 would drop
Declan Rice (41), Zubimendi (36) and Calafiori (33) while Arsenal's academy starts at 48. Measured
2026-08-20: Tottenham 64, Chelsea 58, Arsenal 48 … Everton 34, Fulham 31.

⚠ Consequences for the squad list, none of which are bugs:
- **Long lists.** Roughly double a Spanish squad — `SquadList` should expect to scroll.
- **Sparse rows near the bottom.** Academy players usually have no portrait, often no `foot`, and
  sometimes no `shirt` — the below-900 fold already handles nullable cells, but they are the common
  case here rather than the exception.
- **Teenagers by name.** Arsenal's youngest two are 16.
- **Two players can share a shirt number** (Arsenal has two #39s). Key rows on `id`, never on
  `shirt` — which is what `id` was added for.
- **Two rows are literally named `Trialist`.** They are what the league registered and are served
  deliberately rather than filtered.

#### Freshness and coverage

- Refreshed by a **weekly** job (Tuesdays), so `max-age=300` reflects reality; polling harder buys
  nothing. `REVALIDATE.catalogue` on the client side is well matched.
- **LaLiga Primera and the PREMIER LEAGUE** — 20 tracked clubs each. ⚠ **The Premier League was
  added 2026-08-20; this line used to read "LaLiga Primera only".** Flip `League.squads` for
  `premier-league` in `lib/cronogol/leagues.ts` to switch the tab on.
- ⚠ **What a Premier League player does NOT carry**, because the source does not publish it:
  `placeOfBirth` (it serves a country, not a town), `optaId`, and `international`. `heightCm` and
  `weightKg` are present for roughly three quarters; `age` and `dateOfBirth` for all.
- *(superseded)* Segunda, Serie A, the
  Bundesliga and Ligue 1 have no stored squad, so they return **200 with `players: []`** if the club
  is known to us, and **404** if the slug is not.
- A player the most recent sweep did not return is omitted automatically (a departure or
  de-registration). Nothing is deleted server-side.
- ⚠ A player whose provider position cannot be mapped to the four bands is **dropped and logged as an
  error**, never defaulted into `MID`. If a squad looks short, that is the first thing to check.

#### ⚠ This response contains personal data

⚠⚠ **This got substantially wider on 2026-08-20.** The Premier League's list is the league's
registration record and **includes academy squads**, so roughly **three under-18s per club — about 60
across the league** — now have an exact date of birth on this endpoint, where LaLiga contributed a
handful. **If a Premier League squad is rendered, `age` rather than `dateOfBirth` is the right
default and the argument for it is now much stronger.**

Exact `dateOfBirth` and `placeOfBirth` of named living people, and **squads register 16- and
17-year-olds** — so this endpoint serves minors' birth dates over an unauthenticated, cacheable
route. `age` is provided precisely so a UI need not touch `dateOfBirth`; **prefer `age`**, and think
before putting an exact date or a home town on a public page.

### `GET /cronogol/leagues`

Every competition we hold fixtures for. Four today.

```json
[
  { "slug": "bundesliga", "name": "Bundesliga",
    "logoUrl": "https://altagamafc.crono-gol.com/…/f18a072d….png",
    "logoUrls": { "primary": "https://altagamafc.crono-gol.com/…/f18a072d….png" },
    "accentColor": "#f5c451" },
  { "slug": "laliga", "name": "LALIGA EA SPORTS",
    "logoUrl": "https://altagamafc.crono-gol.com/…/08826931….png",
    "logoUrls": { "primary": "…/08826931….png", "icon": "…/08826931….png",
                  "wordmark": "…/77f0497b….png" },
    "accentColor": "#ff563c" },
  { "slug": "premier-league", "name": "Premier League",
    "logoUrl": "https://altagamafc.crono-gol.com/…/26526aea….png",
    "logoUrls": { "primary": "…/26526aea….png", "onDark": "…/26526aea….png",
                  "onLight": "…/9808213c….png" },
    "accentColor": "#7db6ff" },
  { "slug": "serie-a", "name": "Serie A",
    "logoUrl": "https://altagamafc.crono-gol.com/…/4c459d82….svg",
    "logoUrls": { "primary": "…/4c459d82….svg" },
    "accentColor": null }
]
```

`Cache-Control: public, max-age=300` — longer than its neighbours, because this set changes when an
operator registers a competition, not on a sweep.

⚠ **`name` is the provider's own display copy**, not a label to key on. LaLiga's is `LALIGA EA SPORTS`.
Key on `slug`, always — it is operator-assigned, provider-independent and permanent.

⚠ **`accentColor` can be null, and is.** Serie A has no tint as of 2026-08-08. Fall back to a neutral.

### `GET /cronogol/crests` — every club crest in a competition

*New 2026-09-17 (CRONOGOL.md §135).* One call for a crest grid, a league picker's badges, or a
"clubs in this league" strip. Ask by league **or** by club.

| Param | Notes |
| --- | --- |
| `league` | a slug from `GET /cronogol/leagues`, **or `champions-league`** |
| `club` | a club slug — answers **that club's domestic league** |
| `season` | `champions-league` only; starting year (`2026` = 2026/27). Defaults to the current season |

Exactly one of `league` / `club`. `Cache-Control: public, max-age=300, stale-if-error=86400`.

```
GET /cronogol/crests?club=real-betis
```

```json
{
  "league": {
    "slug": "laliga",
    "name": "LALIGA EA SPORTS",
    "logoUrl": "https://altagamafc.crono-gol.com/storage/v1/object/public/team-assets/leagues/08826931….png",
    "logoUrls": {
      "icon": "https://altagamafc.crono-gol.com/…/leagues/08826931….png",
      "primary": "https://altagamafc.crono-gol.com/…/leagues/08826931….png",
      "wordmark": "https://altagamafc.crono-gol.com/…/leagues/77f0497b….png"
    }
  },
  "season": null,
  "club": "real-betis",
  "count": 20,
  "crests": [
    {
      "slug": "athletic-club",
      "name": "Athletic Club",
      "shortName": "ATH",
      "logoUrl": "https://altagamafc.crono-gol.com/storage/v1/object/public/team-assets/crests/7095530d….png",
      "logoUrls": {
        "xsmall": "https://altagamafc.crono-gol.com/…/crests/7095530d….png",
        "small": "https://altagamafc.crono-gol.com/…/crests/677d7944….png",
        "medium": "https://altagamafc.crono-gol.com/…/crests/ab6e8bef….png",
        "large": "https://altagamafc.crono-gol.com/…/crests/c84b90a1….png",
        "xlarge": "https://altagamafc.crono-gol.com/…/crests/53517022….png"
      },
      "format": "png"
    }
  ]
}
```

The Champions League, where formats are mixed (sampled from the real 2026 roster):

```
GET /cronogol/crests?league=champions-league
```

```json
{
  "league": { "slug": "champions-league", "name": "UEFA Champions League", "logoUrl": null, "logoUrls": null },
  "season": 2026,
  "club": null,
  "count": 36,
  "crests": [
    { "slug": "borussia-dortmund", "name": "Borussia Dortmund", "shortName": "BVB",
      "logoUrl": "https://altagamafc.crono-gol.com/…/crests/29a0b1c5….svg",
      "logoUrls": { "svg": "https://altagamafc.crono-gol.com/…/crests/29a0b1c5….svg" },
      "format": "svg" },
    { "slug": "como", "name": "Como", "shortName": "COM",
      "logoUrl": "https://altagamafc.crono-gol.com/…/crests/2c5c5dc4….webp",
      "logoUrls": { "teamLogo": "…/2c5c5dc4….webp", "teamLogoLight": "…/2c5c5dc4….webp" },
      "format": "webp" }
  ]
}
```

| Status | When |
| --- | --- |
| 200 | a set, possibly `crests: []` — **a Champions League season before its roster syncs is empty, not missing** |
| 400 | neither or both of `league`/`club`; `season` without `league=champions-league`; a malformed slug; any undeclared param |
| 404 | unknown league; unknown club; a club with no published domestic league |

⚠ **Unlike `GET /cronogol/teams?league=`, an unknown league is a 404 here**, not `[]`. `/teams` filters
a collection; this names one.

⚠ **Since 2026-09-18 the 20 Serie A and 18 Bundesliga crests are PNG** (CRONOGOL.md §136 — re-sourced
from a crest library and mirrored to our bucket), so `format` reads `png` across both sets and across
35 of the 36 Champions League clubs; the one `jpg` (`sabah-sabah`) stays. ⚠ **For those 38 clubs
`logoUrls` is `null`** — there is one file, in `logoUrl`, and no size map. `crestSrc(logoUrls, logoUrl, size)`
already falls back to `logoUrl`, so nothing in a client changes, but a component that reads
`logoUrls.svg` or `logoUrls.teamLogo` directly now gets `undefined`. The sample below predates this
and shows the old formats on purpose.

⚠ **`format` is still normal to be `webp`, `svg` or `jpg` elsewhere.** Before 2026-09-18 Serie A crests
were WebP (all 20), Bundesliga SVG (all 18), and the Champions League mixed png/svg/webp/jpg. An `<img>` and `expo-image` draw all four. **Satori
(the `/og/*.png` routes) cannot draw WebP** — check `format` and fall back to the monogram tile there.
`null` means no crest; draw the tile.

⚠ **`logoUrls` keys are the provider's own**, exactly as on `TeamView` — sizes for LaLiga/PL, `svg`
for Bundesliga, `teamLogo`/`teamLogoLight` for Serie A. Pick through `crestSrc(logoUrls, logoUrl, want)`
as everywhere else; never read a key directly.

⚠ **`crests` is sorted by `name`**, which is the provider's display copy (Spanish collation). Key on
`slug`.

**What this route does not do:**

- **No image bytes, and no format conversion.** It returns the same storage URLs `TeamView` carries.
  A PNG for every WebP/SVG crest is backend gap D12, still open.
- **`?club=` never answers the Champions League**, even for a club in it. It resolves to the club's
  domestic league. For a UCL grid ask `league=champions-league`.
- **Untracked clubs are excluded from domestic sets** (the `/teams` default). The Champions League set
  is the full roster, tracked or not.
- No `accentColor`, club colours or venue — use `/cronogol/leagues` and `/cronogol/teams`.
- There is no `league` block logo for the Champions League (`logoUrl: null`). Render the name.

### `GET /cronogol/brands` — kit-maker logos from our storage

*New 2026-09-19 (backend `CRONOGOL.md` §141).* Every kit-maker logo we hold, served from our own
bucket, so a page never hard-codes a URL.

```
GET /cronogol/brands              every brand, sorted by name
GET /cronogol/brands?slug=adidas  one brand, as an object (not an array)
```

`Cache-Control: public, max-age=300, stale-if-error=86400` (the `table` bucket). An unknown `slug` is
`404`; a malformed one (upper case, punctuation) or any other query param is `400`.

```jsonc
// 200 — GET /cronogol/brands  (22 brands; two shown)
[
  {
    "slug": "adidas",
    "name": "adidas",
    "logoUrl": "https://altagamafc.crono-gol.com/storage/v1/object/public/team-assets/brands/a8b40534….png",
    "logoUrls": {
      "primary": "https://…/brands/a8b40534….png",   // Badge of Sport + wordmark
      "mark":    "https://…/brands/d1b7ee07….png",   // the three bars alone
      "trefoil": "https://…/brands/956eebb6….png"    // Originals
    }
  },
  {
    "slug": "nike",
    "name": "Nike",
    "logoUrl": "https://…/brands/aedbac7c….png",
    "logoUrls": { "primary": "https://…/brands/aedbac7c….png" }
  }
]
```

The slugs today: `adidas atomik castore charly coach errea fiume givova hummel joma kappa kelme
kyrios le-coq-sportif macron new-balance nike peak puma reebok umbro under-armour`. ⚠ Read them
from the route, never from this list.

- ⚠ **`logoUrls` keys are SEMANTIC, not sizes**, the same convention as a league's `logoUrls`. Every
  brand has `primary`, and `logoUrls.primary === logoUrl` always, so a client that ignores the map
  is correct. Only two brands have more: **adidas** (`mark`, `trefoil`) and **hummel** (`classic`,
  the old chevron; `primary` is the current bee).
- ⚠⚠ **Most marks are BLACK on transparent, and there is no light variant.** On a dark surface they
  disappear. Put them on a light tile, or treat the image as a mask and tint it yourself.
- **Every file is a PNG**, trimmed to its visible edges (no transparent margin) and immutable: a
  changed logo is a new URL, so caching one forever is safe.
- ⚠ **Brands are not linked to anything.** No club, kit or fixture carries a brand slug, and kit
  manufacturer data is sparse and free text. This route is a catalogue, not "who makes this club's
  shirt".
- **`coach` is Coach Argentina** (sportswear), not the fashion house.

### `GET /cronogol/fixtures` — every league, one date window

What a "next 7 days" band reads. One request, all four leagues, in kickoff order.

| Param | Default | Notes |
| --- | --- | --- |
| `from` | current **UTC** midnight | ISO 8601 instant, inclusive |
| `to` | `from` + 7 days | ISO 8601 instant, **EXCLUSIVE** |
| `league` | all | a slug; unknown → 200 empty, not 404 |
| `limit` | 200 | 1–500 |

```json
{
  "from": "2026-08-09T00:00:00.000Z",
  "to": "2026-08-16T00:00:00.000Z",
  "count": 2,
  "truncated": false,
  "nextKickoffUtc": null,
  "leagues": [ /* LeagueRef, exactly as GET /cronogol/leagues */ ],
  "fixtures": [
    {
      "id": "c56084e3-df56-420d-9a05-714b3eadaaa5",
      "homeTeam": { "slug": "alaves", "name": "Deportivo Alavés", "shortName": "ALA",
                    "logoUrl": "https://altagamafc.crono-gol.com/…/5b2dae24….png",
                    "logoUrls": { "xsmall": "…", "small": "…", "medium": "…" } },
      "awayTeam": { "slug": "getafe", "name": "Getafe CF", "shortName": "GET",
                    "logoUrl": "https://altagamafc.crono-gol.com/…/f83b1f13….png",
                    "logoUrls": { "xsmall": "…", "small": "…", "medium": "…" } },
      "competition": "league",
      "competitionName": "LALIGA EA SPORTS",
      "round": "Jornada 1",
      "kickoffUtc": "2026-08-15T17:30:00+00:00",
      "kickoffTbd": false,
      "venue": "Mendizorroza",
      "venueCity": "Vitoria-Gasteiz",
      "status": "scheduled",
      "goalsHome": null,
      "goalsAway": null,
      "leagueSlug": "laliga",
      "season": 2026,
      "matchweek": 1
    }
  ]
}
```

A mid-season week looks very different. `?from=2026-10-09T00:00:00Z&to=2026-10-16T00:00:00Z` returns
**39 fixtures across all four leagues, every one of them `kickoffTbd: true`**:

```json
{
  "kickoffUtc": "2026-10-10T00:00:00+00:00",
  "kickoffTbd": true,
  "round": null, "venue": null, "venueCity": null,
  "status": "scheduled",
  "leagueSlug": "bundesliga", "season": 2026, "matchweek": 5
}
```

#### ⚠ Send your own `from` and `to`

The default `from` is **UTC** midnight. A reader in Auckland gets a window starting about twelve hours
in their past, and one in Los Angeles a window that ends mid-afternoon on day seven. Compute your
reader's local midnight and send both bounds. The server picks no timezone and never will — that is
why this parameter exists rather than a `date` + `days` pair.

#### ⚠ `to` is EXCLUSIVE — `[from, to)`

Unlike `to` on `GET /cronogol/teams/{slug}/fixtures`, which is inclusive. The two differ on purpose.

A TBD fixture is stored at `00:00:00Z` of its day, so an inclusive bound on a seven-day request drags
in every provisional match dated day 8 and your grid grows an eighth column of nothing but `--:--`.

#### ⚠ This route 400s an unknown query param

It is the first CronoGol read with a query schema, so `forbidNonWhitelisted` bites here where it does
not on the jornada or feed routes. **No cache-busters, no `utm_*`, no `?v=2`.** A typo'd `form=` is a
400 rather than a silently ignored parameter — which is the trade being made deliberately.

Also 400: a malformed or impossible date (`from=2026-02-31T00:00:00Z`), `limit` outside 1–500, an
upper-case `league`, `to` at or before `from`, and a span over **31 days**. The span is a 400 rather
than a silent clamp, because the response echoes `to` and a narrowed echo you did not re-read would
caption a UI with a range it does not hold.

#### `nextKickoffUtc` — what to say when there is nothing to show

⚠ **Populated only when `count` is 0.** It is the first kickoff at or after `to`, so an empty band can
read "Season starts Sat 15 Aug" instead of rendering blank.

Null therefore means *either* "the window is not empty, so this was not looked up" *or* "nothing is
ahead at all". It is meaningful **only** when `count === 0`; never read it as "no more fixtures exist".

This is not a hypothetical: on 2026-08-08 the default window held **two** fixtures, both on its last
day. The four seasons start 15, 21, 22 and 28 August. Design the empty state first.

#### The rest of the contract

- **`leagues` is what the window was SCOPED to, not what has matches in it.** A league between
  matchweeks still appears. It is the legend, and a legend that flickers as a week empties is worse
  than one that does not.
- **`truncated: true` means the LAST DAY IS PARTIAL.** Narrow the range or drop that column; do not
  render it as a quiet day.
- **`season` is per fixture, never per response.** A window is a date range and a date range can
  straddle a season change. There is deliberately no `season` on the envelope.
- **`matchweek`** deep-links to `/cronogol/jornada/{leagueSlug}/{season}/{matchweek}`. Populated on
  every league fixture today; typed nullable because a cup has no round. ⚠ It is a *label*, not a
  position — matchweek order is not chronological.
- **`leagueSlug`** keys into `leagues`. The league object is not repeated per fixture; at ~40 fixtures
  it would be most of the payload.
- **`shortName`** is the club's own 3-letter code (`ALA`, `GET`, `BVB`). ⚠ Nullable — fall back to
  `name`. ⚠ And **not unique** (Valencia and Valladolid have collided), so never key on it.
- `Cache-Control: public, max-age=60`. Anonymous — see the `followed` note below.

### `GET /cronogol/fixtures/{id}/events` — one match's timeline

⚠ **Champions League ties involving a tracked club have a timeline HERE too — verified
2026-09-08/09.** They are written by the live session's full-time hand-off, not by the finished-match
sweep (which is league-only): Real Madrid 2-1 Inter, `0d457708…`, 16 events written 21:03Z, served
by this route and, identically, by `GET /cronogol/ucl/fixtures/{id}/events`. Such a fixture arrives
with `competition: "cup"`, `competitionName: "UEFA Champions League"` and a **null `leagueSlug`** —
so a client gating timelines on `competition === "league"` hides these; key on the name. The
foreign side's events carry the opponent row's slug in `teamSlug` (`inter-inter`) and a null
`player.slug` with the name present. Other cups are NOT verified. *(Added 2026-09-09.)*

*Added 2026-08-26. Goal scorers, assists, cards and substitutions for a finished
fixture, in all five published leagues.*

`{id}` is our own `FixtureView.id`.

```
GET /cronogol/fixtures/4b1e0f2a-…/events
```

```json
{
  "fixtureId": "4b1e0f2a-9c3d-4e51-8a77-2f6b0d1c5e93",
  "count": 4,
  "events": [
    {
      "id": "0a7c1d55-3e92-4c18-b6a1-77d0e2f4b8c3",
      "type": "goal",
      "subtype": "normal",
      "minute": 39,
      "minuteExtra": null,
      "period": "FirstHalf",
      "teamSlug": "real-madrid",
      "player":  { "name": "Mbappé",   "slug": "mbappe" },
      "related": { "name": "Valverde", "slug": "valverde" }
    },
    {
      "id": "1b8d2e66-4fa3-4d29-c7b2-88e1f3a5c9d4",
      "type": "goal",
      "subtype": "penalty",
      "minute": 43,
      "minuteExtra": null,
      "period": "FirstHalf",
      "teamSlug": "real-sociedad",
      "player":  { "name": "Sucic", "slug": "sucic" },
      "related": null
    },
    {
      "id": "2c9e3f77-50b4-4e3a-d8c3-99f2a4b6dae5",
      "type": "card",
      "subtype": "yellow",
      "minute": 46,
      "minuteExtra": null,
      "period": "SecondHalf",
      "teamSlug": "real-sociedad",
      "player":  { "name": "Aramburu", "slug": "jon-aramburu" },
      "related": null
    },
    {
      "id": "3daf4088-61c5-4f4b-e9d4-aa03b5c7ebf6",
      "type": "substitution",
      "subtype": "tactical",
      "minute": 77,
      "minuteExtra": null,
      "period": "SecondHalf",
      "teamSlug": "real-madrid",
      "player":  { "name": "Camavinga",  "slug": "camavinga" },
      "related": { "name": "Bellingham", "slug": "bellingham" }
    }
  ]
}
```

#### ⚠ Read this before you build the timeline

**1. An empty `events` array does NOT mean a goalless match.** It means we have
no events for that fixture *yet*. The sweep runs every three hours and only for
finished fixtures, so a match that ended twenty minutes ago will legitimately
return `count: 0`. **Never render "no goals" from an empty array** — render
nothing, or a "not available yet" state. A 0-0 and an un-swept 4-1 are the same
response from here, and the API cannot distinguish them for you.

**2. `player.slug` is `null` for every Serie A and Bundesliga person, always.**
Squads are stored for LaLiga and the Premier League only, so a name in the other
three competitions has nothing to link to. This is the design, not a gap
(`GET /cronogol/teams/{slug}/squad` has the same boundary). A UI that links a
scorer to a player page **must** fall back to plain text rather than hiding the
event.

**3. `related` is the assister on a goal and the player going OFF on a
substitution.** One field, two meanings, disambiguated by `type`. It is `null`
on cards and VAR decisions — and on an **unassisted goal**, which is normal:
about a third of goals have no assister recorded (67% do).

**4. Order comes from the server. Do not re-sort on `minute`.** Events share a
minute often — a substitution pair, a goal and the booking that followed — and
the array order encodes each source's own chronology. Sorting client-side on
`minute` alone will flip pairs between renders.

**5. `minuteExtra` is populated by Serie A only.** LaLiga and the Premier League
fold stoppage time into `minute`, so a 90+4 goal arrives from them as
`minute: 94, minuteExtra: null` and from Serie A as `minute: 90, minuteExtra: 4`.
You cannot infer a competition's convention from one match. Render
`minuteExtra ? \`${minute}+${minuteExtra}\` : minute`.

**6. `type` can be `"unknown"`, and you must render it.** It means the source
described something we do not have a name for yet — which will happen, because
the underlying vocabulary is long-tailed. Show it as a neutral timeline entry
with the player and minute; do not drop the row and do not treat it as an error.

**7. `subtype` is an open string, not a union.** Switch on `type`; treat
`subtype` as a label. Observed values: `normal` · `penalty` · `own` · `yellow` ·
`second-yellow` · `red` · `tactical` · `injury`, plus slugged free text for VAR
decisions (`goal-awarded`, `penalty-not-awarded`, …). It is `null` on Premier
League substitutions, which do not distinguish tactical from injury.

**8. `teamSlug` can be null** — on a VAR decision belonging to neither side, and
where a club has no crosswalk row for the event's provider.

**9. Minutes are the DISPLAY minute, and stoppage time is separate.** `minute`
is what a broadcast says — `40'`, not the floored 39 the upstream stores
internally. A stoppage-time event carries `minute: 45, minuteExtra: 2`, i.e.
**45+2**, never a flat 47. Verified against ESPN's clock on every goal of three
matches.

**Status codes.** `404` for a fixture id that does not exist. `200` with
`events: []` for a real fixture with nothing stored — see point 1. `Cache-Control:
public, max-age=60`.

### `GET /cronogol/fixtures/{id}/lineups` — one match's teamsheets

*Added 2026-09-21 (CRONOGOL.md §142, decision 0077). The starting eleven, the bench, the formation,
the manager and the substitution minutes for a fixture in all five published leagues — LaLiga,
Segunda, Premier League, Serie A, Bundesliga.*

`{id}` is our own `FixtureView.id`, exactly as on `/events`.

```
GET /cronogol/fixtures/85dcbb54-…/lineups
```

```jsonc
// 200 — Valencia 2-3 Real Sociedad, 2026-09-20, after full time
{
  "fixtureId": "85dcbb54-8eb5-4b08-be25-4144afed27b1",
  "coverage": { "teamsheet": true, "minutes": true, "settled": true },
  "home": {
    "teamSlug": "valencia",
    "formation": null,                       // ⚠ null on every LaLiga/Segunda/Bundesliga sheet — see 2
    "manager": { "name": "Oscar Sanchez" },
    "starters": [
      { "player": { "name": "Dimitrievski", "slug": "dimitrievski" }, "shirtNumber": 1,  "position": "GK", "formationPlace": 1,  "captain": false, "minuteOn": null, "minuteOnExtra": null, "minuteOff": null, "minuteOffExtra": null },
      { "player": { "name": "Gayà",         "slug": "gaya" },         "shirtNumber": 14, "position": null, "formationPlace": 2,  "captain": true,  "minuteOn": null, "minuteOnExtra": null, "minuteOff": 82,   "minuteOffExtra": null },
      // … nine more, in formation order
      { "player": { "name": "Javi Guerra",  "slug": "javi-guerra" },  "shirtNumber": 8,  "position": null, "formationPlace": 11, "captain": false, "minuteOn": null, "minuteOnExtra": null, "minuteOff": null, "minuteOffExtra": null }
    ],
    "bench": [
      { "player": { "name": "Otorbi",       "slug": "otorbi" },       "shirtNumber": 19, "position": null, "formationPlace": null, "captain": false, "minuteOn": 46,   "minuteOnExtra": null, "minuteOff": null, "minuteOffExtra": null },
      { "player": { "name": "L. Rioja",     "slug": "luis-rioja" },   "shirtNumber": 17, "position": null, "formationPlace": null, "captain": false, "minuteOn": 88,   "minuteOnExtra": null, "minuteOff": null, "minuteOffExtra": null },
      // … the rest of the bench, minuteOn null on those who never came on
    ]
  },
  "away": { "teamSlug": "real-sociedad", "formation": null, "manager": { "name": "Matarazzo" }, "starters": [ /* 11 */ ], "bench": [ /* 12 */ ] }
}
```

#### ⚠ Read this before you build the lineup

**1. `coverage` says what is present. Read it before the arrays.**

| `coverage`             | Meaning                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| `teamsheet: false`     | Nothing stored: `home` and `away` are **null**. The ordinary state until about an hour before kickoff.       |
| `settled: false`       | A **provisional** sheet, written from the pre-kickoff publication. Replaced at full time; render it as such. |
| `minutes: false`       | No substitution minutes: every `minuteOn`/`minuteOff` is null. True before full time, and always on the Bundesliga. |

A known fixture with nothing stored answers `200` with `home: null, away: null` — that is not a
missing match, it is a sheet not published yet.

**2. `formation` is `null` on every LaLiga, Segunda and Bundesliga sheet.** That source states per-row
slots, not a formation string, and the backend does not invent one. The Premier League and Serie A
carry `"4-2-3-1"`-style strings. A layout that needs a formation must degrade to a plain list.

**3. `position` is null far more often than not.** Only the keeper is derivable on LaLiga, Segunda
and the Bundesliga; the Premier League and Serie A state a role for everyone. `formationPlace` (1–11,
keeper first) is the Opta slot where the source states one and null on Serie A. Never infer a
position from a slot.

**4. `player.slug` is null for every Serie A and Bundesliga person, and for a Segunda player without
a squad row.** Same boundary as `/events`. Fall back to plain text; never hide the row.

**5. The eleven are exactly eleven, once `coverage.teamsheet` is true.** A sheet is never stored short;
the backend refuses anything else. The bench length follows competition rules (9 in the Premier
League, up to 12 in Spain). Order is the source's own — formation order where it states one.

**6. Minutes are football notation.** `minuteOn: 45, minuteOnExtra: 2` is 45+2, never 47. A bench
player with `minuteOn: null` never came on; a starter with `minuteOff: null` finished the match. ⚠ On
the Bundesliga every minute is null (`coverage.minutes: false`) — a bench player who came on is
indistinguishable from one who did not. Do not render "unused" there.

**7. This is not statistics.** No shots, passes, duels or ratings — no provider serves them. And **no
minutes played here**: that is arithmetic over these rows plus a red card, served since 2026-09-21 on
`GET /cronogol/players/{slug}/stats` as `minutes` (a flat 90 a match, no stoppage — CRONOGOL.md
§143), not on this route.

**Status codes.** `404` for a fixture id that does not exist. `200` with null sides for a real fixture
with nothing stored — see point 1. `Cache-Control: public, max-age=60`.

### `GET /cronogol/feed/ucl/{season}.ics` — the competition, subscribable

*Added 2026-09-11 (CRONOGOL.md §125).*

**Public, tokenless, no account** — exactly like the club and jornada feeds. Identical in every
respect to those: same headers, same `ETag`/`304` behaviour, same query-params-ignored rule, no
timezone information at all.

```
Content-Type: text/calendar; charset=utf-8
Content-Disposition: attachment; filename="champions-league-2026.ics"
Cache-Control: public, max-age=900
ETag: W/"…"
X-WR-CALNAME: UEFA Champions League · 2026/27
```

The season feed carries the league phase **and** the knockout rounds as they are drawn. The sibling
`GET /cronogol/feed/ucl/jornada/{season}/{n}.ics` carries one league-phase round and downloads as
`champions-league-2026-jornada-1.ics`. ⚠ Knockout rounds are not reachable through the jornada feed —
they carry no matchday, which is why the season feed exists.

**The caveats, which matter more than the shapes:**

- ⚠⚠ **A subscriber who also follows a club in this competition will see that club's ties TWICE.**
  This is deliberate. A cup tie has up to two ids — its own, and a club-side twin that only 40 of 144
  fixtures have and that **can be attached late**. Keying the cup feed on the twin would mean a UID
  that changes under a live subscription, which orphans the event on every device for ever with no
  recall mechanism. So the cup feed uses `UID:ucl-fixture-{id}@cronogol` and the club feed keeps
  `UID:fixture-{id}@cronogol`. **Do not try to deduplicate across feeds client-side** — the calendar
  client owns that state and you cannot reach it.
- ⚠ **A season we hold nothing for 404s, and must.** An empty calendar *deletes* every event from the
  subscriber's device; a 404 leaves their copy alone and shows a refresh error. **Never fall back to
  an empty calendar on error.**
- ⚠ `season` is in the path and that is permanent — a feed URL is copied onto a device and cannot be
  corrected. There is no "current season" variant and there must never be one.
- ⚠ Matchday is validated 1–20 (the column's own CHECK). Out of range is a **400**.
- ⚠ Unknown query parameters are **ignored, not rejected** — a calendar client's cache-buster must
  not empty somebody's calendar.
- ⚠ `X-WR-CALNAME` is snapshotted by Apple and Google at subscribe time and never renamed on an
  existing subscription. The name above is what the first cohort keeps.

The subscribe affordances are the club feed's, unchanged: `webcal://` for the deep link, `https://`
for Google's manual box, and ⚠ `cid` on Google's deep link takes the **`webcal://`** form — handed
`https://` it opens Google Calendar and silently adds nothing.

### `GET /cronogol/ucl/jornada/{season}` — the season index

*Added 2026-09-11 (CRONOGOL.md §124).*

The pager's nav. Two arrays, because the competition is two shapes.

```jsonc
{
  "season": 2026,
  "matchdays": [
    { "matchday": 1, "fixtures": 18, "finished": 18, "kickoffsTbd": 0,
      "firstKickoffUtc": "2026-09-08T16:45:00+00:00",
      "lastKickoffUtc":  "2026-09-10T19:00:00+00:00" }
    // …7 more
  ],
  "stages": []
}
```

- ⚠ **`stages` is `[]` until the February draw** — the normal state of the current season for most of
  the year, not a gap. For 2025 it carries five entries.
- ⚠⚠ **`stages` arrives in COMPETITION order** — `playoff → round-of-16 → quarter-final →
  semi-final → final`. Never re-sort it: `stage` is a string, and sorting alphabetically puts `final`
  first and `playoff` after `round-of-16`.
- ⚠ `matchdays` is ordered by NUMBER, which is not a time axis.
- ⚠ **There is no `complete` boolean, deliberately.** On the domestic jornada contract that word
  means *coverage* — "we hold every match of this round" — and all 38 LaLiga matchweeks report it
  true in July with nobody having kicked a ball. Compare `finished` against `fixtures` and decide
  which question you are asking.
- ⚠ **No `totalMatchdays` and no `expectedCount`.** The domestic `clubs / 2` and `2 * (clubs - 1)`
  describe a double round robin; the league phase is Swiss — 36 clubs, 8 matchdays, 18 matches each,
  and every club plays 8 of a possible 35 opponents. Count `matchdays` for the 8.
- ⚠ **No `league` ref**, unlike `SeasonJornadasView`. There is no `leagues` row for this competition
  worth serving.
- ⚠ `firstKickoffUtc`/`lastKickoffUtc` are PROVISIONAL while `kickoffsTbd > 0`.

### `GET /cronogol/ucl/jornada/{season}/{matchday}` — one league-phase round

*Added 2026-09-11 (CRONOGOL.md §124).*

```jsonc
{
  "season": 2026,
  "matchday": 1,
  "count": 18,
  "fixtures": [
    {
      "fixture": {
        "id": "b29c8704-915a-4230-b677-258fa2e97f79",
        "season": 2026, "stage": "league-phase", "matchday": 1,
        "round": "Jornada 1", "competitionName": "UEFA Champions League",
        "kickoffUtc": "2026-09-08T19:00:00+00:00", "kickoffTbd": false,
        "status": "finished", "goalsHome": 2, "goalsAway": 3,
        "winnerSlug": "real-betis", "venue": "Pierre-Mauroy", "venueCity": "Lille",
        "fixtureId": "41b02ac4-9dfc-4933-9eb1-bb7ad8512489"
      },
      "home": { "slug": "lille", "name": "LOSC", "shortName": "LIL", "logoUrl": "…", "logoUrls": { … } },
      "away": { "slug": "real-betis", "name": "Real Betis", "shortName": "BET", "logoUrl": "…", "logoUrls": { … } }
    }
    // …17 more
  ]
}
```

- ⚠ **`count: 0` is a 200, never a 404.** The domestic jornada routes 404 only on an unknown league
  slug; this competition has none, so an empty round is an empty collection.
- ⚠ `matchday` is validated 1–20 (mirroring the column's own CHECK), not 1–8. A `9` returns empty.
- ⚠ `home`/`away` are **nullable** — a knockout row exists before its draw with both sides reading
  "por determinar". Not reachable in the league phase, but the type is shared.
- ⚠ `fixture.id` is the key to `/cronogol/ucl/fixtures/{id}` and `…/{id}/events`. `fixture.fixtureId`
  is a DIFFERENT id — the club-centric twin — and passing it to those routes 404s.

### `GET /cronogol/ucl/stage/{season}/{stage}` — one knockout stage

*Added 2026-09-11 (CRONOGOL.md §124).*

`stage` is one of `playoff`, `round-of-16`, `quarter-final`, `semi-final`, `final`. Same
`fixtures[]` shape as the matchday route; the response carries `stage` instead of `matchday`.

- ⚠ An unrecognised stage is a **400**, never an empty list. `league-phase` is rejected here too — it
  has its own route.
- ⚠ Returns **both legs** of every tie in the stage, ordered by kickoff. There is no aggregate score
  and no tie grouping; pair the legs by the two club slugs.
- ⚠⚠ **`winnerSlug` is the winner ON THE NIGHT and does NOT say who progressed.** Measured across
  2025's 45 knockout matches: it is null on exactly the 6 that were **drawn on the night** —
  including the final, `psg 1-1 arsenal`, which was decided on penalties. Do not build a bracket on
  this field. The column's own comment in the migration claims it is "the penalties answer"; the data
  says otherwise.

```ts
export interface UclFixtureListItem {
  fixture: UclFixtureView;
  /** ⚠ Null is a PRE-DRAW placeholder side, not a missing club. */
  home: TeamRef | null;
  away: TeamRef | null;
}

export interface UclRoundSummary {
  matchday: number;      // 1-8
  fixtures: number;
  finished: number;
  kickoffsTbd: number;
  /** ⚠ PROVISIONAL while kickoffsTbd > 0. */
  firstKickoffUtc: string | null;
  lastKickoffUtc: string | null;
}

export interface UclStageSummary {
  stage: "playoff" | "round-of-16" | "quarter-final" | "semi-final" | "final";
  fixtures: number;
  finished: number;
  kickoffsTbd: number;
  firstKickoffUtc: string | null;
  lastKickoffUtc: string | null;
}

export interface UclSeasonRoundsView {
  season: number;
  /** Ordered by NUMBER. */
  matchdays: UclRoundSummary[];
  /** ⚠ COMPETITION order — never re-sort. [] before the February draw. */
  stages: UclStageSummary[];
}

export interface UclJornadaView {
  season: number;
  matchday: number;
  /** ⚠ 0 is a 200. */
  count: number;
  fixtures: UclFixtureListItem[];
}

export interface UclStageView {
  season: number;
  stage: UclStageSummary["stage"];
  count: number;
  fixtures: UclFixtureListItem[];
}
```

### `GET /cronogol/ucl/standings` — the Champions League league-phase table

*Added 2026-09-11 (CRONOGOL.md §123).*

⚠ **Render-path route, provisional in shape.** It exists so `/og/standings.png?league=champions-league`
can draw the standings poster, and so that route can check its own reading of the table against what
the backend asserted. Treat it as you treat the two cup fixture routes.

**Query.** `season` only, a four-digit starting year (2026 is 2026/27). Optional; defaults to the
current season and the response echoes what it resolved. ⚠ There is **no `?matchweek=`** — a
point-in-time cup table is unbuilt, and accepting the param would make a feature look served.

```jsonc
{
  "season": 2026,
  "matchday": 1,
  "clubs": 36,
  "lastMatchUtc": "2026-09-10T19:00:00+00:00",
  "tiebreakers": ["points", "goal-difference", "goals-for", "away-goals-for", "wins", "away-wins"],
  "rows": [
    {
      "rank": 1,
      "team": {
        "slug": "psg",
        "name": "PSG",
        "shortName": "PSG",
        "logoUrl": "https://altagamafc.crono-gol.com/storage/v1/object/public/team-assets/crests/….png",
        "logoUrls": { "xsmall": "…", "small": "…", "medium": "…", "large": "…" }
      },
      "played": 1, "won": 1, "drawn": 0, "lost": 0,
      "goalsFor": 6, "goalsAgainst": 1, "goalDifference": 5, "points": 3
    }
    // …35 more, ranked
  ]
}
```

**The caveats, which are worth more than the shapes:**

- ⚠⚠ **THE BANDS ARE POSITIONAL AND ARE NOT ON THIS RESPONSE.** 1–8 go straight to the round of 16,
  9–24 into a two-legged play-off, 25–36 out. That is a property of the FORMAT; there is no `zone`
  field and the server decides nothing about a club's season. Slice on `rank` — and **refuse to band
  a table whose `clubs` is not 36**, because the order below a missing club is wrong in a way that
  looks entirely normal.
- ⚠ `zoneFor`/`bandsApply` in the web app are **not** the thing to reach for. Their
  `ZoneKind = "ucl"` means *"this DOMESTIC rank qualifies for the Champions League"* — a different
  question from this table entirely.
- ⚠ **`matchday` is the last COMPLETE round, derived here, and must be rendered verbatim.** Do not
  recompute it: the caption and the picture would then be able to name different rounds. It is
  `null` mid-round, which during the league phase is true on two nights in three.
- ⚠ **No `form`.** There is no cup form guide — the field is absent rather than always-empty, so
  nothing has to guess what an empty array meant.
- ⚠ **`tiebreakers` names no head-to-head, and that is the rule, not an omission.** Each club plays
  eight different opponents, so two tied clubs have usually never met. ⚠ The list stops at
  `away-wins`: UEFA's next criteria are disciplinary points and club coefficient, neither of which
  this service holds — so for clubs still tied there, **our order can differ from uefa.com**, which
  publishes a fully resolved table. `rank` is contiguous regardless; ties fall to a club-slug sort
  that is stable but arbitrary.
- ⚠ **`team.shortName` is the monogram fallback** the poster draws when a crest cannot be rendered.
  It is populated on all 36 clubs today but is nullable, and it is **not unique**.
- ⚠ **200 with 36 clubs on zero is a correct answer** between the July season rollover and the first
  kickoff in September — not an empty state.

**`Cache-Control: public, max-age=300`**, matching `GET /cronogol/standings`.

```ts
export type StandingsTiebreaker =
  | "points"
  | "head-to-head-points"
  | "head-to-head-goal-difference"
  | "goal-difference"
  | "goals-for"
  // ⚠ UEFA league-phase criteria (§123). They appear ONLY on
  // `UclStandingsView.tiebreakers` — no domestic table can emit them.
  | "away-goals-for"
  | "wins"
  | "away-wins";

export interface UclStandingsRowView {
  rank: number;
  team: TeamRef;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface UclStandingsView {
  season: number;
  /** The last COMPLETE matchday, or null. ⚠ Render verbatim; never recompute. */
  matchday: number | null;
  /** 36 for a full field. ⚠ Refuse to band anything shorter. */
  clubs: number;
  lastMatchUtc: string | null;
  tiebreakers: StandingsTiebreaker[];
  rows: UclStandingsRowView[];
}
```

### `GET /cronogol/ucl/fixtures/{id}` — one Champions League match, with both clubs

⚠ **A render-path route, provisional in shape (CRONOGOL.md §116).** It exists so the web app's
`/og/match.png`, `/og/score.png` and `/og/xi.png` routes can resolve a Champions League match and
both its clubs the way they resolve a LaLiga one through `GET /cronogol/teams`. The Champions
League lives in its own tables, competition-wide (all 36 clubs, every match, seasons from 2025),
and this is the only public read of them. **There is no list route, no table, no club page** —
that surface is v2, and may reshape this response.

```json
{
  "fixture": {
    "id": "5d3b1c2e-8f1a-4c0b-9a7e-2b6f0d4e1a90",
    "season": 2026,
    "stage": "league-phase",
    "matchday": 1,
    "round": "Jornada 1",
    "competitionName": "UEFA Champions League",
    "kickoffUtc": "2026-09-08T19:00:00+00:00",
    "kickoffTbd": false,
    "status": "finished",
    "goalsHome": 2,
    "goalsAway": 1,
    "winnerSlug": "real-madrid",
    "venue": "Bernabéu",
    "venueCity": "Madrid",
    "fixtureId": "c05eedf3-3f21-44cb-9780-c9bf6d97be52"
  },
  "home": { "slug": "real-madrid", "name": "Real Madrid", "logoUrl": "…", "logoUrls": { "…": "…" }, "colorPrimary": "#0f39b8", "venue": { "…": "…" }, "tracked": true, "…": "…" },
  "away": { "slug": "inter-inter", "name": "Inter", "logoUrl": "…", "logoUrls": { "…": "…" }, "colorPrimary": null, "venue": null, "tracked": false, "…": "…" }
}
```

`Cache-Control: public, max-age=60`. `404` for an unknown id, `400` for a malformed one (the
id is validated as a UUID before any read).

- `home` and `away` are full `TeamView`s — the same shape `GET /cronogol/teams` serves — built
  by the same code path, so crest URLs, colours and the home ground arrive identically for a
  LaLiga club and a foreign one. ⚠ **Most foreign clubs are untracked opponent rows**: expect
  `tracked: false`, a null `colorPrimary` or the source's `#999999` placeholder, and often a
  null `venue`. `name` is the source's Spanish short form — `LOSC`, `Oporto`, `Man Utd`.
- ⚠ **A null `home` or `away` is a PRE-DRAW PLACEHOLDER**, a real state of a knockout tie before
  its draw — not a missing club and not an error. Nothing can be drawn for it.
- `stage` is one of `league-phase` · `playoff` · `round-of-16` · `quarter-final` · `semi-final`
  · `final` · `unknown`; `matchday` is set only during the league phase; `round` is the source's
  own label verbatim (`Octavos - Ida`).
- `goalsHome`/`goalsAway` are the 90/120-minute score and are LEVEL on a tie decided on
  penalties — **and `winnerSlug` is null there too.** ⚠ Corrected 2026-09-08 against all 189
  rows of 2025: the source sets its winner only when that score is not level, so `winnerSlug`
  is the winner on the day and **never says who went through on penalties** (the 2025 final,
  PSG 1-1 Arsenal, has `winnerSlug: null`). The shootout is in `…/events` — see that route.
- `fixtureId` is the club-centric twin (`FixtureView.id`) when a tracked club is involved — the
  five LaLiga clubs' 40 ties exist in both tables by design — else null.

### `GET /cronogol/ucl/fixtures/{id}/events` — one Champions League match's timeline

The exact shape of `GET /cronogol/fixtures/{id}/events` above, served from the Champions League
tables. Everything that section says applies: ordered by our stored `sort_order`, `404` for an
unknown fixture and `200` with `events: []` for a known one with nothing stored yet, no player
statistics behind it, and `player.slug` null for anyone outside the LaLiga and Premier League
squads — which is every foreign club's player. `Cache-Control: public, max-age=60`.

⚠ Events for a match arrive from the competition poll's events pass, which runs on every tick
inside a kickoff window and caps itself per pass — so a match that finished minutes ago can still
answer `events: []` for one or two ticks.

⚠ **A penalty shootout arrives as `type: "unknown"` rows — render them, never count them as
goals.** Observed on the 2025 final (PSG 1-1 Arsenal): ten kicks, each `period: "ShootOut"`,
`subtype` `scored` · `missed` · `saved`, **`minute: null`** (the source stamps kicks with a counter,
not a clock), in kick order after every in-play event. Counting `scored` per `team.slug` is the
shootout result and the only record of who went through — the match's `winnerSlug` is null
there. A scorer block that filters on `type: "goal"` is unaffected. *(Added 2026-09-08.)*

### `GET /cronogol/standings` — the league table

*Added 2026-08-14; `form` and `?matchweek=` added 2026-08-15.* Rank, club, MP/W/D/L/GF/GA/GD/Pts
and a last-five form guide, for every published league.

**Derived from the fixtures the backend already holds** — there is no standings provider. That is why
it exists at all, and it is also the caveat: the table is exactly as complete as our fixture coverage.
See `clubs` below.

| Param | Default | Notes |
| --- | --- | --- |
| `league` | all published leagues | Slug (`laliga`, `segunda`, `premier-league`, `bundesliga`, `serie-a`). ⚠ An unknown slug is **200 with `tables: []`, not a 404** — this narrows a collection. |
| `season` | current season | Starting year: 2026/27 is `2026`. Always echoed back. |
| `matchweek` | *(none — the live table)* | The table **as of** this matchday, cumulative through it. 1–60; `0`, `61` and a non-integer are 400. ⚠ Not clamped to the league's real length — `50` against a 38-week league serves the final table. |

⚠ **This route has a query DTO, so an undeclared param is a 400.** A `utm_source` or cache-buster that
the jornada routes silently tolerate will fail here.

`Cache-Control: public, max-age=300` — longer than the match reads, because the table only moves when
a result is written. Live matches are excluded by construction.

**A league-tab UI is ONE request.** Omit `league` and every published league comes back in `tables`,
each carrying its own `league` object — `name`, `logoUrl` / `logoUrls` and `accentColor` — so a tab
strip needs nothing else. Two things to know before wiring it:

- ⚠ **`tables` is ordered by league SLUG ascending**, i.e. `bundesliga`, `laliga`, `premier-league`,
  `segunda`, `serie-a`. That is a stable, diffable order, **not an editorial one** — a design that
  wants LaLiga first orders the tabs itself. Do not read tab priority out of this array.
- ⚠ **A league with no stored rows is ABSENT from `tables`, not present and empty.** Build the tab
  strip from `GET /cronogol/leagues` if the tabs must be stable regardless of coverage; build it from
  `tables` and a league can disappear from the UI on a bad sync.

⚠ `league.logoUrls` is *different artwork* keyed semantically — `primary` is the full lockup, `icon`
is icon-only — not one image at several sizes the way `TeamView.logoUrls` is. Picking wrong is a
layout mistake, not a resolution one. `accentColor` is **our** tint, chosen for exactly this
tell-the-leagues-apart job. ⚠ It is null on **Serie A and on segunda**, and on every cup — verified
against production 2026-08-15, where only `laliga`, `premier-league` and `bundesliga` of the five
published leagues carry one. Keep a neutral fallback; do not assume a league competition has a tint.

```jsonc
// GET /cronogol/standings?league=laliga&season=2026  (trimmed to three rows)
{
  "season": 2026,
  "tables": [
    {
      "league": {
        "slug": "laliga",
        "name": "LALIGA EA SPORTS",
        "logoUrl": "https://…/laliga.png",
        "logoUrls": { "primary": "https://…/laliga.png", "icon": "https://…/ll.png" },
        "accentColor": "#ff563c"
      },
      "season": 2026,
      // ⚠ The rule ACTUALLY applied — read it, do not assume it. See below.
      "tiebreakers": [
        "points",
        "head-to-head-points",
        "head-to-head-goal-difference",
        "goal-difference",
        "goals-for"
      ],
      // Null because no ?matchweek= was sent. Echoed, never computed.
      "matchweek": null,
      "clubs": 20,
      "matchesPlayed": 20,
      "matchesTotal": 380,
      "lastMatchUtc": "2026-08-24T19:00:00+00:00",
      "rows": [
        {
          "rank": 1,
          "team": {
            "slug": "athletic-club",
            "name": "Athletic Club",
            "shortName": "ATH",
            "logoUrl": "https://…/ath.png",
            "logoUrls": { "small": "https://…/ath-small.png" }
          },
          "played": 2, "won": 2, "drawn": 0, "lost": 0,
          "goalsFor": 4, "goalsAgainst": 1, "goalDifference": 3, "points": 6,
          // ⚠ NEWEST FIRST. Reverse it to render a left-to-right chip strip.
          "form": ["W", "W"]
        },
        {
          "rank": 2,
          "team": { "slug": "atletico-madrid", "name": "Atlético Madrid", "shortName": "ATM", "logoUrl": "https://…/atm.png", "logoUrls": null },
          "played": 2, "won": 2, "drawn": 0, "lost": 0,
          "goalsFor": 5, "goalsAgainst": 1, "goalDifference": 4, "points": 6,
          "form": ["W", "W"]
        },
        {
          "rank": 3,
          "team": { "slug": "osasuna", "name": "Osasuna", "shortName": "OSA", "logoUrl": "https://…/osa.png", "logoUrls": null },
          "played": 2, "won": 1, "drawn": 1, "lost": 0,
          "goalsFor": 3, "goalsAgainst": 2, "goalDifference": 1, "points": 4,
          "form": ["D", "W"]
        }
      ]
    }
  ]
}
```

Note rows 1 and 2 above: **Atlético has the better goal difference and is ranked below Athletic.**
That is not a bug — LaLiga breaks a points tie on head-to-head before goal difference. Which brings us
to the caveats, all of which are worth more than the field types.

#### ⚠ `tiebreakers` differs per league and must not be assumed

Do not sort client-side by `points, goalDifference` and expect to reproduce `rank`.

| League | Rule |
| --- | --- |
| `laliga`, `segunda`, `serie-a` | points → **head-to-head** points → head-to-head GD → overall GD → goals for |
| `premier-league` | points → GD → goals for (**never** head-to-head) |
| `bundesliga` | points → GD → goals for → **head-to-head** points |

⚠ A head-to-head criterion listed here was not necessarily *reached*, and may have been deliberately
skipped: it applies only once every match between the tied clubs has been played. Mid-season the table
falls back to overall goal difference — which is what the federations themselves publish.

#### ⚠ `rank` is always 1..N with no gaps, which the official rules are not

The Premier League's regulations say clubs level on points, GD and goals scored *share* a position;
RFEF and Lega settle a surviving title or relegation tie with a playoff. Neither is expressible in a
table. Clubs equal on every criterion are finally ordered by **club slug**, which is arbitrary but
stable across requests.

So two adjacent rows are not necessarily separated by anything real. Compare `points` before telling a
reader one club is "above" another.

#### `form` — last five, newest first

⚠ **Newest first**, which is the opposite of how a `WWDLW` strip normally renders. Reverse it before
mapping to chips. It is emitted this way deliberately: a shortened array then loses the *oldest* match
rather than the most recent one.

⚠ **Fewer than five is normal, `[]` is normal, and it is never null.** Early season, a promoted club,
and any club whose matches we do not fully hold all produce a short array. There is no padding entry
and no placeholder.

**It counts exactly what `played` counts** — finished league matches only, never cup, never live. That
is a guarantee rather than a coincidence: the same rows produce both.

⚠ **Do not derive this yourself from `GET /cronogol/fixtures`.** That was proposed and measured, and
it is feasible — one league's last five matchdays fits well inside the 500 cap. It was still declined,
for one reason that outweighs the rest: **a `finished` fixture with null goals is a real stored
shape.** The backend excludes it so the table under-reports rather than crediting a phantom 0-0; a
client-side derive scores it a **draw**, and the page then shows form chips that disagree with the
points column beside them, from the same data. Three lesser reasons: that route has no competition
filter so cup ties land in the array, "five matches back" is not a date range once a club has a game
in hand, and form must sort by `kickoffUtc` rather than `matchweek` because jornada order is not
chronological.

#### `?matchweek=` — the table as of a matchday

Cumulative **through** that matchday, not the matches played in it. Every number moves: `played`,
`points`, `rank`, `lastMatchUtc` and `form` are all as of that point, and `matchweek` is echoed on
each table. Omit it for the live table and `matchweek` comes back `null`.

The tiebreak is scoped too — a matchday-24 table is never ranked using a head-to-head result from
matchday 30.

⚠ **A club that had no fixture that matchday still appears**, with its totals through the previous one.
A postponement must not drop a club out of the table.

⚠ **It is not clamped to the league's real length.** `?matchweek=50` against a 38-week league is a 200
carrying the final table, because the league is not resolved at validation time. `0`, `61` and a
non-integer are 400.

⚠ **A historical table can disagree with the live one, and the cause is not in your request.** The
matchweek table is built only from fixtures that carry a matchweek, and a finished league fixture can
be stored without one (it is what a degraded ingest writes). Those matches count in the live table and
are invisible to every `?matchweek=` table. Worth knowing before you spend an afternoon on an
off-by-one that is really a data gap.

⚠⚠ **In the worst case a league is ABSENT from `tables` on a `?matchweek=` request** — not present
with an empty `rows`, absent — while the same league without `?matchweek=` serves a full table. That
happens when none of its finished fixtures carry a matchweek. Confirmed against real data on
2026-08-15: one league-season serves 20 clubs live and zero at every matchweek.

**So do not treat `tables` as a fixed-length list keyed by your league tabs.** Match on
`tables[].league.slug`, and render "no table for this matchday" rather than assuming the response is
in the same shape as the one before it. The backend logs the cause; the response cannot carry it.

#### ⚠ `clubs` is the completeness signal, and there is no `complete` flag

`clubs` counts the clubs we hold a fixture for. It **under-reports exactly when coverage is worst**: a
match between two clubs the backend does not track is fetched by nobody, and both lose a match from
`played`, `points` and `goalDifference` with nothing looking wrong.

There is deliberately no `complete` boolean, because the obvious one would be true by construction and
therefore worthless. Compare `clubs` against what you know the league fields — 20 for LaLiga and the
Premier League and Serie A, 22 for Segunda, 18 for the Bundesliga.

#### ⚠ Every club on zero is a correct answer

Between the season rollover (July) and the first kickoff, the true table is every club on zero. Render
it; it is not an empty state. `lastMatchUtc` is `null` then, and `matchesPlayed` is `0`.

`lastMatchUtc` is a **kickoff**, not an ingest time. It answers "as of when", never "how fresh is
this" — a table not synced for a week and a table where nothing has been played for a week look
identical here.

### `GET /cronogol/jornada/{league}/{season}` — the matchweek index

**What a jornada pager is built from.** One request instead of one per matchweek.

`league` is a slug (`laliga`, `premier-league`, `bundesliga` or `serie-a`). Both segments are required — a jornada
number means nothing without them, and there is no default season. ⚠ For `premier-league`, expect
`kickoffsConfirmed: false` on most matchweeks outside the ~6-week TV-selection window — see the PL
caveats section; it is the normal state, not an ingest gap. ⚠ For `bundesliga`, expect it on **most of
the season at once**: matchdays 1–4 and 34 were confirmed on 2026-08-07 and the other 29 were not.
Same normal state, different cause — the DFL states the flag rather than the backend deriving it.

⚠ **This index is the only place a German matchday number exists.** `round` and `matchweek` are both
null on `GET /cronogol/teams/{slug}/fixtures` for Bundesliga clubs — see the Bundesliga caveats.

```jsonc
// 200
{
  "league": { "slug": "laliga", "name": "LALIGA EA SPORTS" },
  "season": 2026,
  "expectedCount": 10,     // clubs / 2 — derived, NOT hardcoded
  "totalMatchweeks": 38,   // 2 * (clubs - 1). Size your pager from this.
  "matchweeks": [
    {
      "matchweek": 1,
      "count": 10,
      "complete": true,
      "kickoffsConfirmed": true,
      "firstKickoffUtc": "2026-08-14T19:00:00+00:00",
      "lastKickoffUtc": "2026-08-26T19:00:00+00:00", // ⚠ 12 days — a deferred opener
    },
    {
      "matchweek": 4,
      "count": 10,
      "complete": true,
      "kickoffsConfirmed": false, // published, times pending — render it, greyed
      "firstKickoffUtc": "2026-09-06T00:00:00+00:00", // provisional
      "lastKickoffUtc": "2026-09-06T00:00:00+00:00",
    },
  ],
}
```

`Cache-Control: public, max-age=60`. **`404` for an unknown league slug.**

⚠ **`totalMatchweeks` is 38 for primera, Serie A and the Premier League, 42 for segunda and 34 for
the Bundesliga** — it is derived from the club count (`2 × (clubs − 1)`, and the Bundesliga has 18),
so do not write any of them down. The Bundesliga is the first league here that is not a 20-club season, so any code that
assumed 38 as a floor or a default is wrong now rather than later. ⚠ `matchweeks` is ordered by **number**, which is not date order
(caveat 5). ⚠ Kickoff timestamps are **provisional** wherever `kickoffsConfirmed` is false.

Ida/vuelta is `matchweek <= totalMatchweeks / 2`.

### `GET /cronogol/jornada/{league}/{season}/{n}` — one matchweek

`n` is 1–60; outside that is a `400`.

```jsonc
// 200
{
  "league": { "slug": "laliga", "name": "LALIGA EA SPORTS" },
  "season": 2026,
  "matchweek": 4,
  "count": 10,
  "expectedCount": 10,
  "totalMatchweeks": 38,
  "complete": true,           // coverage — see caveat 4
  "kickoffsConfirmed": false, // schedule  — see caveat 4
  "fixtures": [
    {
      "id": "5355ba8f-6092-411b-a1fd-0bf7e0a7e1da",
      // ⚠ HOME and AWAY, not opponent/homeAway. There is no requesting club here.
      "homeTeam": {
        "slug": "rcd-espanyol",
        "name": "RCD Espanyol",
        "logoUrl": "https://altagamafc.crono-gol.com/.../crests/<sha>.png",
        "logoUrls": { "xsmall": "…", "small": "…" },
      },
      "awayTeam": { "slug": "real-madrid", "name": "Real Madrid", "logoUrl": "…", "logoUrls": {} },
      "competition": "league",
      "competitionName": "LALIGA EA SPORTS",
      "round": "Jornada 4",     // the provider's own label; the number is above
      "kickoffUtc": "2026-09-06T00:00:00+00:00",
      "kickoffTbd": true,       // render --:--, not midnight
      "venue": "RCDE Stadium",
      "venueCity": "Cornellà de Llobregat",
      "status": "scheduled",
      // ⚠ HOME-AWAY, not for/against. This page has no perspective to flip.
      "goalsHome": null,
      "goalsAway": null,
    },
  ],
}
```

`Cache-Control: public, max-age=60`. **`404`** for an unknown league; **`200` with `fixtures: []`**
for a matchweek that exists but has not been ingested.

⚠ **This is not `FixtureView`.** A club page asks "what are *my* fixtures" and gets `homeAway`,
`opponent`, `goalsFor`/`goalsAgainst`. A jornada page has no requesting club, so it gets both teams
and a home-away score. Do not try to reuse the club fixture card component without mapping.

**Ordering:** confirmed kickoffs first, then by time, then by a stable tiebreak. Grouping by day is
yours to do — the payload has everything needed and the backend does not pick a timezone.

### `GET /cronogol/feed/jornada/{league}/{season}/{n}.ics` — subscribe to a matchweek

The "subscribe to the whole round" button. **Public, tokenless, no account** — exactly like the club
feed. Same `webcal://` swap, same rules in [Subscribing](#subscribing--what-the-ui-needs-to-offer).

⚠ Not always ten matches: a Bundesliga round is **nine**, because the league has 18 clubs. Label the
button from the round's own `count`, never from a constant.

```
webcal://crono-gol.com/cronogol/feed/jornada/laliga/2026/4.ics
webcal://crono-gol.com/cronogol/feed/jornada/premier-league/2026/1.ics
webcal://crono-gol.com/cronogol/feed/jornada/bundesliga/2026/1.ics
webcal://crono-gol.com/cronogol/feed/jornada/serie-a/2026/1.ics
```

The calendar's display name follows the league's own vocabulary: `LALIGA EA SPORTS · Jornada 4`,
`Premier League · Matchweek 1`, `Bundesliga · Matchday 1`, `Serie A · Giornata 1` — and the download
filenames match (`bundesliga-2026-matchday-1.ics`, `serie-a-2026-giornata-1.ics`, both confirmed from
the `Content-Disposition` header, 2026-08-07 and 2026-08-08). The URL segment is always
`feed/jornada/...` for all four — only the user-facing strings differ.

⚠ **`league` and `season` are in the URL and that is permanent.** A feed URL lives on the
subscriber's device forever, so it must always mean the same ten matches. Never construct a
"current season" variant.

**This is the whole point of subscribing early:** a jornada added today is ~10 all-day events, and
when LaLiga publishes the times every subscriber's calendar converts them to real slots
automatically. No notification, no re-subscribe, no action from you.

⚠ **`404` for an unknown league** — and that is deliberate. An empty calendar would *delete* ten
events from someone's phone; a 404 leaves their existing copy alone. If you build a "subscribe"
button, do not fall back to an empty feed on error.


### ✅ Verified against production, 2026-08-04

Everything below is a live response, not a design intention.

```
GET /cronogol/jornada/laliga/2026
  expectedCount 10 · totalMatchweeks 38 · 38 matchweeks · none incomplete
  kickoffsConfirmed: jornadas 1, 2, 3, 4 only — the rest are published-but-unscheduled

GET /cronogol/jornada/laliga/2026/1
  count 10 · complete true · kickoffsConfirmed true

GET /cronogol/jornada/laliga/2026/20
  count 10 · complete true · kickoffsConfirmed FALSE
  first fixture: 2027-01-17T00:00:00+00:00, kickoffTbd true   <- a real date, no time

GET /cronogol/feed/jornada/laliga/2026/1.ics
  200 · text/calendar · 10 VEVENTs · ETag present
  filename "laliga-2026-jornada-1.ics" · X-WR-CALNAME "LALIGA EA SPORTS · Jornada 1"
```

⚠ **Only four jornadas have confirmed times, and that number grows weekly.** It was three the day
before. Build for the majority case — a jornada with dates and `--:--` — and treat confirmed times as
the exception that arrives later.

⚠ **Jornada 1 spans 15–27 August**, twelve days, because a deferred opener stretches it. Take the
window from `firstKickoffUtc`/`lastKickoffUtc`; never assume a weekend.

### ⚠ Three things the jornada design assumes that this API does not do

Checked against `handoff_jornadas/README.md` on 2026-08-04.

**1. The feed URL is on `crono-gol.com`, not the front-end domain.** The mock shows
`altagamafc.app/jornada/1` as the subscribe URL. The real one is:

```
webcal://crono-gol.com/cronogol/feed/jornada/laliga/2026/1.ics
```

⚠ **This is a one-way door and has to be settled before the button ships.** The host inside a
`webcal://` link is copied onto the subscriber's device and can never be changed — see the warning at
the top of this file. Serving it from the front-end domain would mean committing *that* domain to
proxying calendar traffic forever. Either point the button at the backend host, or make the proxy
decision deliberately and permanently.

**2. "10 matches, always" — ✅ true again as of 2026-08-04, but do not hardcode it.**

It was briefly false: five clubs promoted into primera had never been tracked, and a match between two
untracked clubs is fetched by nobody, so 18 of 38 jornadas were short. **Fixed** — all 20 primera clubs
are now tracked and the season serves **380/380 matches, 38/38 jornadas complete**.

⚠ **Still read `expectedCount` and `complete` rather than writing 10.** Two reasons: they are what makes
segunda work (22 clubs, 11 a matchweek, 42 of them), and they are the only thing that would surface the
next promotion/relegation cycle. The gap above took a year to appear and was invisible on every club
page.

**3. The MIDWEEK ROUND badge is derived, not served.** There is no `isMidweek` field. Compute it from
`firstKickoffUtc` — a Tuesday or Wednesday kickoff in Spanish local time.

⚠ Two caveats. It needs a timezone to get the weekday right, and the backend deliberately picks none.
And while `kickoffsConfirmed` is false the date is **provisional**, so the badge can appear, disappear
or move when the league publishes times. Either derive it only for confirmed matchweeks, or accept
that it changes. Ask for a real field if it needs to be stable — it is cheap to add, it just is not
there now.

### `GET /cronogol/news`

The global news feed — every publisher, newest first.

| Query       | Type           | Notes                                              |
| ----------- | -------------- | -------------------------------------------------- |
| `limit`     | `number` 1–100 | Default `30`                                       |
| `before`    | ISO 8601       | Keyset cursor — pass the previous page's `nextBefore` |
| `publisher` | `marca \| laliga` | ⚠ A *malformed* value (uppercase, spaces) is a `400`; a well-formed but unknown slug like `espn` returns an empty list |
| `featured`  | `'true' \| 'false'` | **New 2026-08-11.** `'true'` returns **only our own editorial** — the homepage rail. Any other value is a `400`. See below |

```jsonc
// 200
{
  "count": 30,
  // Cursor for the next page. null means this was the last one.
  "nextBefore": "2026-08-01T07:25:03+00:00",
  "articles": [
    {
      "id": "53b71406-8c0b-4e8a-b0fb-ae4373efc966",
      "title": "Middlesbrough - Espanyol: horario y dónde ver hoy en TV el partido amistoso",
      "excerpt": "Los detalles del duelo amistoso de pretemporada",
      // ⚠ EXTERNAL. This is the publisher's URL, never one of ours.
      "url": "https://www.marca.com/futbol/espanyol/2026/08/01/middlesbrough-espanyol-….html",
      // ⚠ Hot-linked to the publisher's CDN — NOT mirrored like crests are.
      "imageUrl": "https://objetos-xlk.estaticos-marca.com/files/og_thumbnail/….jpeg",
      "publishedAt": "2026-08-01T07:31:22+00:00",
      // ⚠ MUST be displayed. See "Attribution is not optional" below.
      "publisher": {
        "id": "marca",
        "name": "MARCA",
        "siteUrl": "https://www.marca.com",
      },
      "author": "Daniel Rete", // often null
      "categories": ["Espanyol"], // the publisher's own tags, not our slugs
    },
  ],
}
```

Always sorted by `publishedAt` descending. `Cache-Control: public, max-age=60`.

#### `?featured=true` — the homepage rail, new 2026-08-11

The feed above is strict reverse-chron and MARCA supplies roughly three quarters of it, so **a
briefing or a story is off the first page within the hour**. This is how you build a band that always
carries our own editorial.

```
GET /cronogol/news?featured=true&limit=5
```

Same `NewsFeedView` envelope, containing only rows whose `publisher.isFirstParty` is `true`. It
composes with everything else:

| Request | What you get |
| --- | --- |
| `?featured=true` | our editorial, newest first |
| `?featured=true&league=laliga` | our editorial tagged LaLiga |
| `?featured=true&before=…` | page 2 of it — the keyset cursor works normally |
| `?featured=false` | **unfiltered**, identical to omitting the param |
| `?featured=true&publisher=marca` | empty, legitimately |

Works on the club route too: `GET /cronogol/teams/real-madrid/news?featured=true`. An unknown slug is
still a `404` there — the club is resolved before the filter, so a bad slug does not quietly become an
empty rail.

⚠ **There is NO `featured` field on the article.** It is a query parameter only, so `NewsArticleView`
is unchanged. The per-article flag you already have is `publisher.isFirstParty`, and `featured=true`
simply selects on it server-side.

⚠ **`featured=false` is NOT "aggregated only".** It means "do not apply this filter", which is what a
single UI toggle expects. There is no parameter for third-party-only — ask for one rather than
inferring it from the shape.

⚠ **Only the strings `'true'` and `'false'` are accepted.** `?featured=1` and `?featured=yes` are
**400**, not ignored. The value is validated rather than coerced, deliberately: a truthy-string
convention would make `?featured=false` silently *enable* the filter.

⚠ **The rail can be short, or empty, and neither is an error.** First-party editorial is a handful of
items a week — five stories a day is the automated ceiling and briefings are weekly — against a
30-day retention window. **Design the band for 1–12 items**, not a full page, and render something
deliberate at zero rather than a spinner.

⚠ **Driven by the registry, not by an id.** `featured` selects every publisher with
`isFirstParty: true` — today exactly one (`cronogol`), tomorrow possibly a partner whose content we
host. Do not reimplement it client-side as `?publisher=cronogol`; that is the branch the
`isFirstParty` section already tells you not to write.

#### ⚠ The publisher set changes without a deploy, and one is leaving now

Publishers live in a database registry, so `?publisher=` values come and go on a migration.

**Mundo Deportivo (`mundodeportivo`) was dropped as a source on 2026-08-11.** No new articles arrive.
The ones already stored keep serving until they age out of the 30-day window, so the id **fades over
a month rather than vanishing today** — a feed that still shows their headlines next week is correct,
not stale.

⚠ Never hardcode a publisher chip list. Derive it from what the feed actually returns, or the UI will
offer a filter that yields nothing.

### `GET /cronogol/news/leagues`

The **league filter** the news screen needs. Returns the tabs in the order to render them.

```jsonc
// 200 — the live response, 2026-08-08. Nine entries, now carrying logos.
[
  { "id": "laliga", "name": "LALIGA", "shortName": "LaLiga",
    "logoUrl":  "https://altagamafc.crono-gol.com/.../leagues/77f0497b….png",
    // ⚠ LaLiga is the ONLY league with an `icon`. Everyone else has `primary` alone.
    "logoUrls": { "icon": "https://…/08826931….png", "primary": "https://…/77f0497b….png" } },
  { "id": "premier-league", "name": "Premier League", "shortName": "Premier",
    "logoUrl": "https://…/leagues/….png", "logoUrls": { "primary": "…" } },
  { "id": "serie-a", "name": "Serie A", "shortName": "Serie A",
    "logoUrl": "https://…/leagues/4c459d82.svg", "logoUrls": { "primary": "…" } },  // ⚠ SVG
  { "id": "bundesliga", "name": "Bundesliga", "shortName": "Bundesliga",
    "logoUrl": "https://…/leagues/….png", "logoUrls": { "primary": "…" } },
  // ⚠ These four have NO artwork — `logoUrl: null`, `logoUrls: {}`.
  { "id": "ligue-1",          "name": "Ligue 1",               "shortName": "Ligue 1",    "logoUrl": null, "logoUrls": {} },
  { "id": "champions-league", "name": "UEFA Champions League", "shortName": "Champions",  "logoUrl": null, "logoUrls": {} },
  { "id": "europa-league",    "name": "UEFA Europa League",    "shortName": "Europa",     "logoUrl": null, "logoUrls": {} },
  { "id": "liga-mx",          "name": "Liga MX",               "shortName": "Liga MX",    "logoUrl": null, "logoUrls": {} },
  // MLS since 2026-09-19 (backend CRONOGOL.md §140) — a trimmed 863×913 PNG.
  { "id": "mls",              "name": "Major League Soccer",   "shortName": "MLS",
    "logoUrl": "https://…/leagues/9eeac2ec….png", "logoUrls": { "primary": "…" } },
]
```

⚠ **Ligue 1 and Liga MX stay `null` on purpose (2026-09-19).** The only artwork found carries a
sponsor mark (McDonald's; the BBVA lockup); it is stored for later use in the backend's ops console
and deliberately served by nothing. Keep rendering the name for those two.

`id` is what `?league=` on the news endpoints takes. `Cache-Control: public, max-age=300` — the set
changes on a migration, not on a sweep.

⚠ **`shortName` exists and an earlier version of this sample omitted it.** It is the label to render
in a tab strip — `name` is the registered form and overflows a narrow tab ("UEFA Champions League").

⚠ **Render the array's order; do not re-sort.** Order is the server's answer, and a client that sorts
its own way will disagree with it. There is no `sortOrder` and no `enabled` field: a disabled league is
simply absent.

⚠ **Do not hold this list in the front end.** It is database-owned, and it is *not* the same as the
list of leagues we have fixtures for — see "What this backend does not do" below.

### `GET /cronogol/teams/{slug}/news`

Same query parameters and the same `articles` shape, plus a slim club header.

```jsonc
// 200
{
  "team": {
    "slug": "real-madrid",
    "name": "Real Madrid",
    "logoUrl": "https://altagamafc.crono-gol.com/.../crests/<sha>.png",
    "logoUrls": { "xsmall": "…", "small": "…", "medium": "…" },
  },
  "count": 1,
  "nextBefore": null,
  "articles": [ /* …as above… */ ],
}
```

⚠ **`team` here is deliberately slimmer than `TeamView`** — no venue, no colours, no `lastSyncedAt`.
Serving those would mean a stadium join on every news request for fields a news page does not render.
If you need the full club object, you already have it from `/cronogol/teams`.

**`404` for an unknown slug**, same as the fixtures route.

### ⚠ Six things to get right before shipping a news UI

**1. Attribution is not optional.** `publisher.name` **must** be visible on every card. This feature
exists on the basis that we send readers to the people who wrote the article — a card without a
publisher name is not a design choice, it is the thing that makes the feature defensible. If `author`
is null (it often is), show the publisher name; never show a blank byline.

**2. `url` is external — open it as such.** Every link leaves the site.

```tsx
<a href={article.url} target="_blank" rel="noopener noreferrer">
```

There is no `/news/{id}` detail page and there will not be one. **We do not have the article body** —
the API carries a headline and the publisher's own one-to-three-sentence summary, deliberately.

**3. ⚠ `imageUrl` is hot-linked, and this differs from crests.** Club crests are mirrored into our own
storage (see "Crest hosting"). News images are **not** — they point at the publisher's CDN, which can
404, rate-limit, or hotlink-protect at any time. Always render with an `onError` fallback and never
assume the image loads. `imageUrl` can also be `null`.

**4. ⚠ Articles are deleted after 30 days.** Retention is enforced hourly. **`id` is not a permanent
handle** — do not persist it in a user's bookmarks, a share URL, or anything expected to outlive a
month. If you need durable "save for later", store `url`.

**5. LALIGA articles never appear on a team page.** Two sources feed this: MARCA per-club (which is
where every team-attributed article comes from) and LALIGA's general league feed (institutional news,
no club attached). So `/cronogol/news` mixes both, `/cronogol/teams/{slug}/news` is MARCA only, and the
totals will not add up. That is correct, not a bug.

**6. Pagination has one known edge.** `nextBefore` is a timestamp, and RSS publish times have
second resolution — MARCA publishes in bursts, so two articles can share a second and one may be
skipped across a page boundary. Acceptable for infinite scroll; **do not build anything that depends on
having seen every article exactly once.** A compound cursor is a server-side change if that ever
matters.

**Current volume, 2026-08-01:** ~700 articles across the 30-day window, ~665 of them MARCA. All 20
tracked clubs have coverage. Roughly 650 new articles land in the first sweep of a fresh window and a
few dozen an hour thereafter.

### `GET /cronogol/health`

Ops/debug. `Cache-Control: no-store`.

Since 2026-09-14 the body also carries a **`process`** block — the process's own load signals
(CRONOGOL.md §131.7), additive to every key below. Event-loop lag percentiles are `null` until the
sampler has closed its first window.

```jsonc
"process": {
  "eventLoopLag": { "p50Ms": 0.3, "p99Ms": 4.1, "maxMs": 12.8 },
  "rssMb": 161, "heapUsedMb": 74,
  "supabase": { "inFlight": 2, "queued": 0, "rejected": { "queue-full": 0, "queue-timeout": 0 } },
  "readCache": { "entries": 137, "inFlight": 0 }
}
```

```jsonc
{
  "ok": true,
  "db": "up",
  "trackedTeams": 83,   // measured 2026-08-08, up from 20 — see the note below
  "leagues": 22,
  "fixtures": 2331,
  "teamsNeverSynced": 0,
  "oldestLastSyncedAt": "2026-08-06T05:00:17.061+00:00",
  "unbucketedFixtures": 43,
  // Added 2026-08-01 with the news feature.
  "news": {
    "articles": 699,
    "feedsEnabled": 21,
    "feedsStale": 0, // feeds that have published nothing recently
    "feedsDisabled": 20, // LALIGA per-club feeds, rejected as archival
    "newestArticleAt": "2026-08-01T07:31:22+00:00",
    "oldestArticleAt": "2026-07-02T08:00:00+00:00",
    "trackedTeamsWithoutFeed": 0,
  },
}
```

Useful while developing: `teamsNeverSynced` tells you how much of the catalogue is still empty — it is
`0` as of 2026-07-28.

⚠ `fixtures` and `leagues` count **every** row across both data sources, including the older
API-Football data no team reads any more. They are an ops number, not "how many fixtures the API will
serve you".

On the `news` block: `trackedTeamsWithoutFeed` should stay `0` — anything else means a club's news page
is silently empty. `oldestArticleAt` should never be more than ~31 days old; if it drifts further, the
hourly retention purge has stopped. `feedsDisabled: 20` is expected and permanent — see the news
endpoints above.

### `GET /cronogol/feed/{slug}.ics`

The subscribable calendar feed. Public, no auth, no token. Returns
`Content-Type: text/calendar; charset=utf-8` and a complete `VCALENDAR`.

```
GET /cronogol/feed/real-madrid.ics
→ 200  Content-Disposition: attachment; filename="real-madrid.ics"
       Cache-Control: public, max-age=900
       ETag: W/"pKvL4V9wCC_igT42tGlDca-Y2I4"
       Last-Modified: Tue, 28 Jul 2026 06:18:52 GMT
```

⚠ **Query parameters are ignored here, not rejected.** This is the one route in the domain where the
strict-validation rule below does **not** apply: `?_=1690000000` returns 200, not 400. Calendar clients
and proxies append their own cache-busters to a URL a subscriber saved, and a 400 would silently stop
their calendar updating.

`404` for an unknown slug, with the usual JSON error body. **The whole CURRENT season is served** —
every competition and status, no date window, because a fixture that vanishes from a feed is
_deleted_ from the subscriber's calendar. Since 2026-09-22 (§144) that contract is a database view,
`calendar_fixtures`: the club's current season as the backend last synced it. The one thing it adds:
when the club's next season is synced, the finished season's results leave the feed. Past seasons the
backend now holds for LaLiga and the Premier League never enter a calendar.

```ics
BEGIN:VEVENT
UID:fixture-5355ba8f-6092-411b-a1fd-0bf7e0a7e1da@cronogol
SEQUENCE:17993891
DTSTAMP:20260728T061811Z
DTSTART:20260822T193000Z
DTEND:20260822T213000Z
SUMMARY:Real Madrid at Espanyol
TRANSP:TRANSPARENT
LOCATION:RCDE Stadium\, Cornellà de Llobregat
DESCRIPTION:LALIGA EA SPORTS · Jornada 2\nRCDE Stadium\, Cornellà de Llobregat
CATEGORIES:Football,LALIGA EA SPORTS
STATUS:CONFIRMED
END:VEVENT

BEGIN:VEVENT
UID:fixture-11053e87-8427-4976-b658-64125faa89ca@cronogol
DTSTART;VALUE=DATE:20260906
DTEND;VALUE=DATE:20260907
SUMMARY:Real Madrid at Real Betis
DESCRIPTION:LALIGA EA SPORTS · Jornada 4\nKick-off time to be confirmed\n…
END:VEVENT
```

### Subscribing — what the UI needs to offer

**There is no Apple sign-in, and there should not be.** Subscribing is just a URL; Apple Calendar
fetches it server-side with no credentials. Render **two** affordances:

If the user picked a subset of matches, `POST /cronogol/feed` first and use the returned `path` in place
of `/cronogol/feed/{slug}.ics` below — everything else about subscribing is identical.

> ⚠ **The host in a `webcal://` link is a one-way door.** It is copied onto the subscriber's device and
> stays there; nothing can tell them their feed moved — the calendar simply stops updating. Use
> **`crono-gol.com`** and nothing else. Never emit the `onrender.com` host, even though it works.

1. **Primary CTA — `webcal://`.** A plain link, not a `fetch`:
   ```html
   <a href="webcal://crono-gol.com/cronogol/feed/real-madrid.ics">
     Subscribe in Calendar
   </a>
   ```
   On iOS and macOS this opens Calendar's subscribe sheet directly. Build it by swapping the scheme on
   your existing base URL. Never `fetch()` a `webcal://` URL — the browser cannot.
2. **Secondary — copy the `https://` URL** to the clipboard, for Google Calendar ("Other calendars →
   From URL", which rejects `webcal://`), Outlook, and Android.

   > ### ⚠ Google wants opposite schemes in its two "add by URL" surfaces
   >
   > The line above is about Google's **manual** box, which takes `https://`. The one-click **deep link**
   > `googleAddUrl()` builds takes `webcal://`:
   >
   > ```
   > https://calendar.google.com/calendar/r?cid=webcal%3A%2F%2Fcrono-gol.com%2Fcronogol%2Ffeed%2Freal-madrid.ics
   > ```
   >
   > Percent-encode the `cid` value, and **keep the `webcal://` scheme inside it**. Handed an `https://`
   > cid the deep link does not error — it opens Google Calendar and silently adds nothing, so the
   > button is indistinguishable from a dead one and no console message says why. This is not
   > hypothetical: the jornada and club rails shipped that way and the bug survived review because
   > every other part of the link — origin, path, markup, feed — was correct.

   ⚠ **This is for the user's own other devices, not for sharing.** Label it that way — "Add to Google
   Calendar", not "Share". As of 2026-07-28 feeds are per-user: if someone else wants the fixtures they
   subscribe themselves, either from the public club feed or by making their own. **Do not build a share
   button.** A shared personal feed means one person's edits and one person's unsubscribe silently
   change someone else's calendar.

⚠ **Downloading is not subscribing.** `Content-Disposition: attachment` means clicking the `https://`
link downloads a **snapshot** that never updates again. If you offer it at all, label it as such — the
whole point of the feature is the live subscription.

⚠ **Refresh cadence is not ours to control.** Apple honours the feed's `REFRESH-INTERVAL: PT1H`, but
the subscriber picks the interval on-device (Settings → Calendar → Refresh Calendars) and the default
is conservative; Google ignores the hint and polls roughly daily. A postponement reaches a phone in
hours to a day, not minutes. Do not promise real-time updates in the copy.

Rendering reality, matching caveat 2: **~35 of 38 events are all-day** (`DTSTART;VALUE=DATE`) because
the kick-off time is not confirmed yet. `DTEND` on a timed event is a **2-hour estimate**, and every
event is `TRANSP:TRANSPARENT`, so subscribing never makes anyone look busy.

### Saving a match selection

For "pick some matches, then subscribe". The plain `/cronogol/feed/{slug}.ics` above always carries the
**whole** season — it has no way to express a selection, and it **ignores** any query parameter you add
(see the warning above), so `?matches=…` silently returns everything.

⚠ These two write routes are the only rate-limited endpoints in the domain: **20/min per IP**, and they
return **429** when exceeded. Everything else on `/cronogol` is unthrottled.

#### `POST /cronogol/feed`

```jsonc
// request
{ "slug": "real-madrid", "mode": "subset",
  "fixtureIds": ["5355ba8f-…", "64d9902a-…"] }     // omit for mode "all"

// 201
{ "token": "1kxAW792DxYJiePLChw-fGTN",
  "path":  "/cronogol/feed/custom/1kxAW792DxYJiePLChw-fGTN.ics",
  "mode":  "subset",
  "count": 2,                                       // fixtures the feed will contain
  "claimed": false,                                 // true when created while signed in
  "revokedAt": null,
  "editSecret": "u7Kd2QpX9mLvB4nR6sT1wYcZ" }        // ⚠ returned ONCE, see below
```

**You get a `path`, not a URL** — prepend your own origin, exactly as you already do to build the
`webcal://` link.

> ### ⚠ `editSecret` is returned exactly once
>
> Only its hash is stored, so **there is no endpoint that will ever give it back**. It is the credential
> for `PUT` and for claiming the feed into an account.
>
> - **Anonymous user:** persist it (localStorage, beside the token). Losing it means the feed keeps
>   serving forever but can never be edited or claimed.
> - **Signed in:** you can ignore it — `claimed` is already `true` and the user's JWT authorises edits.
>
> Never put it in a URL, a query string, or anything you render for sharing.

⚠ **`mode: "all"` is not the same as listing every id.** It re-reads the club on every fetch, so cup
fixtures drawn later still appear. If you send `subset` with all 38 ids today, that subscriber will
**never** receive a Copa del Rey match. Map your "select all" checkbox to `mode: "all"`.

Validation is strict here, unlike the `.ics` route: `400` for a fixture id that is not this club's, an
empty `fixtureIds`, a non-UUID, or an unrecognised property. `404` for an unknown slug.

#### `PUT /cronogol/feed/custom/{token}`

Same body minus `slug`, same response. **The subscriber's URL keeps working** — this is the entire
reason the feature is token-based rather than encoding the selection in the URL.

⚠ **Requires a credential as of 2026-07-28.** Send exactly one of:

```
X-Feed-Edit-Secret: <the editSecret from POST>     # anonymous feed
Authorization: Bearer <supabase jwt>               # once the feed is claimed
```

**403** if you send neither, the wrong secret, the token as the secret, or a JWT that is not the owner's.
**409** if the feed has been unsubscribed. **404** for an unknown token.

⚠ Once a feed is claimed the edit secret is **retired** — only the owner's JWT works. This is deliberate:
signing in revokes any secret that leaked beforehand.

⚠ You cannot change the club. A different club needs a new token.

#### `GET /cronogol/selections/{token}`

```jsonc
{
  "token": "1kx…",
  "path": "/cronogol/feed/custom/1kx….ics",
  "mode": "subset",
  "count": 3,
  "slug": "real-madrid",
  "fixtureIds": ["5355ba8f-…", "64d9902a-…", "e1d65504-…"],
} // null when mode is "all"
```

Re-opens a saved selection in your editor. Use it so "edit my selection" survives a cleared
localStorage or a different device — the token is the only thing the user needs to keep.

#### `GET /cronogol/feed/custom/{token}.ics`

The feed itself. Identical in every respect to the club feed above — same headers, same `ETag`/`304`
behaviour, same query-params-ignored rule — except it contains only the selected matches and downloads
as `{slug}-custom.ics`. `404` for an unknown token.

> **The UIDs are identical to the club feed's.** A subscriber holding both sees each match once in each
> calendar, rather than two events their client cannot reconcile.

> ### ⚠ This changed on 2026-07-28 — the link is now read-only
>
> This section previously said _"anyone with the link can read **and edit** the selection."_ That is no
> longer true, and the change is the reason accounts exist.
>
> The token is a **public identifier**: it is in the URL a subscriber saved, it sits in their calendar
> app, their browser history and their device backup. It no longer authorises anything. Writing needs
> the **edit secret** returned once from `POST /cronogol/feed`, or the owner's JWT once the feed has
> been claimed — see [Accounts](#accounts) below.
>
> **What you must change:** persist `editSecret` when you create a feed, and send it as
> `X-Feed-Edit-Secret` on `PUT`. Without it you get **403**.

**Treat the token as unguessable, not as a password.** Anyone with the link can _read_ the selection and
subscribe to its calendar. Nobody can change it without the edit secret or the owner's account. The
fixture data itself is public either way.

## Contact

### `POST /cronogol/contact` — the contact page's transport

*Added 2026-08-29 (CRONOGOL.md §102).* Public, unauthenticated, **called from the browser** — not through
the front end's server — so the per-IP throttle sees the visitor rather than one shared Netlify egress
address. Covered by the CORS allowlist like every other browser write.

```jsonc
// request
{ "topic":   "feed",                     // feed | press | other
  "name":    "Lucía",                    // optional, ≤ 120
  "email":   "lucia@example.com",        // becomes the mail's Reply-To
  "message": "My Google Calendar has not picked up the feed since Tuesday.",
  "website": "" }                        // the honeypot — render off-screen, never fill

// 202
{ "ok": true }
```

- **`202`, not `201`** — nothing is created and nothing can be read back. The message goes straight to
  the inbox via Resend and is stored nowhere.
- **`400`** for an unknown `topic`, a malformed `email`, a `message` under **12 non-space characters**,
  or any property not listed above (`forbidNonWhitelisted`). The front end enforces the same floor with
  its own wording, so a 400 here means a request the form did not send.
- **`429`** at **5 per minute per IP** — tighter than the feed writes because every accepted request
  sends real mail from the shared `send.altagamafc.com` sender.
- **`502`** `{ "error": "undelivered" }` when the relay refuses. Show "email us directly" and the
  address; do not retry automatically.
- ⚠ **A filled `website` is a 202 that sends nothing.** The response is deliberately identical to a
  real send so a bot cannot learn which field to leave blank. Do not treat 202 as proof of delivery
  in a test — check the inbox.
- `Accept-Language`'s first tag is copied into the mail body for the person replying. It is not
  validated and affects nothing else.

The topic ids are a protocol shared with the form's chips; the front end's `lib/legal/contact.ts`
carries the same three strings. ⚠ `fixture` and `editorial` existed for a few hours on 2026-08-29 and
were removed by product decision — the page is support and business only. Do not add them back.

## Accounts

**Shipped 2026-07-28.** Google and email/password, via Supabase Auth. There is no Apple sign-in.

> **⚠ New 2026-07-30 — `AccountView` gained a field and `/cronogol/me` gained a `PATCH`.**
> Fixture-change email notifications are built server-side and opt-in. The account page needs a toggle
> and a save CTA; the full contract, the four ways to get a 400, and the copy obligations are in
> **[`cronogol-notifications-handoff.md`](./cronogol-notifications-handoff.md)**.

> **⚠ New 2026-08-01 — the display name and the email are editable.**
>
> `PATCH /cronogol/me` accepts `displayName`, and there is a new `POST /cronogol/me/email`.
> `AccountView` gained `pendingEmail`.
>
> **Two things changed that are easy to miss:**
>
> 1. **Do not call `supabase.auth.updateUser({ email })` any more.** Changing the address goes through
>    this API now — see the email flows below. The old snippet in this file said otherwise and was
>    corrected here.
> 2. **A saved display name is now permanent.** It used to be re-derived from the Google profile on
>    every request, which meant a saved name silently reverted on the next page load. It no longer does.

> ### ✅ Email/password is live as of 2026-07-29 — build both buttons
>
> This block previously said "build the Google button only". Custom SMTP is now configured and verified
> end to end: a real signup, a delivered confirmation, a clicked link, `dmarc=pass`. **Nothing in this
> API changed when it was switched on** — both flows were always supported here.
>
> Confirm the current state yourself. ⚠ **The endpoint needs an `apikey` header** — your publishable key
> is enough, and it exposes nothing secret:
>
> ```bash
> curl -s -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
>      "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/settings" | jq .external
> # want: "google": true, "email": true
> ```
>
> Without the header you get `{"message":"No API key found in request"}`, and piping that through `jq`
> yields `null` — which looks like "no providers are configured" rather than "bad request". Don't
> conclude anything from a `null`.

### ⚠⚠ Do NOT change `NEXT_PUBLIC_SUPABASE_URL` without pinning `storageKey` first

The Supabase project gained a custom domain on 2026-08-01. Both hosts work, so **switching is optional
and there is no deadline**. If you do switch, this is the trap.

`supabase-js` derives the localStorage key for the session from the *hostname*, and `lib/supabase/client.ts`
does not set one explicitly. From the installed source (`@supabase/supabase-js/dist/index.cjs`):

```js
const defaultStorageKey = `sb-${baseUrl.hostname.split(".")[0]}-auth-token`;
```

So the key silently changes with the URL:

| `NEXT_PUBLIC_SUPABASE_URL` | localStorage key |
| --- | --- |
| `https://wtxuryktmryzhepxafqd.supabase.co` (current) | `sb-wtxuryktmryzhepxafqd-auth-token` |
| `https://altagamafc.crono-gol.com` (if you switch) | `sb-altagamafc-auth-token` |

**Change the URL on its own and every signed-in user is signed out.** Their session is still in the
browser, under a key the new client never looks at. It presents as "the app forgot me after a deploy",
with no error anywhere.

Pin the key to its current value **before or in the same change as** the URL switch:

```ts
client ??= createClient(url!, publishableKey!, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // ⚠ Pinned. Without this, supabase-js derives the key from the hostname,
    // so moving to the custom domain renames it and orphans every live
    // session. The value is deliberately the OLD project ref — it is just a
    // storage key, and changing it later costs another mass sign-out.
    storageKey: "sb-wtxuryktmryzhepxafqd-auth-token",
  },
});
```

Once pinned, the URL can move freely and sessions survive.

⚠ Also note: the Google OAuth console already lists **both** callback URLs, so sign-in works on either
host. That part needs nothing from you.

### ⚠ Signing up does not sign the user in

This is the one behaviour that will bite you, because it looks exactly like a failure:

```ts
const { data, error } = await supabase.auth.signUp({ email, password });
// error   === null          ← it worked
// data.user                 ← exists
// data.session === null     ← and there is NO session
```

Confirmation is required (`mailer_autoconfirm` is off, deliberately — otherwise anyone could register an
address they do not own). Until the user clicks the link in their email there is **no session and no
access token**, so every call to this API stays anonymous.

**Render "Check your email to confirm your account", not an error.** Treating a null session as a failed
signup is the most likely way to break this flow, and the user has no way to recover from the wrong
message — they will simply try again and hit the 60-second resend window.

Signing in _before_ confirming returns `AuthApiError: Email not confirmed`. Show that as "confirm your
email first", with a resend affordance — not as "wrong password".

### The three email flows

Mail is sent by Supabase, not by this API — this service never sees the tokens. That holds for all
three, **including the email change**: the API forwards your access token to Supabase Auth and Supabase
sends the confirmation itself.

```ts
// 1. Sign up. Sends "Confirm your AltaGama FC account".
await supabase.auth.signUp({
  email,
  password,
  options: { emailRedirectTo: "https://altagamafc.com" },
});

// 2. Forgot password. Sends "Reset your AltaGama FC password".
//    Always show the same confirmation even for an unknown address —
//    a differing response tells an attacker which emails have accounts.
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: "https://altagamafc.com/reset-password",
});

// …then on that page, once the recovery link has established a session:
await supabase.auth.updateUser({ password: newPassword });

// 3. Change email. Sends "Confirm your new AltaGama FC email address".
//    The old address stays active until the new one is confirmed.
//
//    ⚠ CHANGED 2026-08-01 — this goes through the API now, NOT
//    supabase.auth.updateUser({ email }). See POST /cronogol/me/email below.
//    Calling updateUser directly still works, but the API route is what the
//    account page uses, and only it keeps `pendingEmail` consistent.
await requestEmailChange(accessToken, newEmail);
```

⚠ **Every `redirectTo` / `emailRedirectTo` must already be listed in Supabase → Authentication → URL
Configuration → Redirect URLs.** An unlisted one silently falls back to the Site URL, which looks like
"the reset link goes to the wrong page" and has nothing to do with your code.

⚠ **The confirmation link returns tokens in the URL fragment**, so the page it lands on must be served
over **https** and must let `supabase-js` consume the fragment before you redirect anywhere.

⚠ **A confirmation link is single-use.** If users on corporate mail report "token expired" for links
they never clicked, their mail security scanner is prefetching it. The fix is switching templates to
`{{ .Token }}` (a 6-digit code) with `verifyOtp` — a front-end change too, so do not do it
pre-emptively. See `.claude/cronogol/smtp-findings.md` §5.

**Rate limits:** 30 emails/hour project-wide, plus a **60-second per-user window** between sends. A user
who mashes "resend" gets nothing and no error worth showing — disable the button for 60s.

> Email/password will be switched on once `DEPLOY.md` §8.4 is verified. Nothing in your code needs to
> change when it is — both flows already work against the same API.

The browser talks to **Supabase Auth directly** for sign-in, and to this API for everything else:

```ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);

await supabase.auth.signInWithPassword({ email, password });
await supabase.auth.signInWithOAuth({ provider: "google" });

const { data } = await supabase.auth.getSession();
// Send this to crono-gol.com:
//   Authorization: Bearer ${data.session.access_token}
```

⚠ **The publishable key is for `/auth/v1` only.** Never query Supabase tables from the browser — they
are grant-revoked and will return `401 / 42501`. Everything goes through this API.

⚠ **Bearer token, not cookies.** `Access-Control-Allow-Credentials` is never sent, so a cookie could not
reach this host cross-origin anyway. Read the access token from the session and set the header yourself.

⚠ **An expired token is a 401, even on routes that allow anonymous callers.** It never silently degrades
to anonymous — that would let a save succeed while quietly not belonging to the user. Refresh the
session and retry.

### What an account is for

Without one, the token and its edit secret are the only things a user keeps. With one: their feeds are
listed, editable from any device, and unsubscribable.

### `GET /cronogol/me`

```jsonc
{
  "id": "aaaa…",
  "email": "fan@example.com",
  "displayName": "Alice Alvarez", // null until set; an email/password signup
  //                                 starts with none
  "timeZone": null,
  "pendingEmail": null, // an email change awaiting confirmation
  "notifyFixtureChanges": false,
}
```

⚠ **`email` is read from Supabase Auth, not from this service's copy of it.** That matters in exactly
one window: after a user confirms an email change, their access token still carries the **old** address
until it refreshes, up to an hour later. This field is correct the whole time.

**So do not derive the displayed address from the JWT** — `session.user.email` will disagree with this
for that hour, and this one is right.

`pendingEmail` is non-null between requesting a change and confirming it. It clears itself once the
change lands, so there is nothing to poll and nothing to reset.

### `PATCH /cronogol/me` — save the account

```jsonc
{
  "notifyFixtureChanges": true, // REQUIRED on every call
  "displayName": "Alicia", // optional; omit to leave unchanged
  "timeZone": "Europe/Madrid", // optional; omit to leave unchanged
}
```

⚠ **`notifyFixtureChanges` is required even on a save that only changes the name.** An empty body is a
400 by design — a save must never silently no-op. Any form writing this route has to hold the toggle's
current on-screen value.

An **omitted** key means "leave it alone". An explicit `null` is a **400**: clearing a field is not an
operation this route offers.

`displayName` is capped at **60 characters**, must contain a non-whitespace character, rejects control
characters, and is trimmed server-side.

⚠ **Once saved, the name is the user's own.** It used to be re-derived from `user_metadata.full_name` on
every request, so a Google user's saved name reverted on their next page load. It no longer is — which
also means a user who links Google _after_ signing up will not inherit that Google name.

**One thing worth saying in copy:** a Google user sees their Google name prefilled and may assume
editing it changes their Google account. It does not.

### `POST /cronogol/me/email` — change the sign-in address

```jsonc
// request
{ "email": "new@example.com" }

// 201 — an AccountView, with pendingEmail set and email UNCHANGED
```

⚠ **This does not change the address.** It asks Supabase to send a confirmation; the change lands when
the user clicks the link. Until then `email` holds the old address and `pendingEmail` holds the
requested one. **Never render "Email updated"** — the success here is "we sent something".

The response is a full `AccountView`, so the pending state can be rendered from it without a refetch.

⚠ **Check whether _Secure email change_ is on for the project.** If it is, Supabase mails **both** the
old and the new address and **both** links must be clicked. The copy has to say so — a user who clicks
one link, sees nothing change, and is told nothing will report this as broken.

| Status  | Meaning                                                                                 |
| ------- | --------------------------------------------------------------------------------------- |
| **400** | The address could not be used                                                           |
| **429** | 5 requests/minute — tighter than everything else here, because each one sends real mail |
| **401** | Usual token rules                                                                       |

⚠ **A 400 is returned both for a malformed address and for one that already belongs to another account,
and the API will not tell you which.** Distinguishing them would let anyone signed in probe whether a
given address has an account here. **There is no 409.** Word the error to cover both — _"That address
can't be used. Check it and try again."_ — never "already taken", which would be a guess that is often
wrong.

There is no cancel-pending-change endpoint and no resend endpoint. Re-requesting **is** the resend,
within the rate limit.

### `GET /cronogol/me/feeds`

**What am I subscribed to.** Returns the caller's feeds, each shaped like
`GET /cronogol/selections/{token}` — `token`, `path`, `slug`, `mode`, `count`, `fixtureIds`, `claimed`,
`revokedAt`. Never returns an edit secret.

### `POST /cronogol/me/feeds` — claim an anonymous feed

```jsonc
// request
{
  "token": "1kxAW792DxYJiePLChw-fGTN",
  "editSecret": "u7Kd2QpX9mLvB4nR6sT1wYcZ",
}
```

Use this when someone creates a feed anonymously and _then_ signs up. Idempotent for the owner.
**403** for a wrong secret · **409** if it already belongs to another account · **404** for an unknown
token.

⚠ **The token goes in the body, not the path** — a token in a path segment ends up in server logs.

⚠ The edit secret is required. Without it, anyone who had seen the subscription URL could claim the feed
and lock its creator out.

### `DELETE /cronogol/me/feeds/{token}` — unsubscribe

Owner only (**403** otherwise). Idempotent.

> ### ⚠ Unsubscribing empties the calendar; it cannot remove it from the device
>
> The feed keeps returning **200** with a valid but **empty** `VCALENDAR`, so the matches disappear from
> the user's calendar on its next refresh — hours to a day, per the refresh-cadence warning above.
>
> **The now-empty calendar entry stays in their calendar app until they delete it there.** No server can
> change that: a calendar subscription is client-side state that this API cannot see or reach. **Say so
> in the confirmation copy**, or an empty-but-present calendar reads as a bug and generates support
> mail. Something like: _"Removed. The matches will disappear at the next refresh — you can delete the
> empty calendar in your calendar app."_
>
> There is no un-revoke. Create a new feed instead.

### `DELETE /cronogol/me` — delete the account

**Added 2026-08-24.** In-app account deletion — the App Store requires the path to exist
(Guideline 5.1.1(v)), and the web account page may offer it too.

```
DELETE /cronogol/me
Authorization: Bearer <access token>

→ 204 No Content
```

**204 with no body**, then discard the session client-side and treat the user as signed out.
Idempotent: a retry after a timeout also answers **204**, even though the user is already gone —
the JWT stays signature-valid until it expires, and the server treats "user not found" as success.

What it does, in order:

1. **Revokes every claimed feed first** — permanent, exactly like
   `DELETE /cronogol/me/feeds/{token}`: each feed keeps answering **200** with a valid but
   **empty** `VCALENDAR`, and the now-empty calendar entry stays on the device until the user
   deletes it there. Reuse the unsubscribe confirmation copy above — same caveat, all feeds at
   once. There is no un-revoke and no un-delete.
2. Deletes the auth user, the profile (display name, timezone, notification opt-in), any pending
   email change, **and the account's follows** (added 2026-09-01 — they cascade with the account).

What it does **not** do: push device registrations (native app) survive as anonymous,
device-scoped registrations — deleting an account does not silently disable a device's alerts;
the device's own switches or OS notification settings do that.

⚠ **Follows and devices part company here, deliberately.** The account's follow list dies with the
account; the device's registered clubs do not. A signed-out device keeps alerting for whatever it
last registered, which is the same behaviour it has always had — deletion removes the roaming copy,
not the device's own. A user who wants the alerts to stop turns them off on the device.

**429** at 5 requests/minute, same as the email-change route. **Confirm in the UI before calling**
— the server has no undo and no second step.

### `GET` / `PUT /cronogol/me/follows` — account follows

⭐ **Follows roam with the account** as of 2026-09-01 (decision 0041). Both routes require a bearer;
there is no anonymous form, because an anonymous account follow is a contradiction. Anonymous
devices keep their own local list exactly as before.

⚠ **Built for the native app; the web app has not adopted it.** The endpoints are ready whenever the
web wants them, but today the web's "followed" still means "has a claimed feed", and the two are
different truths. Do not wire one screen to follows and another to feeds and expect them to agree.

**Why this exists.** Follows used to be device state, and a list carries no timestamps — so when one
device unfollowed a club and another device (which never heard) re-sent its old list, the unfollow
came back. Neither device was wrong; neither could tell which was newer. So the wire shape is a list
of **events**, and the sync verb is **merge**, never wholesale replace.

```jsonc
// GET /cronogol/me/follows → 200
{
  "follows": [
    { "clubSlug": "real-madrid", "followedAt": "2026-08-20T10:00:00.000Z", "unfollowedAt": null },
    { "clubSlug": "elche",       "followedAt": "2026-08-20T10:00:00.000Z", "unfollowedAt": "2026-09-01T22:04:11.000Z" }
  ]
}
```

⚠ **Tombstones are in the response on purpose.** `unfollowedAt` non-null means "unfollowed at this
moment". A client that only learned the live follows could not tell an unfollowed club from one it
has never heard of, and would re-follow it on its next sync — the exact bug above. Keep them
locally, send them back, and prune ones older than ~90 days.

```jsonc
// PUT /cronogol/me/follows — send the events you know
{
  "follows": [
    { "clubSlug": "barcelona", "followedAt": "2026-08-30T18:00:00.000Z", "unfollowedAt": null },
    { "clubSlug": "alaves",    "followedAt": "2026-08-01T09:00:00.000Z", "unfollowedAt": "2026-09-01T21:58:00.000Z" }
  ]
}
// → 200, same shape as GET: the merged canonical state, ordered by clubSlug
```

**Merge rules.** Per club, incoming versus stored:

1. The side whose **latest timestamp** — `max(followedAt, unfollowedAt)` — is newer wins outright.
2. **An exact tie goes to the follow.** Losing a follow silently kills that club's alerts; a
   spurious follow costs one tap.
3. **Future timestamps are clamped to the server's `now()`**, each independently. A device with a
   fast clock would otherwise write a row nothing could beat until real time caught up.
4. **`unfollowedAt <= followedAt` normalises to a live follow** (rule 2 applied inside one row).
   This is reachable in practice — clamping a future pair collapses both to `now`.
5. Duplicates of the same club within one body fold by the same rules, so array order never matters.

⚠ **Trust the echo, not the 200** — the same rule as `PUT /cronogol/push/device`. A future timestamp
comes back clamped and an inverted pair comes back as a live follow, so the response body, not your
request, is what is now true. Sending the same body twice is a no-op and writes nothing.

**Errors:**

- **404** `Unknown club: x, y` — a slug not in `GET /cronogol/teams`, for a club the account does not
  already hold. The whole body is refused and nothing is written. (A club that has since *left* the
  vocabulary is still accepted if the account already has a row for it, so a club dropped by a
  provider sync can never wedge your sync.)
- **400** — more than **20 live** (un-tombstoned) follows. Precisely: refused only if the body would
  make the live count exceed `max(20, current live count)`. So a tombstone-only body, or one that
  does not grow the live count, **always succeeds** even for an account somehow above the cap.
  ⚠ **This 400 is reachable on a normal first sign-in** — two devices holding 15 different follows
  each merge to 30. Surface it as "you follow too many clubs, remove some", never as a retry loop.
- **400** — more than 100 entries in `follows` (tombstones included), a bad ISO-8601 timestamp, or
  any undeclared field, including inside a nested entry.
- **429** at 20 requests/minute. ⚠ **Per IP, not per account** — several users behind one carrier
  NAT share the budget.

⚠ **Two different caps, and they are not the same mechanism.** This route caps **20 live follows per
account** with the growth rule above. `PUT /cronogol/push/device` separately caps **20 slugs per
request** and simply **rejects** a longer array with a 400 — it does not truncate. A client that
merges to 20 follows fits both; one that tries 21 fails differently on each route.

### `PUT /cronogol/push/device` — register a push device (native app)

**Added 2026-08-24.** iOS-only. Registers (or wholesale-replaces) a device's push registration:
its APNs token, followed clubs, alert switches and language. This is also the device's durable
follow state — it is **separate from calendar feeds**, and neither affects the other.

```jsonc
// request — anonymous OR with a bearer; a bearer links the registration to the account
{
  "token": "ab…64 lowercase hex…ab",
  "platform": "ios",
  "lang": "es",                    // push copy language — the one server-rendered surface
  "clubSlugs": ["real-madrid", "sevilla"],
  "alertMoved": true,              // kickoff moved / confirmed / TBD / reinstated
  "alertPostponed": true,          // postponed / cancelled
  "alertGoals": false,             // goals, red cards, full time. OPTIONAL; defaults false
  "activityToken": "ab…hex…ab",    // OPTIONAL. ActivityKit push-to-start token — NOT the token above
  "environment": "sandbox"         // optional; dev builds mint sandbox tokens. Default "production"
}

// 200
{
  "clubSlugs": ["real-madrid", "sevilla"],
  "alertMoved": true,
  "alertPostponed": true,
  "alertGoals": false,
  "lang": "es",
  "environment": "sandbox",
  "liveActivityCapable": false,    // whether a push-to-start token is on file — never the token
  "linked": false                  // whether an account holds it — never whose
}
```

⚠ **`alertGoals` is the one OPTIONAL alert flag, and it defaults `false`.** Optional so a client
built before it existed keeps registering — a required field is a 400 for every old build, which is
the same silent push death an *undeclared* field causes. `false` because goal alerts are a new class
of interruption and opting in every registered device is not the server's call. ⚠ It is always
present in the RESPONSE: trust that, not your request. ⚠ It is ONE switch for all three of goal,
red card and full time — by design; do not draw three.

⚠ **The token goes in the body, never a path**, and the response **never echoes it**. Possession
of the token is the authorisation — there is no edit secret for devices.

⚠⚠ **`activityToken` is a DIFFERENT token from `token`, and a different LENGTH.** `token` is the
APNs device token and is exactly 64 lowercase hex. `activityToken` is the ActivityKit **push-to-start**
token — per device *and per activity type* — which lets the server start a Live Activity on a locked
phone with the app closed. Apple documents no fixed size for it, so this field accepts **64–512
lowercase hex**. ⚠ Validating it with the 64-hex rule that fits `token` rejects every real one, and
because the field is optional the rejection is a **400 on the whole registration** — taking the follow
list down with it.

⚠ **Omitting it is ORDINARY, not an error.** Below iOS 18, on a simulator, or with Live Activities
switched off in Settings there is no token to send. Such a device simply receives the `match_*`
banners instead of a card, and `liveActivityCapable` reads `false`.

⚠ **Send it on every registration once you have it, and re-send when it rotates** (reinstall,
restore-from-backup). A stale push-to-start token is *accepted* by APNs and produces no card, silently
— and because the server suppresses the ordinary goal banner for a device it believes it started a
card on, a stale token can cost the reader both.

Call it on launch, on permission grant, and on every follow change — it is an idempotent replace.
Registering while signed in links the row; **an anonymous refresh keeps an existing link** (sign-out
does not unlink a device; only re-registering from another account would move it).

**404** names an unknown club slug — the slugs must come from `GET /cronogol/teams`.
**400** for a malformed token, an undeclared field, or a string where a boolean belongs.
**429** at 20/minute.

### `DELETE /cronogol/push/device` — unregister (body: `{ "token": "…" }`)

**204**, idempotent, silent on an unknown token. Soft: a later re-register PUT revives the same
registration. This is the app's "alerts off for this device" — it touches no account, no feed, and
no other device.

> ### What the server pushes — and what it does NOT
>
> ⚠ **This block described exactly two types until 2026-08-28; there are now five.** The two below
> are the fixture-change pair; the three live ones are documented after them.
>
> Sent when a followed club's fixture changes:
> `kickoff_moved` (also covers confirmed / TBD / reinstated, with `oldKickoffUtc`/`newKickoffUtc`)
> and `fixture_postponed` (with `status: "postponed" | "cancelled"`). Both carry
> `thread-id`/`apns-collapse-id` = `fixture-{id}`, a `deepLink` of `altagamafc://club/{slug}`, and
> ⚠ **`fixtureId` as a uuid STRING** — the numeric ids in the design handoff's sample payloads were
> placeholders.
>
> Since 2026-08-25 both types also carry, for the app's notification extensions:
> `mutable-content: 1` and an `aps.category` equal to the `type`; `homeName`/`awayName` and
> `homeAbbr`/`awayAbbr` (⚠ home club **first**, which is not necessarily the followed club);
> `venue`, `round`, `kickoffUtc` (⚠ on a postponement this is the kickoff that **was**); and
> `crestPairUrl`/`homeCrestUrl`/`awayCrestUrl`, which are just the crest route above plus the
> fixture id. The payload is ~1.1 KB against APNs' 4 KB ceiling.
>
> ⭐ **Goal, red-card and full-time pushes EXIST as of 2026-08-28** (decision 0033) — `match_goal`,
> `match_red_card` and `match_full_time`, gated by the device's `alertGoals`. They are dispatched
> from inside the live session's own **30-second** loop, not the fixture-change cron, and they carry
> the live meta keys (`minute`, `minuteExtra`, `minutesLeft`, `score`, `cards`, `consequence`,
> `secondYellow`) plus `interruption-level: time-sensitive` on the first two. ⚠ **LaLiga only**, and
> ⚠ **nothing is delivered until `CRONOGOL_LIVE_PUSH_ENABLED` is on** — it ships `false` and the
> detector logs what it would have sent.
>
> ⭐ **Live Activities exist as of 2026-08-28** (decision 0034) — a Lock Screen / Dynamic Island card
> for the length of a match, started with `activityToken` and updated over an APNs **broadcast
> channel**, one per fixture. ⚠ **iOS 18+ only**, gated by the same `alertGoals` switch, and dark
> behind `CRONOGOL_LIVE_ACTIVITY_ENABLED`.
>
> ⚠⚠ **For a device that has a card, the `match_*` banners above are SUPPRESSED** — the card's own
> update carries the alert instead, so a goal interrupts once rather than twice. A device with no
> `activityToken` is unaffected and keeps the banners.
>
> ⛔ **None of this is reachable from the web.** A Live Activity is an iOS surface: there is no route
> that starts, updates or lists one, and the channel ids are never exposed. The only thing the API
> surfaces is `liveActivityCapable` on a device registration.
>
> ⛔ **Still no half-time push and no per-minute update.** The card's clock is drawn on the device
> from an anchor the server sends; only goals, red cards and full time are ever pushed. Apple budgets
> Live Activity updates and forwarding every poll cycle would exhaust it inside one half.
>
> ⚠⚠ **`minute` on a PUSH is the regulation minute and stoppage is `minuteExtra` — the opposite of
> `minute` on `GET /cronogol/live`.** They are two different clocks and both are documented
> correctly: the live route carries the MATCH clock, which LaLiga folds (`94` means 90+4, and
> `injuryTime` is always null); a push carries an EVENT, which arrives split, so a 90+4 goal is
> `{ "minute": 90, "minuteExtra": 4 }`. **Never render the sum** — `47` is not a minute that
> happened. The server already composes the body text (`90+4’`), so this only matters if you read
> the raw keys.
>
> ⚠ A full-time push carries **no sound** and `interruption-level: active`; goals and reds carry
> `sound: "default"`. None of the three carry crest urls — the live alert design is crest-free and
> its attachment is a glyph plate the service extension draws itself.
>
> **No kickoff-reminder push is sent** — reminders are scheduled locally on the device from fixture
> data, by design. Delivery cadence: fixture changes are detected by the ~3h sync and dispatched
> within ~30 minutes after a 30-minute quiet period.


### `GET /cronogol/fixtures/{id}/crest.png?slot=pair|home|away` — composed crest imagery

**PNG bytes, not JSON.** Draws one or both clubs' crests for a fixture, server-side. Built for the
**native app's notifications** (the service extension attaches `pair`; the long-look card reads
`home` and `away` off disk), but it is an ordinary public route and nothing about it is push-specific.

```
GET https://crono-gol.com/cronogol/fixtures/64d9902a-7bbf-46f7-a51b-f34fffc24406/crest.png?slot=pair

200  Content-Type: image/png
     Cache-Control: public, max-age=86400
     ETag: W/"cwFCa0gLQW-0gBC-6w--bKFRevg"
     <44698 bytes of PNG>
```

| `slot` | Output | What it is |
| --- | --- | --- |
| `pair` (default) | **256×256** | Dark rounded plate, home crest inset top-left, away inset bottom-right. Corners are **transparent**. |
| `home` | **128×128** | One crest, **fully transparent background**, no plate. |
| `away` | **128×128** | The same, for the away club. |

⚠⚠ **It ALWAYS answers with an image. A crest that cannot be drawn is a lettered tile, never an
error.** The only `404` is an unknown (or malformed) fixture id; an unknown `slot` or any undeclared
query param is a `400`. Do not write a fallback for "the image failed" — write one for "the request
failed", which is a different and much rarer thing.

⚠⚠ **The abbreviation tile is part of the design, not a failure state.** LaLiga and the Premier
League have real crests. **Bundesliga clubs publish SVG only and Serie A publishes WebP**, neither
of which can be decoded by the backend or by iOS — so for those two leagues *every* notification
shows a three-letter tile (`#1e2126`, hairline `rgba(255,255,255,.14)`, code in `#8fa0a6`). That is
correct output. Never treat it as a bug, and never substitute artwork for a club that has none.

⚠ **There is no size parameter, and there will not be one.** `id` picks a fixture and `slot` picks a
composition the route already owns — no `?size=`, no `?abbr=`, no `?home=`. Nothing a caller supplies
reaches the canvas, which is the only reason a public unauthenticated renderer can sit on this
domain at all (the same property the `/og/*` routes carry). **A new size needs a new named slot** —
ask, and it is a small change; do not expect to pass a number.

⚠ **`Cross-Origin-Resource-Policy: same-origin`.** The app fetches this with `URLSession`, which does
not care. **A browser on `altagamafc.com` cannot embed these bytes cross-origin** — an `<img>` from
the web app will be blocked. If the web app wants the plate, that is a one-line server change, but it
has to be asked for.

The ETag is derived from the source crests, which are content-addressed, so a conditional request is
exact and cheap — send `If-None-Match` and expect a `304`. Both crests being tiles still produces a
stable ETag, and it changes if a club gains artwork or is renamed.

### `GET|POST /cronogol/notify/unsubscribe/{token}` — **not for the front end**

The one-click unsubscribe link inside notification emails. Serves **HTML directly** and is called by
the recipient's mail client or browser, never by this app. Listed only so it is not mistaken for a
missing JSON endpoint.

### `POST /cronogol/admin/track-league` — **not for the front end**

How a club becomes tracked. Operator-only, secret-key guarded. Listed here because it changes what
`GET /cronogol/teams` returns and which slugs resolve to a feed.

```jsonc
// POST { "provider": "laliga", "leagueExternalId": "1", "dryRun": true }
{
  "provider": "laliga",
  "season": 2026,
  "dryRun": true,
  "fetched": 20,          // clubs in the provider's roster
  "resolved": 20,         // how many we could match to a club we hold
  "alreadyTracked": ["real-madrid", "barcelona", "..."],
  "newlyTracked": ["elche", "levante", "malaga", "racing", "deportivo"],
  "unresolved": [],       // in the roster, not matched — needs link-provider
}
```

⚠ `leagueExternalId` is the **provider's** competition id — LALIGA's `'1'` (primera) or `'2'`
(segunda) — not a `leagues.id` and not our `leagues.slug`.

`POST /cronogol/admin/register-league` is **deprecated**: it runs through the api-football adapter,
which cannot read the current season.

### `POST /cronogol/admin/register-roster` — **not for the front end**

Its successor (2026-08-05), and the route that brought the Premier League in: registers a
competition's roster from **any** provider — creating the league row (with its public slug) and club
rows where none exist, tracking crosswalked clubs where they do. Operator-only, secret-key guarded.
Listed because one call changes what `GET /cronogol/teams` returns, which league slugs the jornada
routes resolve, and which club slugs become feed URLs.

```jsonc
// POST { "provider": "premier-league", "leagueExternalId": "8",
//        "leagueSlug": "premier-league", "season": 2026, "dryRun": true }
{
  "provider": "premier-league",
  "leagueSlug": "premier-league",
  "season": 2026,
  "dryRun": true,
  "fetched": 20,
  "league": { "created": true, "slugAssigned": true, "newsBridged": false },
  "alreadyTracked": [],
  "newlyTracked": [],       // crosswalked clubs flipped to tracked
  "inserted": [{ "externalId": "3", "name": "Arsenal", "slug": "arsenal" }],
  "disambiguated": [],
  "slugConflicts": [],      // clubs needing a link-provider call first — each names it
}
```

It also links `news_leagues.<slug>.league_id` on the real run (`league.newsBridged`), which is what
gives the league's clubs news attribution — there is still no PL news *content*, see the caveats
section.

### `POST /cronogol/dashboard/api/stories/:id/approve` — the every-language hold

⚠ **New refusal, 2026-08-11.** Approving a story now returns **409 `incomplete-editions`** when the
story does not yet carry every language the pipeline is configured for. It is not an error: the
missing edition is written by the next scheduled run, and the story then approves normally.

```jsonc
// POST { "note": "reads well" }
// 409 when the English edition has not been written yet
{ "statusCode": 409, "message": "incomplete-editions" }
```

The override, for a story whose second language will never arrive:

```jsonc
// POST { "note": "shipping es-only", "allowIncompleteEditions": true }
```

⚠ It waives **only** "wait for the other language". A story the gate held still cannot be approved by
any route.

⚠ **A story may still publish in one language.** After a bounded number of writer attempts the
pipeline gives up and ships what exists, so an article whose `language` field reads `ES` in the
English slot remains a normal outcome — see the localization notes above.

### `POST /cronogol/admin/story-reconcile` — **not for the front end**

Reconciles the editorial pipeline's review queue against the CMS. A reviewer rejects a story by
**deleting its entry in Hygraph**, and the `story_drafts` row was left in `in_review` for ever; this
finds those rows and moves them to `rejected`. Operator-only, secret-key guarded. Listed because it
is the only route that can move a story to a terminal state without a human clicking anything, and
because a rejected story disappears from `GET /cronogol/news` once retention removes its row.

⚠ **`dryRun` defaults to `true`.** An empty body reports what it would do and writes nothing.

```jsonc
// POST { "dryRun": true }        // or { "dryRun": false, "limit": 25 }
{
  "dryRun": true,
  "examined": 18,      // rows probed, oldest first
  "missing": 16,       // entries Hygraph no longer has
  "rejected": 0,       // rows actually moved -- always 0 on a dry run
  "present": 2,        // still awaiting a publish click
  "errors": 0,         // probes that THREW. Never counted as deletions
  "raced": 0,          // stamped `published` between the probe and the write
  "purged": 0,         // storage objects reclaimed
  "orphanedAssets": [],// Hygraph Assets left behind -- nothing can delete them
  "unknownAge": 1,     // in_review with no reviewed_at, so never probed
  "unlinked": 0,       // in_review with no entry id. Should be impossible
  "abandoned": false,  // ⚠ true = the sweep stopped early. NOT a clean result
  "items": [
    { "draftId": "…", "storyKey": "…", "slug": "robbie-ure-…",
      "entryId": "cmso0ppcltl0x07n3o9xvvrc2",
      "outcome": "skipped", "detail": "dry run" }
  ]
}
```

⚠ **A `502` is the normal failure**, including on a dry run: whenever the CMS could not be probed the
route refuses to answer rather than reporting `missing: 0`, because a caller who cannot tell a failed
sweep from an empty one will eventually treat one as the other. `abandoned` is never `true` in a
`200` body.

⚠ **Only rows older than 48 hours are probed**, measured from when the story was approved. A story
approved this morning is never touched, so this cannot race a reviewer who is about to publish.

⚠ **There is no un-reject.** Reversing one is a hand-written SQL update, exactly as it already is for
a rejection a human typed. If a reviewer restores the entry from Hygraph's trash and publishes it, the
article goes live on the site while its draft row stays `rejected`.

### Admin — **not for the front end**

`POST /cronogol/admin/{register-roster,register-league,track-league,sync,backfill-league-types,link-provider,story-reconcile,club-kit}` require the Supabase
**secret key** in an `apikey` header. That key must never reach a browser. Listed only so you recognise them in logs.

⚠ **`club-kit` stores kit/jersey imagery, and nothing serves it.** No `/cronogol` route returns a kit,
there is no `kits` field on any club or fixture payload, and the images are not in any response
documented here (CRONOGOL.md §80). It is listed only because you will see it in logs and in the ops
console — treat the capability as absent until this document says otherwise.

---

## Live scores

A scoreboard: what is being played on a given day, and how a club's last few matches finished. Two
routes, both public, both `Cache-Control: public, max-age=60`.

### ⚠ Read this before you build the carousel

**These scores do not come from the same place as everything else in this API.** Fixtures, clubs,
jornadas and the `.ics` feeds come from our licensed providers. The scoreboard comes from a third-party
source we have no agreement with, ingested into our own database on a schedule. Five consequences, all
of which change what you should build:

1. **It is not live.** The ingest runs every four hours — 00:35, 04:35, 08:35, 12:35, 16:35, 20:35 UTC.
   A match that finished at 22:50 UTC appears after the 00:35 run. A `status: "live"` row is a
   **snapshot that was true at the last sweep**, not a ticker — do not build a minute-by-minute match
   centre on it, and do not poll this endpoint faster than the 60-second cache. (Tightened from six
   hours on 2026-08-09. Do not build UI that assumes it will keep tightening: the source's own
   `lastUpdate` stamp is minutes behind the final whistle, so there is no cadence at which this becomes
   a ticker. Show `lastUpdateAt` if the user needs to know how fresh a score is.)
2. **`score` is `null`, not `0`, before kick-off.** Render `vs` (or the kickoff time), never `0 - 0`.
   The upstream really does send zeros for unplayed matches; we strip them, and a null here means "no
   score yet".
3. **`status` can be `"unknown"`, and that is a normal value.** We have only observed three of the
   source's states in the wild. Anything unrecognised is passed through as `unknown` with the source's
   own wording in `statusLabel` — render that label, do not treat `unknown` as an error state.
4. **Crest URLs are hot-linked from the source's CDN.** This is the one place in the API where an image
   URL is not on our own storage (everywhere else, see *Crests: use `logoUrl`*). They may 404 or
   disappear without notice. **Always render a fallback.**
5. **The whole feature is provisional.** It can be switched off. If it is, these routes keep returning
   200 with data that stops moving — so a UI that says "as of {lastUpdateAt}" degrades gracefully and
   one that implies real-time does not.

**These are not our clubs.** The scoreboard carries whatever its editors chose to show that day —
Argentine league matches, club friendlies, Portuguese fixtures. There is **no relationship** between an
event here and a club in `GET /cronogol/teams`: no shared ids, no slug, no crosswalk. Do not try to
join them.

### `GET /cronogol/live` — what is being played right now — new 2026-08-27

The only route in this API that carries a **minute of play**, and the only live data that joins to a
fixture.

```
GET /cronogol/live
GET /cronogol/live?league=laliga
```

`Cache-Control: public, max-age=10`. Optional `league` is a slug; an unknown one returns an empty list
rather than a 400. ⚠ Any other query parameter is a **400**, not a no-op.

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

**What to know before you build on it:**

- ⚠⚠ **An empty `matches` array is the NORMAL answer.** Most of the time nothing is being played.
  Render your ordinary empty state, never an error.
- ⚠⚠ **LaLiga only.** Premier League, Serie A, Bundesliga and segunda return nothing here today. This
  is a coverage gap, not a bug, and it is the first thing to widen.
- ⚠ **`minute` is null unless `status` is `"live"`** — null before kick-off and null once finished.
  Render nothing, never `0'`.
- ⚠ **`minute` INCLUDES stoppage time.** A `94` is "90+4". There is no split, and `injuryTime` is
  always null for LaLiga. Render `94'`, not `90+4'`.
- ⚠ **`score` is null before kick-off**, exactly as on `/cronogol/scores`. Render `vs`, never `0 - 0`.
- ⚠ **`halftime` is always `{null, null}` today.** The source does not state one. It is in the shape
  because a second source will.
- ⚠ **`status` can be `"unknown"`.** The upstream's in-play vocabulary is only partly observed, and an
  unrecognised state is reported honestly rather than guessed. Render the score and omit the minute.
- **`lastSeenAt` is "we looked", not "it changed".** It advances every ~30s during a live match whether
  or not the score moved — which is what makes it useful for spotting a stalled session.
  ⭐ **As of 2026-08-29 the server enforces it too**: a row nothing has refreshed in ten minutes is not
  returned at all. Still render it — "as of HH:MM" is the honest presentation — but you are no longer
  the only thing standing between a stale row and the screen.
- **`polling`** says whether a session is currently refreshing. See the caveat section above for why
  the two silences differ. ⚠ **As of 2026-08-29 there is only one silence**: `false` now always comes
  with an empty `matches`.
- ⭐ **`events` is the in-play timeline — new 2026-08-28** (backend §98). Same
  field names as `/cronogol/fixtures/{id}/events` minus its stored-row `id`, so
  you render it with the same component. Ascending by the source's own ordering.
  - ⚠⚠ **`[]` does not distinguish "no events" from "not fetched yet".** Both
    render as nothing, which is the same thing on screen. If you need the
    difference, `score` tells you: a non-zero score with an empty array means a
    fetch has not landed, not that the goals were unattributed.
  - ⚠ **`player.slug` is often `null` while live** — it resolves only when the
    person matches a squad row we hold. Render `name`; treat `slug` as an
    optional link, never an identity.
  - ⚠ **`teamSlug` on an OWN GOAL is the scorer's team, not the side that
    benefited.** Passed through from the source, not derived. Do not infer which
    score it moved. Unverified as of 2026-08-28.
  - ⚠ `type` can be `"unknown"` — render the minute and the name, skip the icon.
  - ⚠ **Still LaLiga only**, and the durable route remains the record after full
    time. These vanish with the row; those persist.
- ⚠ **Rows disappear when the match ends.** This route serves in-play matches only; the final score
  arrives on `/cronogol/fixtures` (within ~3h) and on `/cronogol/scores` (within ~4h). Do not treat a
  row vanishing as an error, and do not use this route as a results feed.

### `GET /cronogol/scores`

One day's matches, in kickoff order.

| Query | |
| --- | --- |
| `date` | `YYYY-MM-DD`. Optional; defaults to today (UTC). Any other format is a 400 |
| `days` | 1–7, default 1. How many consecutive buckets to return, counting **back** from `date` |

**`?days=2` is the one you want for a "today and yesterday" carousel** — it returns both buckets in a
single response instead of two requests. Observed against production: `days=1` returned 3 events,
`days=2` returned 15.

```
GET /cronogol/scores?days=2

{ "date":  "2026-08-07",
  "dates": ["2026-08-07", "2026-08-06"],
  "count": 15,
  "events": [ … ] }
```

Three things about the span:

- **`date` is still the ANCHOR bucket, not the range.** It keeps the meaning it had before `days`
  existed, so nothing written against the single-day shape changes behaviour. `dates` is the span, and
  each event carries its own `date` — group on that to render day headings.
- **`events` stays in ascending kickoff order across the whole span**, so yesterday's matches come
  first. The order does not change with `days`; reverse client-side if the carousel wants newest first.
- ⚠ **Only the newest TWO buckets are kept fresh.** The ingest sweeps today and yesterday, so
  `days=3`–`7` return older rows only if something backfilled them, and those rows stopped updating
  when they left the sweep's window. `days=2` is the supported case; the larger cap exists for
  operators, not for the UI.

`days` outside 1–7, non-integer, or non-numeric is a 400.

⚠ **`date` is the source's editorial day bucket, not a UTC window over kickoffs.** They mostly agree
and occasionally do not — in the sample below, a match kicking off at `2026-08-07T22:30Z` is filed under
`2026-08-08`. The response echoes `date` back so you always know which bucket you got. If you need
strict chronology, sort on `kickoffUtc`.

```json
{
  "date": "2026-08-06",
  "count": 12,
  "events": [
    {
      "id": "01_0152_20260805_540_927",
      "date": "2026-08-06",
      "kickoffUtc": "2026-08-05T22:00:00+00:00",
      "tournament": { "id": "0152", "name": "Liga Argentina" },
      "status": "finished",
      "statusLabel": { "es": "Finalizado", "en": "Ended" },
      "home": {
        "name": "Boca",
        "shortName": "BOC",
        "optaId": "540",
        "crestUrl": "https://e01-marca.uecdn.es/assets/datos-deportivos/escudos/opta/png/80x80/540.png"
      },
      "away": {
        "name": "Estudiantes",
        "shortName": "EST",
        "optaId": "927",
        "crestUrl": "https://e01-marca.uecdn.es/assets/datos-deportivos/escudos/opta/png/80x80/927.png"
      },
      "score": { "home": 1, "away": 0 },
      "lastUpdateAt": "2026-08-07T00:47:56.79+00:00"
    }
  ]
}
```

⚠ **Note the day bucket.** That match kicked off at `22:00` UTC on the **5th** and is filed under the
**6th**. Sort on `kickoffUtc` if you need chronology.

⚠ Timestamps come back as `+00:00`, and `lastUpdateAt` carries sub-second precision with trailing
zeros trimmed (`…56.79+00:00`). Both are valid ISO 8601 and `new Date()` parses them — do not
string-compare them against a `Z`-suffixed value.

A day with nothing on it is `200` with `count: 0` and an empty `events`, never a 404.

**400** on a malformed date (`20260806`, `06-08-2026`, a full datetime), on an impossible one
(`2026-02-31`), and on any undeclared query parameter.

### `GET /cronogol/scores/recent`

A club's most recent **results**, newest first.

| Query | |
| --- | --- |
| `team` | **required.** Free text, 2–64 characters — a club name, not a slug |
| `limit` | 1–50, default 10 |

⚠ **`team` is fuzzy free-text matching against the scoreboard's own club names.** It is accent- and
case-insensitive (`Atlético` finds `atletico madrid`) and matches on containment in either direction,
so `madrid` finds both Madrid clubs and `union` finds `Unión de Santa Fe`. That is the trade for being
able to ask about any club the source carries. **It is not a club identifier** — do not store it, and
do not expect it to correspond to a `slug` from `GET /cronogol/teams`.

Only **finished matches with a real score** are returned. A "recent scores" list containing an unplayed
fixture would be a schedule, and `GET /cronogol/teams/{slug}/fixtures` is already that.

```json
{
  "count": 1,
  "events": [
    {
      "id": "01_0152_20260805_540_927",
      "date": "2026-08-06",
      "kickoffUtc": "2026-08-05T22:00:00+00:00",
      "tournament": { "id": "0152", "name": "Liga Argentina" },
      "status": "finished",
      "statusLabel": { "es": "Finalizado", "en": "Ended" },
      "home": {
        "name": "Boca",
        "shortName": "BOC",
        "optaId": "540",
        "crestUrl": "https://e01-marca.uecdn.es/assets/datos-deportivos/escudos/opta/png/80x80/540.png"
      },
      "away": {
        "name": "Estudiantes",
        "shortName": "EST",
        "optaId": "927",
        "crestUrl": "https://e01-marca.uecdn.es/assets/datos-deportivos/escudos/opta/png/80x80/927.png"
      },
      "score": { "home": 1, "away": 0 },
      "lastUpdateAt": "2026-08-07T00:47:56.79+00:00"
    }
  ]
}
```

A club nobody has heard of returns `200` with `count: 0` — the caller asked to filter a collection, not
to fetch a resource. The response never echoes the query back.

**400** on a missing `team`, on one shorter than two characters, on one containing anything other than
letters, digits, spaces and `.'-`, on a non-numeric `limit`, on `limit` above 50, and on any undeclared
query parameter.

### ✅ Verified against production, 2026-08-06

Both samples above are real responses, not illustrations. The sweep that produced them read 34 events
across two day buckets, mapped 15 football matches, skipped none and met no unrecognised match state.
Re-running it wrote the same 15 rows and changed no count, which is the upsert behaving.

Two behaviours worth knowing, observed in that run rather than reasoned about:

- `?team=boca` returned Boca's finished match; `?team=juventus` returned **0**, because the only
  Juventus match on the board was *scheduled* — `/scores/recent` is results-only, by design.
- The sanity check compared **0** fixtures. Correct for pre-season: it can only compare matches that are
  finished on both sides on the same day, and none of our tracked clubs had played. It is a cross-check,
  not a coverage metric.

### `status` — the whole vocabulary

| Value | What it means | Confidence |
| --- | --- | --- |
| `scheduled` | Not started. `score` is null | Observed |
| `finished` | Played to the end. `score` is populated | Observed |
| `live` | In play — **as of the last sweep, up to ~4 hours ago** | Partially observed |
| `postponed` | Postponed, suspended, cancelled or abandoned | ⚠ Never observed in the wild |
| `unknown` | The source reported a state we do not recognise. `score` is withheld | Normal, expect it |

⚠ **Render `statusLabel`, not a translation of `status`.** `statusLabel.es` / `.en` are the source's own
wording, and when `status` is `unknown` they are the only thing that says anything useful. `status` is
what you should branch on; `statusLabel` is what you should print.



### `crestUrl` — hot-linked, and sometimes a flag

Unlike club crests elsewhere in this API (§16), which we mirror into our own storage, scoreboard crests
are **hot-linked at the source's CDN**. Two consequences the design will not show you:

- ⚠ **A national team gets a country flag, not a crest.** Every World Cup competitor observed carried a
  144px flag image, where club crests are 80px. Same field, different kind of image and a different
  intrinsic size — so **constrain the box in CSS and never lay out off the image's own dimensions**, or
  World Cup rows render visibly larger than league rows.
- **It can 404 or vanish, and it is `null` often enough to matter.** Always render a fallback; a broken
  crest is a broken `<img>`, never a placeholder logo. The source sends no CORS headers, so the bytes
  are unreachable from JS — an `<img>` tag works, `fetch()` and canvas readback do not.

`optaId` is the crest's filename at the source, but **do not build image URLs from it.** The imagery is
licensed to the source, and constructing URLs for clubs with no fixture is a licensing question, not a
feature. Ask the backend before relying on anything crest-shaped beyond this field.

---
## Errors

Ordinary HTTP status codes.

⚠ **`503` with a `Retry-After` header, since 2026-09-14** — the backend sheds load when its database
budget is full (CRONOGOL.md §131.5). It is answered in milliseconds, never after a slow timeout, and it
is **retryable**: wait `Retry-After` seconds (currently `2`) and try once more. Treat it like a
network error in the UI, not like a 5xx outage — the cached copy at the edge is usually still being
served for the read routes, so a user rarely sees it.

```jsonc
// 503 — database budget full; retry after the header's number of seconds
// Retry-After: 2
{ "statusCode": 503, "message": "Busy — retry shortly" }
```

```jsonc
// 404 — unknown team slug
{ "message": "Unknown team: nope", "error": "Not Found", "statusCode": 404 }

// 400 — unknown query param (validation is strict: unrecognised params are rejected)
{ "message": ["property bogus should not exist"], "error": "Bad Request", "statusCode": 400 }

// 400 — bad enum value
{ "message": ["status must be one of the following values: scheduled, live, finished, postponed, cancelled"],
  "error": "Bad Request", "statusCode": 400 }

// 400 — news: a `publisher` that is not a lowercase slug (uppercase, spaces, …).
// ⚠ Shape only. `?publisher=espn` is well-formed and returns an empty list, not a 400.
{ "message": ["publisher must be a lowercase slug"], "error": "Bad Request", "statusCode": 400 }

// 400 — news: a `before` cursor that is not ISO 8601
{ "message": ["before must be a valid ISO 8601 date string"], "error": "Bad Request", "statusCode": 400 }

// 400 — ⚠ ONE bad value can produce SEVERAL messages. `?limit=abc`:
{ "message": [
    "limit must not be greater than 100",
    "limit must not be less than 1",
    "limit must be an integer number",
  ], "error": "Bad Request", "statusCode": 400 }
```

`message` is a **string** for 404 and a **string[]** for validation errors. Normalise before rendering —
and note the array can hold several messages about the **same** field, so rendering one line per entry
shows the user three complaints about one input. Show the first, or de-duplicate by field.

`5xx` returns a generic body with no internal detail — treat as "try again shortly".

⚠ **`429`** is possible on the six write routes — `POST /cronogol/feed`,
`PUT /cronogol/feed/custom/{token}`, `POST /cronogol/me/feeds`, `DELETE /cronogol/me/feeds/{token}`,
`PUT /cronogol/push/device`, `DELETE /cronogol/push/device` —
at 20 requests per minute per IP, and on `POST /cronogol/me/email`, `DELETE /cronogol/me` and
`POST /cronogol/contact` at 5 per minute. Nowhere else in this domain. Debounce the save button rather than
retrying.

**`401` vs `403`, which mean different things here:**

|         | Meaning                                                                  | What the UI should do                                                           |
| ------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| **401** | No token, or one that is expired/forged/malformed                        | Refresh the session; if that fails, sign in again                               |
| **403** | Authenticated fine, but not allowed to modify _this_ feed                | Do **not** retry. Missing or wrong `X-Feed-Edit-Secret`, or someone else's feed |
| **409** | The feed is already claimed by another account, or has been unsubscribed | Explain; there is nothing to retry                                              |

⚠ A 403 body never says _which_ of "wrong secret" or "belongs to an account" applies — that would leak
information about someone else's feed. Your copy has to cover both.

---

## TypeScript types

```ts
// The Champions League render-path routes (CRONOGOL.md §116) — shape PROVISIONAL, see the endpoint.
export type UclStage =
  | 'league-phase' | 'playoff' | 'round-of-16' | 'quarter-final' | 'semi-final' | 'final' | 'unknown';

export interface UclFixtureView {
  id: string;
  season: number;
  stage: UclStage;
  matchday: number | null;
  round: string | null;
  competitionName: string; // always 'UEFA Champions League'
  kickoffUtc: string;
  kickoffTbd: boolean;
  status: FixtureStatus;
  goalsHome: number | null;
  goalsAway: number | null;
  winnerSlug: string | null;
  venue: string | null;
  venueCity: string | null;
  fixtureId: string | null; // the club-centric twin, when a tracked club is involved
}

export interface UclFixtureDetailView {
  fixture: UclFixtureView;
  home: TeamView | null; // null = pre-draw placeholder side
  away: TeamView | null;
}
```

Copy into the Next.js repo. These mirror the server DTOs exactly.

```ts
export type Competition = "league" | "cup" | "friendly" | "other";
export type FixtureStatus =
  "scheduled" | "live" | "finished" | "postponed" | "cancelled";

/** A club's home ground. Null for opponent-only clubs. ⚠ `city`/`capacity` are
 *  Serie A ONLY; `latitude`/`longitude` are null in every league. */
export interface VenueView {
  name: string;
  imageUrl: string | null;
  imageUrls: Record<string, string> | null;
  /**
   * ⚠ `city` and `capacity` are non-null for SERIE A ONLY (since 2026-08-08);
   * null for LaLiga, the Premier League and the Bundesliga. `latitude` and
   * `longitude` are null on EVERY club in every league — see Rendering notes.
   */
  city: string | null;
  capacity: number | null;
  latitude: number | null;
  longitude: number | null;
}

export interface TeamView {
  slug: string;
  /** Display name — `Deportivo Alavés`, not the legal `… SAD`. */
  name: string;
  /** 3-letter code: `RMA`, `ALA`. Was null on every club before 2026-07-29. */
  shortName: string | null;
  country: string | null;
  /** The crest to render when you have no particular size in mind. */
  logoUrl: string | null;
  /**
   * ⚠ Keys are PER-LEAGUE VOCABULARY, not one scale: LaLiga `xsmall`…`xlarge`,
   * PL `"20"`…`"100"` plus `svg`, Bundesliga `svg` alone, Serie A `teamLogo` /
   * `teamLogoLight` (themes, not sizes).
   * ⚠ NOT ordered by weight, and sparse. Name every key you accept, in
   * preference order, and end at `logoUrl` — never index by position.
   */
  logoUrls: Record<string, string> | null;
  /**
   * Club hex, verbatim. Check contrast before putting text on it.
   * ⚠ Populated for LaLiga (25/25) and the Bundesliga (18/18) only — null on
   * every Premier League and Serie A club. And identical to each other on all
   * 18 German clubs, so a two-stop gradient renders flat.
   */
  colorPrimary: string | null;
  colorSecondary: string | null;
  venue: VenueView | null;
  tracked: boolean;
  /** null => no complete schedule has been fetched. See caveat 1. */
  lastSyncedAt: string | null;
}

export interface FixtureView {
  id: string;
  /** Perspective of the requested team. */
  homeAway: "H" | "A";
  opponent: string | null;
  opponentLogoUrl: string | null;
  /** As `TeamView.logoUrls`, for the opponent. */
  opponentLogoUrls: Record<string, string> | null;
  competition: Competition;
  competitionName: string | null;
  round: string | null;
  /** ISO 8601 with offset. */
  kickoffUtc: string;
  /** true => the time is a placeholder; render as all-day. */
  kickoffTbd: boolean;
  venue: string | null;
  venueCity: string | null;
  status: FixtureStatus;
  /** Requested team's goals, not the home team's. */
  goalsFor: number | null;
  goalsAgainst: number | null;
}

export interface TeamFixturesView {
  team: TeamView;
  count: number;
  fixtures: FixtureView[];
}

/* ------------------------------------------------------------------ jornada */

/** A club on a page that belongs to no club. Narrower than `TeamView`. */
export interface TeamRef {
  slug: string;
  name: string;
  /**
   * The club's own 3-letter code — `ALA`, `GET`, `BVB`.
   * ⚠ Nullable: fall back to `name`. Populated on all 83 tracked clubs today,
   * but it comes from the source and an opponent-only club can lack one.
   * ⚠ NOT unique — Valencia and Valladolid have collided. A label, never a key.
   */
  shortName: string | null;
  logoUrl: string | null;
  logoUrls: Record<string, string> | null;
}

export interface LeagueRef {
  slug: string;
  name: string;
  /** Null for cups/UEFA competitions — render the name alone, not a box. */
  logoUrl: string | null;
  /**
   * ⚠ SEMANTIC keys, unlike `TeamView.logoUrls`' sizes: `primary` is the full
   * lockup, `icon` is icon-only (LaLiga only today). Different artwork, not
   * different resolutions. `primary` always equals `logoUrl`.
   */
  logoUrls: Record<string, string> | null;
  /**
   * A tint for this competition, lowercase `#rrggbb`.
   * ⚠ **Ours, not the league's.** A UI accent we chose so a competition can be
   * told apart at a glance — not an official brand colour, and not comparable
   * to `TeamView.colorPrimary`, which is the club's own hex from the source.
   * ⚠ Null is normal: every cup, UEFA tie and friendly has none, and **Serie A
   * has none either** as of 2026-08-08. Fall back to a neutral.
   */
  accentColor: string | null;
}

// GET /cronogol/crests (CRONOGOL.md §135)
/** From the crest's file extension. ⚠ `webp`/`svg` are normal; Satori cannot draw `webp`. */
export type CrestFormat = 'png' | 'svg' | 'webp' | 'jpg';

export interface ClubCrestView {
  slug: string;
  name: string;
  shortName: string | null;
  /** Null → draw the monogram tile. */
  logoUrl: string | null;
  /** Provider's own keys, exactly as `TeamView.logoUrls` — pick via `crestSrc`. */
  logoUrls: Record<string, string> | null;
  format: CrestFormat | null;
}

export interface CrestSetView {
  /** `LeagueRef` without `accentColor`. `champions-league` has null logos. */
  league: Omit<LeagueRef, 'accentColor'>;
  /** The Champions League season served; null for a domestic league. */
  season: number | null;
  /** Echoes `?club=`; null when asked by league. */
  club: string | null;
  count: number;
  /** Sorted by name — key on `slug`. */
  crests: ClubCrestView[];
}

/** `GET /cronogol/brands` (CRONOGOL.md §141). `?slug=` returns ONE of these, not an array. */
export interface BrandView {
  slug: string;
  name: string;
  /** Always equals `logoUrls.primary`. PNG, trimmed, mostly black on transparent. */
  logoUrl: string;
  /** Semantic keys: always `primary`; adidas adds `mark`/`trefoil`, hummel `classic`. */
  logoUrls: Record<string, string>;
}

/**
 * ⚠ NOT `FixtureView`. Home and away are both named, and the score is
 * home-away rather than for/against — a jornada has no requesting club.
 */
export interface JornadaFixtureView {
  id: string;
  /** Null only for a row whose club could not be resolved. */
  homeTeam: TeamRef | null;
  awayTeam: TeamRef | null;
  competition: Competition;
  competitionName: string | null;
  /** The provider's label, e.g. "Jornada 4". The number is on the parent. */
  round: string | null;
  kickoffUtc: string;
  /** ⚠ True for most of the season. Render `--:--`, never midnight. */
  kickoffTbd: boolean;
  venue: string | null;
  venueCity: string | null;
  status: FixtureStatus;
  goalsHome: number | null;
  goalsAway: number | null;
}

export interface JornadaView {
  league: LeagueRef;
  season: number;
  matchweek: number;
  count: number;
  /** `clubs / 2`. Null when nothing is stored for the league-season. */
  expectedCount: number | null;
  /** `2 * (clubs - 1)` — 38 primera/Serie A/PL, 42 segunda, 34 Bundesliga. Never hardcode any. */
  totalMatchweeks: number | null;
  /** COVERAGE: we hold every match. False means missing data. */
  complete: boolean;
  /** SCHEDULE: times published. False is NORMAL — not an error state. */
  kickoffsConfirmed: boolean;
  fixtures: JornadaFixtureView[];
}

/** One pager entry. */
export interface JornadaSummaryView {
  matchweek: number;
  count: number;
  complete: boolean;
  kickoffsConfirmed: boolean;
  /** ⚠ Provisional while `kickoffsConfirmed` is false. Can span >1 week. */
  firstKickoffUtc: string | null;
  lastKickoffUtc: string | null;
}

export interface SeasonJornadasView {
  league: LeagueRef;
  season: number;
  expectedCount: number | null;
  totalMatchweeks: number | null;
  /** ⚠ Ordered by NUMBER, which is not date order. */
  matchweeks: JornadaSummaryView[];
}

/* ------------------------------------------------------- the fixture window */

/** One match in a cross-league date window. */
export interface WindowFixtureView extends JornadaFixtureView {
  /** Key into `FixtureWindowView.leagues` — where the name, logo and tint live. */
  leagueSlug: string;
  /** ⚠ Per FIXTURE. A window can straddle a season change; the envelope has none. */
  season: number;
  /**
   * Deep-links to `/cronogol/jornada/{leagueSlug}/{season}/{matchweek}`.
   * ⚠ A label, not a position — matchweek order is not chronological.
   * Null for a competition without rounds.
   */
  matchweek: number | null;
}

/** `GET /cronogol/fixtures`. */
export interface FixtureWindowView {
  /** The resolved bounds after defaulting. ⚠ HALF-OPEN: `[from, to)`. */
  from: string;
  to: string;
  /** Renderable fixtures returned — the "18 matches" number. */
  count: number;
  /** ⚠ True means the LAST DAY IS PARTIAL. Narrow the range or drop that column. */
  truncated: boolean;
  /**
   * First kickoff at or after `to`, for the empty state.
   * ⚠ Computed ONLY when `count === 0`. Null otherwise means "not looked up",
   * not "nothing ahead" — read it only when `count` is 0.
   */
  nextKickoffUtc: string | null;
  /** ⚠ What the window was SCOPED to, not what has matches in it. */
  leagues: LeagueRef[];
  fixtures: WindowFixtureView[];
}


/** Saved feed selections. */
export type FeedSelectionMode = "all" | "subset";

export interface FeedSelectionView {
  token: string;
  /** Prepend your own origin. Deliberately not an absolute URL. */
  path: string;
  mode: FeedSelectionMode;
  /** Fixtures the feed currently contains. 0 once revoked. */
  count: number;
  /** Whether it belongs to an account. Never says which one. */
  claimed: boolean;
  /** ISO 8601 once unsubscribed; the feed then serves an empty calendar. */
  revokedAt: string | null;
}

/** `POST /cronogol/feed` only. */
export interface CreatedFeedSelectionView extends FeedSelectionView {
  /**
   * ⚠ Returned exactly once and never retrievable again — only its hash is
   * stored. Persist it for an anonymous feed; ignore it when signed in.
   */
  editSecret: string;
}

/** `GET /cronogol/selections/{token}` and `GET /cronogol/me/feeds`. */
export interface FeedSelectionDetailView extends FeedSelectionView {
  slug: string;
  /** null when mode is 'all' — the feed re-reads the club instead. */
  fixtureIds: string[] | null;
}

/** `GET /cronogol/me`. */
export interface AccountView {
  id: string;
  /**
   * ⚠ From Supabase Auth, not from this service's mirror of it — so it stays
   * correct in the hour after a confirmed email change, while the JWT still
   * carries the old address. Never render `session.user.email` instead.
   */
  email: string | null;
  /** null until the user sets one; an email/password signup starts with none. */
  displayName: string | null;
  timeZone: string | null;
  /**
   * An email change awaiting confirmation, or null. Clears itself when the
   * change lands — there is nothing to poll and nothing to reset.
   */
  pendingEmail: string | null;
  /**
   * Opt-in for fixture-change email. Always a boolean — the column is
   * `not null default false`.
   *
   * ⚠ Never cache it. The one-click unsubscribe link in the mail flips this
   * server-side, so a stored `true` renders a control that lies about whether
   * mail is coming.
   */
  notifyFixtureChanges: boolean;
}

// ─── News (2026-08-01) ───────────────────────────────────────────────────────

/** Who wrote the article. Comes from our registry, never from feed content. */
export interface NewsPublisherView {
  /** `marca` | `laliga`. Also the `?publisher=` filter value. */
  id: string;
  /** ⚠ MUST be rendered on every card. */
  name: string;
  siteUrl: string | null;
}

export interface NewsArticleView {
  /**
   * ⚠ NOT a permanent handle. Articles are deleted after 30 days, so this must
   * not be persisted in bookmarks or share URLs. Store `url` for that.
   */
  id: string;
  title: string;
  /**
   * The publisher's own summary, ~1–3 sentences, truncated server-side.
   * There is no full article body and there will not be one.
   */
  excerpt: string | null;
  /** ⚠ EXTERNAL. Open with target="_blank" rel="noopener noreferrer". */
  url: string;
  /**
   * ⚠ Hot-linked to the publisher's CDN — unlike crests, this is NOT mirrored
   * by us. It can 404 or be hotlink-blocked. Always render an onError fallback.
   */
  imageUrl: string | null;
  publishedAt: string;
  publisher: NewsPublisherView;
  /** Often null — several publishers supply no usable byline. Fall back to
   *  `publisher.name` rather than rendering an empty author. */
  author: string | null;
  /** The publisher's own tags (e.g. `["Real Madrid"]`). NOT our team slugs. */
  categories: string[];
}

/** `GET /cronogol/news`. */
export interface NewsFeedView {
  count: number;
  /** Pass as `?before=` for the next page. null means there is no next page. */
  nextBefore: string | null;
  articles: NewsArticleView[];
}

/** `GET /cronogol/teams/{slug}/news`. */
export interface TeamNewsView extends NewsFeedView {
  /** ⚠ Deliberately slimmer than TeamView — no venue, colours or sync state. */
  team: {
    slug: string;
    name: string;
    logoUrl: string | null;
    logoUrls: Record<string, string> | null;
  };
}

// ---------------------------------------------------------------- scores --
// The live scoreboard. ⚠ A DIFFERENT source from everything above — read the
// "Live scores" section before using these. Not joinable to TeamView.

/** ⚠ `unknown` is a normal value, not an error. `postponed` is unobserved. */
export type ScoreboardStatus =
  | 'scheduled' | 'live' | 'finished' | 'postponed' | 'unknown';

export interface ScoreboardTeamView {
  name: string;
  shortName: string | null;
  /** Opta's public club id. Stable, but NOT a key into anything else here. */
  optaId: string | null;
  /** ⚠ Hot-linked at the source's CDN, unlike every other image in this API.
   *  May 404 or vanish. Always render a fallback.
   *  ⚠ Not always a crest, and not always one size: club crests are 80px, but
   *  national teams (World Cup) get a 144px COUNTRY FLAG here instead. Constrain
   *  the box; never size off the intrinsic image. */
  crestUrl: string | null;
}

export interface ScoreboardEventView {
  id: string;
  /** ⚠ The source's editorial day bucket — can differ from kickoffUtc's date. */
  date: string;
  kickoffUtc: string;
  tournament: { id: string | null; name: string | null };
  status: ScoreboardStatus;
  /** The source's own wording. Print THIS; branch on `status`. */
  statusLabel: { es: string | null; en: string | null };
  home: ScoreboardTeamView;
  away: ScoreboardTeamView;
  /** ⚠ null before kick-off — render `vs`, never `0 - 0`. */
  score: { home: number | null; away: number | null };
  /** When the SOURCE last moved this row. The real freshness signal. */
  lastUpdateAt: string | null;
}

/** GET /cronogol/scores */
export interface ScoreboardDayView {
  /** ⚠ The ANCHOR bucket — with ?days=2 this is still only the newest one. */
  date: string;
  /** Every bucket included, newest first. `[date]` when days is 1 or absent. */
  dates: string[];
  count: number;
  /** Ascending by kickoff across the whole span — oldest first. */
  events: ScoreboardEventView[];
}

/** GET /cronogol/scores/recent */
export interface ScoreboardRecentView {
  count: number;
  events: ScoreboardEventView[];
}


/* ---------- live (added 2026-08-27) ------------------------------------- */

/** ⚠ Narrower than FixtureStatus — a live poll never observes a schedule change. */
export type LiveStatus = 'scheduled' | 'live' | 'finished' | 'unknown';

export interface LiveMatchView {
  /** ⚠ fixtures.id — join on THIS, not on names or kickoff times. */
  fixtureId: string;
  home: { slug: string; name: string; shortName: string | null };
  away: { slug: string; name: string; shortName: string | null };
  kickoffUtc: string;
  status: LiveStatus;
  /**
   * ⚠ Null unless status is 'live'. Render nothing, never `0'`.
   * ⚠ INCLUDES stoppage: 94 means "90+4". Render `94'`, not `90+4'`.
   */
  minute: number | null;
  /** ⚠ Always null for LaLiga — the source folds stoppage into `minute`. */
  injuryTime: number | null;
  /** ⚠ null means "no score yet", never nil-nil. Render `vs`. */
  score: { home: number | null; away: number | null };
  /** ⚠ Always {null, null} today. Shaped for a second source. */
  halftime: { home: number | null; away: number | null };
  /** "We looked", not "it changed" — advances every ~30s during a live match. */
  lastSeenAt: string;
  /**
   * ⭐ The in-play timeline (added 2026-08-28).
   * ⚠ [] means "no events OR not fetched yet" — the two are not distinguished.
   */
  events: LiveMatchEventView[];
}

export type LiveMatchEventTypeView =
  | 'goal' | 'card' | 'substitution' | 'var' | 'missed-penalty' | 'unknown';

export interface LiveMatchEventPersonView {
  name: string;
  /** ⚠ Often null while live. Render `name`; treat this as an optional link. */
  slug: string | null;
}

export interface LiveMatchEventView {
  type: LiveMatchEventTypeView;
  /** `penalty` | `own` | `yellow` | `red` | … or null. */
  subtype: string | null;
  minute: number | null;
  minuteExtra: number | null;
  period: string | null;
  /** Scorer · booked player · the player coming ON. */
  player: LiveMatchEventPersonView;
  /** Assister on a goal; the player going OFF on a substitution. */
  related: LiveMatchEventPersonView | null;
  /**
   * Matches `home.slug` / `away.slug`. Null where an event has no side.
   * ⚠ On an OWN GOAL this is the SCORER's team, not the side that benefited.
   */
  teamSlug: string | null;
}

/** GET /cronogol/live */
export interface LiveView {
  /** ⚠ Empty is the NORMAL answer. LaLiga only today. */
  matches: LiveMatchView[];
  count: number;
  /** false + non-empty matches = live but not refreshing. That is the failure. */
  polling: boolean;
}


/* ---------- standings (added 2026-08-14; form + matchweek 2026-08-15) ---- */

/**
 * One criterion in a league's ordering rule.
 *
 * ⚠ Read `tiebreakers` off the response — do NOT hardcode a rule. LaLiga,
 * Segunda and Serie A consult head-to-head BEFORE goal difference; the Premier
 * League never does; the Bundesliga does it last.
 */
export type StandingsTiebreaker =
  | 'points'
  | 'head-to-head-points'
  | 'head-to-head-goal-difference'
  | 'goal-difference'
  | 'goals-for';

export interface StandingsRowView {
  /**
   * 1..N, contiguous, no repeats.
   *
   * ⚠ Clubs equal on every official criterion are ordered by club slug, which
   * is arbitrary. Two adjacent rows are not necessarily separated by anything
   * real — compare `points` before calling one club "above" another.
   */
  rank: number;
  team: TeamRef;
  /** Finished LEAGUE matches only — never live, cup or friendly. */
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  /** 3-1-0. */
  points: number;
  /**
   * Last five results, NEWEST FIRST, at most five (added 2026-08-15).
   *
   * ⚠ Newest-first is the opposite of how a WWDLW chip strip usually renders —
   * reverse it before mapping to chips. It is emitted this way so a shortened
   * array loses the OLDEST match rather than the most recent.
   *
   * ⚠ Fewer than five is normal; `[]` is normal and is never null. Early
   * season, a promoted club, and any club whose matches we do not fully hold
   * all produce a short array. There is no padding entry.
   *
   * ⚠ Counts exactly what `played` counts — finished league matches only. That
   * is a guarantee, not a coincidence: both come from the same rows.
   *
   * ⚠ With ?matchweek=, this is the form AS OF that matchday.
   */
  form: FormResult[];
}

export type FormResult = 'W' | 'D' | 'L';

export interface StandingsTableView {
  league: LeagueRef;
  /** Starting year: 2026/27 is 2026. */
  season: number;
  /**
   * The matchday this table is AS OF, or null for the live table.
   *
   * ⚠ Echoed from the request, never computed. Null means "you asked for the
   * live table", NOT "we could not work out the current matchday" — there is
   * no field that reports the latter. Not clamped to the league's length.
   */
  matchweek: number | null;
  /** The rule ACTUALLY applied, in order. ⚠ Differs per league. */
  tiebreakers: StandingsTiebreaker[];
  /**
   * Rows returned — the completeness signal.
   *
   * ⚠ Under-reports when coverage is worst. Compare against the league's known
   * size (20 / 22 for Segunda / 18 for the Bundesliga). There is deliberately
   * no `complete` flag.
   */
  clubs: number;
  /** Distinct matches counted, i.e. sum(played) / 2. */
  matchesPlayed: number;
  /** clubs * (clubs - 1). Null when clubs < 2. */
  matchesTotal: number | null;
  /** ⚠ A KICKOFF, not an ingest time. Null before a ball is kicked. */
  lastMatchUtc: string | null;
  rows: StandingsRowView[];
}

/**
 * `type` on a match event.
 *
 * ⚠ `'unknown'` is a REAL value you must render, not an error. It means the
 * source described something the backend has no name for yet, which will
 * happen — the underlying vocabulary is long-tailed. Show it as a neutral
 * timeline entry; never drop the row.
 */
export type MatchEventTypeView =
  | 'goal'
  | 'card'
  | 'substitution'
  | 'var'
  | 'missed-penalty'
  | 'unknown';

export interface MatchEventPersonView {
  /**
   * The display name as the source renders it — `Vini Jr.`, `Bellingham`,
   * `Malen`. Not a legal name, and not normalised: LaLiga's own casing is
   * occasionally poor (`C.soler`).
   */
  name: string;
  /**
   * Our `players.slug`, for linking to a squad page.
   *
   * ⚠⚠ **NULL FOR EVERY SERIE A AND BUNDESLIGA PERSON, ALWAYS.** Squads exist
   * for LaLiga and the Premier League only. Fall back to plain text — do not
   * hide the event.
   */
  slug: string | null;
}

/** One event on `GET /cronogol/fixtures/{id}/events` */
export interface MatchEventView {
  id: string;
  type: MatchEventTypeView;
  /**
   * The narrowing within a type: `normal` · `penalty` · `own` · `yellow` ·
   * `second-yellow` · `red` · `tactical` · `injury`, plus slugged free text for
   * VAR decisions.
   *
   * ⚠ An OPEN string, deliberately not a union — a closed type would reject
   * real data. Switch on `type`; treat this as a label. Null on Premier League
   * substitutions, which do not distinguish tactical from injury.
   */
  subtype: string | null;
  /** Regulation minute. Null means the source did not say — do not render 0. */
  minute: number | null;
  /**
   * Stoppage-time offset.
   *
   * ⚠ **Serie A only.** LaLiga and the Premier League fold stoppage into
   * `minute`, so a 90+4 arrives from them as `minute: 94, minuteExtra: null`.
   * Render `minuteExtra ? \`${minute}+${minuteExtra}\` : minute`.
   */
  minuteExtra: number | null;
  /** The source's period label — `SecondHalf`, `2ª parte`. Free text. */
  period: string | null;
  /** The club, as `TeamView.slug`. Null on a VAR decision belonging to neither. */
  teamSlug: string | null;
  /** Scorer · booked player · the player coming ON. */
  player: MatchEventPersonView;
  /**
   * The assister when `type === 'goal'`; the player going OFF when
   * `type === 'substitution'`. Null on everything else.
   *
   * ⚠ Null on a goal means UNASSISTED, not missing — about a third of goals
   * have no assister recorded.
   */
  related: MatchEventPersonView | null;
}

/** GET /cronogol/fixtures/{id}/events */
export interface FixtureEventsView {
  fixtureId: string;
  /**
   * Chronological, as ordered by the server.
   *
   * ⚠⚠ **Do NOT re-sort on `minute`.** Events share a minute often and this
   * order encodes each source's own chronology; sorting client-side will flip
   * substitution pairs between renders.
   *
   * ⚠⚠ **An empty array does NOT mean a goalless match** — it means nothing is
   * stored for that fixture yet. The sweep is 3-hourly and finished-only.
   */
  events: MatchEventView[];
  count: number;
}

/** `GET /cronogol/fixtures/{id}/lineups` (CRONOGOL.md §142). */
export type LineupPositionView = 'GK' | 'DF' | 'MF' | 'FW';

export interface LineupPersonView {
  name: string;
  /** ⚠ NULL for every Serie A and Bundesliga person, and for a Segunda player without a squad row. */
  slug: string | null;
}

export interface LineupPlayerView {
  player: LineupPersonView;
  shirtNumber: number | null;
  /** ⚠ Null is the common case on LaLiga/Segunda/Bundesliga (keeper only). Never infer from `formationPlace`. */
  position: LineupPositionView | null;
  /** Opta slot 1–11, keeper first, where the source states one. Null on the bench and on Serie A. */
  formationPlace: number | null;
  captain: boolean;
  /** Football notation: `45, 2` is 45+2. Null on a bench player who never came on, and before full time. */
  minuteOn: number | null;
  minuteOnExtra: number | null;
  /** Null on a player who finished the match. */
  minuteOff: number | null;
  minuteOffExtra: number | null;
}

export interface TeamSheetView {
  teamSlug: string;
  /** ⚠⚠ NULL for every LaLiga, Segunda and Bundesliga sheet. Present for the Premier League and Serie A. */
  formation: string | null;
  manager: { name: string } | null;
  /** Exactly eleven once `coverage.teamsheet` is true; the source's own order. */
  starters: LineupPlayerView[];
  bench: LineupPlayerView[];
}

export interface LineupCoverageView {
  /** Both sides stored. False ⇒ `home` and `away` are null. */
  teamsheet: boolean;
  /** Substitution minutes present. False before full time and always on the Bundesliga. */
  minutes: boolean;
  /** Final. False on a pre-kickoff sheet, which is replaced at full time. */
  settled: boolean;
}

export interface FixtureLineupsView {
  fixtureId: string;
  coverage: LineupCoverageView;
  home: TeamSheetView | null;
  away: TeamSheetView | null;
}

/** GET /cronogol/standings */
export interface StandingsView {
  /** The season every table is for, after defaulting. Always echoed. */
  season: number;
  /** ⚠ Empty, with a 200, for an unknown `?league=` slug. */
  tables: StandingsTableView[];
}

/** ⚠ Mapped in the BACKEND so no two clients can disagree about a band. */
export type SquadPosition = 'GK' | 'DEF' | 'MID' | 'FWD';

/** ⚠ Mapped in the BACKEND, lower-case, for the same reason as SquadPosition. */
export type SquadFoot = 'left' | 'right' | 'both' | null;

export interface SquadNationality {
  /**
   * Alpha-3, upper-case — `ESP`, `BRA`.
   *
   * ⚠⚠ The four home nations are **FIFA** codes (`ENG`, `SCO`, `WAL`, `NIR`),
   * NOT ISO 3166-1, because ISO has no alpha-3 for them. Validating this
   * against an ISO list rejects exactly the players an English squad is full of.
   */
  code: string;
  /** English country name, for the cell's `title`. */
  name: string;
}

/**
 * One squad member (`GET /cronogol/teams/{slug}/squad`).
 *
 * ⚠⚠ NO STATISTICS ON THIS TYPE, and the reason is now split (2026-09-09,
 * widened 2026-09-21): goals, assists, cards, timing, streaks and — since
 * CRONOGOL.md §143 — appearances, minutes and per-90 ARE served, on
 * `GET /cronogol/players/{slug}/stats`, keyed by `slug` below — while shots
 * and xG do not exist at any provider or price point this backend holds. Do
 * not build a stat column against THIS type; link to the stats route instead,
 * and read its `coverage` before labelling anything "apps".
 *
 * ⚠⚠ Carries PERSONAL DATA about named living people, including minors:
 * `dateOfBirth` and `placeOfBirth` are exact. Prefer `age`.
 *
 * ⚠ Every field but `id`, `name` and `position` is nullable, and an absent one
 * must render as an empty cell — never `0`, never `""`, never "Unknown".
 */
export interface SquadPlayerView {
  /**
   * Stable PERSON id — survives a transfer AND a new season. Safe as a key.
   * (The registration id is season-scoped and would break every August.)
   */
  id: string;
  /**
   * ⚠ Added 2026-09-09. The link target for `GET /cronogol/players/{slug}/stats`.
   * Nullable AND not unique — it is a LINK, never a key; use `id` to identify a
   * person. Null for Serie A and Bundesliga people, who have no squads ingested.
   */
  slug: string | null;
  /** ⚠ Nullable, and a null shirt sorts LAST rather than as zero. */
  shirt: number | null;
  /** Full registered name — often the legal one, and long. */
  name: string;
  /** ⚠ Prefer this in a narrow cell; `name` overflows. Nullable — fall back. */
  shortName: string | null;
  position: SquadPosition;
  /** The player's OWN nationality, never derived from the club's country. */
  nationality: SquadNationality | null;
  /** Whole years, derived server-side against one clock per response. */
  age: number | null;
  heightCm: number | null;
  /**
   * Preferred foot.
   *
   * ⚠ **This was `null` until 2026-08-20** — the Premier League serves it for
   * ~88% of its players. **LaLiga publishes none, so every Spanish player is
   * permanently null**; render an empty cell as normal, not as missing data.
   *
   * ⚠ `'both'` is a REAL value (23 of 960 PL players), not a stand-in for
   * unknown. Narrowing to `'left' | 'right'` rejects the ambidextrous.
   */
  foot: SquadFoot;
  weightKg: number | null;
  /** ISO `YYYY-MM-DD`. ⚠ Personal data — prefer `age`. */
  dateOfBirth: string | null;
  /** ⚠ Personal data. */
  placeOfBirth: string | null;
  /**
   * ⚠⚠ Real portraits EXIST — 396 of 500 LaLiga players — which post-dates the
   * feature brief's "no headshots" note. ⚠ Null for ~1 in 5 there, worst on
   * recent signings, because the source serves a grey silhouette the backend
   * drops. ⚠ **Closer to 1 in 2 null for the Premier League**, whose CDN has no
   * photo of most academy players. Build the fallback avatar first.
   * ⚠ **Dimensions differ by league** — 256x278 LaLiga, 110x140 Premier League.
   * Size the element. Immutable, cache hard.
   */
  photoUrl: string | null;
  international: boolean | null;
  /** Opta/Stats Perform player id, e.g. `p60772`. */
  optaId: string | null;
  loan: boolean | null;
  /** Loaned OUT to another club. */
  loanedOut: boolean | null;
}

/**
 * `GET /cronogol/teams/{slug}/squad`. 404 for an unknown slug; 200 with an
 * empty `players` for a known club we hold no squad for.
 *
 * ⚠ LaLiga Primera AND the Premier League have stored squads (2026-08-20).
 * Segunda, Serie A, the Bundesliga and Ligue 1 do not.
 */
export interface TeamSquadView {
  team: {
    slug: string;
    name: string;
    shortName: string | null;
    crestUrl: string | null;
  };
  /**
   * Starting year: 2026 is 2026/27.
   *
   * ⚠ NULLABLE, unlike the original brief — null is the honest answer for a
   * tracked club with no stored squad. Never a guessed year.
   */
  season: number | null;
  /** ⚠ When WE last read the provider — freshness, not transfer news. */
  lastSyncedAt: string | null;
  /**
   * ⚠ Unordered and ungrouped, as asked — banding and shirt order are
   * presentation, decided once in `groupSquad`.
   *
   * ⚠ The LEAGUE'S REGISTRATION LIST, not the club's squad page: registration
   * lags a club's own announcement by days.
   */
  players: SquadPlayerView[];
}
```

Nearly everything except `slug`, `name`, `id`, `kickoffUtc`, `status`, `competition` and `homeAway` is
nullable. `venue`, `round` and `opponent` are genuinely absent sometimes — design for it rather than
asserting non-null.

---

## Rendering notes

- **`kickoffTbd: true`** — the date may be provisional and the _time_ is meaningless. Render as all-day
  ("TBD"), never as a specific kick-off time.
- **Times are UTC with an offset.** Convert to the user's zone for display. ⚠ Where something needs
  the *league's* own local day rather than the reader's — "is this a midweek round?" — use the
  competition's zone: `Europe/Madrid`, `Europe/London`, `Europe/Berlin`, `Europe/Rome`.
- **`status: 'postponed'` / `'cancelled'`** need distinct visual treatment — they are the reason a live
  feed exists at all.
- **Crests are served from our own Supabase Storage bucket** as of 2026-07-29 — for `xsmall`, `small`
  and `medium`, which covers every slot a UI actually renders. `large` and `xlarge` in `logoUrls` are
  still hot-linked from `assets.laliga.com`. Objects are content-addressed and immutable
  (`max-age=31536000`), so a URL that works never stops working. Keep a fallback for a failed image
  load anyway: `logoUrl` is nullable, and a not-yet-mirrored crest serves the provider URL.
- **Pick a crest by key, never by position.** `logoUrls` keys are not ordered by weight — `large`
  (740px) is 249 KB while `xlarge` (900px) is 176 KB.
- ⚠ **Pick by key defensively: the map is sparse.** A key the provider does not serve is omitted rather
  than returned broken (2026-08-06), so a preference chain must fall through to the next size and
  ultimately to `logoUrl`, then to a placeholder. See the sparse-map caveat in the Premier League
  section — it applies to every league.
- ⚠ **The sparsest case is the Bundesliga: `logoUrls` is `{ svg }` and nothing else** on all 18 clubs.
  A chain that tries raster sizes and only then `logoUrl` will skip straight past the one good asset
  and land on the provider's file. **Put `svg` high in every preference order, not last** — it is a
  vector, so it is also the correct answer for every size from a 24px monogram to a 156px header.
- ⚠⚠ **Serie A keys `logoUrls` by THEME, not by size** — `{ teamLogo, teamLogoLight }` — which is new
  as of 2026-08-08 and breaks the assumption every other league taught. A chain walking size names
  matches nothing; one taking "the first value" can hand you the light-background mark. Name every key
  you accept and end at `logoUrl`. **And `teamLogoLight` is byte-identical to `teamLogo` on 17 of the
  20 clubs**, so it is not a dependable dark-mode asset — see "Wiring up Serie A" for the code.
- **⚠ News images are the exception to all of the above.** `article.imageUrl` points at the
  publisher's own CDN — it is *not* mirrored, *not* content-addressed, and *not* guaranteed to keep
  working. Give it an `onError` fallback and a fixed aspect box so a dead image does not reflow the
  card. Do not proxy or re-host it either: hot-linking with attribution is the arrangement, caching
  someone else's photography is not.
- **News excerpts are already truncated server-side** (≤400 chars, cut on a word boundary with an
  ellipsis). Clamp with CSS for layout if you like, but do not re-truncate in JS — you would be cutting
  an already-cut string and can end up with two ellipses.
- **`shortName` is a real club code now** (`RMA`, `ALA`) — it was `null` on every club until
  2026-07-29. Anything deriving a monogram from `name` can read this instead and keep its own table
  only as a fallback for a club that still returns `null`.
- **`team.venue` is the club's declared home ground** — its name and its photo. Deriving it from the
  first `homeAway: 'H'` fixture's `venue` string is close but not the same thing: that string is where
  _that match_ is played, so it differs for a ground-share, a temporary move during works, or a
  neutral-venue "home" tie. Prefer `team.venue.name`, falling back to the fixture string when it is
  `null` — it is null for any club reached only as an opponent.

  > ⚠ **UPDATED 2026-08-08 — `city` and `capacity` now fill in for SERIE A, and only Serie A.**
  > This note previously said all four were null on every club, verified 2026-07-29. That is no longer
  > true: the Lega states each club's ground, so all 20 Italian clubs return a `city` and 17 of 20 a
  > `capacity`. LaLiga, the Premier League and the Bundesliga remain null on both — their sources do
  > not state it, so this is not a gap that will close on its own.
  >
  > **A capacity or city component must therefore be null-tolerant**, or it renders for Italy and
  > breaks everywhere else. `fixture.venueCity` remains the fallback for a city string.
  >
  > ⛔ **`latitude` and `longitude` are still null on every club in every league, Serie A included** —
  > the source publishes them as empty strings, which the backend maps to null rather than through
  > `Number()`, since that yields `0` and pins every ground at 0°N 0°E. **Still do not build a map.**

- **`colorPrimary` / `colorSecondary`** are the club's own hex, verbatim and unvalidated. Check
  contrast before putting text on one; several are near-black or near-white.
- **`competition: 'other'`** means the competition type isn't known server-side yet. Render the
  `competitionName` string rather than a bucket label.

---

## Example: Next.js

```ts
// lib/cronogol.ts
const BASE = process.env.NEXT_PUBLIC_CRONOGOL_API ?? "http://localhost:3001";

export async function getTeams(): Promise<TeamView[]> {
  const res = await fetch(`${BASE}/cronogol/teams`, {
    next: { revalidate: 60 }, // matches the server's Cache-Control
  });
  if (!res.ok) throw new Error(`teams: ${res.status}`);
  return res.json();
}

export async function getFixtures(
  slug: string,
  params: {
    from?: string;
    to?: string;
    status?: FixtureStatus;
    competition?: Competition;
    limit?: number;
  } = {},
): Promise<TeamFixturesView> {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  );
  const res = await fetch(`${BASE}/cronogol/teams/${slug}/fixtures?${qs}`, {
    next: { revalidate: 60 },
  });
  if (res.status === 404) return notFound(); // unknown slug
  if (!res.ok) throw new Error(`fixtures: ${res.status}`);
  return res.json();
}
```

> **Only send params you mean.** Validation is strict — an unrecognised query param returns 400 rather
> than being ignored. The `.filter()` above matters. (The one exception is
> `GET /cronogol/feed/{slug}.ics`, which ignores query params instead of rejecting them.)

---

## ⚠ A route the backend depends on

**This is the one place the dependency runs backwards.** Everything else in this document describes
what the backend serves to the web app. `GET /og/standings.png` is served by the **web app** and
fetched by the **backend**, daily, for the Instagram league-table post (`CRONOGOL.md` §75).

```
GET https://altagamafc.com/og/standings.png
  ?league=laliga        a League.apiSlug, resolved against LEAGUES
  &season=2026          starting year
  &matchday=3           1–60, optional — RENDERED VERBATIM, never derived by the route
  &asOf=<lastMatchUtc>  optional, ASSERTED
  &played=<matchesPlayed>  optional, ASSERTED
```

Answers a **1080×1350 PNG**, or `text/plain` with a status:

| Status | When |
| --- | --- |
| `200` | the image |
| `400` | unknown league, or a season/matchday outside range |
| `404` | no stored table for that league-season |
| `409` | ⚠ `asOf` or `played` disagrees with the table the route read for itself |
| `502` | a crest could not be drawn — the body names the club |

⚠⚠ **Do not rename it, and do not drop the `.png`.** The extension is what stops the locale proxy
308-ing the request into `/es/og/standings`, which is an HTML 404. The backend fetches with
`redirect: 'error'` precisely so that a rename fails loudly, but **neither repository fails to build**
if this route disappears — it surfaces as a failed draft in the ops console and nowhere else.

⚠ **The 409 is a feature.** The route re-reads standings (it needs each club's `logoUrls`), and
between the backend's read and the route's sits the fixtures sweep. A disagreement means the picture
and the caption describe different tables — invisible in both, and uncorrectable once posted — so the
route refuses to draw rather than drawing something plausible.

⚠ **LaLiga only today.** Serie A's crests are WebP, which Satori renders as a blank space with no
error; the route asserts the format and answers 502 rather than producing a table with holes in it.

### `GET /og/match.png` and `GET /og/score.png` — the two poster routes

Same arrangement, same repository, and both served by the web app for the backend's poster pipelines
(`CRONOGOL.md` §83 and §85). Same `.png` rule, same `redirect: 'error'`, same `text/plain` errors, same
1080×1350, same `Cache-Control: no-store`. Both echo **`X-Scene-Version`**, which the backend stores on
the draft in `prompt_version` so a poster that looked wrong resolves to the design that drew it.

```
GET https://altagamafc.com/og/match.png        the FIXTURE poster — kickoff pills, no score
  ?league=laliga     a poster competition — the four leagues, or champions-league
  &home=alaves       a club slug
  &away=getafe       a club slug
  &kickoff=<ISO>     the stored UTC instant; the route formats it in Europe/Madrid
  &fixture=<uuid>    ⚠ champions-league ONLY, and REQUIRED there — a ucl_fixtures id

GET https://altagamafc.com/og/score.png        the RESULT poster — the score, no kickoff
  ?league  &home  &away  &kickoff              exactly as above; the kickoff SELECTS the fixture
  &goalsHome=2  &goalsAway=0                   optional, ⚠ ASSERTED — never drawn
  &flare=gold                                  optional — a SWITCH the route interprets, never drawn (§87)
  &source=operator                             optional — DEVELOPMENT ONLY; refused in production (§89)
```

| Status | When |
| --- | --- |
| `200` | the image |
| `400` | unknown league, a malformed slug, an unparseable `kickoff`, the same club twice, half an assertion, a `flare` that is not `gold`, a `source` that is not `operator`, `source=operator` in production, `source=operator` without both goals, a `fixture` that is not a UUID under `champions-league`, an absent one there, or a `fixture` sent under a league slug |
| `404` | a club not in that league, no fixtures stored, no fixture near that kickoff, or **no Champions League match with that id** |
| `409` | the fixture is against a different club; **for `champions-league`, a tie with no clubs drawn yet, a pairing that disagrees with the stored row, or a kickoff more than an hour from it**; and ⚠ score routes only — not `finished`, finished with **no stored score**, or a score disagreeing with `goalsHome`/`goalsAway` |
| `502` | a crest could not be drawn — the body names the club |

⚠⚠ **Neither route accepts anything that reaches the canvas as text, and `score.png` must never grow a
`?score=`.** Every glyph comes from `teams.name`, `venues.name`, `Intl`, or the stored fixture's goals.
That property is the only thing standing between a public unauthenticated renderer and *"print my
scoreline over real crests on the AltaGama FC domain"*. `goalsHome`/`goalsAway` are **compared and
then discarded** — supplying them means *"draw this only if you agree it finished 2–0"*.

⚠ **`flare=gold` is a switch, not an exception to that rule.** It selects a rendering the route already
knows how to draw — the winning side's digits in gold, the loser's and the dash unchanged, a draw
untouched — the way `league` selects from `LEAGUES`. Which side is gold is decided by the scene from the
stored goals, never by the caller. The line: a parameter may *select* among renderings the route owns;
it may never *supply* a glyph, a number or a colour value. Any value other than `gold` is a `400`.

⚠ **The 409 on a score mismatch is the same feature as the standings route's.** The backend holds the
score on its own draft row and has written a caption about it; between its read and the route's sits
the fixtures sweep. A disagreement means the picture and the caption state different scores, which is
invisible in both and uncorrectable once posted.

⚠ **`source=operator` draws the score it is given, and is DEVELOPMENT-ONLY** (`CRONOGOL.md` §89). The
deployed route answers `400`, so the paragraph above holds on production without qualification: there
is no header, no credential and no mode that makes `altagamafc.com` draw a caller's scoreline. It is
gated on `NODE_ENV`, a framework invariant rather than a hosting setting.

⚠⚠ **An authenticated version of this existed for one day and was removed.** A secret shared between
the two services (`x-render-override-secret`, §88) let the backend render a hand-typed score in
production; it was reversed on 2026-08-23 (`.claude/decisions/0026`) because the need behind it is a
marketing picture, which `npm run poster` in the web app produces locally in seconds. **Nothing about
the backend's poster pipeline sends a credential to this route**, and no deploy ordering exists between
the two repositories any more.

⚠ **The Champions League is a SECOND SOURCE on both routes** (`frontend-gaps.md` D10; `match.png`
joined on 2026-09-10, `score.png` on 2026-09-09). `fixture=<uuid>` is a **lookup key**: the route
resolves the match and both clubs through `GET /cronogol/ucl/fixtures/{id}` and draws nothing the
caller supplied. `home`, `away` and `kickoff` are then **asserted** against the stored row, so a
caller holding a stale pairing or a moved kickoff gets a 409 rather than the wrong crests.

⚠⚠ **`match.png` asserts NOTHING about a LEAGUE fixture, and this asymmetry is deliberate.** It reads
no fixture row for one — it draws the two clubs and the instant it is given. Only the cup source
resolves a stored match, because `fixture=<uuid>` is the only key the cup has. **`match.png` also has
no `scheduled` gate on either source**, unlike `xi.png`.

⚠ **The cup poster prints the STORED kickoff**, not the one asked for: within the hour of tolerance
they can differ, and on the fixture poster the kickoff is the largest type in the frame.

⚠⚠ **A Serie A club 502s today, on every poster route.** Every mirrored Serie A crest is WebP, which
Satori draws as a blank space, so a Champions League tie involving Inter, Milan, Juventus, Napoli,
Roma or Atalanta answers `502 crest for <club>: WebP…`. **This is a data gap, not a route defect** —
reaching the crest stage proves the fixture resolved. Fix is a PNG variant mirrored backend-side.
⚠ It also retro-broke a render verified on 2026-09-09: the club crosswalk merged the untracked
`inter-inter` row (PNG crest) into the tracked Serie A `inter` row (WebP), changing both the slug and
the format with no code change in either repository.

### `GET /og/xi.png` — the Expected XI poster

The third poster route, served by the web app for the backend's `ig-xi` pipeline
(`CRONOGOL.md` §114). Same `.png` rule, same `redirect: 'error'`, same `text/plain` errors, same
1080×1350, same `Cache-Control: no-store`, same `X-Scene-Version`.

**One club's PREDICTED starting eleven** — the first poster whose subject is not a stored fact. The
backend asks a model for a formation and eleven players, validates them against the same squad this
route reads, and then asks for the picture.

```
GET https://altagamafc.com/og/xi.png
  ?league=laliga            a poster competition — the four leagues, or champions-league
  &home=real-madrid         the HOME club's slug
  &away=rayo-vallecano      the AWAY club's slug
  &kickoff=<ISO>            the stored UTC instant; SELECTS the fixture
  &fixture=<uuid>           ⚠ champions-league ONLY, and REQUIRED there — a ucl_fixtures id
  &club=real-madrid         whose XI — must equal home or away, and must be TRACKED
  &formation=4-2-3-1        one of the eleven FormationIds the Starting XI creator owns
  &xi=560,6121,…            exactly 11 person ids, in the formation's slot order, KEEPER FIRST
  &bench=6724,25875,…       optional, at most 7 person ids
```

| Status | When |
| --- | --- |
| `200` | the image |
| `400` | unknown league, a malformed slug, an unparseable `kickoff`, the same club twice, a `club` that is neither side, a `formation` not on the list, an `xi` that is not exactly 11 well-formed ids, a `bench` over 7, any id repeated across `xi` and `bench`, or the `fixture` rule above |
| `404` | a club not in that league, no fixtures stored, no fixture near that kickoff, no squad or an empty squad for `club`, **a player id not in that squad**, no Champions League match with that id, or — cup only — **a `club` that is untracked, so no squad is stored for it** |
| `409` | the fixture is against a different club, is **not `scheduled`** (both sources), or — LEAGUE source only — is a cup tie rather than a league match |
| `502` | a crest could not be drawn — the body names the club |

⚠⚠ **The eleven names are never sent — only ids are.** This route draws eleven named living people,
which makes it the one in the family with the most to lose if the no-caller-text rule were relaxed. A
`?players=` parameter would let anybody print any name onto a real club's crest on `altagamafc.com`,
and the result would look exactly as authentic as a real one. So names, short names and photographs
are all read off `GET /cronogol/teams/{slug}/squad` server-side, and an id that is not in that squad
is a **404, never a skipped plate** — ten plates and a hole is a poster stating a formation it does
not draw.

⚠⚠ **`xi` is POSITIONAL and keeper-first.** The order is the formation's own slot order (the
`FORMATIONS` table in the web app's `components/starting-xi/geometry.ts`): `GK` first, then the bands
as declared. The fifth id is the fifth slot whatever that slot is called, and nothing in the URL says
so. The scene then draws rows attack-first, which is the reverse — the route re-orders.

⚠ **`formation` is a switch, not an exception to the no-caller-text rule** — matched against a closed
list the web app owns, exactly as `league` is matched against `LEAGUES`. Nothing from it reaches the
canvas. Any other value is a `400` that names the accepted list.

⚠ **A predicted XI for a match that has kicked off is a false claim**, and it is the failure this
route is most likely to be asked for by accident: compose can run minutes after kickoff if a queue
backs up. Hence the `409` on any status other than `scheduled` — and `409` rather than `404` because
the backend re-queues on one and gives up on the other.

⚠ **`X-Scene-Portraits: <drawn>/<withUrl>`** is echoed alongside `X-Scene-Version`, and the backend
stores it. **Roughly one in five players has no `photoUrl`**, and a plate with no portrait is a
DESIGNED state, not a gap — the position label and the name on it are the fallback. This header is the
only way anything downstream can learn that a poster carries three photographs out of a possible
nine, since nothing on that side can read pixels. ⚠ `0/0` is healthy: it means no player in this XI
has a stored photograph, not that nine fetches failed.

⚠ **`PREVISTO · NO CONFIRMADO` is drawn in frame and is not optional.** An XI graphic that reads as an
official teamsheet is a claim this account cannot make, and the real teamsheet publishes about an hour
before kickoff.

⚠ **No 1080×1920 story cut.** The design specifies one; it is not built, because 0.5625 is below
Instagram's 0.75 aspect floor that the backend's `validatePost` enforces on every entry, stories
included.

⚠ **LaLiga only today**, for the WebP reason above — and additionally because squads exist for LaLiga
and the Premier League alone.


### `GET /og/result-overlay.png` — the facts overlay for the generated result poster

*Added 2026-09-09 (`CRONOGOL.md` §117).* The fourth route the backend fetches from this app, and
the first that is not a whole picture: a **transparent** 1080×1350 PNG carrying every fact of a
finished match — competition eyebrow, both crests, `RMA 2 – 1 INT`, the clubs' names, date and
ground, the scorers with their assists — which the backend composites over an image-model
photograph of the winning side's players and stores as the `generated` style of result poster.
The model is never asked to draw a fact; this route is where every fact comes from.

```
GET https://altagamafc.com/og/result-overlay.png
  ?league  &home  &away  &kickoff              exactly as score.png; the kickoff SELECTS a league fixture
  &fixture=<uuid>                              ⚠ REQUIRED with league=champions-league, REFUSED otherwise —
                                               a LOOKUP KEY into GET /cronogol/ucl/fixtures/{id}; home, away
                                               and kickoff are then ASSERTED against that row
  &goalsHome=2  &goalsAway=1                   optional, ⚠ ASSERTED — never drawn
  &flare=gold                                  optional — the winner's digits in gold (§87)
```

| Status | When |
| --- | --- |
| `200` | the image — `image/png`, 8-bit RGBA, transparent wherever nothing is drawn |
| `400` | everything `score.png` refuses, plus `fixture` under a league slug, the cup without `fixture`, or a `fixture` that is not a UUID |
| `404` | a club not in that league, no fixtures stored, no fixture near that kickoff, no cup match with that id |
| `409` | not `finished`, finished with no stored score, a score disagreeing with the assertion, a cup pairing or kickoff disagreeing with the id, a pre-draw placeholder tie |
| `502` | a crest could not be drawn — the body names the club |

Same `.png` rule, same `redirect: 'error'`, same `text/plain` errors, same `Cache-Control: no-store`.
Echoes **`X-Scene-Version`** (stored by the backend beside its plate prompt's version) and
**`X-Scene-Scorers: <drawn>/<expected>`** — ⚠ **goals**, not names: an assisted goal is one line.

⚠⚠ **The backend refuses an overlay that is not transparent** — `plate-composite.ts` measures the
PNG's transparent fraction and fails the draft below a floor — so a background added to the scene
root by accident surfaces as a failed draft, not as a poster with the photograph hidden.
`scripts/probe-result-overlay.mjs` reads the top-left pixel's alpha for the same reason.

⚠ **No `source=operator`** on this route. The development-only draw switch stays on `score.png`.

⚠ **Spanish throughout** — `RESULTADO FINAL`, `Jornada 1`, `asist.` — because the account is.

⚠ **The Champions League resolves on this route and on `score.png` from day one** through the
poster-only registry in `lib/og/competitions.ts` — **not** through `LEAGUES`, which drives six
public surfaces. **`match.png` and `xi.png` joined on 2026-09-10, which closes `frontend-gaps.md`
D10: all four poster routes now take `league=champions-league&fixture=<uuid>`**, sharing one
definition of the parameter (`fixtureIdFor`) and one of the fixture read (`resolveCup`). ⚠ No
Champions League artwork exists in either repository, so the cup's eyebrow is text.

## What is coming

- **Puerto Rico (LPR Pro Masculina).** Two leagues — `lpr-pro-apertura` and `lpr-pro-clausura` — from
  the federation's own pages, since api-football does not cover Puerto Rico at all. Fixtures,
  standings and squads with portraits; **no jornada route, no live scores and no player statistics,
  none of which are coming**. Read the "Puerto Rico (LPR)" block above before designing anything for
  it. Not served yet.

- ~~**`.ics` subscribable feed per team.**~~ ✅ **Done 2026-07-28** —
  `GET /cronogol/feed/{slug}.ics`, verified across all 20 clubs. See the endpoint section and
  "Subscribing" above.
- ~~**Current-season data.**~~ ✅ **Done 2026-07-28 for all 20 clubs** — see caveat 2. Response shapes
  did not change when they moved, which is the whole point of the backend-as-gateway design.
- **Cup and European fixtures.** ⚠ **Corrected 2026-08-07 — this entry used to say "today every
  fixture is `competition: "league"`", and that has not been true since the Premier League landed:**
  PL clubs already carry cup ties, and a played `friendly` row is shown in the PL verified section.
  What remains outstanding is the *Spanish and German* **domestic** cups — Copa del Rey, Supercopa,
  DFB-Pokal, Supercup — none drawn yet for 2026/27 on the LaLiga side and not tracked at all on the
  German side. **Do not assume `league` is the only value you will see**; it already is not.

  ⭐ **Amended 2026-09-10 — the German half of "European fixtures" is now served.** The four German
  Champions League entrants carry their 8 league-phase ties, from the DFL's own feed. Three European
  gaps remain, and they are not the same shape:

  | Gap | Why | Closes by |
  | --- | --- | --- |
  | **Serie A clubs' European ties** | that source carries **no** European competition at all — seven competitions, all Italian | projecting the competition-wide UCL tables into the club feed (backend `outstanding.md` D52) |
  | **Europa League, Conference League** | not carried by any wired source, for any league | a new source |
  | **Domestic cups** | reachable, not enabled | backend config |
- **Preseason friendlies** are carried for Premier League clubs (see the PL verified section for a
  played one) but not for LaLiga or the Bundesliga. `competition: "friendly"` is a value you must
  handle — this entry previously said no `friendly` rows existed for the current season, which the
  PL data contradicts.
- ~~**Sign-in.**~~ ✅ **Done 2026-07-28** — Google and email/password. See [Accounts](#accounts). An
  account is optional: anonymous create-and-subscribe still works exactly as before.
- ~~**Email subscriptions.**~~ ✅ **Backend done 2026-07-30, front end NOT built** — when a match a
  user follows is rescheduled, postponed or cancelled, they get one coalesced email. Still a separate
  thing from signing in with an email address: sign-in uses your email as _identity_, this uses it to
  _send you_ schedule changes.
  ⚠ **There is no way to opt in yet, so the feature currently has zero recipients.** That is the
  front-end work, and it is one toggle plus one save button on the account page —
  **[`cronogol-notifications-handoff.md`](./cronogol-notifications-handoff.md)**. `AccountView` has
  gained `notifyFixtureChanges` and there is a new `PATCH /cronogol/me`.
  Deliberately **not** included: match reminders ("starts in 1h" — the calendar already does that) and
  scores.
- ~~**Editing the display name and the email.**~~ ✅ **Backend done 2026-08-01** —
  `PATCH /cronogol/me` takes `displayName`, and `POST /cronogol/me/email` starts a verified email
  change. See [Accounts](#accounts). ⚠ Two behaviours the account page has to respect: the email route
  **sends a confirmation rather than saving**, and a 400 there covers "already registered" as well as
  "malformed" — deliberately indistinguishable, so the copy must cover both.
- ~~**News.**~~ ✅ **Backend done 2026-08-01, front end NOT built** — `GET /cronogol/news` and
  `GET /cronogol/teams/{slug}/news`, ~700 articles across a rolling 30-day window, all 20 tracked
  clubs covered. Headline + excerpt + image + a link **out** to the publisher; there is no article
  body and no detail page. **Read the six rules in the news endpoint section before building a card**
  — the two that will bite are that `imageUrl` is hot-linked rather than mirrored, and that article
  `id`s expire after 30 days.
- ~~**Supabase custom domain.**~~ ✅ **Done 2026-08-01** — the project is reachable at
  `altagamafc.crono-gol.com` as well as `wtxuryktmryzhepxafqd.supabase.co`. **Nothing is required of
  the front end**, and the old host works forever. Two things to read before you *choose* to move:
  the `storageKey` trap in [Accounts](#accounts) (switching the URL alone signs everyone out) and
  "The storage host is changing" above (crest URLs arrive on either host — list both in
  `remotePatterns` and never string-match the host).
- ~~**Jornada pages and matchweek subscriptions.**~~ ✅ **Backend done 2026-08-04, front end NOT
  built** — `GET /cronogol/jornada/{league}/{season}` for the pager,
  `GET /cronogol/jornada/{league}/{season}/{n}` for the page, and
  `GET /cronogol/feed/jornada/{league}/{season}/{n}.ics` to subscribe to a whole matchweek. Read
  caveats 4 and 5 first — the two that will bite are that a future jornada is *published but
  unscheduled* rather than missing, and that jornada order is not chronological.
  ⚠ **Two things the design mock promises that the backend does not do yet:**
  **(a) "we update the event *and email you*"** — the update half is real and free, the email half
  does not exist for jornada subscribers and will not arrive with the notifications work either,
  because that keys on claimed *club* feeds while a jornada feed is anonymous. It needs a product
  decision first.
  **(b) the "REMIND ME · 1h / 3h / 1 day" control** — that is a calendar `VALARM`, which Google
  ignores in subscribed calendars and which is *wrong* for an all-day event (an hour before a dateless
  event fires at 23:00 the night before, and most of a fresh jornada is all-day). Recommend pointing
  it at the client's own per-calendar alert setting.
- ~~**Some jornadas are short by 0–2 matches.**~~ ✅ **Fixed 2026-08-04.** All 20 primera clubs are
  tracked; the season serves **380/380 matches with all 38 jornadas complete**, and jornada 1 returns
  10. ⚠ Read `competitionName`; do not assume every club in the LaLiga list plays in primera — five
  relegated clubs are still followed into segunda.
- ~~**The Bundesliga.**~~ ✅ **Live 2026-08-07.** 18 clubs, **306/306 fixtures across all 34
  matchdays**, mirrored SVG crests, league news. (`GET /cronogol/teams` returned 63 at the time; it is
  83 now that Serie A has landed.) Three behaviours differ from the other leagues — source-stated
  `kickoffTbd` on ~85% of the season, no venue data at all, and league-only coverage — all in the
  Bundesliga caveats section.
- ~~**Serie A.**~~ ✅ **Live 2026-08-08.** 20 clubs, **380/380 fixtures across all 38 giornate**,
  mirrored WebP crests, league news. `GET /cronogol/teams` now returns **83** clubs in total. Three
  things are unlike every other league: it is the **only** source with `venue.city` and
  `venue.capacity`, its `round` is the constant stage string `"Campionato"` rather than a round label,
  and its `logoUrls` is keyed by *theme* (`teamLogo`/`teamLogoLight`) rather than by size. All in the
  Serie A caveats section.
- ~~**League logos.**~~ ✅ **Live 2026-08-08.** A mark per league on the jornada routes' `league`
  object and on every `GET /cronogol/news/leagues` entry. Four leagues have artwork; the other five
  news leagues are null. ⚠ All four are drawn for a light background — see the table above before
  putting one on a dark surface.
- **2. Bundesliga, DFB-Pokal, Coppa Italia and the domestic cups.** Not tracked in Germany or Italy.
  The cup data is reachable from both sources, so this is a config decision rather than a limitation;
  ask if a screen needs it.
- **Ligue 1.** The last league in the news registry with no fixtures. When it lands it will follow the
  same shape — and, per "Wiring up Serie A", a client deriving its league set from
  `GET /cronogol/teams` should need no release to show it.
- **Apple sign-in.** Not planned. It needs a paid Apple Developer membership and a key on a rotation
  schedule, for a second OAuth button.

> One thing that will **not** change: a club is served from exactly one source, so you will never see
> the same match twice, and `count` is always the number of real matches.
>
> ⚠ **News is the opposite, deliberately.** Several publishers may cover the same story, and those are
> separate articles a reader may want both of — so do not dedupe by title on the client. What is
> guaranteed is that one publisher never returns the same article twice.

Server-side status: `CRONOGOL.md`. Known gaps: `.claude/cronogol/outstanding.md`.

---

## Season stats

*Added 2026-09-09. Backend spec `CRONOGOL.md` §120, decision `0058`.*

Three routes, all `Cache-Control: public, max-age=300`. They read stored rows that a 3-hourly sweep
rebuilds — nothing here triggers a fetch, and nothing here is live.

⚠ **Seasons held (2026-09-22, §144).** `laliga` and `premier-league`: 2024/25, 2025/26 and 2026/27.
Everything else: 2026/27 only (the Champions League also 2025/26). A player's `seasons[]` therefore
carries up to three rows per competition, `overall` sums them, and `currentScoringStreak` /
`currentScoringStreakApps` are `null` on every past season whatever its stamp. ⚠ **A player who left
LaLiga or the Premier League before 2026/27 has no player page**: his past-season goals appear on the
club's row and nowhere else. Render "no player page" for a missing slug, never "0 goals".
⚠ **Premier League slugs are DERIVED from the name** (since 2026-09-22, D64 — until then every
Premier League player had `slug: null` and no page could open). `william-saliba`, `erling-haaland`.
Two consequences a link must tolerate: the slug can change if the source renames the person, and two
namesakes — including a player who appears in both leagues' tables — share one, which the stats route
answers with `409` and a `candidates` list. `slug` is a link target, never a key; `playerId` is the key.

⚠⚠ **Read "What this does NOT do" at the bottom before designing a screen.** The shape of the data
rules out some columns permanently, and they are the obvious ones.

### `GET /cronogol/players/{slug}/stats`

`slug` is `player.slug` — from `GET /cronogol/teams/{slug}/squad` (added to that view 2026-09-09) or
from any `MatchEventView.player.slug`.

```jsonc
// 200 — GET /cronogol/players/vini-jr/stats
{
  "playerId": "0f0d…-…-…",        // ⚠ THE stable key. Use this to identify a person.
  "slug": "vini-jr",               // ⚠ Nullable and NOT unique — a link target, never a key.
  "name": "Vini Jr.",
  "seasons": [
    {
      "season": 2026,              // starting year: 2026 = 2026/27
      "competition": "laliga",
      "teams": [{ "slug": "real-madrid", "name": "Real Madrid" }],
      "goals": 10,                 // ⚠ own goals NOT counted here
      "assists": 4,
      "goalInvolvements": 14,
      "penaltyGoals": 3,
      "penaltiesMissed": 1,        // ⚠ null on premier-league and serie-a — see below
      "penaltyConversion": 0.75,   // ⚠ null wherever penaltiesMissed is null
      "ownGoals": 0,
      "yellows": 2, "secondYellows": 0, "reds": 0,
      "braces": 1, "hatTricks": 1, "superSubGoals": 1,
      "hatTrickFixtures": [    // ⚠ null below the coverage floor, [] if none
        { "fixtureId": "…",
          "opponent": { "slug": "valladolid", "name": "Valladolid" },
          "matchweek": 22, "kickoffUtc": "2026-02-01T20:00:00.000Z", "goals": 3 }
      ],
      "quickestBooking": {     // ⚠ null below the floor AND null if never booked
        "fixtureId": "…",
        "opponent": { "slug": "atletico-madrid", "name": "Atlético Madrid" },
        "matchweek": 17, "kickoffUtc": "2026-01-01T20:00:00.000Z",
        "minute": 11, "card": "yellow"
      },
      // ── Teamsheet-derived (§143). ⚠⚠ null — never 0 — where no teamsheets stand
      //    behind it (coverage.fixturesWithLineups = 0): every champions-league row
      //    until phase 6, and every season before 2026-09-21. A 0 means "named on
      //    no sheet", and it is real.
      "appearances": 18,           // starts + subAppearances; an unused sub is not one
      "starts": 16, "subAppearances": 2, "unusedSub": 1,
      "minutes": 1500,             // ⚠ a FLAT 90 a match, no stoppage, cut at a red card
      "goalsPer90": 0.6,           // ⚠ null unless coverage.appearancesKnown && sufficient && minutes ≥ 90
      "assistsPer90": 0.24,        //   three decimals; never recompute it from goals and minutes
      "longestScoringStreak": 4,   // ⚠ consecutive CLUB MATCHES — a benched match breaks it
      "currentScoringStreak": 2,   // ⚠ null once the season is stale
      "longestScoringStreakApps": 5, // ⚠ consecutive APPEARANCES — what a broadcaster means
      "currentScoringStreakApps": 2, // ⚠ null once stale; null with the block above
      "goalsByBand": { "1-15": 3, "16-30": 2, "31-45": 1, "46-60": 0,
                       "61-75": 2, "76-90": 1, "90+": 1 },
      "goalsByMatchweek": { "1": 2, "3": 1 },   // sparse; ⚠ null, never {}
      "coverage": {
        "fixturesCounted": 19,     // club fixtures whose timeline reconciled
        "fixturesTotal": 20,       // club fixtures played
        "ratio": 0.95,
        "fixturesWithLineups": 19, // of the 19 counted, those with BOTH teamsheets settled (§143)
        "appearancesKnown": true,  // fixturesWithLineups === fixturesCounted — per-90 is servable
        "sufficient": true         // ⚠ when false, EVERY event field above is null
      }
    }
  ],
  // ⚠⚠ THE MERGE. `seasons` above is one row PER COMPETITION; this is one entry
  //    per SEASON, across all of them. Render this on a single-figure card.
  "seasonTotals": [
    {
      "season": 2026,
      "competitions": ["champions-league", "laliga"],
      "teams": [{ "slug": "real-madrid", "name": "Real Madrid" }],
      "goals": 11,                 // 10 laliga + 1 champions-league
      "assists": 4, "goalInvolvements": 15,
      "penaltyGoals": 3,
      "penaltiesMissed": 1,        // ⚠ null unless EVERY competition can observe a miss
      "penaltyConversion": 0.75,   // ⚠ recomputed from merged counts, never an average of ratios
      "ownGoals": 0,
      "yellows": null,             // ⚠⚠ null because ONE competition is below the floor
      "secondYellows": null, "reds": null,
      "braces": 1, "hatTricks": 1, "superSubGoals": 1,
      "hatTrickFixtures": null,    // ⚠ all-or-null, or length would stop matching hatTricks
      "quickestBooking": null,
      "appearances": null,         // ⚠⚠ all-or-null (§143): champions-league is null until phase 6
      "starts": null, "subAppearances": null, "unusedSub": null, "minutes": null,
      "goalsPer90": null, "assistsPer90": null,   // ⚠ recomputed from merged counts when every part knows
      "longestScoringStreak": 4,   // ⚠⚠ MAX across competitions — a LOWER BOUND, not a merged run
      "longestScoringStreakApps": null,   // same MAX, same bound; all-or-null
      "goalsByBand": null,
      "coverage": { "fixturesCounted": 20, "fixturesTotal": 21, "ratio": 0.952,
                    "fixturesWithLineups": 19, "appearancesKnown": false, "sufficient": false }
      // ⚠ NO goalsByMatchweek — matchweek 5 is a different match in each
      //   competition, so a merged key space would invent one.
      // ⚠ NO currentScoringStreak — a MAX would overstate it.
    }
  ],
  "overall": {                     // ⚠ null only when we hold no seasons at all
    "goals": 17, "assists": 9, "goalInvolvements": 26,
    "penaltyGoals": 5, "ownGoals": 0,
    "yellows": 6, "secondYellows": 0, "reds": 1,
    "braces": 2, "hatTricks": 1, "superSubGoals": 3,
    "longestScoringStreak": 6,     // ⚠ MAX across seasons, not a sum
    "seasonsCounted": 2, "seasonsTotal": 3
  }
}
```

**Status codes, and one of them is unusual:**

| | |
| --- | --- |
| `200` | Served. ⚠ A known player with **no stats at all** is a 200 with `"seasons": []` and `"overall": null` — a quiet season is not a missing person. Render an empty state, not an error. |
| `404` | No player has that slug. |
| `409` | ⚠⚠ **The slug is ambiguous.** `players.slug` is display shorthand from the source with no uniqueness guarantee across ~39,000 people, so two players can share one. The body carries `candidates: [{ playerId, name }]` — show a disambiguation list. Rare, but real, and the backend will not guess. |

### `GET /cronogol/teams/{slug}/stats`

```jsonc
// 200 — GET /cronogol/teams/real-madrid/stats
{
  "team": { "slug": "real-madrid", "name": "Real Madrid" },
  "seasons": [
    {
      "season": 2026,
      "competition": "laliga",
      // ── Scoreline-derived. ALWAYS numbers, for EVERY league including the
      //    Bundesliga, because they need no event data at all.
      "goalsFor": 40, "goalsAgainst": 20, "goalDifference": 20,
      "cleanSheets": 8, "failedToScore": 3,
      "longestScoringRun": 6, "longestUnbeatenRun": 9, "longestWinningRun": 4,
      "biggestWin": {
        "fixtureId": "…",
        "opponent": { "slug": "valladolid", "name": "Valladolid" },  // ⚠ null if unresolvable
        "matchweek": 22,                                             // ⚠ null for cups
        "goalsFor": 7, "goalsAgainst": 0,
        "kickoffUtc": "2026-09-20T19:00:00.000Z"
      },
      "biggestDefeat": null,
      // ── One array, three charts. ⚠ KICKOFF order — `mw` is a LABEL, not the
      //    axis: matchweeks sort by number, which is not chronological.
      //    ⚠ Scoreline-derived, so ALWAYS present, every competition.
      "timeline": [
        { "id": "…", "mw": 1, "ko": "2026-08-15T19:00:00.000Z", "home": true,  "gf": 2, "ga": 0 },
        { "id": "…", "mw": 2, "ko": "2026-08-22T19:00:00.000Z", "home": false, "gf": 1, "ga": 1 }
      ],
      "scoringRun": {          // ⚠ null only if the club never scored
        "length": 21,
        "startIndex": 8, "endIndex": 28,   // into `timeline`
        "fromMatchweek": 9, "toMatchweek": 29,   // ⚠ null on a cup run
        "fromKickoffUtc": "2026-10-24T19:00:00.000Z",
        "toKickoffUtc": "2027-03-13T19:00:00.000Z"
      },
      "home": { "played": 10, "won": 7, "drawn": 2, "lost": 1,
                "goalsFor": 22, "goalsAgainst": 8, "cleanSheets": 5 },
      "away": { "played": 10, "won": 4, "drawn": 3, "lost": 3,
                "goalsFor": 18, "goalsAgainst": 12, "cleanSheets": 3 },
      // ── Event-derived. ⚠⚠ NULL where we hold no trustworthy events —
      //    the Bundesliga ALWAYS, and any thinly-swept season. NEVER 0.
      "comebackWins": 2, "comebackPoints": 7,
      "yellows": 44, "secondYellows": 1, "reds": 2,
      "goalsForByBand":     { "1-15": 5, "76-90": 9, "90+": 3 },
      "goalsAgainstByBand": { "1-15": 2, "76-90": 4, "90+": 1 },
      // ── Teamsheet-derived (§143). ⚠ {} — never null — where the source states no
      //    formation: LaLiga, Segunda, the Bundesliga. Premier League and Serie A
      //    populate it, e.g. { "4-3-3": 12, "4-2-3-1": 7 }. Render "not stated".
      "formations": {},
      "coverage": { "fixturesCounted": 19, "fixturesTotal": 20, "ratio": 0.95,
                    "fixturesWithLineups": 19, "appearancesKnown": true, "sufficient": true }
    }
  ],
  // ⚠⚠ THE MERGE — one entry per SEASON, across every competition.
  "seasonTotals": [
    {
      "season": 2026,
      "competitions": ["champions-league", "laliga"],
      "goalsFor": 42, "goalsAgainst": 21, "goalDifference": 21,
      "cleanSheets": 8, "failedToScore": 4,
      // ⚠⚠ RECOMPUTED over the merged timeline — never summed (two runs of 2
      //    are not a run of 4) and never maxed (a league goal then a European
      //    one is a true run of 2 neither competition can see).
      "longestScoringRun": 7, "longestUnbeatenRun": 9, "longestWinningRun": 4,
      "biggestWin": {
        "fixtureId": "…",
        "opponent": { "slug": "valladolid", "name": "Valladolid" },
        "matchweek": 22, "goalsFor": 7, "goalsAgainst": 0,
        "kickoffUtc": "2026-09-20T19:00:00.000Z",
        "competition": "laliga"    // ⚠⚠ which id space `fixtureId` belongs to
      },
      "biggestDefeat": null,
      // ⚠ INTERLEAVED by kickoff, not concatenated — the European tie sits
      //   between the league matches it fell between. `competition` is the
      //   ONLY thing that says whether `id` is a fixtures or ucl_fixtures id.
      "timeline": [
        { "id": "…", "mw": 1, "ko": "2026-08-15T19:00:00.000Z", "home": true,  "gf": 2, "ga": 0, "competition": "laliga" },
        { "id": "…", "mw": 1, "ko": "2026-09-08T19:00:00.000Z", "home": true,  "gf": 2, "ga": 1, "competition": "champions-league" },
        { "id": "…", "mw": 2, "ko": "2026-09-13T19:00:00.000Z", "home": false, "gf": 1, "ga": 1, "competition": "laliga" }
      ],
      "scoringRun": {              // ⚠ indices address the MERGED array above
        "length": 7, "startIndex": 8, "endIndex": 14,
        "fromMatchweek": 9, "toMatchweek": null,
        "fromKickoffUtc": "2026-10-24T19:00:00.000Z",
        "toKickoffUtc": "2026-12-09T20:00:00.000Z"
      },
      "home": { "played": 11, "won": 8, "drawn": 2, "lost": 1,
                "goalsFor": 24, "goalsAgainst": 9, "cleanSheets": 5 },
      "away": { "played": 10, "won": 4, "drawn": 3, "lost": 3,
                "goalsFor": 18, "goalsAgainst": 12, "cleanSheets": 3 },
      // ⚠⚠ NULL because ONE competition is below the coverage floor. Never 0.
      "comebackWins": null, "comebackPoints": null,
      "yellows": null, "secondYellows": null, "reds": null,
      "goalsForByBand": null, "goalsAgainstByBand": null,
      "formations": {},            // summed key-wise across competitions; {} when none states one
      "coverage": { "fixturesCounted": 20, "fixturesTotal": 21, "ratio": 0.952,
                    "fixturesWithLineups": 19, "appearancesKnown": false, "sufficient": false }
    }
  ]
}
```

`404` on an unknown club slug, like `GET /cronogol/teams/{slug}/squad`.

⚠ **No `played`, `won`, `drawn`, `lost` or `points`.** They live in `GET /cronogol/standings` and a
copy here could only ever drift out of step with the league table. `coverage.fixturesTotal` *is*
played. The venue splits do carry W/D/L, because a home/away split is a fact the standings do not
serve.

### The all-competitions season block (`seasonTotals`)

**Render `seasonTotals` by default; `seasons` is the drill-down.** `seasons` is one row *per
competition* — Real Madrid's 2026 season is a `laliga` row and a `champions-league` row — so a card
that renders one of them understates. `seasonTotals` is the same seasons merged, one entry each,
newest first.

It is **always present, even for a season with a single competition.** That is deliberate: if it
appeared only when there were two, your rendering would flip the day a Copa del Rey fixture lands
mid-season. `[]` only when the subject has no stats at all.

| Class | What happens |
| --- | --- |
| Sums | Goals for/against, clean sheets, venue splits, and the player raw counters. Since 2026-09-21 (§143): `formations` key-wise, and the appearance block **all-or-null** — a Champions League row is null until phase 6, so a merged `appearances` is null for anyone who played in Europe. |
| ⚠⚠ Recomputed | The three club runs and `scoringRun`, over a merged **kickoff-sorted** timeline — never summed, never maxed. `goalInvolvements`, `penaltyConversion` and, since §143, `goalsPer90`/`assistsPer90` likewise come from the merged counts, never from averaging the per-competition values. |
| Picked | `biggestWin`, `biggestDefeat`, `quickestBooking` — across competitions, and each carries the `competition` it came from. |
| ⚠⚠ All-or-null | The club's event block, the bands, `penaltiesMissed`, `hatTrickFixtures`, `quickestBooking`. **Null unless EVERY merged competition published a number.** ⚠ **NOT the player's card counts** — a player row's `yellows`/`secondYellows`/`reds` are non-nullable on the wire, so they simply sum. Gate them on `coverage.sufficient` instead. |
| MAX | `longestScoringStreak` only — see below. |
| Absent | `competition` (it is `competitions[]`), `goalsByMatchweek`, `currentScoringStreak`. |

⚠⚠ **A merged event field is `null` whenever any one competition is below the coverage floor**, and
that is the normal state early in a season: with the Champions League two matchdays old, a club's
merged cards and bands are `null` while its merged **goals** are complete. The scoreline half is
never withheld. If you need the cards, read them per competition from `seasons[]` and name the
competition. This is not a bug and not a temporary gap — a partial sum labelled "all competitions"
would be a null rendered as a zero.

⚠⚠ **`competition` on a merged entry is load-bearing, not decoration.** `timeline[].id` and
`biggestWin.fixtureId` are ids in **two different tables** — `fixtures` or `ucl_fixtures` — and in
`seasons[]` the row's own `competition` says which. A merged block has no such row, so the tag rides
on every entry. It disambiguates `mw` too: LaLiga matchday 5 and Champions League matchday 5 are
different matches and both appear in the one array.

⚠ **`goalsByMatchweek` has no merged form and will not get one.** Matchweeks are per-competition
namespaces, so merging `{"5": 2}` with `{"5": 1}` would invent a matchweek in which he scored three
goals. Chart it per competition.

⚠⚠ **The same namespace rule bites `scoringRun`, and there it is easy to miss.** On a merged block
`fromMatchweek` and `toMatchweek` come from *different competitions*, so the pair is **not a span** —
caption a merged run with `fromKickoffUtc`/`toKickoffUtc` instead. Barcelona's merged 2026 run is
`fromMatchweek: 2, toMatchweek: 1` — five fixtures ending on Champions League matchday 1 — and the
obvious template renders **"MD2 → MD1"**, a run that appears to travel backwards through the season.

⚠⚠ It fails **intermittently**, which is what makes it dangerous: both values are non-null and look
perfectly usable, and a merged run that happens to fall inside one competition captions correctly.
Real Madrid's does today (`fromMatchweek: 2, toMatchweek: 3`), so the club you spot-check may be the
one that works while another is wrong. `startIndex`/`endIndex` have no such problem — indices address
whichever timeline the run was computed over.

⚠ **`longestScoringStreak` is a MAX across competitions and therefore a LOWER BOUND** — the one
field that is not a true merge. A goal in a league match followed by one in Europe is a run of 2
that reads as 1. Do not print it as "scored in N straight matches in all competitions".

⚠ **`seasons` is ordered season descending, then competition slug ascending**, as of 2026-09-10. It
previously had no tiebreaker, so two rows of one season could arrive in either order.

### `GET /cronogol/stats/leaders`

```jsonc
// 200 — GET /cronogol/stats/leaders?league=laliga&season=2026&metric=goals&limit=3
{
  "competition": "laliga",
  "season": 2026,          // echoed, so a client that omitted it knows what it got
  "metric": "goals",
  "leaders": [
    { "rank": 1, "playerId": "…", "slug": "mbappe", "name": "K. Mbappé",
      "teams": [{ "slug": "real-madrid", "name": "Real Madrid" }],
      "value": 14,
      "coverage": { "fixturesCounted": 20, "fixturesTotal": 20,
                    "ratio": 1, "sufficient": true } }
  ]
}
```

| Param | |
| --- | --- |
| `league` | ⚠⚠ **REQUIRED — omitting it is a 400, not a merged table.** There is no cross-competition mode and there will not be one: assist rates differ per provider and Serie A has no player identity, so a merged ranking would measure the provider rather than the footballer. |
| `season` | Optional; defaults to the current season and is echoed back. |
| `metric` | Required, one of `goals · assists · goal-involvements · pen-goals · yellows · reds · hat-tricks · scoring-streak`. Anything else is a 400. |
| `limit` | Optional, 1–100. Capped server-side. |

⚠ An **unknown** league slug is `200` with `"leaders": []`, not a 404 — it narrows a collection, and
asking to narrow to nothing is a request that succeeded and matched nothing. Contrast the two routes
above, where the slug *names* the resource and a miss is a 404.

⚠ Rows below the coverage floor are **excluded from the ranking entirely** rather than listed with a
null value.

### Per-competition coverage — what actually works where

| Competition | Player stats | Club stats | Notes |
| --- | --- | --- | --- |
| `laliga`, `segunda` | ✅ full | ✅ full | Including penalty conversion. Appearances and minutes since 2026-09-21 (§143); `formations` is `{}` — the source states none. ⚠ **Segunda's player rows are a SUBSET**: no squad ingest there, so only a person who also passed through a LaLiga squad has a `players` row and therefore a stats row. Everyone else is absent — not zero, absent. A Segunda player page that exists is correct for him; a missing one is not evidence of anything. |
| `premier-league` | ✅ | ✅ | ⚠ `penaltiesMissed`/`penaltyConversion` are **null**; the penalty/own-goal split is soft (the source's goal vocabulary is barely observed). Appearances, minutes and `formations` since 2026-09-21. |
| `champions-league` | ✅ full | ✅ full | Its own competition slug; it is not a league and has no `leagues` row. ⚠ The appearance block is `null` until phase 6 builds its teamsheet twin, and `formations` is `{}`. |
| `serie-a` | ⛔ none | ✅ full | Events carry a name string and no stable person id — two players sharing a name would merge silently. `formations` populated; no player rows, so no appearances. |
| `bundesliga` | ⛔ none | ⚠ **scorelines only** | Every event-derived field is `null`. The sync reports success and writes no events for most fixtures; this is a known open defect, not a temporary blip. Teamsheets exist without minutes; `formations` is `{}`; no player rows. |

### ⚠⚠ What this does NOT do, and most of it never will

- ✅ **Appearances, minutes played and per-90 ARE served since 2026-09-21** (CRONOGOL.md §143) — under
  three rules a client must honour. **(1) Null is not zero.** The whole block — `appearances`,
  `starts`, `subAppearances`, `unusedSub`, `minutes`, the two rates, the two appearance streaks — is
  `null` where `coverage.fixturesWithLineups` is 0: no counted fixture holds both teamsheets. That is
  every `champions-league` row until phase 6 and every season before teamsheets were stored. A `0` is
  real: named on no sheet. **(2) Two denominators.** `coverage.fixturesCounted` is still CLUB FIXTURES
  (goals, cards, the club-match streak); `coverage.fixturesWithLineups` is the appearance denominator.
  **(3) Per-90 has three guards** — `coverage.appearancesKnown` (goals and minutes over the same
  fixtures), `coverage.sufficient`, and `minutes ≥ 90` — and is `null` under any of them. Never
  recompute it from `goals` and `minutes`. ⚠ `minutes` is a flat 90 a match with no stoppage time,
  cut at a red card. ⚠ Serie A and the Bundesliga have no player rows, so nothing per player there.
  ⚠ A lineup row the crosswalk could not link to a `players` row is an appearance that is silently
  too LOW — never one credited to the wrong person.
- **No shots, shots on target, xG, possession, passes, saves, duels or ratings.** Not stored, not
  buyable at any price point this backend holds. This is the boundary that makes "86% of his shots
  are on target" impossible and "79% of his penalties have gone in" possible.
- **No past-season squads.** The squad route is the current roster, and a player who left the league
  before this season has no row and no page (§144). His past-season goals are on the club.
- **No cross-competition LEADERBOARDS.** `seasonTotals` merges a subject's competitions *within one
  season* and `overall` sums a player's seasons across them, but `/stats/leaders` never merges and
  never will. Treat a cross-league *ranking* as unavailable; a cross-competition *total* is served.
- **No head-to-head, no scorer–assister partnerships, no goal maps.** Derivable from what is stored;
  simply not built.
- **`currentScoringStreak` goes null**, on purpose, once a season's last counted match is old
  enough. A 2024 season has no current streak.
- ⚠ **`timeline` and `scoringRun` are scoreline-derived and therefore ALWAYS
  present**, for every competition and every season, however thin the event
  coverage. A client that treats `timeline` as nullable will render an empty
  chart for the Bundesliga, where it is the only chart that works. The two
  player moments are the opposite — they follow the event block into `null`.
- ⚠ **A Champions League matchweek chart is a LEAGUE-PHASE chart.** Knockout
  rounds carry a round name and no matchday, so they are absent from anything
  keyed on `mw`. Use the `timeline` array index, which includes them.
- ⚠ **A player has ONE ROW PER COMPETITION per season.** A card that renders a
  single row must name the competition or aggregate them — otherwise a striker
  who scored in the Champions League and not in the league reads as `0 goals`,
  which is what prompted this note. **Since 2026-09-10 you do not have to
  aggregate it yourself: read `seasonTotals`.** The warning stands for anything
  rendering `seasons` directly.
- ⚠ **A null is never a zero.** Every nullable field above means "we do not know" — the events are
  missing, or too little of the season reconciles to publish a total. Rendering a null as `0` is the
  single most damaging thing a client can do with this API. Render "not available" and show
  `coverage`.
- ⚠ **Numbers can change retroactively.** These tables are a cache of a pure function over stored
  events; a mapper fix plus a backfill revises old totals. Correct for a stats page — but do not
  snapshot a number into something permanent (a graphic, a published article) and assume it will
  still match.

### TypeScript

```ts
export interface StatsCoverageView {
  /** Club fixtures whose stored timeline reconciled to the stored scoreline. */
  fixturesCounted: number;
  /**
   * Club fixtures played, whether we hold their events or not.
   *
   * ⚠ For a PLAYER this is his club's fixtures for the season — split at the
   * boundary if he transferred — NOT the matches he appeared in; that is
   * `appearances`, since 2026-09-21 (§143). Before 2026-09-10 this was wrongly
   * bounded by his own goals and cards and read far too low.
   */
  fixturesTotal: number;
  ratio: number;
  /**
   * Of `fixturesCounted`, the fixtures where BOTH sides hold a settled
   * teamsheet (§143) — the set the appearance block is computed over.
   * ⚠ 0 means the appearance block is null, not that nobody played.
   */
  fixturesWithLineups: number;
  /**
   * `fixturesWithLineups === fixturesCounted`, with at least one fixture. When
   * true, goals and minutes are over the SAME fixtures and per-90 is served;
   * when false the counts are still served (they can only be too low) and the
   * rates are null. Show "of N" with `fixturesWithLineups`.
   */
  appearancesKnown: boolean;
  /**
   * ⚠ When false, the DERIVED fields in the same block are null — bands, the
   * matchweek series, the named moments, penalty conversion.
   *
   * ⚠⚠ The RAW COUNTERS are served either way: goals, assists, cards. They can
   * only ever be too LOW (a missing event subtracts, it never invents), so they
   * publish with this flag beside them. Read `sufficient` before calling a
   * number complete — never as "there is no number".
   */
  sufficient: boolean;
}

export type GoalBandsView = Record<string, number>;

export interface PlayerSeasonStatsView {
  season: number;
  competition: string;
  teams: { slug: string; name: string }[];
  goals: number;
  assists: number;
  goalInvolvements: number;
  penaltyGoals: number;
  /** ⚠ null on premier-league and serie-a: a miss is not observable there. */
  penaltiesMissed: number | null;
  penaltyConversion: number | null;
  ownGoals: number;
  yellows: number;
  secondYellows: number;
  reds: number;
  braces: number;
  hatTricks: number;
  /**
   * One entry per hat-trick. Always the same length as `hatTricks`.
   * ⚠ A four-goal game is ONE entry. ⚠ Event-derived: `null` below the
   * coverage floor, `[]` when there genuinely were none.
   */
  hatTrickFixtures: StatsMomentView[] | null;
  /**
   * The earliest minute the player was carded all season.
   *
   * ⚠ Cards with no recorded minute are excluded, so this is the earliest
   * PLACEABLE booking. ⚠ On the Premier League the card vocabulary is a
   * provider guess, so `card` is softer there than on LaLiga.
   * ⚠ `null` below the coverage floor AND `null` for a player never booked —
   * the two are not distinguishable here, so read `coverage.sufficient`
   * before telling anyone he was never booked.
   */
  quickestBooking: StatsMomentView | null;
  superSubGoals: number;
  /**
   * ⚠⚠ Teamsheet-derived (§143): null — never 0 — when
   * `coverage.fixturesWithLineups` is 0. A 0 is real: named on no sheet.
   */
  appearances: number | null;
  starts: number | null;
  subAppearances: number | null;
  /** Named on the bench, never came on. Not an appearance. */
  unusedSub: number | null;
  /**
   * A FLAT 90 a match, no stoppage, cut at a red card. ⚠ null with
   * `appearances` a number where a sheet carries no minutes (Bundesliga).
   */
  minutes: number | null;
  /**
   * goals ÷ minutes × 90, three decimals. ⚠ null unless
   * `coverage.appearancesKnown`, `coverage.sufficient` AND minutes ≥ 90.
   * Never recompute it yourself.
   */
  goalsPer90: number | null;
  assistsPer90: number | null;
  /** ⚠ Consecutive CLUB MATCHES with a goal — a benched match breaks it. */
  longestScoringStreak: number;
  currentScoringStreak: number | null;
  /** Consecutive APPEARANCES with a goal (§143). null with the block above. */
  longestScoringStreakApps: number | null;
  /** ⚠ null once stale, like `currentScoringStreak`. */
  currentScoringStreakApps: number | null;
  goalsByBand: GoalBandsView | null;
  /** ⚠ null, never {}, when no counted fixture carried a matchweek. */
  goalsByMatchweek: Record<string, number> | null;
  coverage: StatsCoverageView;
}

/**
 * The career roll-up.
 *
 * ⚠⚠ Sums EVERY season, including thinly-covered ones, so the season rows and
 * this always reconcile. It excluded thin seasons until 2026-09-10, which made
 * the rows add up to more than the total with nothing on screen to explain it.
 * `seasonsCounted` vs `seasonsTotal` is how much of the career is well covered.
 * ⚠ `null` means the player has no seasons at all — never "his seasons are thin".
 */
export interface PlayerOverallStatsView {
  goals: number;
  assists: number;
  goalInvolvements: number;
  penaltyGoals: number;
  ownGoals: number;
  yellows: number;
  secondYellows: number;
  reds: number;
  braces: number;
  hatTricks: number;
  superSubGoals: number;
  /** ⚠ MAX across seasons, not a sum. */
  longestScoringStreak: number;
  seasonsCounted: number;
  seasonsTotal: number;
  // ⚠⚠ NO appearances or minutes here, on purpose (§143). This block sums
  //    EVERY season so the rows and the total reconcile, and the appearance
  //    block is null on every season before 2026-09-21 and on every
  //    champions-league row until phase 6 — a career total would be either
  //    null for everyone or a sum over the seasons that happen to know. Sum
  //    `seasonTotals[].appearances` where non-null if a caption needs one.
}

/**
 * ⚠⚠ ONE SEASON, merged across every competition. Render this on a card;
 * `seasons` is the per-competition drill-down.
 * ⚠ An event-derived field is null unless EVERY competition published a number.
 */
export interface PlayerSeasonTotalsView {
  season: number;
  /** Slug-ascending. ⚠ There is no `competition` — this is not a season row. */
  competitions: string[];
  /** ⚠ Deduped by slug, competition order — NOT a chronology. */
  teams: { slug: string; name: string }[];
  goals: number;
  assists: number;
  goalInvolvements: number;
  penaltyGoals: number;
  penaltiesMissed: number | null;
  /** ⚠ Recomputed from merged counts, never an average of the ratios. */
  penaltyConversion: number | null;
  ownGoals: number;
  /**
   * ⚠⚠ NON-nullable, unlike `TeamSeasonTotalsView`'s cards and unlike every
   * other merged event field. A player ROW's cards are non-nullable on the wire
   * — a row below the coverage floor still answers `0` — so the all-or-null
   * merge can only ever find numbers. Narrowed 2026-09-10; it was `number |
   * null` for one day and clients were writing dead branches.
   * ⚠ **Gate these on `coverage.sufficient`, not on nullability.** A `0` under a
   * failed gate means "we did not look", and the type cannot say so.
   */
  yellows: number;
  secondYellows: number;
  reds: number;
  braces: number;
  hatTricks: number;
  hatTrickFixtures: StatsMergedMomentView[] | null;
  quickestBooking: StatsMergedMomentView | null;
  superSubGoals: number;
  /**
   * ⚠⚠ All-or-null (§143): null for any season with a competition whose
   * appearance block is null — today every player who played in Europe,
   * until phase 6. Read them per competition from `seasons[]` meanwhile.
   */
  appearances: number | null;
  starts: number | null;
  subAppearances: number | null;
  unusedSub: number | null;
  minutes: number | null;
  /** ⚠ Recomputed from the merged goals and minutes, never averaged. */
  goalsPer90: number | null;
  assistsPer90: number | null;
  /** ⚠⚠ MAX across competitions — a LOWER BOUND, not a merged run. */
  longestScoringStreak: number;
  /** Same MAX, same bound, over appearances. All-or-null. */
  longestScoringStreakApps: number | null;
  goalsByBand: GoalBandsView | null;
  coverage: StatsCoverageView;
  // ⚠ No `goalsByMatchweek` (matchweeks are per-competition namespaces) and no
  //   `currentScoringStreak` / `currentScoringStreakApps` (a MAX would
  //   overstate them).
}

export interface PlayerStatsView {
  /** ⚠ The stable key. `slug` is neither unique nor permanent. */
  playerId: string;
  slug: string | null;
  name: string;
  /** ⚠ ONE ROW PER COMPETITION. Season desc, then competition slug asc. */
  seasons: PlayerSeasonStatsView[];
  /** ⚠ The merge, newest first. Always present; `[]` only if there are no stats. */
  seasonTotals: PlayerSeasonTotalsView[];
  overall: PlayerOverallStatsView | null;
}

export interface TeamVenueSplitView {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
}

export interface TeamResultRefView {
  /**
   * ⚠ A `fixtures` id — or a `ucl_fixtures` id when the season's `competition`
   * is `champions-league`. The value does not say which; the competition does.
   */
  fixtureId: string;
  /**
   * ⚠ null when the opponent cannot be named. Two causes, both real: the club
   * has no slug, or the stored reference is stale — these rows are a cache, and
   * a club row merged away leaves a dangling id until the next sweep rebuilds
   * it. Always render the result without an opponent.
   */
  opponent: { slug: string; name: string } | null;
  /** ⚠ null for cups and Champions League knockouts. */
  matchweek: number | null;
  goalsFor: number;
  goalsAgainst: number;
  kickoffUtc: string;
}

/**
 * One finished fixture in a club's season, in KICKOFF order.
 *
 * ⚠⚠ Kickoff order is the axis; `mw` is a LABEL. Matchweeks sort by number,
 * which is not chronological — a postponement really does put matchweek 2
 * before matchweek 1. Plot on the array index, not on `mw`.
 *
 * Drives three charts: a cumulative line (running sum of `gf`), per-matchweek
 * home/away bars, and a scored-in strip (`gf > 0`).
 */
export interface StatsTimelineEntryView {
  id: string;
  /** ⚠ null for cups and Champions League knockouts. */
  mw: number | null;
  /** Kickoff, ISO — the label to fall back on where `mw` is null. */
  ko: string;
  home: boolean;
  gf: number;
  ga: number;
}

export interface ScoringRunView {
  /** Always equals the club's `longestScoringRun`. */
  length: number;
  /** Indices into `timeline`, so the strip can be highlighted. */
  startIndex: number;
  endIndex: number;
  /**
   * ⚠ null on a cup run — render the kickoffs instead of "MD9 → MD29".
   *
   * ⚠⚠ **On a MERGED block (`seasonTotals`) these two are in DIFFERENT
   * NAMESPACES and are NOT a span — caption the run with the kickoffs.** Same
   * rule that dropped `goalsByMatchweek` from the merged blocks, applied to the
   * field it was missed on. Barcelona's merged 2026 run is `fromMatchweek: 2,
   * toMatchweek: 1` (five fixtures ending on Champions League matchday 1), so
   * the obvious caption renders "MD2 → MD1" — a run that appears to travel
   * BACKWARDS through the season.
   * ⚠⚠ It fails INTERMITTENTLY: both values are non-null and look usable, and a
   * merged run that happens to sit inside one competition captions correctly —
   * Real Madrid's does today. The club you spot-check may be the one that works.
   */
  fromMatchweek: number | null;
  toMatchweek: number | null;
  /** ⚠ The only safe caption for a MERGED run. */
  fromKickoffUtc: string;
  toKickoffUtc: string;
}

/** A single named fixture — a hat-trick, a booking. */
export interface StatsMomentView {
  fixtureId: string;
  opponent: { slug: string; name: string } | null;
  matchweek: number | null;
  kickoffUtc: string;
  /** Present on a hat-trick. */
  goals?: number;
  /** Present on a booking. */
  minute?: number;
  /** `yellow` | `second-yellow` | `red`. Present on a booking. */
  card?: string;
}

export interface TeamSeasonStatsView {
  season: number;
  competition: string;
  // Scoreline-derived — always numbers, every league.
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  cleanSheets: number;
  failedToScore: number;
  longestScoringRun: number;
  longestUnbeatenRun: number;
  longestWinningRun: number;
  biggestWin: TeamResultRefView | null;
  biggestDefeat: TeamResultRefView | null;
  home: TeamVenueSplitView;
  away: TeamVenueSplitView;
  /**
   * ⚠ Scoreline-derived, so ALWAYS present — every competition, including the
   * Bundesliga, where it is the only chart that works. Never null; an empty
   * array means no finished fixtures, not missing data.
   */
  timeline: StatsTimelineEntryView[];
  /** ⚠ null only when the club never scored. Also scoreline-derived. */
  scoringRun: ScoringRunView | null;
  // Event-derived — ⚠ null where coverage is absent. NEVER 0.
  comebackWins: number | null;
  comebackPoints: number | null;
  yellows: number | null;
  secondYellows: number | null;
  reds: number | null;
  goalsForByBand: GoalBandsView | null;
  goalsAgainstByBand: GoalBandsView | null;
  /**
   * Formation string → matches, over the club's settled teamsheets that state
   * one (§143). ⚠ `{}` — never null — where the source states none (LaLiga,
   * Segunda, Bundesliga). Keys sum to the sheets that STATE a formation,
   * which can be fewer than `coverage.fixturesWithLineups`.
   */
  formations: Record<string, number>;
  coverage: StatsCoverageView;
}

/**
 * ⚠⚠ `competition` is the ONLY thing that says which table `id` lives in —
 * `fixtures` or `ucl_fixtures`. It disambiguates `mw` too.
 */
export interface StatsMergedTimelineEntryView extends StatsTimelineEntryView {
  competition: string;
}

export interface TeamMergedResultRefView extends TeamResultRefView {
  competition: string;
}

export interface StatsMergedMomentView extends StatsMomentView {
  competition: string;
}

/**
 * ⚠⚠ ONE SEASON, merged across every competition the club played.
 * ⚠ The runs are RECOMPUTED over the merged timeline, not summed and not maxed.
 */
export interface TeamSeasonTotalsView {
  season: number;
  /** Slug-ascending. ⚠ There is no `competition` — this is not a season row. */
  competitions: string[];
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  cleanSheets: number;
  failedToScore: number;
  longestScoringRun: number;
  longestUnbeatenRun: number;
  longestWinningRun: number;
  biggestWin: TeamMergedResultRefView | null;
  biggestDefeat: TeamMergedResultRefView | null;
  home: TeamVenueSplitView;
  away: TeamVenueSplitView;
  /** ⚠ Kickoff-ordered and INTERLEAVED. `home.played + away.played === length`. */
  timeline: StatsMergedTimelineEntryView[];
  /** ⚠ Indices address the MERGED timeline. */
  scoringRun: ScoringRunView | null;
  // ⚠⚠ Null unless EVERY merged competition published a number. Never 0.
  comebackWins: number | null;
  comebackPoints: number | null;
  yellows: number | null;
  secondYellows: number | null;
  reds: number | null;
  goalsForByBand: GoalBandsView | null;
  goalsAgainstByBand: GoalBandsView | null;
  /** Summed key-wise across competitions. `{}` where none states one. */
  formations: Record<string, number>;
  coverage: StatsCoverageView;
}

export interface TeamStatsView {
  team: { slug: string; name: string };
  /** ⚠ ONE ROW PER COMPETITION. Season desc, then competition slug asc. */
  seasons: TeamSeasonStatsView[];
  /** ⚠ The merge, newest first. Always present; `[]` only if there are no stats. */
  seasonTotals: TeamSeasonTotalsView[];
}

export type StatsMetric =
  | 'goals'
  | 'assists'
  | 'goal-involvements'
  | 'pen-goals'
  | 'yellows'
  | 'reds'
  | 'hat-tricks'
  | 'scoring-streak';

export interface StatsLeaderView {
  rank: number;
  playerId: string;
  slug: string | null;
  name: string;
  teams: { slug: string; name: string }[];
  value: number;
  coverage: StatsCoverageView;
}

export interface StatsLeadersView {
  competition: string;
  season: number;
  metric: string;
  /** ⚠ Ranked within ONE competition. There is no cross-league mode. */
  leaders: StatsLeaderView[];
}
```
