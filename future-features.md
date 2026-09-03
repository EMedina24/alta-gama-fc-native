# Feature ideas — future work

**As of 2026-09-02.** Things we could build that aren't designed or committed yet.

Not the same list as [HANDOFF.md § Front-end work outstanding](.claude/HANDOFF.md) —
that one tracks designed states that are unbuilt. Nothing here has a design.

| # | Feature | Size | Blocked on |
| --- | --- | --- | --- |
| 1 | Share / save the league table as an image | M | nothing — the export pipeline already ships |
| 2 | The other shareable cards — result, fixture, matchday | M | 1 |
| 3 | Account follows roam across devices | M | nothing — backend route landed 2026-09-01 |
| 4 | Live Activity for a followed club's match | L | backend (update tokens) |
| 5 | Calendar, natively | M | a product call |
| 6 | A standings widget | M | a snapshot + its Swift mirror |
| 7 | Alert one match | M | backend |
| 8 | Depth on the table screen | M | backend, for the half worth having |
| 9 | Search across the app | M | backend, or a scoped client search |
| 10 | iPad and landscape | L | a design pass |

---

## 1 · Share and save the league table as an image ⭐

From the Table screen: **Save to Photos** and **Share** the standings as a picture.

**Most of this already ships.** The Starting XI card built the whole pipeline:

- [`features/starting-xi/export.ts`](src/features/starting-xi/export.ts) — the
  one seam for `react-native-view-shot` + `expo-sharing` + `expo-media-library`.
  All three are already dependencies, so no dev-client rebuild.
- [`xi-export-sheet.tsx`](src/components/organisms/xi-export-sheet.tsx) — the
  sheet: live preview, size control, Save primary / Share secondary, receipt state.
- [`card-geometry.ts`](src/features/starting-xi/card-geometry.ts) — the
  1080-unit card model and the `4:5 / 1:1 / 9:16` sizes.

**To build:** a `StandingsCard` organism, a standings export module, an entry point.

**Gotchas**

- ⚠ `registerCapture` is a **module-level singleton** — "one registered capture at
  a time — there is one builder screen". Key it by subject before wiring a second.
- ⚠ `app.json`'s `savePhotosPermission` names the Starting XI card by name. It's
  the string iOS shows in the Photos prompt — reword it in the same change.
- ⚠ **20 crests must decode before the shutter.** `LineupCard` has
  `onImagesSettled` for this; capture early and you ship a card of empty boxes,
  invisible in the preview because it has had time to load.
- ⚠ Bands only if `bandsApply(table, league)` passes, and skip `segunda` — same
  rule the screen obeys. A shared image outlives the session that made it.
- ⚠ The card needs an "as of" stamp, and `completedMatchweek` legitimately returns
  `null` on live data. Degrade to the club count like the header does; don't invent
  a matchday — a picture can't be refreshed.
- ⚠ Brand on the card is `Alta Gama FC`, **spaced**
  ([0042](.claude/decisions/0042-brand-spelling-spaced-form-reinstated.md)). Separately:
  `app.json`'s `"name"` is still the closed-up `AltaGama FC` and looks stale.

**One fork worth deciding first.** `cronogol` already renders this exact picture —
[`app/og/standings.png/route.ts`](../cronogol/app/og/standings.png/route.ts) +
`lib/og/standings-scene.ts`, at 1080 × 1350, the same 4:5 the XI card defaults to.

1. **Fetch the web's PNG** — nearly free, but that route is Spanish-only,
   LaLiga-only (Serie A crests are WebP, which Satori draws blank), `no-store`, and
   `409`s when the table moves under it.
2. **Render locally, reading the web scene for its numbers** — what the XI card did
   deliberately, so a card shared from the app and one from the site are the same
   object. None of the web route's limits apply to us; `expo-image` draws WebP.

Recommend **2**. Those limits are Satori's and Instagram's, not ours.

**Open calls:** where the affordance lives (the header `accessory` slot holds the
avatar today); 20 rows at 4:5 is tight — full table at 9:16, or top-N + the
followed club; the card draws in the reader's *in-app* language, unlike widgets.

## 2 · The other shareable cards

Once 1 has generalised the capture seam: a **result** card (scoreline + timeline —
the events already load), a **fixture** card (next match, kickoff, ground), a
**matchday** card (one round, ten results).

- ⚠ The backend serves composed crest imagery already —
  `GET /cronogol/fixtures/{id}/crest.png?slot=pair|home|away`.
- ⚠ The web's `/og/score.png` **refuses to draw a score it is given** — goals are
  compared and discarded. Keep the same rule locally: a share card draws stored
  data, never reader input.

## 3 · Account follows roam across devices

⭐ The backend shipped this **2026-09-01** and no client uses it — not this app,
not `cronogol`. `GET`/`PUT /cronogol/me/follows` (`CRONOGOL-API.md`).

Today `followed` is device state ([`store/preferences.ts`](src/store/preferences.ts)) —
a plain `string[]` with no timestamps, which is the exact bug the backend built
this to fix. Sign in on a second device today and your follows are empty.

- Local store becomes a list of **events** — `{ clubSlug, followedAt, unfollowedAt }`.
- ⚠⚠ That's a `SCHEMA_VERSION` bump, and **`FOLLOWED_RULE_VERSION` must not move
  with it** — the two are separate precisely so a shape bump doesn't empty every
  reader's follows. The loss is permanent and silent; users find out when alerts stop.
- ⚠ Sync is **merge**, never replace, on the backend's rules: latest timestamp
  wins, ties go to the follow, tombstones kept locally and pruned at ~90 days.
- ⚠ Follows are load-bearing in three other places — `PUT /cronogol/push/device`
  sends them as `clubSlugs`, the widget club filter reads them, the alerts sheet
  acts on them. A synced follow must re-arm push and rewrite the App Group snapshot.

## 4 · Live Activity for a followed club's match

Deferred since [0024](.claude/decisions/0024-push-enabled.md); spec in
[LIVE-ACTIVITIES.md](.claude/LIVE-ACTIVITIES.md). **The blocker half-expired.**

- `NSSupportsLiveActivities` is already `true`; the widget extension exists.
- `/cronogol/live` now carries status, score, a **minute** and an `events` array,
  ~30s refresh. Goal push has been end-to-end in production since 2026-08-30.
- ⚠ Missing is **delivery to the Activity** — push-to-start and frequent-update
  tokens registered with the backend. That's backend work; raise it there first.
- ⚠ **LaLiga only.** An Activity for a Bundesliga match would sit at kickoff.
- This is the strongest native-only justification the app has.

## 5 · Calendar, natively

An open question in [SCOPE.md](.claude/SCOPE.md). The `.ics` feeds already exist per club
and per matchweek, and [`calendar-sheet.tsx`](src/components/organisms/calendar-sheet.tsx)
already talks about them. Two shapes, not variants of each other:

1. **Hand iOS the `webcal://` URL.** Updates forever, zero work. ⚠ We can never
   remove or edit those events — which the alerts sheet's unsubscribe copy already
   has to say out loud.
2. **Write events with `expo-calendar`.** We own them, so a postponement updates
   and an unfollow deletes. ⚠ New native module (rebuild) + a new permission string.

⚠ The fixture-change push subsystem already exists, so a moved match is already
known to the app — which is a real advantage for option 2, not a theoretical one.

## 6 · A standings widget

Widgets ship ([0047](.claude/decisions/0047-widgets.md)) reading fixtures and news out of
the App Group. A table is the natural third snapshot.

- ⚠ The extension is a separate process with **no access to the app** — no API, no
  AsyncStorage, no query cache, no theme, no i18n.
  [`features/widgets/snapshot.ts`](src/features/widgets/snapshot.ts) is the whole
  contract, `targets/widget/Snapshot.swift` is its mirror; a field added to one is a
  blank row until added to both. Bump `SNAPSHOT_VERSION`.
- ⚠ Every printed string is pre-formatted in JS — widgets render in the *system*
  language, so the extension can't look anything up.
- ⚠ A small widget can't hold 20 rows. The honest small form is the followed club's
  own row — rank, points, movement.

## 7 · Alert one match

Alerts are per **club**. "Tell me about this one match" is a different subscription.

- ⚠ Backend work: `PUT /cronogol/push/device` sends `clubSlugs`; there's no
  per-fixture subscription in the contract.
- ⚠ Local notifications aren't the shortcut they look like — `threadIdentifier`
  isn't settable from JS in SDK 57, so a local reminder can't join the server's
  `fixture-{uuid}` thread. Two notifications for one match.

## 8 · Depth on the table screen

The expanded row already has W D L GF GA GD and the form strip. Not there:

- **Home / away split tables.** ⚠⚠ **Backend work, not client work.**
  `StandingsRowView` has no split, and deriving one from `/cronogol/fixtures` is the
  exact mistake [`expanded-row.tsx`](src/components/organisms/standings-table/expanded-row.tsx)
  warns about for form: a `finished` fixture with null goals is a real stored shape,
  the backend excludes it, a client derive scores it a draw — printing a split that
  disagrees with the points column beside it.
- **Time travel** — the table as of matchday N. ⚠ Cheap: `/cronogol/standings`
  already takes `matchweek`.
- **Pin the followed club** as a sticky row while scrolling 20 rows.
- **Head-to-head** between two rows.
- ⚠ Anything claiming one club is "above" another must compare `points` first —
  final ties break on club **slug**, which is stable and arbitrary.

## 9 · Search across the app

`SearchField` exists but is used on Clubs and onboarding only.

- ⚠ There is **no search endpoint** in the API contract. So: backend work, or a
  client search honestly scoped to what's cached (clubs, the loaded fixture window)
  and not presented as searching everything.
- ⚠ Players are the obvious want, and squads are **LaLiga Primera only** — every
  other league answers `200` with `players: []`.

## 10 · iPad and landscape

`supportsTablet: false`, `orientation: portrait` today. The table is the screen that
most wants the width — and the one whose fixed column widths are already flagged as
the first casualty of large Dynamic Type. Same problem seen twice.

⚠ Not a config flip: every screen is composed for one width, and iPad-capable apps
get a larger App Store review surface.

---

## Not on this list, and why

- **Player statistics** (appearances, season goals, minutes, xG) — ⛔ not deferred,
  **no source has them at any price point yet found**. Squads carry identity only.
  Match events say *who scored today*, never *how many this season*. A purchase,
  not a backlog item.
- **Android polish** — free from Expo, not a stated goal ([SCOPE.md](.claude/SCOPE.md)).
- **A web target** — dropped in [0016](.claude/decisions/0016-ios-only-v1.md); `cronogol`
  owns the web.
- **Talking to Supabase, Hygraph or a football provider directly** —
  [0009](.claude/decisions/0009-backend-is-only-data-gateway.md).
