# AltaGama FC — iOS design handoff

Design source: `AltaGama FC iOS.dc.html` (interactive prototype) and
`AltaGama FC iOS — explorations.dc.html` (the option set this was chosen from).
Both are **design references in HTML**, not code to port. Recreate in Expo / React
Native using this repo's own patterns.

This pack answers ADR **0014** — it is the app-specific design language that
decision was waiting on. Two things carry over from `cronogol`: the **mark** and
the **accent lime `#c8f25a`**. Nothing else does — surfaces are graphite (not the
web's navy), type is system SF Pro at iOS sizes (not Chivo/Bricolage), and controls
are platform controls.

## 1. Decisions this design assumes

| Decision | Value |
| --- | --- |
| Tabs | **Today · Matchdays · Table · Clubs** (4). Account is a sheet behind the header avatar, not a tab. Fits `NativeTabs` (ADR 0005). |
| Subscription model | **Per club only.** One subscription per club = push + email alerts + one `.ics` feed for the whole season. No per-match affordance anywhere. |
| Alert types | **Global**, three of them: kickoff reminder (30 min), kickoff moved, postponed/abandoned. Per club there is only on/off. |
| Live scores | Designed, feed gap **stated in the UI**: "Score last checked 2h ago · updates roughly every 4h". Goal alerts render **disabled** with the reason. |
| Table | LaLiga first (Spain is the market), switchable. Qualification bands shown, sourced from **per-league config**. |
| Localisation | EN + ES, switch in the account sheet. Copy for both is in the prototype's `I18N` map. |
| Theme | Dark only. No light ground is designed; `Colors.light` aliases dark. |

## 2. Tokens

`handoff/theme.ts` is a drop-in replacement for `src/constants/theme.ts`:
`Colors` (surfaces, hairlines, ink, accent, bands, form chips), `Spacing`,
`Radius`, `Type`, `Size`. Rules that matter:

- **No colour literals in components** (ADR 0014). Everything through the theme.
- Screen gutter **20**; cards pad **16–18**; sheets pad **20** with a 28 top radius.
- Hairlines do the separating; **there are no shadows in the app** (only the device
  frame in the mock has one). Elevation is surface lightness, not shadow.
- Every numeric cell: `fontVariant: ['tabular-nums']`. Scores, kickoffs, points,
  countdowns and GD all line up column to column or the table looks broken.
- Accent is for *one* thing per screen: the live/next marker, the primary action,
  the subscribed state. If two things on a screen are lime, one is wrong.

## 3. Screens

### 3.1 Today — the board
`src/app/index.tsx`

- Header: eyebrow (`SATURDAY · MATCHDAY 4`), large title, 36px avatar → account sheet.
- **In-progress state** (a match live now): card with `live` 1px border, `IN PROGRESS`
  + pulsing dot, minute, crest–score–crest row at `scoreLarge`, and a footer line
  with a clock glyph stating when the score was last checked. That line is
  **required** — the backend has no live push (`/cronogol/scores`, ~4h). Never
  animate or imply real-time.
- **Idle state** (most days): **last result** card (crest–score–crest + W/D/L chip,
  meta `MD 3 · SAT 29 AUG`) stacked above the **next fixture** card (accent
  hairline, crests, kickoff at `kickoff` size, date + timezone caption, then a
  `KICKOFF IN` row with a tabular countdown).
- `FINISHED TODAY`: full-time scores from **every** tracked league, grouped by league
  with the league mark as the group header (LaLiga clubs use `logoUrl` crests; leagues
  without crest coverage use the abbreviation tile — the fallback is part of the design).
  Row: home crest + name · score · name + away crest · `FT`. The losing side's name
  drops to `textDim`; a draw leaves both at full ink. Foot line names the settle delay.
- **`UPCOMING FROM YOUR CLUBS`** (when the user has at least one subscription): grouped
  card, one row per upcoming match of a subscribed club; right column is time over
  `TONIGHT`/day. Below it, two stat tiles (subscribed count → Clubs, feeds → account).
- **No subscriptions** (the state a new user is in): the upcoming section and the stat
  tiles are replaced by the **follow card** — accent-hairline card, "Follow your
  favourite club and never miss a kickoff.", the calendar-moves-with-it line, a 2-up
  grid of six clubs (crest + name, tap opens the club) and a lime pill `BROWSE ALL` →
  Clubs. The live/next/last cards are also suppressed: with nothing followed there is
  no "your" match to lead with, and `FINISHED TODAY` carries the screen.

### 3.2 Matchdays tab (`Jornadas`)
`src/app/matchdays.tsx` — one league's published round at a time, mirroring
`/{locale}/jornada/{n}` on the web.

- Header: eyebrow `LALIGA 2026/27 · FIRST HALF`, title `Matchday 4`, then a prev/next
  pair (34pt raised squares) and, right-aligned, the date range over
  `10 MATCHES · CEST`.
- **League selector**: horizontal row of league marks (LaLiga, Premier League,
  Bundesliga, Serie A). Active gets `raised` + accent ring; inactive drops to 50%.
  A mark that already carries its wordmark shows **no** text label; emblem-only
  (Bundesliga) and mark-less (Serie A) leagues show the text. Switching league
  clamps the matchday to that league's round count (34 in the Bundesliga).
- **Matchday strip**: 34pt number pills, 1…N, horizontally scrolling. Current round
  is accent; played rounds `raised`; future rounds `card`. This is the primary
  navigation — it replaces the web page's paginator.
- **`Add all N matches`**: outlined-accent, opens the matchday calendar sheet
  (`webcal://crono-gol.com/cronogol/feed/jornada/{league}/{season}/{n}.ics`). Its
  sheet says a matchday feed is separate from a club subscription — both can be on.
- **Day groups**: sticky-ish header (`SAT 5 SEP` + count) on the darker `#12151a`,
  then rows: status column (score, or kickoff, or `--:--`) with `FT`/`LIVE`
  underneath · crest pair · home and away names stacked · venue · city. The losing
  side's name drops to `textDim`; a live row takes `rowActive`.
- Clubs without crest coverage (everything outside LaLiga today) render the
  abbreviation tile. Do not invent artwork.
- Foot note states that a matchday is a **published round, not a date range** — order
  is not chronological and a round can be published before kickoffs are scheduled.

### 3.3 Table
`src/app/table.tsx`

- League switcher: the league marks as artwork (`leagues/*.png`), inactive at 45%
  opacity. LaLiga first. Serie A has no mark yet — don't fake one.
- Columns at 393pt: `3px band · 26 pos · club (flex) · 34 PL · 34 PTS`. `PTS` header
  is `text`, every other header `textFaint` — it's the column that matters.
- Row tap **expands in place** into a card: W D L GF GA GD row (GD signed, positive
  in accent), then `LAST 4` form chips (oldest → newest), then `Open {club}` →
  club page. Only one row open at a time.
- Subscribed clubs: `rowActive` background + a 5px accent dot after the name.
- Legend shows only the bands **present in the current table**.
- Foot note names the ~3h standings lag and that bands are config.

### 3.4 Clubs
`src/app/clubs.tsx`

- Search field (visual in the prototype; wire to `/cronogol/teams`).
- **Subscribed** section pinned at the top: grouped card, 34 crest, name, `LaLiga ·
  38 matches`, and a system switch. Switching off unsubscribes immediately (no
  confirm — it's reversible and the feed is regenerable; confirm only on account
  delete).
- **Browse LaLiga**: full club list, 30 crest, name + city, `+ FOLLOW` outlined
  accent chip. Tapping the row opens the club; tapping the chip subscribes in place.

### 3.5 Club page
`src/app/club/[slug].tsx`

- Back row (accent), 58 crest + league eyebrow + name + `city · stadium`.
- Subscribe block: **Match alerts** (accent fill; becomes `Alerts on` in accent
  wash + ring when subscribed) and **Calendar** (outlined), then the note: "One
  subscription covers the whole season … There is no per-match option, by design."
- Segmented **Fixtures / Players**.
- Fixtures = the **season spine**: a 1px rail with a node per fixture. Past matches
  at 62% opacity with score + W/D/L chip; the next fixture is an accent node with
  an accent-hairline card; later fixtures are hollow nodes, `--:--` when unscheduled.
- **`lastSyncedAt === null` state** (opponent-only clubs): do **not** render the
  partial list. Show "No full schedule for this club yet" + "Only a handful of
  matches are known, so this would be a misleading list. Subscribe and it fills in
  on the next nightly sync."
- Players = squad list (shirt no · name · position group). Identity fields only.

### 3.6 Sheets
- **Match alerts confirm** — crest + `{CLUB} · 38 MATCHES` eyebrow, title, body,
  three checked bullets, `Confirm and subscribe`, `Cancel`, footnote about
  one-click unsubscribe. When already subscribed the primary flips to
  `Unsubscribe` (same sheet, no separate destructive screen).
- **Add matches to** — Google Calendar (accent), Apple Calendar (outlined),
  Download `.ics` snapshot (quiet), then the `webcal://crono-gol.com/cronogol/feed/{slug}.ics`
  URL in mono. Never show a config key or host beyond that public feed URL.
- **Account** — name + email + `VERIFIED`; `ALERT TYPES` (3 switches + the disabled
  goals row with its reason); `PREFERENCES` (Language EN/ES, Clock 24h/12h,
  Timezone); `CALENDAR FEEDS` (crest, name, feed URL, COPY); Replay onboarding;
  Sign out; **Delete account** (danger outline) with the note that deleting revokes
  the feed URLs — Apple requires this path to exist.

### 3.7 Onboarding
Two steps, before the tabs. Step 1: club picker (3-up grid, accent ring + check on
picked, search field, primary reads `Continue with N clubs`). Step 2: the three
alert types as explained rows, `Allow notifications` / `Not now` — permission is
requested **after** the explanation, never on cold launch. Skipping still lands in
the app with the picks subscribed.

## 4. Notifications, Live Activity, widgets

Designed in the explorations file, options `1h` and `1i`.

### Push payloads

```jsonc
// 1 — kickoff reminder (scheduled locally from the fixture, no server round-trip needed)
{ "aps": { "alert": { "title": "Valencia v Real Madrid · 30 minutes",
                      "body": "Kicks off 21:00 at Mestalla. Matchday 4." },
           "sound": "default", "thread-id": "fixture-84213" },
  "type": "kickoff_reminder", "fixtureId": 84213, "clubSlug": "valencia",
  "kickoffUtc": "2026-09-05T19:00:00Z", "deepLink": "altagamafc://club/valencia" }

// 2 — kickoff moved (server push on sync diff)
{ "aps": { "alert": { "title": "Kickoff moved — Sevilla v Osasuna",
                      "body": "Sun 16:15 → Sun 18:30. Your calendar entry has already been updated." },
           "thread-id": "fixture-84219", "interruption-level": "active" },
  "type": "kickoff_moved", "fixtureId": 84219, "clubSlug": "sevilla",
  "oldKickoffUtc": "2026-09-06T14:15:00Z", "newKickoffUtc": "2026-09-06T16:30:00Z",
  "deepLink": "altagamafc://club/sevilla" }

// 3 — postponed / abandoned
{ "aps": { "alert": { "title": "Postponed — Valencia at Real Sociedad",
                      "body": "Removed from your calendar. We'll alert you when a new date is set." },
           "thread-id": "fixture-84231" },
  "type": "fixture_postponed", "fixtureId": 84231, "clubSlug": "valencia",
  "status": "postponed", "deepLink": "altagamafc://club/valencia" }
```

Rules: one thread per fixture so re-scheduling collapses instead of stacking;
`interruption-level: active` on a move (it's time-sensitive but not critical);
never send a goal or final-score payload until a live feed exists — the type is
reserved, not implemented.

### Live Activity (`ActivityKit`)

```swift
struct MatchAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    var homeGoals: Int?; var awayGoals: Int?   // nil = not yet reported
    var minuteLabel: String                    // "67'", "HT", "FT" — a string, never derived on device
    var phase: String                          // scheduled | first_half | half_time | second_half | finished
    var lastCheckedMinutesAgo: Int             // drives the honest footer
    var progress: Double                       // 0…1 for the bar
  }
  var fixtureId: Int; var homeSlug: String; var awaySlug: String
  var homeAbbr: String; var awayAbbr: String; var venue: String; var kickoffUtc: Date
}
```

- **Compact (Dynamic Island)**: home crest · `1–0` · divider · minute in `live`.
- **Expanded**: matchday + venue eyebrow, phase pill in `live`, crest/name columns
  flanking the score, and the footer `Checked 2h ago · no live feed yet`.
- **Lock screen**: the same card with a 3px progress bar; footer states the check age
  and venue.
- Start the activity at kickoff from the reminder push; end it 2h after the final
  known state. If `lastCheckedMinutesAgo > 240`, show the age in `live` colour —
  the age is the honest part of the design and must never be hidden.

### Widgets (WidgetKit)

- **Small (148pt)**: mark + `NEXT · J4` eyebrow, crest pair, countdown (`1d 04h`),
  `Sat 21:00 · Mestalla`.
- **Medium (338pt)**: mark + `YOUR WEEK` + club count, three rows (crest, opponent,
  `Sat 21:00`), hairline separated.
- Timeline entries at each kickoff and at midnight; never a per-minute refresh.

## 5. Component inventory (ADR 0013)

```
atoms/
  text.tsx              Type scale wrapper; `tabular` prop sets fontVariant
  crest.tsx             remote logoUrl + abbreviation-tile fallback, sizes from Size
  band-rail.tsx         3px zone rail, colour from a band token or transparent
  form-chip.tsx         W / D / L chip (fill, fill, outline)
  pill.tsx              uppercase micro label (FOLLOWING, HOME, VERIFIED, ON)
  switch.tsx            51×31 system switch wired to the theme
  chip-button.tsx       + FOLLOW / filter chip
  button.tsx            primary (accent) · secondary (raised) · quiet · danger
  eyebrow.tsx           uppercase section label
  hairline.tsx          1px rule at three strengths
  grabber.tsx           sheet grabber
  skeleton.tsx          shimmer block for list/table loading
molecules/
  score-line.tsx        crest · score · crest, two sizes (board, activity)
  fixture-timing.tsx    day/date block + kickoff, handles `--:--`
  home-away-tag.tsx     H/A (L/V in Spanish) tag + venue line
  form-strip.tsx        4–5 form chips, oldest first
  stat-row.tsx          W D L GF GA GD row for the expanded table row
  countdown.tsx         tabular `1d 04h 22m`, ticks per minute
  feed-age.tsx          clock glyph + "Score last checked Nh ago" line
  section-header.tsx    eyebrow + rule + right meta
  league-switch.tsx     league marks as artwork, active ring
  list-row.tsx          crest · title · sub · trailing slot (+ swipe actions)
organisms/
  match-board.tsx       live | last-result + next pairing (owns the two states)
  fixture-list.tsx      month sections, sticky headers, swipe actions
  standings-table.tsx   + standings-row.tsx, expanded-row.tsx, legend.tsx
  club-header.tsx       crest, name, place, subscribe block
  season-spine.tsx      the rail + node + card list
  squad-list.tsx        shirt no · name · position
  subscribed-list.tsx   pinned subscribed clubs with switches
  club-browser.tsx      league club list with follow chips
  alerts-sheet.tsx      subscribe / unsubscribe confirm
  calendar-sheet.tsx    Google / Apple / .ics + feed URL
  account-sheet.tsx     identity, alert types, preferences, feeds, destructive
  onboarding/           club-picker.tsx, alerts-primer.tsx
templates/
  screen-scaffold.tsx   large title + avatar + scroll + tab inset
```

Dependencies point downward only; nothing below `organisms/` fetches.

## 6. Mock data → real endpoints

The prototype's `CLUBS`, `ROWS`, `FIX`, `SPINE`, `SQUAD` map 1:1 onto the API. Shapes
to build against (`senpai-backend/CRONOGOL-API.md` is the contract):

| Prototype | Endpoint | Notes |
| --- | --- | --- |
| `CLUBS` | `GET /cronogol/teams` | never hardcode league slugs; ~100 clubs and growing. Crest = `logoUrl`, not a provider URL |
| `FIX` (Matchdays tab) | `GET /cronogol/jornada/{league}/{season}[/{n}]` | a jornada can be **published but unscheduled**; round order is not chronological; scores are `goalsHome`/`goalsAway` on this route |
| `SPINE` (club page) | `GET /cronogol/teams/{slug}/fixtures` | `to` is **inclusive** here. Scores are `goalsFor`/`goalsAgainst` — the requested club's perspective |
| `ROWS` (table) | `GET /cronogol/standings` | no zones, no home/away split, no live update; lags a finished match by up to ~3h. Bands come from app config |
| live tile + `FINISHED TODAY` | `GET /cronogol/scores`, `GET /cronogol/scores/recent` | different feature, different source, ~4h refresh, does **not** join to clubs/fixtures/jornadas. Do not reconcile against standings. Finished-today rows need a league label from the score payload, not a fixture join |
| `SQUAD` | `GET /cronogol/teams/{slug}/squad` | identity fields only |
| feeds | `GET|POST /cronogol/me/feeds`, `DELETE …/{token}` | `webcal://crono-gol.com/cronogol/feed/{slug}.ics`; deleting revokes the token |
| account | `GET|PATCH /cronogol/me` | drives the account sheet |

Traps the design already accounts for: `lastSyncedAt === null` → the pending state,
never a partial list; jornada order is not chronological; `scheduled` and `finished`
are both normal in a live season; `--:--` means published-but-unscheduled, not missing.

## 7. Open, deliberately

1. **Qualification bands** need real per-league config before launch — the
   prototype's `pos ≤ 4 / ≤ 6 / = 7 / ≥ 18` is a placeholder, same flag the web app carries.
2. **Live scores** are a backend project first (no push, ~4h refresh). Everything in
   the UI that touches a score states its age; if that ever gets removed, the
   feature starts lying.
3. **Serie A / Segunda marks** don't exist yet. Text fallback, no invented artwork.
4. **Push infrastructure** — device token registration and a per-club fan-out
   don't exist server-side yet; the payloads above are the contract to build to.
5. **Widgets and Live Activity need an app group** for shared state, and the
   activity needs a server push token (`ActivityKit` frequent updates entitlement)
   if it is to update while backgrounded.
