# 0040 — Kickoff reminders offer three lead times, and the notification budget counts notifications

- **Date:** 2026-08-26
- **Status:** Accepted — not yet exercised on a device
- **Decided by:** Ed, in session

## Context

Kickoff reminders shipped with one hardcoded lead: `REMINDER_LEAD_MS = 30 * 60 *
1000`. Readers want to choose — an hour out to make plans, fifteen minutes out to
get to a screen — and the design has room for it under the reminder row in the
account sheet.

The obstacle is not the UI. It is **trap 11**: iOS allows an app 64 pending local
notifications, total, and `scheduleNotificationAsync` past the cap does not error
— iOS silently keeps the 64 soonest and drops the rest. `REMINDER_BUDGET = 60`
was the explicit window that made that deterministic, and it counted **fixtures**.
Three lead times turn 60 fixtures into 180 notifications, which hands the cap
straight back to the silent truncation the window exists to prevent.

A second, quieter obstacle: `attachmentCopy` named its file after the fixture,
and `UNNotificationAttachment` **moves** the file it is given (trap 13). Three
reminders for one match pointing at one copy means the first one scheduled
consumes it and the other two are handed a path with nothing at it — and iOS
drops an attachment it cannot read without saying so.

## Decision

**Three lead times — 60, 30 and 15 minutes — as a closed set**
(`REMINDER_LEAD_OPTIONS` in `store/preferences.ts`), stored as
`reminderLeads: readonly ReminderLead[]`.

**`alertReminder` stays the master and the three leads nest under it.** The lead
rows are drawn indented and genuinely `disabled` while the master is off, and the
store keeps the two coupled in both directions: turning off the last lead turns
the master off, and turning the master on with an empty list restores `[30]`.
**The list can never be empty while the master is true** — a green switch that
delivers nothing is the dishonesty the score-age lines exist to prevent.

**`REMINDER_BUDGET` now counts NOTIFICATIONS, not fixtures.** `selectReminders`
expands fixtures × leads, sorts the whole expansion by **fire time**, and takes
the soonest 60. The nearest match is therefore always fully covered and the
**horizon** is what shortens: three leads buys ~20 fixtures where one buys 60.

The cutoff moved with it. It is now tested **per lead**, not per fixture — a match
kicking off in 20 minutes has no 60- or 30-minute reminder left but its
15-minute one is still ahead, and the old per-fixture test would have dropped the
whole thing.

`PlannedReminder` grows a `key` (`${fixtureId}-${lead}`) that is unique per
notification. `attachmentCopy` is keyed by it, and `pruneCrestCache` takes **two**
keep-lists — the plate cache and the App Group are per fixture, the attachment
directory is per notification.

The lead rides the payload as `leadMinutes` and is named in three places: the
banner title (`Barcelona v Sevilla · 1 hour`), the account sheet rows, and the
long-look eyebrow, which gets **one localized key per lead** rather than an
interpolated number — these are micro-labels where width is the real limit and
each language sets its own.

`SCHEMA_VERSION` goes to 2. `FOLLOWED_RULE_VERSION` deliberately does **not**
move; that separation is exactly what stops a shape bump from emptying every
reader's follow list.

## Consequences

- **A reader with all three leads on gets a shorter horizon.** ~20 fixtures
  instead of 60. Acceptable: the re-arm runs on every foreground and continually
  refills, and 20 fixtures is well past what a reader following a handful of
  clubs sees in three weeks. It is a real limit for someone following twenty.
- **Three notifications per match, and the banner title is the only thing that
  tells them apart.** That is why the lead is in the title and not just the card.
- **Adding a fourth lead is a four-file change, not a number**:
  `REMINDER_LEAD_OPTIONS`, both `.lproj` files, and a `case` in
  `MatchCard.eyebrowText`. The constant's doc comment says so.
- **Trap 15 gets wider.** The eyebrow now branches on payload data, so the
  extension's copy of the lead vocabulary is one more thing that can drift from
  `copy.ts` with nothing to catch it.
- Migration is silent and safe: a v1 payload has no `reminderLeads` and becomes
  `[30]` unconditionally — including when the master is off — so turning alerts
  back on behaves exactly as it did before the upgrade.
- `Payload.leadMinutes` defaults to 30 rather than being required, because
  reminders scheduled by a pre-0040 build are still sitting in iOS's queue and
  they were all 30-minute ones. The default is the correct **reading** of an old
  payload, not a fallback.
- Verified by two sliced-source harnesses (16 + 14 assertions) covering the
  expansion, the budget, the per-lead cutoff, the migration and the coupling, plus
  `tsc`, `lint` and `expo export`. **Not yet seen on a device** — the long-look
  eyebrow for 60 and 15, and three banners landing for one match, are unproven.

## Alternatives considered

- **Breadth first, then depth** — give every fixture its closest lead, then fill
  back. Wider coverage, but which alerts you get would depend on how far out the
  match is, which is not explicable to a reader.
- **Leave the budget counting fixtures.** Schedules 180 and lets iOS truncate.
  This is precisely trap 11 and would have looked fine in testing, where nobody
  follows enough clubs to cross 64.
- **Drop the master switch, let three switches be the whole control.** One source
  of truth and no coupling code — but turning reminders off temporarily would
  lose the reader's picks, and there is no natural "all off" affordance.
- **Interpolate the lead into one localized eyebrow string.** Takes the width
  choice away from the translator, in the one place the ES file already documents
  width as the binding constraint.
