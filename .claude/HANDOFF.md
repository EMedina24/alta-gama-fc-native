# Handoff — read this first

**As of 2026-08-25.** State of play for a session picking this up cold.

The app is a working iOS app: five screens on live production data, four sheets,
onboarding, EN + ES, push wired and verified on a simulator build. What remains is
widgets, a device build, and the backend's push cron.

---

## 60-second orientation

| | |
| --- | --- |
| **What** | Native iOS app for **AltaGama FC** — football fixtures, results, tables, club calendars |
| **Stack** | Expo SDK 57 · expo-router · React Query · TypeScript strict · dark-only |
| **Data** | `senpai-backend` at `crono-gol.com`. **The only gateway** — never Supabase or a football provider directly |
| **Reference** | `cronogol` (Next.js web app at `altagamafc.com`). Behaviour is inherited from it; **appearance is not** |
| **Design** | `handoff_AG-ios/` — `SPEC.md` is the screen contract, `screenshots/` shows every state |
| **Run** | `npx expo start --dev-client --ios` (needs a dev build — Expo Go no longer works) |
| **Gates** | `npx tsc --noEmit` · `npx expo export --platform ios` · `npx expo-doctor` |

**Read [ECOSYSTEM.md](./ECOSYSTEM.md) before touching data, naming or URLs.**
Read the decision log — [decisions/](./decisions/) — before changing anything that
looks arbitrary. Most of it isn't.

---

## What exists

```
src/
  app/                  21 routes: (tabs)/, club/[slug], (sheets)/, onboarding/, _debug/
  components/           12 atoms · 11 molecules · 14 organisms · 1 template
  lib/cronogol/         the ported data layer — path-mirrors cronogol/lib/cronogol/
  lib/{format,timezones}.ts · lib/i18n/{phrases,copy,use-i18n}
  queries/              React Query hooks + staleTime buckets
  store/                preferences (device-local) + push registration
  features/push/        capability seam · sync · reminders · routing
```

**Screens:** Today (board + FINISHED TODAY + follow card) · Matchdays · Table ·
Clubs · club page (season spine + squad). **Sheets:** alerts · calendar ·
matchday calendar · account. **Onboarding:** club picker → alert primer.

---

## ⚠ The traps that have already bitten

Every one of these is a real bug that shipped or nearly shipped here. They are
documented at the code that handles them; this is the index.

1. **`lastSyncedAt === null` is not a schedule.** An opponent-only club returns a
   handful of matches. Render the pending state, never the partial list.
2. **Jornada order is not chronological.** LaLiga matchday 1 had a deferred
   fixture *after* matchday 2 finished. `currentMatchweek` sorts on
   `firstKickoffUtc`; `completedMatchweek` walks contiguously and stops at the
   first gap — which is why the Table caption is legitimately `null` right now and
   degrades to a club count.
3. **`form` is NEWEST-FIRST on the wire.** Rendering it as given reverses a
   timeline and silently drops the *oldest* entry on a short array.
4. **Spanish `D` is a LOSS** (*Derrota*), the opposite of English `D` (draw).
   Letters come from `phrases.formLetters`; components never see a language.
5. **`to` is EXCLUSIVE on `/cronogol/fixtures`, INCLUSIVE on
   `/cronogol/teams/{slug}/fixtures`.** On purpose.
6. **Unknown query params are 400s**, not ignored — both those routes carry
   `forbidNonWhitelisted` DTOs. `toQuery`'s drop-undefined filter is load-bearing.
7. **`/cronogol/scores` is a WORLD scoreboard** with no crosswalk to our clubs
   (Liga Argentina, friendlies). It cannot serve FINISHED TODAY — that comes from
   `/cronogol/fixtures`. See [0022](./decisions/0022-finished-today-from-fixtures.md).
8. **No DATA is live.** Scores sweep ~4h, standings lag ~3h. No minute, no
   pulsing dot, nothing that animates a *score* into looking current. Every score
   states its age. **Never remove those lines.** ⚠ The next-up countdown is the
   one exception and is not a counter-example: it is arithmetic on the device
   clock against a kickoff timestamp the API already gave us, so it cannot go
   stale — see [0034](./decisions/0034-next-up-card-live-seconds-countdown.md).
   ⚠ An in-play SCORE may now be shown, and only in the shape
   [0035](./decisions/0035-jornada-rows-show-in-play-scores.md) sets: the score,
   a caption that says *in play* (never "live"), and the cadence sentence beside
   it. Drop any one of the three and you are back to the claim this trap exists
   to stop. `statusText` in `scores.ts` still returns null for `live` — that
   guard is for `/cronogol/scores`, which no UI reads.
9. **The APNs token must be lowercased** — the backend rejects uppercase hex with
   a 400 on *every* registration. Verified against production.
10. **The APNs environment follows the PROVISIONING PROFILE, not the build
    name.** EAS `distribution: internal` is **ad-hoc**, and ad-hoc carries
    `aps-environment: production` — so an EAS build called `development` issues a
    **production** token. Cost a debugging round; see
    [0026](./decisions/0026-apns-environment-is-the-provisioning-profile.md).
    ⚠ This failure is **silent**: the device registers fine and every push fails
    at APNs with nothing surfaced in the app. Also not `__DEV__` — that is false
    in a release-configuration dev-client build.
11. **iOS caps pending local notifications at 64.** `selectReminders` uses a
    rolling window of 60 and never schedules a `kickoffTbd` fixture (stored at
    midnight-UTC, so "30 min before" fires at 01:30 for a 21:00 match).
12. **An `_`-prefixed route is NOT private.** Only `_layout` is special. `/_debug`
    would have shipped; it is guarded by a `__DEV__` redirect in
    `_debug/_layout.tsx`.
13. **`presentation: 'formSheet'` in a nested `_layout.tsx` does NOTHING.** A
    group with a layout is a nested stack, and its first route is that stack's
    root — no navigator presents it, so it rendered full-screen with no grabber,
    no swipe-to-dismiss and (with `headerShown: false`) no way back. All four
    sheets shipped like that. They are declared in the ROOT stack now; a new
    sheet route needs a `Stack.Screen` line there or it silently reverts to a
    card. See [0030](./decisions/0030-sheets-are-presented-by-the-root-stack.md).
    ⚠ And inside a `formSheet`, **`flex: 1` collapses to zero** — the screen is
    laid out at its content's height, so a `flex: 1` wrapper paints its children
    on top of each other. A pinned header there is `stickyHeaderIndices`, not a
    sibling above the scroll.
14. **Bands are per-league CONFIG, never position arithmetic.** `bandsApply` also
    suppresses them on an incomplete or unplayed table — banding a zero-point
    table painted three clubs into relegation on the web app.
15. **The countdown's `AppState` listener is load-bearing.** `countdown.tsx`
    ticks once a second and tears the timer down whenever the app leaves
    `active`. iOS suspends JS timers in the background anyway, so dropping the
    listener does not save the wake — it just means the card comes back from a
    resume showing the number it was suspended on, and re-reading `Date.now()`
    on `active` is the whole fix. Each tick also schedules to the next WALL
    second, not a fixed period, or the digit drifts from whenever the card
    mounted. See [0034](./decisions/0034-next-up-card-live-seconds-countdown.md).

---

## Where things stand

### Done and verified
- Phases 1–3 of the plan: foundation, all read-only screens, follows, sheets,
  onboarding, both languages.
- Push: registration, local reminders, deep-link routing — verified on the
  simulator build `7f90c3d6`, then **end-to-end on a physical device**
  (build `9a8ca060`): real APNs token obtained, registered, and a push from
  `senpai-backend`'s probe **delivered to the phone**. See
  [GO-LIVE.md §5](./GO-LIVE.md).
- The production push contract, exercised with a synthetic token that was deleted
  afterwards: 200 / uppercase 400 / unknown slug 404 / DELETE 204.
- Clubs browses every league behind the Matchdays filter row
  ([0032](./decisions/0032-clubs-browse-by-league.md)) — verified on the
  simulator switching LaLiga → Premier League. ⚠ Search stays global and hides
  the row; only the browse list waits on the roster, or switching league blanks
  the screen under the reader's finger.

### Open — in priority order

0. **Front-end gaps** — see the section below. The Today board's lead states
   are now wired (0027); loading skeletons are the next most visible.
1. **Widgets** — [0025](./decisions/0025-widgets-deferred.md). Both sizes, full
   build. App Group already declared and registered. Strongest Guideline 4.2
   argument; do it before submission.
2. **Device build** — `eas build --profile development --platform ios`.
   Interactive: registers the iPhone, asks for credentials. ⚠ **Upload the
   existing `.p8`** — the account is capped at 2 APNs keys and one is used.
   A real APNs token cannot be obtained on a simulator, at all.
3. **Backend push cron** — `CRONOGOL_PUSH_CRON_ENABLED` is still `'false'`.
   ⚠ **This is the last thing between here and real alerts.** The probe sends
   directly and works; the app's own alerts (kickoff moved, postponed) do not
   dispatch until this flips. Credentials and delivery are already proven.
4. **Live Activity** — deferred to v1.1 ([0024](./decisions/0024-push-enabled.md)).
   SPEC §4's version needs a minute the API cannot supply, an ActivityKit token
   the push DTO rejects, and a push-to-start the dark cron cannot send.
5. **Accounts** — v1 is anonymous by design
   ([0019](./decisions/0019-anonymous-v1.md)). ⚠ Reinstalling loses the follow
   list; that is the strongest argument for adding auth in v1.1. ⚠ Adding Google
   sign-in triggers Guideline **4.8** (needs Sign in with Apple), which the
   backend does not support — a backend project.
6. **App Store prep** — privacy nutrition labels must say what is actually
   collected: an APNs token and followed club slugs, device-keyed, **no account**.


---

## Front-end work outstanding

The five screens are built and running on live data, but several designed states
are unbuilt or stubbed. Audited 2026-08-25 against `handoff_AG-ios/SPEC.md`.
Ordered by what a user would notice first.

### 1 · ~~The Today board is missing two of its three lead states~~ — DONE 2026-08-25

Wired in [0027](./decisions/0027-board-lead-cards-from-fixtures.md): both the
live and last-result cards read `/cronogol/fixtures` (a 14-day `recentBounds`
window plus today's), selected by `lib/cronogol/board.ts` — pure, harness-proven.
`useScoreboard` is gone; **the app's UI no longer reads `/cronogol/scores`**.
⚠ The score-age line now says "as of the last check · roughly every 3h" — the
fixture route has no per-row stamp, and our own fetch time would understate it.
Last-result card verified on the simulator (Elche 0–5 Barcelona, `V` pill); the
live card has not been seen against production yet — no fixture was in play.

### 2 · ~~Loading states are a literal `…`~~ — DONE 2026-08-25

All six sites render `SkeletonRows` at `Size.rowSkeleton`. `Skeleton` now honours
Reduce Motion (`useReducedMotion` → steady opacity), which closes that bullet of
item 7 too.

### 3 · ~~Matchdays header is incomplete~~ — DONE 2026-08-25

Built as `molecules/matchday-pager.tsx` ([0028](./decisions/0028-matchday-pager.md)):
prev/next squares on their own row under the title, range + count right-aligned.
The screen owns ONE clamped `goTo(n)` that the strip and both arrows call — there
is no second state. The range is gated on `kickoffsConfirmed`; a provisional round
prints `datesPending` and drops the zone with it. `formatDateRange` collapses
shared parts to the right and is harness-proven (same day / same month / cross
month / cross year, EN + ES).

Verified on the simulator: jornada 1 `SÁB 15 — JUE 27 AGO 2026` (the deferred-opener
span), jornada 5 `FECHAS POR CONFIRMAR · 10 PARTIDOS`, prev disabled on 1, next
disabled on 38. ⚠ Not yet seen in English or at large Dynamic Type.

Picked up on the way: `Size.pill` now holds the 34pt square for the strip and the
pager, and the strip's accessibility label is localised (it was hardcoded English).

### 4 · Today's stat tiles (SPEC §3.1 item 4)

Two tiles under the upcoming section — subscribed count → Clubs, feed count →
account sheet. Not built. (The upcoming section itself is done —
[0029](./decisions/0029-upcoming-rows-read-from-the-followed-club.md): the
both crests either side of a `vs`, over `kickoff · day · venue` — a relative day
word, accent on today only. Names live on the accessibility label, not the row.
⚠ `formatRelativeDay` must never see a `kickoffTbd` row — midnight-UTC would
claim "tonight" for a match with no kickoff.)

### 5 · The account avatar exists on one screen

`AvatarButton` is only on Today, and it renders **empty initials** (`initials=""`).
The design puts it in every tab header. In an anonymous v1 there is no name to
derive initials from — so this needs a product answer, not just wiring: a glyph, a
mark, or the club crest of the first followed club.

### 6 · Onboarding club picker is 2-up, SPEC §3.7 says 3-up

Cosmetic, but it changes how many clubs are visible without scrolling, which is
the whole job of that screen.

### 7 · Accessibility pass

- ~~`Skeleton` pulses unconditionally~~ — honours Reduce Motion since 2026-08-25.
- Dynamic Type is inherited (system font, no `expo-font`) but has not been tested
  at large sizes; the table's fixed column widths are the likely first casualty.
- Hit targets were built to 44pt but not audited.

### 8 · Polish

- `expo-haptics` is **not installed**. The design calls for a haptic on
  follow/unfollow. `NativeTabs` already gives tab haptics free.
- The Today eyebrow reads only a weekday. The design pairs it with a matchday —
  deliberately not built, because the board spans four leagues and no single
  matchday is true of all of them. **Needs a product call**, not a fix.

### Known gaps, deliberately
- **Serie A has no mark** — text label, don't invent artwork.
- **Qualification bands are unconfirmed for 2026/27** — coefficient-driven, worth
  checking against the real allocation before launch.
- **`venue.city` is null except Serie A** — the club page derives it from the
  first home fixture via `homeGround()`.
- **`threadIdentifier` is not settable from JS in SDK 57**, so a local reminder
  cannot join the server's `fixture-{uuid}` thread. Two notifications, not one.
- **The Today eyebrow shows only a weekday.** The design pairs it with a matchday,
  but the board spans four leagues and no single matchday is true of all of them.

---

## Working rules

- **Every decision gets an ADR** in [decisions/](./decisions/), written with the
  code. Reversals are new entries; the old one is marked superseded, never edited.
  See [AGENTS.md](../AGENTS.md).
- **Read the Expo 57 docs before writing code** — the SDK changed.
- **No colour, space or font literal in a component.** Everything through
  `@/constants/theme`.
- **Dependencies point downward:** organisms → molecules → atoms. Nothing below
  organisms fetches.
- **Verify on the simulator, not just `tsc`.** Every visual bug in this project so
  far — a truncated monogram, merged band rails, a wrong next-card layout, tab
  labels that never translated — passed the type check.
- **Pure logic goes in a module with no native import**, so it can be run in a
  plain-JS harness. That is how the push contract and reminder rules were proven
  before a build existed.
