# Handoff — read this first

**As of 2026-08-29.** State of play for a session picking this up cold.

The app is a working iOS app: five screens on live production data, four sheets,
onboarding, EN + ES, push wired and verified on a device. What remains is the
backend's push cron and flipping `CRONOGOL_LIVE_PUSH_ENABLED` — until that flag is on,
**no goal banner can be sent**, whatever the app does (trap 39).

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

> ⭐ **NEW 2026-08-27 — the app has live scores.** `GET /cronogol/live` carries
> in-play status, score and a **minute**, refreshed every ~30s while a match is
> played, and — unlike `/cronogol/scores` — every row **joins to a fixture** by
> `fixtureId`. LaLiga only. **Today's in-progress card consumes it**
> ([0048](./decisions/0048-live-scores-on-the-today-board.md)); Matchdays, the
> club page and `FINISHED TODAY` do not, yet.
>
> ⚠⚠ It does **not** license un-suppressing liveness in
> `src/lib/cronogol/scores.ts`. That suppression is about `/cronogol/scores`,
> which is still a 4-hourly snapshot, and it stays exactly as it is. Read
> **[LIVE-SCORES.md](./LIVE-SCORES.md) §1 first** — it is the one place these
> two are told apart.

> **2026-08-28 — the app icon is now set 1a "Floodlight"**
> ([0060](./decisions/0060-app-icon-1a-floodlight.md)): graphite field, lime glow,
> lime mark on every appearance. Same geometry as 1b, so nothing else re-cut.
> Source at `icon-handoff/AppIcon-1a-floodlight/`; not yet on a device.

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
8. **Almost no DATA is live, and the exception is exactly one route.**
   `/cronogol/scores` sweeps ~4h, fixtures ~3h, standings lag ~3h. Every score
   off those states its age. **Never remove those lines.**
   ⚠⚠ **`GET /cronogol/live` is the exception and it is narrow**
   ([0048](./decisions/0048-live-scores-on-the-today-board.md)): ~30s refresh,
   joins to a fixture by `fixtureId`, carries a real minute — **LaLiga only**.
   A minute may be printed **only** off that route, and only in the shape 0048
   sets: the minute beside the pill, dimmed when stalled, and a note that states
   either the ~30s cadence or that updates are paused. Drop the stalled branch
   and a dead session looks identical to a live one, which is this trap by
   another route. Everything else still lands on the fixture sweep's card, with
   its `FeedAge` line intact — **that path is not dead code.** ⚠ The next-up countdown is the
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
    extension is a separate binary: `Tokens.swift` copies `theme.ts` by hand, and
    `en.lproj`/`es.lproj` copy nothing from `copy.ts` because the extension
    cannot read the JS bundle. Both will drift and nothing will catch it.
    ⚠ 0047 halved the first half and did NOT touch the second: `Tokens.swift` and
    `CrestView.swift` moved to **`targets/_shared/`**, which `@bacons/apple-targets`
    links into every target, so the widgets did not add a third copy. The
    `.lproj` files are still the content extension's alone — **and the widgets
    deliberately have none.** A widget renders in the SYSTEM language, so its copy
    travels inside the App Group snapshot instead, already resolved for the
    reader's `lang`/`tz`/`clock`. ⚠ Do not "fix" that inconsistency in either
    direction: the two surfaces have different constraints and 0047 argues it out. ⚠ 0040 widened this: the card's eyebrow now
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
    ⚠⚠ **And it has a cousin, 0047.** That same App Group sweep is keyed on the
    REMINDER queue — the soonest 12 fixtures inside 7 days — while the widget
    snapshot is one fixture per followed club across **21**. A club whose next
    match is twelve days out is in the second and not the first, so the sweep
    deleted exactly the crests the widget was drawing, on the next foreground,
    silently. `features/widgets/pins.ts` holds the widget's keep-list and the App
    Group sweep takes the **union**; the two `Paths.cache` sweeps deliberately do
    not. ⚠ The pin is set SYNCHRONOUSLY in `use-push-sync`, before any await —
    losing that race only costs a re-download, but it shows as a flash of
    lettered tiles.
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
    with **no mark in it**. The icon-1a masters (0060; 1b before them) arrive pre-composited on opaque
    `#0b0b0b`, so the flatten is currently a no-op — **but the requirement did not
    go away, it just became the design source's default.** Any tinted export that
    comes back transparent reverts the bug. ⚠ It fails silently: nothing errors,
    `expo-doctor` passes, and it is visible only under Settings → Display &
    Brightness → **Tinted** on a real build. See
    [0036](./decisions/0036-app-icon-appearance-variants.md) →
    [0041](./decisions/0041-app-icon-1b-and-a-splash-of-its-own.md) →
    [0060](./decisions/0060-app-icon-1a-floodlight.md).
    ⚠ **And the `dark` master is OPAQUE now, so it is no longer splash-safe.**
    0036 had the splash reuse `icon-dark.png` because that variant was the glyph
    alone on transparency. Icon 1b's dark variant was a full-bleed `#0f1216` field
    (1a's is `#0a0b0c`, same shape of problem)
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

34. **WidgetKit rations RELOADS, not timeline entries — and spending them is
    silent.** A widget gets roughly 40–70 reloads a day; spend them and it freezes
    for the rest of the day with nothing in any log, on the device or off it. The
    re-arm in `use-push-sync` runs on **every foreground**, so `snapshotKey()`
    excludes `writtenAt` — comparing whole snapshots would call every foreground a
    change and burn the budget in minutes of ordinary app switching. ⚠ The flip
    side is the useful half: **entries inside one timeline are free**, which is why
    the countdown can tick per minute in its last hour while still reloading at
    most once per kickoff. "Never per-minute" (0025) is about reloads.
35. **The board's fixture windows END AT `now`, so a match that kicks off after
    they were fetched is in NONE of them.** `todayBounds` is
    `[local midnight, now]` and `recentBounds` `[midnight-14d, now]`, `to` is
    exclusive (trap 5), and neither query carries an interval — so at kick-off the
    Today board held no row for the match that was starting, `boardLive` tier 1
    had nothing to join `/cronogol/live` onto, and the in-progress card **never
    appeared** however long the poll ran. The next-up countdown now announces
    kick-off (`onElapsed` → `onKickoff`) and the board refetches `finished`,
    `recent` and `live` on it. ⚠ **Never `upcoming` too** — its window starts at
    `now`, so refetching it drops the match that just started, and it is also the
    only query feeding `next`: leaving it alone is what stops a new
    `next.kickoffUtc` re-arming the countdown's guard into a request loop.
    ⚠ And the reason the obvious fix was not enough: window bounds used to be
    computed **during render** and closed over, so a `refetch()` re-asked for a
    window that had already ended. They are built inside the `queryFn` now. See
    [0052](./decisions/0052-kickoff-triggers-the-live-refetch.md).
40. **A gradient drawn behind a rounded card needs `overflow: 'hidden'` AND a
    unique SVG `id`.** `finished-today.tsx` hard-codes `id="band"` and survives
    only because one league has a gradient; a second `<LinearGradient id="band">`
    in the same tree makes both `url(#band)` fills resolve to whichever mounted
    first. `WashGradient` (0068) takes its id from `useId()` — use the atom, do
    not copy the Svg block. And without `overflow: 'hidden'` the absolute fill
    paints square corners over the card's radius (the `flush` trap, again).

36. **A live push must not replay the first half.** `LiveSessionService` opens
    onto whatever is in its window — including a match already at 60 minutes,
    after a restart, a lease handover or a deploy. The stored row is then null
    and **every event of the match is "new"**, so the naive detector fans out
    five goal banners for goals scored an hour ago. `decideLiveAlerts` returns
    `[]` outright when `stored === null`: a match we have never seen starts
    silent and alerts only on what happens next. ⚠ The same shape bites twice —
    `finished` PERSISTS for every remaining cycle of the session, so full time
    keys on the **transition** (`stored.status !== 'finished'`), never on the
    state. See backend decision 0033.

37. **`interruption-level: time-sensitive` is SILENTLY DOWNGRADED without the
    entitlement.** No error, no log, nothing in the payload to inspect — the
    alert simply arrives without Focus break-through, which is the one thing it
    was marked for. `com.apple.developer.usernotifications.time-sensitive` is now
    in `app.json`'s `ios.entitlements`.
    ⚠ **You do NOT enable this by hand in the Apple Developer portal.** EAS Build
    syncs capabilities from `ios.entitlements` to the App ID on every build —
    watch for the `✔ Synced capabilities` step in the log. Time Sensitive
    Notifications is on its supported list.
    ⚠ **What DOES bite: the provisioning profile.** An existing profile does not
    know about a newly-synced capability, and EAS has been seen reusing a cached
    one (expo/expo#40851). If a build signs but the level still downgrades, run
    `eas credentials` and regenerate the iOS profile before suspecting the
    payload. `EXPO_DEBUG=1 eas build` shows the sync; `EXPO_NO_CAPABILITY_SYNC=1`
    turns it off.
    ⭐ **It bit, 2026-08-28.** The first `preview` build after the entitlement
    landed (`090c552a`) failed in Xcode with *"doesn't include the Time
    Sensitive Notifications capability"* while EAS had printed *All credentials
    are ready*. Fixed by trap 29's recipe (`npx eas-cli credentials -p ios` →
    delete the MAIN target's profile → set up all); the Portal ID moved
    `N9WSK26LXP` → `9KB5277ZHF`. ⚠ `eas` is not installed globally here — it is
    `npx eas-cli`, always.
    ⚠ This is why `reminders.ts` has always used `active`. The only way to
    confirm it works is to fire one at a device with a Focus on
    ([0053](./decisions/0053-live-match-push-alerts.md)).

38. **The live alert's meta row is the CARD, not the banner.** A standard iOS
    banner has title, subtitle and body and no third styled row — so
    `28' left · 🟨 3 · 🟥 1 · Getafe 10 men` can only exist on the long look,
    drawn by `MatchCard.swift` from `userInfo` keys. ⚠ A missing key **drops its
    segment**, deliberately: a zero would draw `🟨 0`. And if only the clock
    would remain, the whole row goes — a lone `28' left` under a scoreline is a
    widow. ⚠ Its five new strings need a line in **both** `.lproj` files or iOS
    prints the raw key (trap 15, again).
39. **An exclusive `to` on the kickoff MILLISECOND excludes the fixture — and the
    live card is no longer allowed to depend on that window at all.** Levante v
    Betis, 2026-08-29 15:00 UTC: the 0052 kickoff refetch fired from a tick
    aligned to the wall second, its `to` could equal the kickoff exactly, and
    measured against production `to=15:00:00.000Z` returns **zero** rows for a
    15:00:00 kickoff while `.001Z` returns it. One shot, zero margin, and nothing
    re-asks for fifteen minutes. The card sat on `00m 00s` for ninety minutes
    beside a healthy `/cronogol/live`. Fixed twice
    ([0066](./decisions/0066-live-card-reads-the-live-route-directly.md)):
    `routeLive` (tier 0) now builds the card from the live route alone, crests
    from the club catalogue, and `Countdown` fires strictly PAST the target.
    ⚠ The 0052 refetch stays — it still feeds FINISHED TODAY and the LAST
    RESULT card — and its "never `upcoming`" rule still holds.
    ⚠⚠ **Goal pushes were the same report and are NOT this bug.** The backend's
    `LivePushService` sends nothing until `CRONOGOL_LIVE_PUSH_ENABLED` is
    `'true'` on Render (`render.yaml` ships `'false'`; the gate is a matchday of
    `[dry-run] live push` log lines), and `alertGoals` defaults OFF in the app.
    No app change can produce a goal banner while that flag is off.

---

## Where things stand

### Done and verified
- **FINISHED TODAY rows are a stacked pair** ([0069](./decisions/0069-finished-today-stacked-rows.md)):
  home over away, fixed goal column, no `FT` word. ⚠ Nothing may be added to the
  right of the goals without re-measuring `Borussia Mönchengladbach` at 393pt.
  `/_debug/gallery?only=finished` is the screenshot path.
- **Club-colour wash on the next-up card and the club header**
  ([0068](./decisions/0068-club-colour-wash.md)): `lib/cronogol/club-wash.ts`
  tames `colorPrimary`/`colorSecondary` (harness-proven, 16 assertions); a
  `WashGradient` atom on `react-native-svg`; `/_debug/gallery` shows the four
  states. ⚠ Only LaLiga and Bundesliga carry colours — a Premier League or
  Serie A card renders exactly as before, and that is correct.
- **League header bands in FINISHED TODAY** ([0062](./decisions/0062-league-header-bands.md)):
  `LeagueBand` in `@/constants/theme`, keyed by API slug; Serie A's gradient via
  `react-native-svg`. ⚠ Not yet seen on the simulator — check the first band's
  top corners clip under the card radius and the Svg does not eat row taps.
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
- **The widgets ship** (2026-08-27, [0047](./decisions/0047-widgets.md)) —
  `NextFixtureWidget` (small + the three Lock Screen accessories) and
  `YourWeekWidget` (medium), both configurable to one followed club or all of them.
  **Verified on the simulator**, with real production data for two followed clubs:
  - both sizes rendering real crests off the App Group, `NEXT · MD 1`, the crest
    pair, and `Thu 15:00 · Spotify Camp…`;
  - the countdown ticking **6m → 2m → 1m with the app closed** — minute-resolution
    timeline ENTRIES, and **not one reload spent** (see trap 20);
  - the played fixture **dropping out of both widgets the moment kickoff passed**,
    the small advancing to `NEXT · MD 3` / `2d 19h` / `Sun 11:00 · Bernabéu`;
  - a medium row tap deep-linking to **that row's** club page from a cold start.
    ⚠ Worth noting against open item 3: the notification path lands on Today, the
    widget path lands correctly. They are different mechanisms.
  - ⚠ **App Groups DO work in the iOS simulator** — this was an open question and
    it is now closed. What breaks them is building with `CODE_SIGNING_ALLOWED=NO`,
    which strips the entitlement so the container silently does not exist. That
    looks exactly like "the simulator does not support App Groups". It does.
  - ⚠ **NOT seen, by anyone:** the Lock Screen accessories and the Edit Widget
    club picker. Both are behind a long-press that cannot be driven from a script.
    They compile and are wired; nobody has looked at them.
  - **The medium row was redrawn 2026-08-28**
    ([0059](./decisions/0059-your-week-widget-names-both-sides.md)): both sides
    named home-first, the followed side in accent with a `HOME`/`AWAY` pill, and
    `SAT` over `21:00` on the right. Snapshot bumped to **v2**; every new field
    is optional in Swift. **Verified on an iPhone 17 Pro simulator** with four
    real clubs. ⚠ Names are CONTRACTED (`widgetName`: `R. Madrid`) — the full
    forms truncated one side or the other. Not yet checked on an SE-width
    simulator, nor with a hand-edited v1 `snapshot.json`.
- **The Starting XI builder is IN THE APP** (2026-08-29, [0065](./decisions/0065-starting-xi-builder.md)) —
  the whole of `handoff_squad-builder/`: a row on the club page (between the
  subscribe block and Fixtures / Players) pushing `/club/[slug]/starting-xi` —
  tap a slot, tap a player, rail filtered to the line, Shape / Look / Export as
  root-stack sheets, drag a placed token onto a teammate to swap, long-press
  for Swap / Remove / Player page, export a TRUE 1080-px card to the share
  sheet or Photos. Eleven formations; the spacing rule is asserted in code.
  `tsc`, lint (baseline unchanged), `expo export` and a **94-assertion
  harness** on `features/starting-xi/` are clean. ⚠ **Four new NATIVE
  modules** (`expo-haptics`, `react-native-view-shot`, `expo-sharing`,
  `expo-media-library`) — a dev client built before 2026-08-29 throws at
  import; rebuild first — **`preview` build `e5b4405e` (2026-08-29) carries all four**; install that. ⚠ `GestureHandlerRootView` is now the outermost view
  in `_layout.tsx`. ⚠ The club page is a FOLDER route now
  (`club/[slug]/index.tsx`); no `_layout` in it, on purpose. ⚠ The row
  enables off `players.length > 0`, not the league — squads exist for LaLiga
  AND the Premier League. ⚠ Placements key on the person `id`, never the
  shirt. ⚠ `tsconfig.json` excludes `handoff_*/**` — design source no longer
  gates `tsc`.
- **News is IN THE APP** (2026-08-29, [0064](./decisions/0064-news-card-and-screen.md)) —
  the whole of `handoff_news-card-page/`, phase 1: a NEWS card on the Today board
  (lead + two rows + `n NEW`, one tap) pushing `src/app/news.tsx` (chips ·
  TODAY/YESTERDAY groups · attribution line) and a `(sheets)/news-link` sheet
  that names the publisher before `Linking.openURL`. Reads the SAME `useNews()`
  the widget writer fills — one feed, three consumers. `tsc`, lint (baseline
  unchanged), `expo export` and a 20-assertion harness on `lib/cronogol/news.ts`
  are clean. **Verified on the simulator** (card, screen, sheet — see 0064 for
  what was and was not seen). ⚠ First-party rows drew a `STORY` chip until
  `articleTopic` learned that `categories[0]` is the editorial KIND there — the
  widget shared the bug. ⚠ Header is NEWS, not
  the handoff's AROUND YOUR CLUBS: the wire carries NO club slugs, so "Your
  clubs" is phase 2 (per-club fan-out). ⚠ Phase 2's in-app browser is one line
  in `features/news/open.ts` (`expo-web-browser` is already installed).
  ⚠ Preferences schema is **4** now (`newsSeenAt`); `FOLLOWED_RULE_VERSION`
  untouched.
- **The NEWS widget is built** (2026-08-28, [0061](./decisions/0061-news-widget.md)) —
  `systemLarge`, the whole of `handoff_news-widget/`: lead story with picture, three
  headlines, age derived in Swift. Global `GET /cronogol/news`, tap opens the
  publisher in Safari. `expo-image-manipulator` downscales each picture to
  924×348 before it reaches the App Group (`news/{id}.jpg`, `widget/news.json`).
  `tsc`, lint (baseline unchanged), `expo export` and a 14-assertion harness on
  `lib/cronogol/news.ts` are clean. **Verified on the simulator** with real
  MARCA/SPORT headlines — lead, gradient, topic chips, ages, no chip on a
  topicless row. ⚠ Not yet seen: cold-cache layout, empty state, Spanish, a tap
  reaching Safari. **`preview` build `94e46736` (2026-08-28) carries it** — the first build with `expo-image-manipulator`; install that, not an older client. ⚠ **`expo-image-manipulator` is a NATIVE module** — a dev client built before
  it throws on import, exactly as `react-native-svg` did (§3b). Rebuild first.
  `/_debug/widgets` has a News section that reads `news.json` back from disk.
- **Live scores reach the Today board** (2026-08-27,
  [0048](./decisions/0048-live-scores-on-the-today-board.md)). The in-progress card
  now has two paths: `/cronogol/live` with a real minute for LaLiga, and the ~3h
  fixture sweep — unchanged, `FeedAge` and all — for every other league.
  - `lib/cronogol/live.ts` is pure and **harness-proven, 25 assertions**: the
    10-minute cache-age cutoff, both selection tiers, `status: 'unknown'`
    withholding the minute, stoppage-inclusive minutes (`94`, never `90+4`), both
    stall tells, and every unparseable-stamp branch.
  - Contract checked against production: `400` on any undeclared query param, an
    empty list rather than a 404 on an unknown league, `max-age=10`, and
    `{"matches":[],"count":0,"polling":false}` — the normal answer.
  - Gates clean: `tsc`, `expo export`, and lint at its **unchanged 6-error / 9-warning
    baseline**.
  - ⭐ **VERIFIED against a real in-play match, 2026-08-28** — Racing v Elche,
    LaLiga, kickoff 17:00 UTC. Seen on the **simulator** and on a **physical
    device** via the `preview` build `12e1c602`. The `fixtureId` join holds against
    a real row: `/cronogol/live` and `/cronogol/fixtures` served the same
    `d70bfe7b…`, with the sweep still reading `scheduled` — which is exactly the
    case tier 1 exists for, now proven rather than argued.
  - ⚠ **`useIsFocused` under `NativeTabs` is unexercised.** It is the poll's gate;
    if it misreports, the app polls every 15s from a background tab. Confirm the
    network log goes quiet on a tab switch.
  - ~~⚠⚠ **KNOWN GAP — the card is hostage to the fixture window**~~ — **CLOSED
    2026-08-29** by [0066](./decisions/0066-live-card-reads-the-live-route-directly.md):
    `routeLive` builds the card from `/cronogol/live` alone, crests from
    `useTeams()` by slug. It bit exactly as predicted (trap 39) before it was fixed.
  - ~~⚠ **KNOWN GAP — `liveMinute` would render `0′`**~~ — closed in 0066; a
    literal `0` now returns null like the non-live cases.
  - ~~⚠ **`polling: false` was CONSTANT on a genuinely live match**~~ — **ROOT
    CAUSE FOUND AND FIXED IN THE BACKEND, 2026-08-28.** It was never an app
    question: `LiveSessionService.acquireLease()` stamped `lease_started_at`
    **once**, while `LiveReadService.isPolling()` reads that same stamp against
    the same 120s window — so a session running for hours reported itself dead
    from ~two minutes in. `senpai-backend@60b0ebf` renews the lease every poll
    cycle, and the renewal doubles as an ownership check.
    ⭐ **Verified in production at 18:39 UTC**: `polling: true` on Racing v Elche,
    the first `true` ever observed from this route.
    ⚠ **This does NOT reverse [0049](./decisions/0049-stall-is-lastseenat-not-polling.md).**
    `isStalled` still reads `lastSeenAt` alone. 0049 already says what a
    trustworthy flag would license — reinstating it as a **second** tell beside
    the stamp, never a swap back — and one afternoon's observation is not yet
    that. ⚠ The invariant it now rests on: `livePollIntervalMs` (30s) must stay
    comfortably under `liveLeaseSeconds` (120s).
    ⚠ The minute still lagged the wall clock (`minute: 4` at 17:07 on a 17:00
    kickoff); that half is unexplained and is a `senpai-backend` question.
- **The push cron is ON** (2026-08-26, Render dashboard; `render.yaml:91` agrees).
  ⚠ It dispatches only what the ~3h sync newly detects, so silence is the normal
  state. Every notification seen on 2026-08-26 was hand-sent.

### Open — in priority order

0. **Front-end gaps** — see the section below. The Today board's lead states
   are now wired (0027); loading skeletons are the next most visible.
1. ~~**Widgets**~~ — DONE 2026-08-27, [0047](./decisions/0047-widgets.md).
   Both home-screen sizes, the Lock Screen accessories, and a per-club picker.
   Verified on the simulator; see "Done and verified" above for what was and was
   not seen. ⚠ ~~The remaining widget work is a device build~~ — **that profile is
   minted.** `widget phase 2` landed 15:44 on 2026-08-27 and the `preview` build at
   15:51 the same day succeeded with the widget target in it, as did `12e1c602` on
   2026-08-28. The third bundle id (`com.altagamafc.app.widget`) signs. What is
   still unseen is the widgets themselves ON a device — only the simulator has
   shown them.
1b. **`REMINDER_HORIZON_DAYS` is 21 over a 7-day dataset**, so it never binds:
   `selectReminders` filters `useUpcoming`'s seven days, and reminders therefore
   cover a week rather than three. Found while sizing the widget's own window
   (0047) and **deliberately not fixed there** — changing it changes the pending
   notification queue and deserves its own decision, not a drive-by in a widget
   commit.
1c. **The two notification targets are pinned at `deploymentTarget: 18.0`**, the
   plugin's default, while the app runs on 16.4. That silently means no
   long-look card for a reader on iOS 16.4–17.x. The widget target is at 17.0 by
   deliberate choice (0047); the notification pair was left alone because they
   are verified on device and this is not a widget change.
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
5. ~~**Live Activity**~~ — **BUILT 2026-08-28**, dark
   ([0055](./decisions/0055-live-activities-broadcast-channels.md),
   [0057](./decisions/0057-local-expo-module.md); backend `0034`). Broadcast
   channels, one per fixture, iOS 18+. The card REPLACES the goal banner for a
   device that has one.
   ⚠ **Never on a device, and gated behind three flags.** Nothing appears until
   `CRONOGOL_LIVE_CRON_ENABLED`, `CRONOGOL_LIVE_PUSH_ENABLED` and
   `CRONOGOL_LIVE_ACTIVITY_ENABLED` are all on, and the last one additionally
   needs `CRONOGOL_LIVE_ACTIVITY_DRY_RUN=false`.
   ⚠⚠ **The broadcast capability is a MANUAL Apple Developer portal step** —
   under Push Notifications on `com.altagamafc.app`. EAS capability sync does
   NOT cover it, and without it every channel create fails.
   ⚠ **First real Swift typecheck is `expo prebuild`**, and it now has a THIRD
   native input: `modules/live-activity/`, the app target's only Swift. A
   prebuild that skips it produces an app that compiles, runs, and never reports
   a push-to-start token.
   ⚠ `.claude/LIVE-ACTIVITIES.md` and 0054 both carry claims 0055 corrects —
   read 0055 first, not them.
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

⚠ **The first of those three was reversed on 2026-08-28** —
[0050](./decisions/0050-match-events-on-the-in-progress-card.md). The
in-progress card expands too now. Its premise expired rather than being wrong:
the upstream **does** publish the timeline during play, so an in-play match
having no events is a gap in our ingest, not a fact about football. ⚠⚠ **Nothing
serves it yet**, so that panel opens on *"aren't published yet"* on real data —
by design, and the state LIVE-SCORES.md §6 has been asking us to render
explicitly. The other two divergences stand.

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

### 3c · ~~Event grouping tabs~~ — DONE 2026-08-27

`handoff_event-groups/`, built to
[0046](./decisions/0046-match-events-grouping-tabs.md). The panel from 3b now
opens on a four-segment counted control — `Goles · Tarjetas · Cambios · Otros` —
and shows one group at a time. It was twenty rows on a busy match, which pushed
the matches under it off screen.

⚠ **Four groups, where the design asked for three.** It was written against its
own four-kind model; ours is eight, and 0045 decision 1 forbids dropping a row,
so `var` / `missed-penalty` / `unknown` need somewhere to go. **`groupOf`'s
`default:` branch is the guarantee** — a ninth mark lands in `other` and is still
read. Never expand it into an exhaustive list of cases.

⚠ **The tabs replaced the eyebrow**, but `showTitle` did NOT go away — it now
gates on `events.length === 0`, so `MATCH EVENTS` still labels the pending, error
and not-published states. `match-board.tsx` still needs its `false`.

⚠ **The active group is derived from a nullable pick, not stored**, and there is
no `useEffect` in this feature. Seeding state with a group needs an effect to
correct it when the fetch lands, which flashes an empty `Goals` on a 0-0 with two
bookings. Resetting per match is free for the same reason — the component
unmounts with its row.

⚠ `Size.eventTab` is **28, under `minTouch`**, with `hitSlop` making up the
difference. The only control in the app that paints under the minimum; a 44pt
track spends the height the grouping won back.

⚠ `handoff_event-groups/EventTabs.tsx` is a **reference, not the shipped
mapping** — its `groupOf` files `own-goal`, `var`, `missed-penalty` and `unknown`
into `cards`. Read it for the values and the behaviour only.

Typecheck and lint clean (baseline unchanged: 6 pre-existing `Date.now()` purity
errors, none in the touched files). ⚠ **Not yet exercised on the simulator** —
`/_debug/gallery` carries a live tab case and a dimmed-`0` case, but the real
panel on real data has not been opened since the change.

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
- ⚠ **Live scores are LaLiga-only, and live match EVENTS do not exist YET.**
  `/cronogol/live` (2026-08-27) covers LaLiga alone — every other league renders
  exactly as it does today, so the non-live path stays the fallback rather than
  being replaced. Wired on Today only
  ([0048](./decisions/0048-live-scores-on-the-today-board.md)); Matchdays rows and
  the club page are the two other surfaces keyed on `fixtureId` and are unbuilt. And `/cronogol/fixtures/{id}/events` is still a 3-hourly
  sweep: the expanded-row timeline ([0045](./decisions/0045-match-events-expanded-row.md),
  [0046](./decisions/0046-match-events-grouping-tabs.md)) does **not** fill in
  during a match. A live scoreline beside an empty timeline is the expected
  shape — handle it explicitly so it does not read as a bug.
  ⭐⭐ **Backend §98 is now WRITTEN** (2026-08-28, later the same day —
  `senpai-backend/CRONOGOL.md` §98, its `decisions/0032`). This supersedes
  "planned": `/cronogol/live` gains a per-match `events` array, and the durable
  timeline is written **at the whistle** instead of ≤3h later.
  ⭐⭐ **DEPLOYED, and the app consumes it** (2026-08-28, same day —
  [0051](./decisions/0051-live-match-events-inline.md)). `/cronogol/live` carries
  a per-match `events` array; the in-progress card renders it through 0050's
  `supplied` seam, in one expression: `suppliedEvents: match?.events`.
  ⚠ **It took two deploys.** The first was red — the backend committed the
  migration and the code that reads `events` but not the regenerated
  `database.types.ts`, against a column not yet applied to the database. Exactly
  what that migration's own header warns about.
  ⚠ **`undefined` vs `[]` selects the source and must not be collapsed.**
  `undefined` (the sweep path, every non-LaLiga league) falls back to the durable
  `/cronogol/fixtures/{id}/events`; `[]` means the live route holds an empty
  timeline and the panel says so. Never default it to `[]`.
  ⚠ **`eventKey()` keys BOTH sources**, and not because live events lack an
  `id`: the panel swaps source at full time, and keying one on `id` and the other
  on an index would remount every row at that moment.
  ⚠ **0050's 60s durable-route poll is GONE** (`STALE.liveEvents`, the `polling`
  option). Events ride the 15s live poll now; the second poll would be a request
  a minute at a finished-only sweep that cannot have anything for a live match.
  ⚠⚠ **Never verified against a real scorer.** No LaLiga match scored while this
  was wired — Tenerife v Sporting was 0-0 at 6′ with `events: []`. The triggers,
  the full-time hand-off, and "the event set grows during play" are all still
  inferred. `/_debug/gallery` proves the rendering, not the feed. **This is the
  first thing to watch on the next matchday.**
  [LIVE-SCORES.md](./LIVE-SCORES.md) §2 (shape) and §5 (wiring).
- ⛔⛔ **Player STATISTICS do not exist, and match events are NOT them.** Squads
  carry identity only — name, position, photo, age — never appearances, season
  goals, minutes or xG. No source has them at any price point yet found, so this
  is a purchase, not a backlog item. §98 will let a live match say *who scored*;
  it will never say *how many they have scored this season*. Per the backend's
  own decision log this is "the claim most likely to be lost in retelling"
  (`senpai-backend/.claude/decisions/0030`).
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
