# 0097 — The club hero carries a FOLLOWING pill: the unfollow's visible door

- **Date:** 2026-09-01
- **Status:** Accepted — verified on the simulator (Real Madrid via deep link; the tap itself cannot be scripted here)
- **Decided by:** Ed Medina (reported he could not find how to unfollow); implemented same day
- **Amends:** [0091](./0091-club-page-hero-and-trays.md) (hero layout only)
- **Upholds:** [0082](./0082-clubs-screen-rail-redesign.md) — no unfollow on the Clubs screen, and every unfollow still confirms through the alerts sheet

## Context

The app's ONE unfollow path was functionally intact but invisible. 0082
removed unfollow from the Clubs screen deliberately (the rail bubble's only
action is opening the club), and 0091 moved the club page's subscribe block
into the alerts+calendar tray — where the unfollow entry is a row labelled
**"Alerts on"**, which reads as an alerts setting, not a follow control, and
which sits **below the fold** behind the hero, the standing strip and the
NEXT UP card. Nothing above the fold even said the club was followed. Ed —
who built the thing — reported it as "I cannot unfollow clubs": the flow
Clubs → bubble → club page dead-ended at a page with no visible follow
state and no visible way out.

## Decision

The subscribed club page draws a **FOLLOWING pill in the hero's top row**,
opposite the back pill: check glyph + `copy.club.following`
("Following" / "Siguiendo"), on `accentWash` with an `accentRing` border —
the settled-state chrome the alerts row already uses, at pill size.

1. **Its tap opens the SAME alerts sheet as the alerts row** — a second door
   to one confirm, never a direct unfollow. 0082's reason stands unweakened:
   unfollowing drops a season of calendar entries, so it always asks first,
   and the sheet already renders the unsubscribe direction (danger
   `Unsubscribe`, the calendar-stays warning).
2. **It is hidden while NOT subscribed.** The unsubscribed page's follow
   invitation is the solid-lime alerts row (0091's inversion), and the
   screen keeps exactly one lime hero. A quiet "Follow" pill beside it would
   be a second, weaker door to the same sheet and was not built.
3. **It wears the wash, never solid lime** — it states a settled fact, and
   solid lime is the invitation (0091's rule, unchanged).

`ClubHero` takes it as an optional `follow: { label, onPress } | null` prop,
so the organism stays presentational; the route push lives in the screen.

## Consequences

- The flow Ed described now works as described: bubble → club page → a CTA
  visible on arrival that unfollows (after the existing confirm).
- Two entry points feed one sheet. The sheet stays the single place follow
  state changes on this page — a third entry point should also route there.
- The hero's top row became a `space-between` row; the back pill lost its
  `alignSelf` (the row owns placement now).
- The pill states follow status above the fold, which the page previously
  stated nowhere — arguably the bigger half of the fix.
- A HIG audit the same day added `hitSlop` to BOTH hero pills (a 34pt pill
  is below `minTouch` — the theme's own recorded rule for chips), and a
  VoiceOver `accessibilityHint` on the follow pill: the visible label states
  the state, so the hint carries the action.
- ⚠ The tap → sheet hop is unverified on the simulator (taps cannot be
  scripted here), but it is byte-for-byte the alerts row's push
  (`/(sheets)/alerts` + `slug`), which is a shipped path.

## Alternatives considered

- **Unfollow directly from the pill** — one tap fewer, and exactly the
  no-confirm unfollow 0082 refused; a season of calendar entries deserves a
  confirm.
- **A danger "Unfollow" row in the ClubActions tray** — honest, but below
  the fold, which is the discoverability failure this exists to fix.
- **Unfollow on the rail bubble** — rejected in 0082 (a thumb's width from
  the open-club tap) and not reopened.
- **Relabelling the alerts row "Following" instead** — cheaper, but the row
  genuinely governs alerts and the calendar note beneath it; renaming it
  trades one ambiguity for another and still leaves the fold problem.
