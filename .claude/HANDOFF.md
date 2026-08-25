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
8. **Nothing is live.** Scores sweep ~4h, standings lag ~3h. No minute, no pulsing
   dot, no ticking. Every score states its age. **Never remove those lines.**
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
13. **Bands are per-league CONFIG, never position arithmetic.** `bandsApply` also
    suppresses them on an incomplete or unplayed table — banding a zero-point
    table painted three clubs into relegation on the web app.

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

### Open — in priority order

0. **Front-end gaps** — see the section below. The Today board's live and
   last-result states are the biggest: both organisms exist, neither is wired.
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

### 1 · The Today board is missing two of its three lead states ⚠

`organisms/match-board.tsx` implements **live**, **last result** and **next** —
but `(tabs)/index.tsx` only ever passes `next`. So the in-progress card and the
last-result card never render.

That makes this the highest-value item, and it is mostly wiring rather than new
components. It also means **the score-age line has never appeared in the app** —
"Score last checked 2h ago · updates roughly every 4h" is the honesty centrepiece
of the whole design (SPEC §3.1, and the handoff says twice not to remove it), and
today there is no code path that shows it.

Needs: `useScoreboard()` (already written in `queries/use-today.ts`, currently
unused) wired to a live row, and the most recent finished fixture of a followed
club for the last-result card.

### 2 · Loading states are a literal `…`

Six screens render `<Text>…</Text>` while pending: Today, Table, Matchdays, Clubs
and the club page (twice). The `Skeleton` / `SkeletonRows` atoms exist, are
designed for exactly this, and are used **only** in `_debug`.

### 3 · Matchdays header is incomplete (SPEC §3.2)

- **Prev/next pager** — 34pt raised squares flanking the title. Only the strip
  exists. ⚠ They must drive the same clamped state as the strip, not a second one.
- **Date range + count** — right-aligned `SAT 5 — MON 7 SEP 2026` over
  `10 MATCHES · CEST`. ⚠ Gate the range on `kickoffsConfirmed`; provisional dates
  would print a range that moves.

### 4 · Today's stat tiles (SPEC §3.1 item 4)

Two tiles under the upcoming section — subscribed count → Clubs, feed count →
account sheet. Not built.

### 5 · The account avatar exists on one screen

`AvatarButton` is only on Today, and it renders **empty initials** (`initials=""`).
The design puts it in every tab header. In an anonymous v1 there is no name to
derive initials from — so this needs a product answer, not just wiring: a glyph, a
mark, or the club crest of the first followed club.

### 6 · Onboarding club picker is 2-up, SPEC §3.7 says 3-up

Cosmetic, but it changes how many clubs are visible without scrolling, which is
the whole job of that screen.

### 7 · Accessibility pass

- ⚠ `Skeleton` pulses unconditionally — must honour **Reduce Motion**. It is the
  only always-on animation in the app, and the design says motion is platform
  defaults plus the accent ring, nothing else.
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
