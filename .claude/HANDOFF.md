# Handoff — read this first

**As of 2026-08-26.** State of play for a session picking this up cold.

The app is a working iOS app: five screens on live production data, four sheets,
onboarding, EN + ES, push wired and verified on a simulator build. What remains is
widgets, a device build, and the backend's push cron.

---

## 60-second orientation

| | |
| --- | --- |
| **What** | Native iOS app for **Alta Gama FC** — football fixtures, results, tables, club calendars |
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
   ⚠ The score CHIP ([0044](./decisions/0044-scores-render-as-split-digits.md))
   is `raised`, a neutral ground, and must stay that way. Painting it `live` /
   `liveWash` would make every finished score in a list look current, which is
   this trap by another route.
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
    ⚠ **That window counts NOTIFICATIONS, not fixtures** — a reader can pick up
    to three lead times (1 h / 30 / 15) and one match then costs three slots, so
    three leads buy ~20 fixtures of horizon where one buys 60. The selection
    expands fixtures × leads and sorts the whole expansion by FIRE TIME, so the
    nearest match is always fully covered and the horizon is what shortens. Going
    back to counting fixtures schedules 180 and hands the cap to iOS's silent
    truncation — which looks fine in testing, because nobody testing follows
    enough clubs to cross 64. See
    [0040](./decisions/0040-kickoff-reminder-lead-times.md).
    ⚠ The cutoff is tested PER LEAD: a match kicking off in 20 minutes has no
    60- or 30-minute reminder left but its 15-minute one is still ahead.
    ⚠ And an attachment file is per NOTIFICATION, not per fixture — see trap 13.
12. **Notification crests cannot be drawn on the device — for two leagues, not
    ever.** Bundesliga clubs publish `svg` and nothing else; Serie A crests are
    WebP. `UNNotificationAttachment` takes neither and Swift decodes neither, so
    `senpai-backend` composites every crest and the lettered fallback tile
    ([0037](./decisions/0037-rich-notifications-server-composed-crests.md)).
    ⚠ The tile is the DESIGN for those clubs, not a degradation. Never hot-link
    a provider to "fix" it.
13. **`UNNotificationAttachment` MOVES the file it is handed** into the
    notification's own store. Attaching a cached file empties the cache on every
    fire; `crest-cache.ts` hands over a copy, and `attachmentCopy` exists for
    exactly this. ⚠ It also needs `typeHint: 'public.png'` — iOS types the
    attachment from that and silently drops an untyped file.
    ⚠ **One copy PER NOTIFICATION, keyed `${fixtureId}-${lead}`.** Three lead
    times on one match are three notifications; sharing one copy between them
    means the first one scheduled consumes the file and the other two are handed
    a path with nothing at it — dropped silently, as above. This is also why
    `pruneCrestCache` takes TWO keep-lists: the plate cache and the App Group are
    per fixture, the attachment directory is per notification, and sweeping the
    latter against fixture ids deletes every copy on every re-arm (0040).
14. **A notification category identifier is a THREE-WAY contract that nothing
    validates**: `categories.ts`, the wire (`aps.category` from the backend and
    `categoryIdentifier` on every local reminder), and the content extension's
    `UNNotificationExtensionCategory`. A mismatch produces no error anywhere —
    the long-look card simply never appears.
15. **The long-look card is a second source of truth, twice over.** An app
    extension is a separate binary: `targets/notification-content/Tokens.swift`
    copies `theme.ts` by hand, and `en.lproj`/`es.lproj` copy nothing from
    `copy.ts` because the extension cannot read the JS bundle. Both will drift
    and nothing will catch it. ⚠ 0040 widened this: the card's eyebrow now
    branches on `leadMinutes`, so **a lead added to `REMINDER_LEAD_OPTIONS` needs
    a `case` in `MatchCard.eyebrowText` AND a line in both `.lproj` files** or iOS
    prints the raw key on the card.
16. **Reminder artwork is capped at the soonest 12** (`REMINDER_ARTWORK_BUDGET`),
    because the re-arm runs on **every foreground**, not just on a data change.
    Lifting the cap puts 60 downloads on every resume from the app switcher.
17. **A `Directory`'s `uri` ends in a slash; a `File`'s does not.**
    `FileSystemPath.init` standardises through
    `appendingPathComponent(_:isDirectory:)`, so `entry.uri.split('/').pop()`
    yields `''` for every directory. `pruneCrestCache` walked a directory of
    directories that way and would have deleted the whole App Group crest cache
    on every re-arm — the long-look card showing lettered tiles for clubs that
    HAVE a crest, and re-downloading all of them on every foreground. ⚠ Caught
    by reading the native source, not by `tsc` and not by any test.
18. **An `_`-prefixed route is NOT private.** Only `_layout` is special. `/_debug`
    would have shipped; it is guarded by a `__DEV__` redirect in
    `_debug/_layout.tsx`.
19. **`presentation: 'formSheet'` in a nested `_layout.tsx` does NOTHING.** A
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
20. **Bands are per-league CONFIG, never position arithmetic.** `bandsApply` also
    suppresses them on an incomplete or unplayed table — banding a zero-point
    table painted three clubs into relegation on the web app.
21. **The countdown's `AppState` listener is load-bearing.** `countdown.tsx`
    ticks once a second and tears the timer down whenever the app leaves
    `active`. iOS suspends JS timers in the background anyway, so dropping the
    listener does not save the wake — it just means the card comes back from a
    resume showing the number it was suspended on, and re-reading `Date.now()`
    on `active` is the whole fix. Each tick also schedules to the next WALL
    second, not a fixed period, or the digit drifts from whenever the card
    mounted. See [0034](./decisions/0034-next-up-card-live-seconds-countdown.md).
22. **`expo prebuild` FLATTENS the tinted app icon onto solid WHITE.**
    `withIosIcons` generates every variant with
    `removeTransparency: appearance !== 'dark'` and `backgroundColor: '#ffffff'`
    — only `dark` keeps its alpha. A tinted export drawn the usual way (a pale
    glyph on transparency) comes out white-on-white, and since iOS 18 maps
    *luminance* to the user's tint, the home-screen tile renders as flat colour
    with **no mark in it**. The icon-1b masters arrive pre-composited on opaque
    `#0b0b0b`, so the flatten is currently a no-op — **but the requirement did not
    go away, it just became the design source's default.** Any tinted export that
    comes back transparent reverts the bug. ⚠ It fails silently: nothing errors,
    `expo-doctor` passes, and it is visible only under Settings → Display &
    Brightness → **Tinted** on a real build. See
    [0036](./decisions/0036-app-icon-appearance-variants.md) →
    [0041](./decisions/0041-app-icon-1b-and-a-splash-of-its-own.md).
    ⚠ **And the `dark` master is OPAQUE now, so it is no longer splash-safe.**
    0036 had the splash reuse `icon-dark.png` because that variant was the glyph
    alone on transparency. Icon 1b's dark variant is a full-bleed `#0f1216` field
    — deliberately, so the lime stays the Home Screen signal — and 184pt of it
    centred on the `#0a0b0c` ground is a **visible dark square**. The splash has
    its own asset now: `assets/images/splash-lockup.png`, the full logo lockup. ⚠ It
    is TIGHT to the artwork — no padding — so `imageWidth` (300) is the artwork's
    true width, NOT 0036's 184, which was really 184 × 0.646 because the mark
    floated in a 1024 square. **Trim and `imageWidth` are one setting in two
    files**: re-trim the artwork without re-deriving the number and the launch
    screen silently resizes.
23. **A hand-authored `AppIcon.appiconset` in the repo does NOTHING.** This is a
    CNG project — `prebuild` regenerates `Images.xcassets/AppIcon.appiconset`
    from `app.json` and overwrites it. A complete, correct seventeen-file
    appiconset sat at `icons/` unread from `924828a` until 0036. The icon is
    configured in `app.json`, nowhere else. ⚠ `prebuild` also rewrites
    `package.json`'s `ios`/`android` scripts to `expo run:*` — revert that; the
    run command is still `npx expo start --dev-client --ios`.
    ⚠ Same trap, same shape: **`icon-handoff/` and `logos/` are design source and
    no build step reads a byte of either.** They are kept because the SVG masters
    and the geometry notes are worth having; the only files that reach a build are
    the four in `assets/images/` that `app.json` names.
24. **Signing out must never touch `followed`.** It is device state, this device's
    array IS the follow state, and nothing on the server can rebuild it
    ([0019](./decisions/0019-anonymous-v1.md) survives 0038 on this point). A
    sign-out that clears it silently unsubscribes the reader from every alert they
    have. `store/session.ts` clears the session and nothing else, deliberately.
25. **Apple hands over the user's name EXACTLY ONCE** — the first authorization
    ever for that Apple ID and this app — and the identity token carries no name
    claim, so Supabase never sees it either. `features/auth/apple.ts` writes it to
    `PATCH /cronogol/me` in the same function. Miss it and the account is nameless
    forever, short of the user revoking the app in Settings → Apple ID.
26. **An expired bearer is a 401 even on `@OptionalAuth()` routes.** "Optional"
    means a MISSING credential is acceptable, not a bad one — so
    `PUT /cronogol/push/device` must carry a freshly-resolved token or none at
    all. A cached one breaks push registration entirely and silently. Never store
    an access token anywhere; call `getAccessToken()`, which refreshes.
27. **There is no unlink.** A bearer links a device row to an account permanently;
    an anonymous re-register KEEPS the link, and signing out changes nothing
    server-side. Push therefore re-registers on sign-IN only — firing on sign-out
    would spend one of 20/min to tell the server what it already knows.
28. **`AUTH_STORAGE_KEY` can never change.** Unset, `supabase-js` derives it from
    the hostname; `cronogol` is pinned to a stale project ref forever because
    moving to the custom domain silently renamed its key and presented as "the app
    forgot me after a deploy", with no error anywhere.
29. **EAS checks that a provisioning profile is ACTIVE, not that it COVERS your
    entitlements.** Adding a capability to `app.json` and enabling it on the App
    ID is **not enough** — an already-issued profile does not gain it, and EAS
    happily prints *"All credentials are ready to build"* while handing Xcode a
    profile that cannot sign the app. It cost three failed builds on 2026-08-26.
    The error, if you hit it:
    `Provisioning profile "…" doesn't include the Sign In with Apple capability`.
    **The fix is to make Apple mint a NEW profile:**
    `eas credentials -p ios` → the build profile → the MAIN target → *Provisioning
    Profile: Delete one from your project*, then *All: Set up all the required
    credentials*. ⚠ When it asks *"All your registered devices are present… reuse
    the profile?"* answer **No, let me choose devices again** — "Yes" re-imports
    the same stale profile from Apple and nothing changes. Confirm success by the
    **Developer Portal ID changing** and `Updated` reading seconds rather than
    hours; the ID alone is the only reliable tell.
    ⚠ `--refresh-ad-hoc-provisioning-profile` is the non-interactive equivalent,
    but it is **non-interactive ONLY** and needs an **App Store Connect API key**,
    which this account does not have. ⚠ An APNs `.p8` is NOT one — different
    console, different service, different issuer claim, not interchangeable.
30. **React Native's `URL` and `URLSearchParams` corrupt credentials silently.**
    `URL.hash` is `match(/#([^/]*)/)` — it stops at the first `/`. `URLSearchParams`
    does `pair.split('=')` and takes two elements, cutting any value containing
    `=`. Both truncate rather than throw. `features/auth/google.ts` parses the
    OAuth redirect by hand for exactly this reason — do not "simplify" it back.
31. **The splash and the icon are NATIVE — Metro reloads will never change them.**
    Both are compiled into the binary from `app.json` at build time, so a dev build
    already installed on a device keeps the artwork it was built with no matter how
    many times it re-downloads the bundle. Seeing new launch artwork means
    installing a NEW NATIVE BUILD on **that** device; a simulator being right says
    nothing about the phone. ⚠ And `expo run:ios` **skips prebuild entirely when
    `ios/` already exists**, so an `app.json` change silently does not reach the
    native project — it reports "Build Succeeded" and installs the previous
    artwork. Delete `ios/` (or `expo prebuild --clean`) after ANY `app.json` edit,
    and verify against the GENERATED asset in
    `ios/*/Images.xcassets/SplashScreenLogo.imageset/`, never the build's exit code.

32. **An empty events array is NOT a goalless match, and the feed order is not
    always chronological.** `GET /cronogol/fixtures/{id}/events` returns
    `count: 0` for any fixture the 3-hourly, finished-only sweep has not reached
    — so a 4-1 that ended twenty minutes ago and a real 0-0 are the *same
    response*, and the API cannot tell them apart for us. Copy says "not
    published yet" and must never be tidied into "no goals"
    ([0045](./decisions/0045-match-events-expanded-row.md)).
    ⚠ **Two claims in `handoff_event-expansion/API-MATCH-EVENTS.md` did not
    survive first contact with production**, checked 2026-08-26:
    *"`minuteExtra` is Serie A only"* — it is not, LaLiga populates it; and
    *order comes from the server* implying chronological — on
    `c56084e3-df56-420d-9a05-714b3eadaaa5` a 46' substitution is served **before**
    the 45+3' booking, so the panel legitimately renders `46′` above `45+3′`.
    Shipped as served, per the instruction and design rule 2. A **stable** sort
    on the composed `(minute, minuteExtra)` would fix that inversion without the
    pair-flipping the doc warns about — it needs its own ADR, not a quiet edit.
33. **A fixed-width numeric column needs `adjustsFontSizeToFit`, not just a
    measured width.** The events panel's minute column was built to the spec's
    30pt and truncated `45+2′` to `45…` on the simulator — the spec's number was
    set against HTML, which overflows a fixed width silently rather than
    ellipsing it. ⚠ `tsc` and `expo export` both passed; **only the simulator
    caught it**, and the same is true of the chevron column that this change
    first added to the matchday row: it cost the name block 19pt and truncated
    `Espanyol de Barcelona`, which is the failure ADR 0029 exists to name. The
    chevron lives beside `FIN` in the timing column for exactly that reason.

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
- **Rich notifications — the whole of `handoff_notifications/`, both directions**
  ([0037](./decisions/0037-rich-notifications-server-composed-crests.md)),
  built and verified on hardware 2026-08-26 (build `cdb69968`).
  - **`1a`, the composed crest thumbnail.** `senpai-backend` draws every crest
    (`GET /cronogol/fixtures/{id}/crest.png?slot=pair|home|away`) because ⚠ half
    our leagues cannot be rasterised on the device at all — Bundesliga publishes
    SVG only, Serie A publishes WebP. Server pushes get it through a Notification
    Service Extension; the local reminder attaches a file cached at schedule
    time, since ⚠ a local notification can never invoke an NSE.
  - **`1b`, the long-look card.** A Notification Content Extension, all three
    variants: reminder, moved (`was → now`), postponed (`NO NEW DATE`). The NSE
    leaves both crests in the App Group and the card reads them off disk.
  - `@bacons/apple-targets` adopted, Swift in `targets/` and ⚠ **never** a
    committed `ios/` ([0025](./decisions/0025-widgets-deferred.md)). Three bundle
    IDs now; `ios.appleTeamId` is `8Q5L5A2M62`.
  - Proven on device: the attachment on both a real-crest and a lettered-tile
    fixture, the App Group hand-off between two processes, `ALTAGAMA FC`,
    a derived `TOMORROW`, the `Open club` action, and ⚠ **`apns-collapse-id`
    REPLACING rather than stacking** — one current card for a fixture that moves
    twice, which is what stops a wobbling kickoff from spamming a reader.
  - ⚠ **Nothing about APNs changed.** Same `.p8`, same device token, same
    `apns-topic: com.altagamafc.app` — extensions never appear on the wire, iOS
    invokes them locally. No second APNs key was created (the account caps at 2).
  - ⚠ One bug found and deliberately deferred: **a tapped notification lands on
    Today**, open item 3 below.
- **The push cron is ON** (2026-08-26, Render dashboard; `render.yaml:91` agrees).
  ⚠ It dispatches only what the ~3h sync newly detects, so silence is the normal
  state. Every notification seen on 2026-08-26 was hand-sent.

### Open — in priority order

0. **Front-end gaps** — see the section below. The Today board's lead states
   are now wired (0027); loading skeletons are the next most visible.
1. **Widgets** — [0025](./decisions/0025-widgets-deferred.md). Both sizes, full
   build. App Group already declared and registered. Strongest Guideline 4.2
   argument; do it before submission.
2. ~~**Device build**~~ — DONE 2026-08-26. `development` profile, ad-hoc, so a
   **production** token ([0026](./decisions/0026-apns-environment-is-the-provisioning-profile.md)).
   ⚠ The two extension targets each needed their own provisioning profile; the
   existing `.p8` was reused and **no second APNs key was created** (the account
   caps at 2 and one is spent). `ios.appleTeamId` is now `8Q5L5A2M62`.
3. 🐛 **BUG — tapping a notification lands on Today, not the club page.**
   Reproduced on device 2026-08-26, build `cdb69968`: tapping `Open club` on a
   `kickoff_moved` push opens the app on the Today tab. `deepLink` in that
   payload was `altagamafc://club/barcelona`. **Deferred to a later session by
   decision, not overlooked.**

   Ruled out, with evidence:
   - **Not the `actionIdentifier` filter.** `wantsRoute` accepts `open_club` and
     `DEFAULT_ACTION_IDENTIFIER`, and `NotificationRecords.swift:457` maps iOS's
     `UNNotificationDefaultActionIdentifier` onto exactly the string the JS
     constant holds. Both branches pass.
   - **Not `routeFor`.** Its regex matches `altagamafc://club/{slug}` and it is
     harness-proven across nine payload shapes ([0024](./decisions/0024-push-enabled.md)).
   - **Not `OnboardingGate`.** It only redirects while `!onboarded`, and this
     device is onboarded with a followed club.

   ⚠ **Leading hypothesis: the navigation is fired before the navigator is
   ready, and silently dropped.** `<PushSync />` is a SIBLING of `<Stack>` and is
   declared *before* it (`_layout.tsx:28`), so its effect runs before the
   navigator mounts its screens. `OnboardingGate` gets away with the same
   position only because `useSegments()` re-runs it once routing exists;
   `usePushSync`'s tap effect depends on `[router]` alone and fires once, on
   mount. A cold-start tap resolves `initialRoute()` into a `router.push` that
   has nothing to push onto, and the app settles on its default route — Today.

   To settle it: log inside the `.then` and inside `onNotificationTap`, then
   compare a COLD tap (app killed) against a WARM one (app backgrounded). If
   warm works and cold does not, it is the race above and the fix is to defer
   until routing is live — not to change `routeFor`.
4. ~~**Backend push cron**~~ — **ON since 2026-08-26**, set in the Render
   dashboard; `render.yaml:91` already reads `'true'`, so the two agree and a
   Blueprint sync will not revert it.
   ⚠ **"On" does not mean alerts are imminent.** The pass dispatches only what
   the ~3h fixture sync has newly detected — a kickoff moved, postponed,
   confirmed, TBD or reinstated. Those are genuinely rare, so days can pass with
   nothing sent, and that is the system working. Every push seen so far this
   session was hand-sent; the cron removes the last manual step, it does not
   create traffic.
   ⚠ Cadence is `:15` and `:45`, offset so it never stacks on the hour crons.
5. **Live Activity** — deferred to v1.1 ([0024](./decisions/0024-push-enabled.md)).
   SPEC §4's version needs a minute the API cannot supply, an ActivityKit token
   the push DTO rejects, and a push-to-start the dark cron cannot send.
6. ~~**Accounts**~~ — **shipped 2026-08-26**, Apple + Google, sign-in optional
   ([0038](./decisions/0038-accounts-apple-and-google.md),
   [0039](./decisions/0039-auth-goes-direct-to-supabase.md)). Guideline **4.8**
   turned out not to be a backend project at all: the backend authenticates
   nobody, and native-only Apple needs no Services ID or `.p8`.
   ⚠ **Built successfully 2026-08-26** with the Sign In with Apple entitlement
   ([build efdb732c](https://expo.dev/accounts/emedina24s-team/projects/alta-gama-fc/builds/efdb732c-94ed-4430-aa4a-efee47a59b1e)),
   but **not yet exercised on a device**. The nine checks below are still open.
   ⚠ **Reinstalling still loses the follow list.** Signing in does NOT sync
   follows: the backend has no follows endpoint, and the web derives them from
   claimed feeds, which 0019 excluded and 0038 did not add back.
   ⚠ **`AUTH_REQUIRED`** in `features/auth/capability.ts` is the seam for making
   sign-in mandatory. Flipping it also makes 5.1.1(v) unavoidable and needs the
   sign-in sheet re-presented without its `Close`.
7. **App Store prep** — privacy nutrition labels. ⚠ **This changed with 0038** and
   the old answer is now wrong: it is no longer "device-keyed, **no account**".
   Collected: an APNs token and followed club slugs (device-keyed), **plus email
   and display name linked to an account** for readers who sign in. Sign in with
   Apple's Hide My Email means some of those addresses are
   `@privaterelay.appleid.com`.

   **Before the first build that ships auth:**
   - Enable **Sign In with Apple** on `com.altagamafc.app` in the Apple Developer
     portal, and rebuild — the entitlement changes the provisioning profile.
   - Supabase → Providers → **Apple** → enable, add `com.altagamafc.app` to
     *Client IDs*. Leave Services ID and Secret Key empty.
   - Supabase → URL Configuration → **Redirect URLs** → add `altagamafc://auth-callback`.
     ⚠ An unlisted value does not error — Supabase falls back to the Site URL, so
     Google sign-in lands on the website and the app never hears back.
     `/_debug/auth` prints the exact string to paste.
   - The Apple Sign In **entitlement is verified to generate correctly** — a
     `prebuild` on 2026-08-26 produced `com.apple.developer.applesignin` alongside
     the existing App Group, and the `altagamafc` URL scheme the Google redirect
     needs. ⚠ That proves the CONFIG, not the account: the capability still has to
     be enabled on the App ID or the build fails to sign.

   **Then verify on a PHYSICAL device** (Apple Sign In is unreliable in the
   simulator, and push already needs one — `getDeviceToken()` returns `null` on
   `!Device.isDevice`). `/_debug/auth` drives all of this:
   **Progress 2026-08-26** (build `efdb732c`, one iPhone). Items 1–5 partly done;
   **6–9 are untouched and 7 is the one that would ship broken.**

   1. ~~**Apple, first ever sign-in**~~ — **PASSED**, and it found a bug.
      `displayName: "Edgardo Medina"` reached `GET /cronogol/me`. But the response
      also carried `timeZone: "America/New_York"`, which **this app never
      writes** — so the account already existed on `altagamafc.com` and Supabase
      linked the Apple identity to it by matching verified email.
      ⚠ **That is the general case, not an edge case:** "first authorization" is
      once per Apple ID **per APP**, so every web user signing in here for the
      first time hits it against an established account. `apple.ts` was sending
      `notifyFixtureChanges: false` unconditionally and silently switching off
      their fixture-change emails. Fixed in `7b3e09a` — reads the account first,
      echoes the flag back, writes `displayName` only when there is none.
      ⚠ **Re-test needs a revoke:** Settings → Apple ID → Sign in with Apple →
      AltaGama FC → Stop Using. Otherwise `fullName` is null and the branch never
      runs. **Still unproven: the true new-account path** (no prior web account).
      ⚠ Ed's own `notifyFixtureChanges` reads `false` and may have been clobbered
      by the old code — re-enable on the web if it was on. There is no UI here.
   2. **Apple, second sign-in** — sign out, sign in again. `fullName` is `null`
      now; the name must still render, read back from `/cronogol/me`.
   3. **Hide My Email** — check the identity slot does not overflow.
   4. **Google** — the browser sheet returns to the app. ⚠ Landing on the website
      instead means the redirect URL is missing from Supabase, not broken code.
   5. **Push linking** — ⚠ **INCONCLUSIVE, needs re-checking.** The device
      answered `push → "unchanged"`, which is what a diff with nothing to send
      says — and that is the CORRECT answer once the sign-in effect has already
      auto-registered. But it is indistinguishable from a link that never
      happened. `/_debug/auth` grew a **`Linked to this account?`** button
      (`7b3e09a`) that settles it: the linked id is persisted ONLY when the
      server's response says `linked: true`.
   6. **Cancel paths** — dismiss the Apple sheet and the Google browser. Both must
      land back signed-out silently, with no error banner.
   7. **Follows survive sign-out** — follow three clubs, sign in, sign out. All
      three must still be there. This is trap 24 and the one that would ship broken.
   8. **Delete account** — two-step confirm → 204 → signed out. Re-run the same
      `DELETE`; it must 204 again.
   9. **Token expiry** — background past the ~1h access-token lifetime, foreground,
      confirm `/cronogol/me` still resolves rather than bouncing to signed-out.

   Also verified in passing: `AUTH_AVAILABLE true` / `AUTH_REQUIRED false`, an
   access token present, the Google redirect rendering as
   `altagamafc://auth-callback`, and `GET /cronogol/me` correctly throwing
   `NotSignedInError` while signed out.

   ⚠ **Not on the list but worth a look while testing:** the account sheet signed
   IN — the identity block, Sign out, and the two-step Delete account — has only
   been seen in `/_debug/sheets?which=account-in` with a stub, never against a
   real account.


---

## ⚠ `npm run lint` now works — and it has never run before

`eslint.config.js` has been in the repo since the start, but neither `eslint` nor
`eslint-config-expo` was ever installed, so `expo lint` only ever answered
`Cannot find module 'eslint'`. Both were added as devDependencies on 2026-08-26.

It immediately earned it. `tsc` had passed on a **duplicate `export interface
AccountView`** in `lib/cronogol/types.ts` — TypeScript *merges* same-named
interface declarations rather than erroring, so a second one appended to that file
silently widened the first instead of failing. Lint caught it as
`import/export`. ⚠ Worth remembering generally: `tsc --noEmit` is not a
duplicate-declaration check.

**6 errors remain, all pre-existing and none in auth code.** Left alone
deliberately — they are unrelated to accounts and each deserves its own look:

- `components/molecules/feed-age.tsx:30` and two spots in `_debug/gallery.tsx` —
  `Date.now()` called during render (`react-hooks/purity`). The one in
  `feed-age.tsx` is on a real screen, not a debug one.
- `(tabs)/matchdays.tsx:60`, `_debug/push.tsx:59`, `_debug/skip-onboarding.tsx:12`
  — `setState` synchronously inside an effect (`react-hooks/set-state-in-effect`).

Plus 9 warnings (unused vars, duplicate imports). `--fix` handles 2.

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

### 3b · ~~Expanded match events~~ — DONE 2026-08-26

The whole of `handoff_event-expansion/`, built to
[0045](./decisions/0045-match-events-expanded-row.md). A finished match expands
in place into its timeline — goals with assists, cards, substitutions, VAR and
missed penalties, on `GET /cronogol/fixtures/{id}/events`, fetched on expand.
⚠ Three divergences from the design, each with a reason in the ADR: the **live**
card takes no chevron (in-progress matches have no events at all, so design rule
3 cannot be built) and the **last-result** card takes one instead; disclosure is
gated on **status, not data**, because gating on data means pre-fetching a whole
matchday; and all six wire types are drawn, not four.

⚠ **`react-native-svg` is now in use** — its first import in `src/`, for the
event glyphs and the chevron. It autolinks, so no config changed, but it is a
NATIVE module: a dev client built before it was declared throws rather than
degrading. `/_debug/gallery` carries the case that checks it, plus every glyph
and every null.

Verified on the simulator against production: LaLiga jornada 1 expanded, crests
per side, `45+3′` intact, the panel bleeding to both gutters, scheduled rows with
no chevron, and the board's last-result card (Elche 0–5 Barcelona).
⚠ **`FINISHED TODAY` was not exercised** — there were no finished matches that
day, so the section renders its quiet state and there is nothing to expand. It
shares `MatchEvents` with the two surfaces that were exercised, but its own row
geometry has only been seen in code.
⚠ Player links are deferred deliberately (§6 of the API doc): `player.slug` is a
PLAYER slug and ADR 0033's sheet keys on `{club slug, person id}`.

### 4 · Today's stat tiles (SPEC §3.1 item 4)

Two tiles under the upcoming section — subscribed count → Clubs, feed count →
account sheet. Not built. (The upcoming section itself is done, and was
restyled on 2026-08-26 —
[0043](./decisions/0043-upcoming-cards-name-the-sides.md), superseding
[0029](./decisions/0029-upcoming-rows-read-from-the-followed-club.md): one card
per match, `MD n · ground` as the eyebrow with `TONIGHT` accent opposite it, the
two sides NAMED and stacked home-lit over away-dim, kickoff over its absolute
date on the right. ⚠ `formatRelativeDay` must never see a `kickoffTbd` row —
midnight-UTC would claim "tonight" for a match with no kickoff. ⚠ Only today is
named now; the `tomorrow` copy key is no longer rendered anywhere.)

### 5 · The account avatar exists on one screen

**Half done 2026-08-26.** The product answer arrived with accounts
([0038](./decisions/0038-accounts-apple-and-google.md)): `useIdentityInitials()`
derives them from `displayName`, falling back to the email's local part, and
`AvatarButton` now takes `string | null` and draws a neutral mark when signed out.
⚠ **Still only on Today.** The design puts it in every tab header, and that part
is unchanged — it is now plain wiring, with no product question left in it.

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
