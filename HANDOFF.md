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

⚠ **And since then, the Live Activity too** — the same moments on a card that
stays on the Lock Screen for the match instead of a banner that scrolls away. See
Phase 2 below; it is built, not planned.

**Design:** [`handoff_live-notification/LIVE-MATCH-NOTIFICATIONS.md`](./handoff_live-notification/LIVE-MATCH-NOTIFICATIONS.md)
and `handoff_AG-ios/SPEC.md` §196 for the card.
**Decisions:** native [0053](./.claude/decisions/0053-live-match-push-alerts.md),
[0054](./.claude/decisions/0054-live-activities-still-deferred.md) (superseded),
[0055](./.claude/decisions/0055-live-activities-broadcast-channels.md),
[0057](./.claude/decisions/0057-local-expo-module.md) ·
backend `0033-live-match-push.md`, `0034-live-activities-broadcast-channels.md`

---

## ⚠ State: complete, verified, and NOT COMMITTED

Two working trees, both dirty. **Commit or stash before anything else.**

| Repo | Last commit | Uncommitted files |
|---|---|---|
| `alta-gama-fc-native` | `ff9a27a post countdown poll trigger` | 25 |
| `senpai-backend` | `54af2d3 fix` | 21 |

### Verified

- Backend: **192 suites / 4950 tests pass**, and `eslint src` is **clean**.
  Typecheck at **77 errors, every one of them in a `.spec.ts` or an
  `e2e-spec.ts`** and none in `src/` production code.
  ⚠ The "71" this file originally claimed counts differently; what matters is
  that the number did not move across either feature.
- New tests: `live-alert.policy.spec.ts` (20), `live-push.mapper.spec.ts` (18),
  and for the card `live-activity.mapper.spec.ts` (14) and
  `live-activity.service.spec.ts` (12).
- App: typechecks clean; `expo lint` **identical to baseline** (6 errors, 9
  warnings, all pre-existing).
- All Swift files pass `swiftc -parse`.

### ⚠ NOT verified — read this before trusting anything above

1. **The migrations have not been applied.** `yarn db:push` was never run. I
   **hand-edited `src/supabase/database.types.ts`** to match what the migrations
   will produce. ⚠ **Run `yarn db:push && yarn db:types` and diff the result** —
   if my hand-edit was wrong, the types will change and the build will tell you.
2. **Swift is parse-checked, not compiled.** Full typecheck needs the target
   module context, i.e. `expo prebuild`, and `ios/` is gitignored deliberately
   (ADR 0025). First real compile is an EAS build.
3. **Nothing has touched a device.** No push has been sent, end to end, ever.
   ⚠ But APNs itself is now proven, twice: the provider credentials answer
   `400 BadDeviceToken` (good auth, garbage token), and a **channel create/delete
   round-trip returns 201 then 204**. What is unproven is everything from the
   device token onward.
4. ~~**`scripts/probe-apns.mjs` was NOT extended.**~~ **DONE 2026-08-28.** It now
   carries `--live=goal|red|ft` (the three §99 banners),
   `--channel` (create + delete round-trip, no device needed), `--start <token>`
   (the whole card lifecycle: channel → push-to-start → publish → end → delete)
   and `--delete-channel <id>` for litter.
5. ⚠ **`parseChannels()` guesses.** Apple documents the `all-channels` response
   body only as "empty", which cannot be right for a listing endpoint, so it
   handles two plausible shapes and answers `[]` for anything else. Re-verify
   against a real response and delete the wrong branch.
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
| `src/apns/apns-channels.ts` | Channel create/delete/list. ⚠ A different host, on port 2195 |
| `src/cronogol/live-activity.mapper.ts` | `LiveAlert` → `content-state`. ⚠ Holds the clock anchor |
| `src/cronogol/live-activity.service.ts` | start / update / end / prune |
| `supabase/migrations/20261004000000_push_to_start_token.sql` | The column 0054 said did not exist |
| `supabase/migrations/20261005000000_live_activity_channels.sql` | Channels + the banner-suppression table |
| `.claude/decisions/0033-live-match-push.md`, `0034-live-activities-broadcast-channels.md` | |

Modified: `apns.types.ts` (union 2 → 5 types, `time-sensitive`, the live meta
keys), `push-device.dto.ts`, `push-device.service.ts`, `push-payload.mapper.ts`
(`aps()` exported and widened), `push-dispatch.service.ts` (`isDeadToken`
exported), `live-session.service.ts`, `configuration.ts`, `render.yaml`,
`cronogol.module.ts`, `CRONOGOL-API.md`, `database.types.ts`.

### `alta-gama-fc-native`

| New | |
|---|---|
| `targets/_shared/EventPlate.swift` | Draws the 38pt glyph plate with CoreGraphics |
| `targets/_shared/MatchAttributes.swift` | ⚠ The activity contract, compiled into TWO binaries by two unrelated mechanisms |
| `targets/widget/MatchActivity.swift` | Lock Screen + Dynamic Island, `@available(iOS 18.0, *)` |
| `modules/live-activity/` | ⚠ The app target's ONLY Swift — a local Expo module (0057) |
| `.claude/LIVE-ACTIVITIES.md` | Phase-2 research. ⚠ **Three of its claims are wrong; read 0055 first** |
| `.claude/decisions/0053…`, `0054…`, `0055…`, `0057…` | |

Modified: `preferences.ts` (v3 + `alertGoals`), `push.ts` (`activityToken` +
`normaliseActivityToken`), `sync.ts`, `registration.ts`, `capability.ts` (the
Live Activity seam), `use-push-sync.ts` (token rotation), `_debug/push.tsx`,
`account-sheet.tsx` (switch enabled), `copy.ts`, `categories.ts` (3 → 6),
`app.json` (entitlement + `NSSupportsLiveActivities`), `tsconfig.json`
(`@/modules/*`), `AltaGamaWidgetBundle.swift`, `NotificationService.swift`,
`MatchCard.swift` (the meta row), `Payload.swift`, `Tokens.swift`, `Info.plist`,
both `.lproj`, `.claude/{HANDOFF,LIVE-ACTIVITIES,LIVE-SCORES,PUSH-AND-ACCOUNTS}.md`.

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

### The flags — ⚠ FOUR now, not two

⚠ `CRONOGOL_LIVE_ACTIVITY_ENABLED` ships `false` and is **not** implied by
`CRONOGOL_LIVE_PUSH_ENABLED`; `CRONOGOL_LIVE_ACTIVITY_DRY_RUN` ships `true` and
defaults to the dry run when UNSET — the opposite polarity to every other flag,
deliberately, so an unset variable is the safe state.

The original two, unchanged. Both ship `false`. ⚠ `render.yaml:81` warns the **Render dashboard value wins
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

## Phase 2: Live Activities — ⚠ BUILT 2026-08-28, and this section's plan was wrong twice

⚠⚠ **This is no longer a plan.** It was built the same day, on the answers below
plus three corrections that only appeared once the code existed. The authorities
are [0055](./.claude/decisions/0055-live-activities-broadcast-channels.md),
[0057](./.claude/decisions/0057-local-expo-module.md) and the backend's
`0034-live-activities-broadcast-channels.md`. The list below is kept because the
corrections are the useful part.

### What this section got wrong

1. ⚠⚠ **"There is no per-Activity push token to store" — half true, wrong half.**
   Channels remove the UPDATE token. The **push-to-start** token is still needed
   (nobody opens the app at kickoff) and it is per device and per activity TYPE,
   so it is one nullable column on `device_tokens`. Planned against "no token",
   this feature has no way to begin.
2. ⚠⚠ **Item 1 below — "raise `deploymentTarget` to 18.0" — is wrong.**
   `targets/widget/` is ONE extension holding both widgets and both Lock Screen
   accessories; raising its floor removes the WIDGETS from every iOS 17 reader,
   which is the exact cost ADR 0047 paid 17.0 to avoid. `@available(iOS 18.0, *)`
   at the call sites costs nothing. **The floor did not move.**
3. ⚠ **Item 3 below — "decide what replaces the check-age footer" — has an answer
   the plan did not anticipate.** It is the last alertable moment, and **no stall
   line goes with it**: a card goes stale by the ABSENCE of pushes, so no push
   can carry that fact. `aps.stale-date` is the mechanism and iOS greys the card
   itself.

Also: the channel ceiling is **10,000 per app per environment**, not "limited".
And there are **four APNs hosts**, not one — sends, broadcast publishes and
channel management each have their own, the last on port 2195. Every path and
header was verified against Apple's documentation on 2026-08-28.

### What was right, and load-bearing

- Channels really do delete the update-token table. Item 4 (widening
  `apns.service.ts` and `ApnsPayload`) and item 5 (channel management and
  pruning) were both exactly right and are both done.
- ⚠⚠ **"APNs is not a ticker"** is the single most important line in this file.
  Only what `decideLiveAlerts` returns is published; the clock is drawn on device.
- ⚠ The broadcast capability really is the one MANUAL Apple Developer portal
  step, and it is still not done.

### What is left

1. ~~**Enable the broadcast capability**~~ — **DONE, and VERIFIED 2026-08-28.**
   `node scripts/probe-apns.mjs --channel` answers `201` with a channel id and
   `204` on the delete. The capability is on and the prune path works.
2. `yarn db:push && yarn db:types`, now covering **four** migrations, and diff
   `database.types.ts` — it was hand-edited again, for the new column and both
   new tables.
3. `expo prebuild` locally: confirm `modules/live-activity/` compiles into the
   app target and that `MatchAttributes.swift` reaches BOTH binaries. This is the
   first real Swift typecheck; everything before it is `swiftc -parse`.
4. EAS build, then read the push-to-start token off `/_debug/push` and run
   `node scripts/probe-apns.mjs --start <that-token>`. ⚠ **That command is the
   milestone** — it is the first time a card can appear on a phone, and it needs
   no matchday, no cron and no flags.
5. A matchday with `CRONOGOL_LIVE_ACTIVITY_DRY_RUN=true`, reading the
   `[dry-run] live activity` lines. Only then flip it.

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
- ⚠ **iOS 18+ for the Live Activity.** A reader on 17.x keeps the banners and
  gets no card, and nothing in the UI says so.
- ⚠⚠ **One language per Live Activity channel.** A broadcast reaches every
  subscriber with identical bytes, so per-device copy is impossible by
  construction. Spanish wins — so an English reader gets an English BANNER and a
  Spanish CARD. Recorded in the backend's 0034 §6, not discovered later.
