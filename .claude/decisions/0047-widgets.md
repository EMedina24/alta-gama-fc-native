# 0047 — Widgets: both home-screen sizes, the Lock Screen, and a club picker

- **Date:** 2026-08-27
- **Status:** Accepted — verified on the simulator
- **Decided by:** Ed Medina
- **Supersedes:** [0025](./0025-widgets-deferred.md)

## Context
[0024](./0024-push-enabled.md) chose "widgets: both sizes, full build" and put push
first. [0025](./0025-widgets-deferred.md) paused them deliberately and wrote down the
pick-up steps. [0037](./0037-rich-notifications-server-composed-crests.md) then
installed `@bacons/apple-targets`, added `targets/`, and gave the App Group its first
real cross-process consumer — which was most of what 0025 was waiting to prove.

The tooling gate 0025 named ("Xcode 16 / macOS 15") is met: this was built on Xcode
26.6 / macOS 26.5.2.

Beyond the feature, this is the App Store **Guideline 4.2** argument. The app ports a
website; widgets plus native tabs plus local match reminders are the case that it is
not a wrapper, and GO-LIVE §5 says to make it before submission rather than after a
rejection.

## Decision

**Two widgets, four families, one provider.**

- `NextFixtureWidget` — `systemSmall`, plus `accessoryRectangular`,
  `accessoryCircular` and `accessoryInline` on the Lock Screen.
- `YourWeekWidget` — `systemMedium`.

Both take an `AppIntentConfiguration`: long-press → Edit Widget → one followed club,
or nothing, which means every club you follow. **`nil` is the default, not an unset
value** — a widget dropped on the home screen has to be useful before the reader has
configured anything, which is what SPEC §4 describes.

### The snapshot is a file, and it carries its own copy

`<AppGroup>/widget/snapshot.json`, written temp-then-`moveSync` so the extension never
reads a half-written file. `ExtensionStorage` is used for one thing — the reload
signal.

A file rather than `ExtensionStorage`'s App Group `UserDefaults` because the container
is already this repo's proven cross-process idiom (`crest-cache.ts` writes it,
`CrestView.swift` reads it), because Swift decodes it with the same one-line disk read
the crest view already does, and because it is inspectable with `cat` in a simulator
container.

⚠⚠ **Every string the widget prints is pre-formatted in JS, including the furniture —
the inverse of what the notification content extension does with its two `.lproj`
files.** A widget renders in the **system** language, so `.lproj` strings would hand
an English widget to a reader who chose Spanish inside the app; the same argument
covers the explicit timezone pick and the 12/24h clock, neither of which an extension
can see. Only `kickoffUtc` travels raw, because the countdown is arithmetic.

The cost, stated plainly: the strings are a **rendering**, not data, and they are only
as fresh as the last snapshot write. The app rewrites on every foreground and `copy`
is in the effect's deps, so a language switch is one render behind at worst.

The one exception is `Snapshot.placeholder`, hardcoded English, for the gallery
preview before the app has ever run. There is no reader preference to read yet.

### Timeline: many entries, one reload

⚠⚠ **Entries are not refreshes, and 0025 step 5 is a rule about refreshes.** Entries
handed back inside one timeline are rendered by iOS itself at zero cost; **reloads**
are what WidgetKit rations (roughly 40–70 a day). So:

- minute-resolution entries through the final hour before kickoff, so `18m` is honest;
- hourly entries before that, which is all `1d 04h` can show;
- an entry at each kickoff, so a started match drops out of the list;
- local midnights for three days, from `Calendar` — never `now + 86_400`, which is
  wrong twice a year;
- **reload policy `.after(nextKickoff)`**, falling back to the next local midnight.

And the app reloads on its own whenever the snapshot actually changed — which is why
`snapshotKey()` excludes `writtenAt`. Comparing whole snapshots would call every
foreground a change, spend the day's reload budget in minutes, and freeze the widget
for the rest of the day with nothing in any log.

### Crests: pinned, so the reminder prune cannot eat them

The widget reads the same `<AppGroup>/crests/{fixtureId}/{slot}.png` the long-look card
does, so `CrestView.swift` needs no second code path.

⚠⚠ But `pruneCrestCache` swept that directory against the **reminder queue**, and the
two selections disagree: reminders are the soonest 12 fixtures inside a 7-day window,
the widget is one fixture per followed club across 21 days. A club whose next match is
twelve days out is in the second and not the first, so the sweep deleted exactly the
crests the widget was drawing, on the next foreground, silently. `features/widgets/pins.ts`
holds the widget's keep-list and the App Group sweep takes the **union**. The two
`Paths.cache` sweeps are deliberately not unioned — the widget uses neither the
composed plate nor the attachment copies.

The pin is set **synchronously**, before any await in the re-arm. Losing that race only
costs a re-download, but it shows as a flash of lettered tiles.

### A 21-day window of its own

`useUpcoming` is seven days, which is right for the Today board and wrong for a widget:
an international break blanks it while the club page shows a match on day nine.
`useWidgetWindow` is 21 days — chosen against a **hard 31-day span cap on
`GET /cronogol/fixtures`, which answers 400 rather than clamping**
(`fixtureWindowMaxDays` in the backend's `configuration.ts`).

### Smaller calls, recorded so they are decisions

- **`deploymentTarget: '17.0'`**, set down from the plugin's 18.0 default. 17.0 is the
  real floor because `AppIntentConfiguration` and `.containerBackground(for: .widget)`
  both need it. The app itself runs on 16.4, so **a reader on iOS 16.x gets the app and
  no widget** — an accepted cost of the configurable choice.
- **`targets/_shared/`** now holds `Tokens.swift` and `CrestView.swift`. The plugin
  links that folder into every target, so there is one copy rather than three.
  Verified: the prebuild adds both files to all four targets and the build succeeds.
- **`reloadWidgets()` passes no kind**, so it maps to `reloadAllTimelines()`. A kind
  string would have to equal `AppIntentConfiguration(kind:)` in two Swift files with
  nothing validating either — trap 14's twin, and its failure is silent.
- **The mark is drawn as a SwiftUI `Shape`**, not shipped as an image asset. A bitmap
  survives the home screen but is flattened to a mask on the Lock Screen and under
  iOS 18's tinted rendering.
- **`formatWidgetKickoff` renders sentence case** (`Sat 21:00`) where every other date
  block in the app is uppercase. The widget is the one surface that puts a weekday
  inline beside a club name at 12pt; the weekday still comes from the pinned tables in
  `phrases.ts`.
- **The medium row leads with the followed club's crest and names the opponent** —
  0029's reading, which 0043 superseded *for the Today card*. At 338pt across three
  rows the question is "who are we playing", so the older reading is the right one
  here. This is not drift.
- **`@bacons/apple-targets` moved to `dependencies`.** It is now a runtime import
  (`ExtensionStorage`), not only a config plugin.

## Consequences

- **The Guideline 4.2 argument is now real**, and GO-LIVE §4 is no longer deferred for
  the widgets half. ⚠ **Live Activity stays deferred** — 0024/0025 still hold, SPEC §4's
  version needs a `minuteLabel` the API cannot supply and an ActivityKit token the push
  DTO rejects.
- ⚠ **App Groups DO work in the iOS simulator** — settled 2026-08-27 and recorded in
  `.claude/HANDOFF.md`. The hedge in `crest-cache.ts` stays, because it is also
  the Android answer, but simulator provisioning is no longer an open question. What
  does break it is building with `CODE_SIGNING_ALLOWED=NO`: that strips the
  entitlements and the group container silently does not exist.
- **A third extension bundle id** — `com.altagamafc.app.widget` — needs its own
  provisioning profile for a device build, exactly as the two notification targets did.
- **The snapshot is a contract in two files**, `src/features/widgets/snapshot.ts` and
  `targets/widget/Snapshot.swift`. A field added to one is a blank row on the card
  until it is added to both.
- **`REMINDER_HORIZON_DAYS` is 21 over a 7-day dataset** and therefore never binds —
  reminders cover a week, not three. Found while sizing the widget window. **Not fixed
  here**: changing it changes the pending-notification queue and deserves its own
  decision, not a drive-by in a widget commit. Logged in HANDOFF.
- **The medium widget draws the rows it has, centred.** A reader following one club
  gets one row. Filler rows and `—` placeholders both read as data that failed to
  load, so they are out — but so is pinning a single row to the top, which leaves
  four fifths of the card empty and tells the same lie by omission. Seen on the
  simulator the moment a kickoff passed and the card dropped to one row; the spacers
  collapse to nothing at three rows, so the mock's layout is unchanged.

## Alternatives considered
- **`StaticConfiguration`, no club picker.** Less Swift, no `AppEntity`, no empty-picker
  state before first launch. Rejected: the picker was asked for, and it is the
  difference between one widget and one per club.
- **A separate `<AppGroup>/widget-crests/` directory** with its own sweep. Zero coupling
  to the reminder path and no ordering hazard — but it duplicates PNGs the reminder
  path has usually already fetched, doubles cold-install downloads, and creates two
  copies of one file that can drift when the backend recomposes a crest.
- **Duplicating `Tokens.swift`/`CrestView.swift` into `targets/widget/`** instead of
  `_shared/`. Safer in that it does not touch a target already verified on device, but
  it makes trap 15 a three-binary problem. `_shared` was tried first and worked.
- **`.lproj` files in the widget target**, matching the content extension. Rejected for
  the system-language argument above.
