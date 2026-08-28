# 0053 — Live match push alerts: goals, reds and full time behind one `alertGoals` switch

- **Date:** 2026-08-28
- **Status:** Accepted — not yet on a device
- **Decided by:** Ed Medina
- **Builds on:** [0024](./0024-push-enabled.md) (push, and the Live Activity
  deferral it still holds), [0037](./0037-rich-notifications-server-composed-crests.md) (the service and
  content extensions), [0051](./0051-live-match-events-inline.md) (the live event
  feed), [0052](./0052-kickoff-triggers-the-live-refetch.md)

## Context

The account sheet has drawn a **"Goals & final score" switch, disabled**, since
push shipped. Its note said *"Needs a live feed — not yet available."*

That note stopped being true on 2026-08-27. `GET /cronogol/live` carries a
minute and a score, and since 2026-08-28 an in-play **event timeline** — goals,
cards, substitutions — refreshed by `LiveSessionService` on a 30-second poll.
The blocker was never redrawn: what is missing is **delivery**. The app polls
while it is open and foregrounded; nothing reaches a locked phone.

`handoff_live-notification/LIVE-MATCH-NOTIFICATIONS.md` is the design for that
delivery, and it left three questions open. This entry answers them.

⚠ The handoff's payloads carry a numeric `fixtureId` (`84213`). **The real one is
a uuid string.** Built against the backend, not the mock.

## Decision

1. **Three types, one switch.** `match_goal`, `match_red_card` and
   `match_full_time` are all gated by a single `alertGoals`. A reader who wants
   to know about a goal wants to know about the sending-off that shaped it, and
   three switches for one match is a settings screen pretending to be a
   preference. The design assumed this; we are confirming it.
2. **`alertGoals` defaults OFF** — the only alert here that does. The other three
   describe a fixture the reader already put in their calendar; this is a new
   class of interruption, several per match, breaking through a Focus. Turning it
   on for everyone who upgrades would be us making that choice for them.
   `parse()` reads it `=== true`, the opposite test to its three neighbours.
3. **Yellow cards never alert.** They move the counts on the card, silently.
4. **Full time is quiet** — no sound, `interruption-level: active`. A goal and a
   red are `time-sensitive`. A result is not urgent; a goal is the entire point.
5. **The attachment is DRAWN on device** (`targets/_shared/EventPlate.swift`),
   not composed by the backend. This reverses nothing in 0037: that decision
   exists because two of our four leagues publish crests iOS cannot rasterise
   (Bundesliga SVG, Serie A WebP). None of that applies to a glyph — it is our
   own vectors in our own colours, identical for every club. The live design is
   **crest-free by intention**, so there is no composed-crest problem to solve
   and a server round trip would buy nothing.
6. **`routeFor()` is untouched.** Every alert still opens `/club/{slug}`. The
   tolerance for an unknown `type` that `deep-link.ts` has documented since it
   was written was for exactly this.
7. **The meta row belongs to the content extension, not the banner.** A standard
   iOS banner has slots for title, subtitle and body — there is no third styled
   row, and `28' left · 🟨 3 · 🟥 1 · Getafe 10 men` is card typography. It is
   drawn by `MatchCard.swift` from structured `userInfo` keys.

   The consequence, accepted: **on a glance banner the meta row is not visible.**
   That is consistent with the design's own copy rule 1 — the score is always in
   the title, because the title is all that survives a glance.
8. **`time-sensitive` needs an entitlement**, now declared in `app.json`. Without
   `com.apple.developer.usernotifications.time-sensitive` iOS **silently
   downgrades** the level: the alert still arrives, it just loses Focus
   break-through, with no error anywhere. This is why `reminders.ts` deliberately
   uses `active` today.

   ⚠ **No Apple Developer portal work.** EAS Build syncs capabilities from
   `ios.entitlements` to the App ID on every build, and Time Sensitive
   Notifications is on its supported list — declaring it in `app.json` IS the
   whole action. The residual risk is a **stale provisioning profile**, which
   does not know about a newly-synced capability; regenerate via
   `eas credentials` if the level still downgrades on a signed build.
9. **This does not supersede 0024.** Live Activities stay deferred — see
   [0054](./0054-live-activities-still-deferred.md).

## Consequences

- The switch is honest for a LaLiga follower and **silent for everyone else**:
  `LiveScoreProviderRegistry` has exactly one member. The note beside it now says
  `LaLiga only, for now` in both languages, replacing the stale "not yet
  available". ⚠ **That note is load-bearing.** It was load-bearing when it was
  disabled and it still is; a switch that promises a Bundesliga follower goal
  alerts lies to them.
- `SCHEMA_VERSION` goes to 3. `alertGoals` is absent from every v1 and v2 payload
  and absent must read as OFF.
- **The backend DTO has to be deployed first.** It is `forbidNonWhitelisted`, so
  an undeclared `alertGoals` is a **400 on every registration** — not a dropped
  field, a total and silent loss of push for that device. Backend decision 0033
  declares it `@ValidateIf`-optional so older builds keep registering.
- Six categories now, not three. ⚠ The three-way contract in `categories.ts`
  grew by three strings and **still nothing validates it** (HANDOFF trap 14).
- `Tokens.swift` gains `plate*` UIColors beside its SwiftUI ones — the service
  extension draws with CoreGraphics, which cannot take a SwiftUI `Color`. ⚠ It is
  still the hand-maintained copy of `theme.ts` (trap 15).
- Five new `.lproj` keys in **both** files. Verified at parity: 18 keys each.
- The app has **no test harness at all**, so none of this is covered by an
  automated test on this side. The policy and the copy are unit-tested in
  `senpai-backend` (38 cases), which is where the logic actually lives.

## Alternatives considered

- **A second switch for full time**, so a reader could take the result without
  the play-by-play. Rejected as a settings problem dressed as a product one; the
  design assumed one gate and nothing has argued against it yet. It is an
  additive change if somebody asks.
- **A server-rendered glyph PNG**, beside the existing `crest.png` route. It
  matches the 0037 precedent, and that is the only thing it has going for it: a
  route, a fetch and a failure mode for a shape with no upstream format to
  decode.
- **Routing a goal to the fixture** rather than the club. More app work, a
  widened `NotificationRoute` union, and a divergence from the handoff — for a
  destination the reader reaches in one more tap.
