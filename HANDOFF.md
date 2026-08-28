# Handoff — live match notifications (goals, red cards, full time)

**Written 2026-08-28. Session boundary — nothing is committed in either repo.**

⚠ This is not [`.claude/HANDOFF.md`](./.claude/HANDOFF.md), which is the project's
standing START-HERE document. This file covers **one feature**, built across two
repos in one session, and can be deleted once the work is merged and its contents
folded into the standing docs.

---

## What this is

The account sheet's "Goals & final score" switch was drawn **disabled** with the
note *"Needs a live feed — not yet available."* That stopped being true on
2026-08-27: `/cronogol/live` carries a minute, a score, and since 2026-08-28 an
in-play **event timeline**, refreshed every ~30 s.

What was missing was never data. It was **delivery** — the app polls while it is
open, and nothing reaches a locked phone.

This work builds that delivery: `match_goal`, `match_red_card` and
`match_full_time` APNs pushes, gated by a new `alertGoals` switch.

**Design:** [`handoff_live-notification/LIVE-MATCH-NOTIFICATIONS.md`](./handoff_live-notification/LIVE-MATCH-NOTIFICATIONS.md)
**Decisions:** native [0053](./.claude/decisions/0053-live-match-push-alerts.md),
[0054](./.claude/decisions/0054-live-activities-still-deferred.md) ·
backend `0033-live-match-push.md`

---

## ⚠ State: complete, verified, and NOT COMMITTED

Two working trees, both dirty. **Commit or stash before anything else.**

| Repo | Last commit | Uncommitted files |
|---|---|---|
| `alta-gama-fc-native` | `ff9a27a post countdown poll trigger` | 25 |
| `senpai-backend` | `54af2d3 fix` | 21 |

### Verified

- Backend: **189 suites / 4907 tests pass.** Typecheck at the **pre-existing
  baseline of 71 errors** — all in unrelated spec files, confirmed by stashing.
- New tests: `live-alert.policy.spec.ts` (20) and `live-push.mapper.spec.ts` (18).
- App: typechecks clean; `expo lint` **identical to baseline** (6 errors, 9
  warnings, all pre-existing).
- All five Swift files pass `swiftc -parse`.

### ⚠ NOT verified — read this before trusting anything above

1. **The migrations have not been applied.** `yarn db:push` was never run. I
   **hand-edited `src/supabase/database.types.ts`** to match what the migrations
   will produce. ⚠ **Run `yarn db:push && yarn db:types` and diff the result** —
   if my hand-edit was wrong, the types will change and the build will tell you.
2. **Swift is parse-checked, not compiled.** Full typecheck needs the target
   module context, i.e. `expo prebuild`, and `ios/` is gitignored deliberately
   (ADR 0025). First real compile is an EAS build.
3. **Nothing has touched a device.** No push has been sent, end to end, ever.
4. **`scripts/probe-apns.mjs` was NOT extended.** The plan called for adding the
   three live payloads to it. I did not do it. That is the fastest path to a
   device test and it is still open work.
5. **No app-side unit tests.** The app has **no test harness at all** — no jest
   config, 297 files scanned, zero test files. The three tests the plan promised
   (`buildRegistration` carries `alertGoals`, `registrationChanged` fires on it,
   v2→v3 migration defaults absent to `false`) are **not written**. Adding a test
   framework is a new dependency and its own decision, so I left it. Those three
   behaviours are currently covered by typecheck alone.

---

## Architecture, in one screen

The load-bearing decision: **live pushes dispatch from inside the live session's
own 30-second poll loop, not the `cronogol-push` cron.** That cron runs at
`15,45 * * * *` over the `fixture_changes` outbox — right for a schedule change
found by a 3-hourly sweep, hopeless for a goal.

```
LiveSessionService (30s loop, leased)
  └─ poll provider → upsert live_match_states     ← the score is written FIRST
       └─ LivePushService.run()                    ← ⚠ never throws into the loop
            ├─ decideLiveAlerts()   pure, testable, no I/O
            ├─ coalesceLiveAlerts() send the LAST, record them ALL
            ├─ claim in live_push_sent  (insert = the lease)
            ├─ fan out: device_tokens.team_ids && [home,away], alert_goals = true
            └─ renderLivePush() → ApnsService.send()
```

**A goal has no outbox row and cannot have one** — it is not a change to a
fixture we store, it is a moment inside a match. `live_push_sent`
(`fixture_id`, `event_key`) is the dedupe, and the insert is the claim.

### The three traps this design exists to avoid

1. ⚠⚠ **Replaying the first half.** A session opening onto a match already in
   play (restart, lease handover, deploy at half time) has `stored === null`, and
   every event is "new". `decideLiveAlerts` returns `[]` outright in that case —
   **a match we have never seen starts silent.**
2. ⚠ **Re-sending full time forever.** `finished` persists for every remaining
   cycle, so FT keys on the **transition**, never the state.
3. ⚠ **Two banners for one passage of play.** More than one alertable moment in a
   cycle sends only the last and records them all.

---

## Files

### `senpai-backend`

| New | |
|---|---|
| `src/cronogol/live-alert.policy.ts` | **The change detector.** Pure. Decides what interrupts a person. |
| `src/cronogol/live-push.mapper.ts` | Bilingual copy, enforcing the design's five rules |
| `src/cronogol/live-push.service.ts` | Fan-out, dedupe claim, dead-token pruning |
| `supabase/migrations/20261002000000_push_alert_goals.sql` | `alert_goals` + rebuilt `updated_at` trigger |
| `supabase/migrations/20261003000000_live_push_sent.sql` | The dedupe table |
| `.claude/decisions/0033-live-match-push.md` | |

Modified: `apns.types.ts` (union 2 → 5 types, `time-sensitive`, the live meta
keys), `push-device.dto.ts`, `push-device.service.ts`, `push-payload.mapper.ts`
(`aps()` exported and widened), `push-dispatch.service.ts` (`isDeadToken`
exported), `live-session.service.ts`, `configuration.ts`, `render.yaml`,
`cronogol.module.ts`, `CRONOGOL-API.md`, `database.types.ts`.

### `alta-gama-fc-native`

| New | |
|---|---|
| `targets/_shared/EventPlate.swift` | Draws the 38pt glyph plate with CoreGraphics |
| `.claude/LIVE-ACTIVITIES.md` | Phase-2 research — **read before touching ActivityKit** |
| `.claude/decisions/0053…`, `0054…` | |

Modified: `preferences.ts` (v3 + `alertGoals`), `push.ts`, `sync.ts`,
`registration.ts`, `account-sheet.tsx` (switch enabled), `copy.ts`,
`categories.ts` (3 → 6), `app.json` (entitlement), `NotificationService.swift`,
`MatchCard.swift` (the meta row), `Payload.swift`, `Tokens.swift`, `Info.plist`,
both `.lproj`, `.claude/{HANDOFF,LIVE-SCORES,PUSH-AND-ACCOUNTS}.md`.

---

## ⚠⚠ Do these in order

1. **Deploy the backend DTO BEFORE the app ships `alertGoals`.** The DTO is
   `forbidNonWhitelisted`, so an undeclared field is a **400 on every
   registration** — not a dropped field, a **total and silent loss of push for
   that device**. `alertGoals` is `@ValidateIf`-optional so older builds keep
   working.
2. `yarn db:push && yarn db:types`, and diff `database.types.ts` (see above).
3. Extend `scripts/probe-apns.mjs` with the three payloads; fire at a sandbox
   device.
4. EAS build. ⚠ **Test on a real build, never the simulator** — the APNs
   environment follows the provisioning profile, and an EAS `internal` build is
   ad-hoc, which is *production*. A dev build registered as `production` receives
   nothing, silently (trap 10, ADR 0026).
5. Watch a matchday with `CRONOGOL_LIVE_PUSH_ENABLED=false` and read the
   `[dry-run] live push` lines against the actual match — right club, right
   scorer, right minute, no repeats. **This is the gate on everything.**
6. Only then flip it.

### The two flags

Both ship `false`. ⚠ `render.yaml:81` warns the **Render dashboard value wins
over the file** — check the dashboard, not the repo.

- `CRONOGOL_LIVE_CRON_ENABLED` — whether we watch a match at all.
- `CRONOGOL_LIVE_PUSH_ENABLED` — whether watching may light up a phone.
  Deliberately **not** implied by the first.

---

## Corrections made this session — do not re-derive these

Three things I asserted and then had to correct. They are in the docs now, but
they were wrong first, so treat the surrounding claims with the same suspicion.

1. **A goal-swing bug, found and fixed mid-build.** `swingFor` first compared the
   new score against the *stored* row. Two goals inside one 30 s cycle made that
   two goals stale, so the second read as "extended the lead" when it was the one
   that went in front. It now reconstructs from the timeline, and refuses to
   claim *"ahead for the first time"* unless the goals it can see add up to the
   score the provider reports. Test: *"reads the goal before it, not the cycle
   before it."*
2. **The `time-sensitive` entitlement needs NO Apple Developer portal work.** I
   said it was manual and "the long-pole item." **EAS Build syncs capabilities
   from `ios.entitlements` automatically** and Time Sensitive Notifications is on
   its supported list — watch for `✔ Synced capabilities` in the build log. The
   real risk is a **stale provisioning profile**; regenerate with
   `eas credentials` if the level still downgrades on a signed build.
3. **A Live Activity design DOES exist**, and the Watch is free — see below.

---

## Phase 2: Live Activities — deferred, but the road got much shorter

Full research and citations: [`.claude/LIVE-ACTIVITIES.md`](./.claude/LIVE-ACTIVITIES.md).

**Broadcast channels (iOS 18+) delete the blocker `GO-LIVE.md` named.** There is
no per-Activity push token to store: an activity subscribes with
`pushType: .channel(id)`, the server publishes once to a channel id, APNs fans it
out. Apple names shared sporting events as the case channels exist for. One
channel per fixture.

⚠ **The design exists** — `handoff_AG-ios/SPEC.md` §4 plus
`screenshots/16-live-activity-widgets.png`. The live-notification handoff's "not
in this export" refers only to *its own* export. ⚠⚠ **But it was drawn for a
world with no live feed**: its footer is a check-age, *"the honest part of the
design"*. With a 30 s feed that footer answers a question nobody is asking. The
layout survives; the premise needs re-deciding.

⚠ **The Watch, CarPlay and menu bar are free.** From iOS 18 an iPhone Live
Activity appears in the Watch Smart Stack automatically, reusing the Dynamic
Island views. `supplementalActivityFamilies` only *replaces* that with something
hand-made. Not a gate.

**What is actually left:**

1. Raise `targets/widget/expo-target.config.js` from `deploymentTarget: '17.0'`
   to `'18.0'`. ⚠ It was lowered from the plugin's 18.0 default deliberately, so
   this is a decision. Supporting both means reintroducing the token table
   channels exist to delete.
2. ⚠ **Enable the broadcast capability by hand in the Apple Developer portal** —
   the one thing here EAS capability sync does *not* cover.
3. Decide what replaces the check-age footer.
4. Server: `apns.service.ts` hard-codes `apns-push-type: 'alert'` and one topic;
   Live Activities need `liveactivity` and
   `<bundleId>.push-type.liveactivity`. `ApnsPayload` is a closed interface with
   no `aps.event` / `content-state` / `stale-date` / `dismissal-date`.
5. Channels are limited per app and outlive their activities — the server must
   delete them via APNs' channel management API. `prune()` is the obvious home.

⚠⚠ **APNs is not a ticker.** Discrete events only — goal, half time, full time.
`live-alert.policy.ts` already emits exactly those, which is the single reason
phase 2 is now tractable. The clock is drawn client-side from
`Text(timerInterval:)`; never push a per-minute update.

---

## Known limits, stated plainly

- ⚠ **LaLiga only.** `LiveScoreProviderRegistry` has exactly one member. A reader
  following Bayern gets nothing. The switch's note now says `LaLiga only, for
  now` in both languages — **that note is load-bearing.**
- ⚠ The live event feed is still **unverified against a real scorer**
  (`.claude/LIVE-SCORES.md` §6). Bad attribution in a push cannot be taken back
  the way a wrong screen can.
- `alertGoals` defaults **off**, unlike the other three alert switches. An
  upgrade is not consent to be interrupted.
- The meta row exists **only on the long-look card**, not the banner — iOS has no
  third styled row. Consistent with the design's rule that the score is always in
  the title.
