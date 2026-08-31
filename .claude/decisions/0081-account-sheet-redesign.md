# 0081 — The account sheet is redesigned: an identity block, per-type alert tiles, lead times as chips, and the app's first staggered entrance

- **Date:** 2026-08-30
- **Status:** Accepted — verified on the simulator (`/_debug/sheets`, `?which=account-in`, the real `/account` route, and with Reduce Motion on); the signed-in half still only against a stub
- **Decided by:** Ed Medina, from an approved interactive mock
- **Amends:** [0040](./0040-kickoff-reminder-lead-times.md) (presentation only) · [0076](./0076-onboarding-floodlight-redesign.md) (the primer's tile is now shared)

## Context

The account sheet was the last screen with no design pass. It honoured every
behavioural ADR and read as a flat grey column: seven switches of identical
weight, a text-only identity block, three nested lead rows that outweighed the
master they belonged to, and no motion anywhere. The reader's words: *"very
barren."*

Two of the fixes were already sitting in the handoff, unbuilt.
`screenshots/10-sheet-account.png` leads with an avatar beside the name, and
`screenshots/12-onboarding-alerts.png` gives each alert type a tinted glyph
tile — a device the onboarding primer shipped and this sheet never borrowed.

## Decision

1. **An identity block.** A new `atoms/avatar.tsx`, extracted from the disc that
   was inline in `screen-scaffold.tsx`, draws the initials at `Size.avatarLg`
   beside the name and email. Signed out it draws the `Mark` instead of the
   header's `·`, which works at 36pt and only at 36pt. The `VERIFIED` pill stays
   undrawn ([0038](./0038-accounts-apple-and-google.md)).
2. **Per-type alert tiles.** A new `molecules/alert-tile.tsx`, with the primer
   rewired to it so there is one tile in the codebase rather than two, and a
   fourth `goals` kind added to `AlertGlyph`. `moved` and `postponed` wear the
   hues those alert types already own — the same ones their lock-screen eyebrow
   uses, so the tile you tap is the colour of the notification it turns on.
   Reminder and goals have no designed hue and go neutral rather than borrowing
   an invented one.
3. **The lead times become chips** under their master, and are not drawn at all
   while it is off. This is 0040's presentation, not its behaviour: the store
   still couples the two in both directions, the set is still closed and still
   ordered by `REMINDER_LEAD_OPTIONS`. New copy `leadsShort` draws them; the
   full `leads` sentence stays as each chip's `accessibilityLabel`.
4. **The feeds rows get their crests**, which SPEC §3.6 always specified and
   nothing ever drew. The route already had `logoUrls` in hand.
5. **Motion, tokenised.** A new `Motion` scale in `constants/theme.ts` names the
   durations that were literals at call sites. The sheet spends it on a
   staggered `FadeInDown` per section, a segmented thumb that slides, the chips
   fading in and out under `LinearTransition`, the avatar ring settling once,
   and the armed delete's consent note. **Every one branches on
   `useReducedMotion()`**, and nothing loops.
6. **Haptics move to `lib/haptics.ts`** from `features/starting-xi/`, still the
   only file importing `expo-haptics` — the single-address rule is the point of
   the file, and a second importer would end it. Two new calls: `hapticArmed()`
   on the first press of the delete, `hapticToggle()` on a chip.
7. **`StatusBanner kind="error"`** replaces the bare red `Text` for a failed
   delete. That molecule exists for exactly this ([0074](./0074-export-receipt-state.md)),
   and the message — *the account is still alive* — was the quietest thing on
   the sheet.
8. **The bar grows a hairline once scrolled.** It is absolutely positioned, out
   of flow, because the sticky wrapper rewrites its child's style and a second
   child in flow would turn that row into a column.

## What was deliberately NOT changed

Each of these is a rule a future reader would otherwise think we missed.

- **`Switch` stays the native `UISwitch`.** The approved mock had a custom
  spring switch. Its atom's docblock explicitly rejects rebuilding it, and
  SPEC §2 says every control is a platform control. Not built.
- **No glows, no shadows.** The mock had both. SPEC §2: *there are no shadows in
  the app; depth is surface lightness.* The one shadow in `src/` is
  `alert-preview.tsx`, which is imitating an iOS notification, not app chrome.
- **No nested card shells.** They would invent a fifth surface; the ladder stays
  `background → card → raised → raisedAlt`.
- **`event-tabs` is still not animated.** [0045](./0045-match-events-expanded-row.md)
  rejected that for consistency and it stands. This sheet's segmented is a
  different control: a two-up in a settings row, where the slide is the feedback
  that a preference took, not a dense four-up competing with a timeline under it.
- **The `alertsNote` footnote stays directly under the switches**
  ([0079](./0079-push-sync-survives-a-stale-bearer.md)). Its absence is exactly
  how three dispatched goals reached zero devices for two days.
- **Nothing in `store/`, `features/push/` or `senpai-backend` was touched.**

## Consequences

- The accent budget on this sheet is now written down: lime is for a control
  that is ON, plus exactly one hero — the sign-in button signed out, the avatar
  ring signed in. It is still a lot of lime, because a settings screen with
  everything on is inherently that; the rule bounds where more can be added.
- `Size.segOption` is fixed, not `flex: 1`, and that is load-bearing: the first
  build let the track grow and it ate the row, pushing `Idioma` and `Reloj` off
  screen entirely. The fixed width is also why the thumb needs no measurement
  and is correct on the first frame.
- `AlertGlyph`'s `goals` pentagon is r=4.2 against the circle's 7. Smaller reads
  as a camera aperture — measured on the simulator, not derived.
- The primer and the account sheet now share `AlertTile`. Retuning one retunes
  the other; the `tone` prop is the seam that keeps their accent rules apart.
- `Motion` is a token module with no enforcement: it cannot make a caller branch
  on Reduce Motion, and an unguarded animation has already been a bug here once.
- The signed-in half still has only ever been seen against a stub (HANDOFF).

## Alternatives considered

- **Keeping the three lead-time switch rows** — least churn, but the imbalance
  that made the section feel long is the thing being fixed.
- **Chips that stay visible and disabled while the master is off** — more
  discoverable, but it keeps 0040's "live switch under a dead one" problem in a
  new shape. Not drawing them says the same thing with no ambiguity.
- **Building the mock's custom switch, glows and nested shells** — the most
  faithful port, and the one that quietly reverses three recorded rules. Taken
  as far as it goes without doing that.
