# 0111 — The Live Activity's crests are a fourth keep-list, and the prune stops guessing

- **Date:** 2026-09-04
- **Status:** Accepted
- **Decided by:** Ed Medina
- **Builds on:** [0037](./0037-rich-notifications-server-composed-crests.md),
  [0040](./0040-kickoff-reminder-lead-times.md), [0047](./0047-widgets.md),
  [0055](./0055-live-activities-broadcast-channels.md),
  [0085](./0085-broadcast-card-redesign.md)
- **Amends:** 0047's crest-pin section (the pin is no longer initialised to `[]`)
  and 0085 §1's claim that the card's crest is "already warmed by `crests.ts`"

## Context

The Live Activity card reached a real lock screen for the first time on
2026-09-04 (Real Betis v Real Madrid, `CRONOGOL_LIVE_ACTIVITY_DRY_RUN` flipped
mid-match). Everything on it rendered except **the two club crests**, which drew
as empty plates.

⚠ The plate itself is correct — `CrestView`'s fallback with `showsAbbr: false`
(0085 §7) and `tone: .solid` (0104 §5). The card drew *"a badge we do not have"*.
It did not have one.

⚠⚠ **The Live Activity is the ONE crest consumer whose demand set is chosen by the
SERVER, at a moment when the app is not running.** `LiveActivityService`
push-to-starts a card at T−10 to T−7 with the app closed (0055 §3: *"nobody opens
the app at kickoff"*), and `CrestView` reads the App Group and never the network
(0025 step 4, 0085 §1). So the artwork has to be on disk from an **earlier**
foreground, put there by a selection that anticipates the server's. Neither
existing selection does:

- The **reminder** artwork set is the soonest 12 fixtures — and it exists only
  while `alertReminder` is on. ⚠⚠ A reader who turned kickoff reminders off gets
  no crest from this path **and still gets cards**, because 0055 §5 hangs activity
  consent on `alertGoals`, a different switch. Their only remaining writer is the
  widget's ≤ 6.
- The **widget** set is ≤ 6 entries chosen as "one fixture per followed club" for
  what the WIDGET DRAWS. In-play fixtures consume its budget without gating
  anything, so a followed club kicking off tonight can fall outside it.

⚠⚠ **And the asymmetry is worse than a gap.** Crest writes are budget-limited
(6 or 12), foreground-only and asynchronously debounced; crest deletes are
unbudgeted, run on the same foreground, and are the tail of a fire-and-forget
promise. Three ways artwork the card needs was being destroyed:

1. **The cold-launch pin hole.** `pinWidgetCrests` sits behind `if (snapshot)`, so
   when `widgetWindow.data` has not resolved it is *not called* and `pins` keeps
   its module initialiser `[]`. The 7-day `useUpcoming` query normally lands
   before the 21-day `useWidgetWindow` one — so the prune routinely swept the App
   Group down to the reminder queue. A `widgetWindow` query that merely **failed**
   left it that way for the whole session.
2. ⭐ **An unsynchronised write-vs-delete race.** `applyReminders` is fired with
   `void` and ends in `pruneCrestCache`, while `scheduleWidgetSync`'s 1s timer
   runs `warmLongLookCrests` concurrently. A warm can pass its `file.exists`
   check, start `downloadFileAsync`, and have the sweep `entry.delete()` the
   directory out from under it. The throw is swallowed — **the crest is silently
   absent for a fixture that was in the keep-list all along.**
3. **An empty keep-set.** With `planned` empty (international break, or everything
   filtered by `kickoffTbd`/`postponed`) and `pins` empty, the sweep emptied
   `crests/` outright.

## Decision

### 1. A fourth keep-list, over a third horizon

`features/push/activity-crests.ts` selects followed clubs' fixtures inside a
**48-hour** window, capped at 8, and both **pins** and **warms** them.

⚠ Two days rather than two hours is the whole point: the card starts at T−10, but
nothing about the app runs then. The window has to be wide enough that an ordinary
foreground — opening the app yesterday evening — has already warmed tomorrow's
match.

⚠ **No new App Group directory.** 0047 already argued and rejected `widget-crests/`
(duplicate PNGs, doubled cold-install downloads, two copies that drift when the
backend recomposes). 0061's separate `news/` directory is not a precedent — it
exists because article ids must not enter `pruneCrestCache`; fixture ids already do.

### 2. ⚠⚠ `kickoffTbd` and `postponed` fixtures are KEPT

This is the one place the selection deliberately disagrees with both others.
`selectReminders` and `selectWidgetFixtures` drop them, so such a fixture is in
**no write set and no keep-list** — its crest is deleted if present and never
written if absent. The backend does not drop it: `LiveActivityService` reasons
explicitly about a postponed fixture reaching the pre-kickoff start once
reinstated, and a TBD kickoff that gets confirmed is an ordinary match by the time
it kicks off. ⚠ `cancelled` IS dropped — nothing restarts a cancelled match.

### 3. ⚠⚠ The prune refuses to sweep on an unknown pin set

Both pin modules now answer `null` until their selection has been built once, and
the App Group sweep is **skipped entirely** while either is unknown.

0047 reasoned that an unpinned cold launch is safe because "a snapshot has not been
built yet, so there is nothing the widget is drawing to protect." That is true of
the WIDGET and false of the App Group, which the long-look card and the Live
Activity also read. **Keeping too much is a disk-space problem; deleting too much
is artwork missing from a lock screen ninety minutes later, with nothing anywhere
saying so.**

### 4. A directory being downloaded into is never deleted

`warmLongLookCrests` claims its fixture id in an in-flight set before its first
await and releases it in `finally`; the sweep treats those ids as wanted. ⚠ Belt
and braces with the keep-lists, not a replacement — it only covers the moments a
download is actually open.

### 5. The warm is ungated

Not gated on `alertReminder` (see Context), and not on `liveActivitiesAvailable()`
either: the same files serve the long-look card and both widgets, so they are not
wasted on a device that cannot show a card, and a reader who switches activities on
mid-week finds the artwork already there.

### 6. `_debug/widgets.tsx` lists EVERY crest directory

The existing list is keyed on the snapshot's entries, which is the wrong key for
this question — the card's fixture is chosen by the server and need not be one of
the widget's ≤ 6, so it was invisible there whether its artwork was on disk or not.

## Consequences

- ⚠ A third selection over a third horizon is exactly **trap 17**, and it is now
  four keep-lists that the App Group sweep must union. Anything that adds a fifth
  must join it or be deleted silently on the next foreground.
- ⚠ Up to 8 more fixtures may be warmed per foreground. Bounded, and a settled
  cache is free — `warmLongLookCrests` skips a file already on disk (trap 16).
- ⚠ No widget reload is added on a crest write; reloads are rationed and spending
  them is silent (trap 34).
- ⚠ The prune now declines to run in situations where it previously ran. Stale
  directories can survive longer on disk. That is the intended trade.
- ⚠⚠ **This does not close the case where the app has not been opened at all since
  the fixture entered the window.** A silent pre-kickoff push that wakes the app to
  warm is the chosen mechanism for that and needs its own entry — it requires
  `expo-task-manager`, `enableBackgroundRemoteNotifications`, and reverses the
  no-`content-available` non-choice recorded in 0080 and 0061.
- ⚠ 0085 §1 records the card's crest as "already warmed by `crests.ts`". It was not,
  for the fixtures that matter most. That claim is amended here rather than edited
  there.

## Alternatives considered

- **Crest URLs in `MatchAttributes`, fetched by the extension** — forbidden by 0025
  step 4 and 0085 §1 (no reliable network, hard memory budget in that process), and
  the start push is on APNs' 4096-byte ceiling anyway.
- **Warming from the notification service extension at start** — impossible: a
  `liveactivity` push carries no `mutable-content` and does not run an NSE at all.
  Goal pushes do run it, but carry no crest URLs by design and are suppressed for a
  device that already has a card.
- **Letting the tile print the abbreviation when no crest is on disk** — reintroduces
  the `ATH ATH` doubling 0085 §7 closed; the card already prints it at 30pt.
- **Raising `WIDGET_ENTRY_BUDGET`** — mixes two questions. The widget's budget is
  about what the widget draws; the activity's is about what the server may start.

## Verification

- ✅ Plain-node harness over the real `selectActivityFixtures` (8 cases): in-play
  kept on `KICKOFF_HOLD_MS`, finished dropped, `kickoffTbd` kept, `postponed` kept
  and `cancelled` dropped, unfollowed dropped, beyond-48h dropped, sorted
  soonest-first, budget capped at 8.
- ✅ `tsc --noEmit` and `eslint` clean across all five changed files.
- ✅ Pin ordering re-checked in `use-push-sync.ts`: both pins are set before
  `applyReminders` — which is what runs the prune.
- ⚠ **Not yet verified on a device.** Nothing in this repo starts an activity (the
  server push-to-starts it, 0055), so the card cannot be exercised from a simulator
  and this reaches a phone only with the next build.
- ⚠⚠ **Build with `yarn build:preview`, never a bare `eas build`** — trap 46.
