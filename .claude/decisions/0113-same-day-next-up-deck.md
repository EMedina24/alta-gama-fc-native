# 0113 — NEXT UP becomes a same-day deck in the crown

- **Date:** 2026-09-04 (opaque deck surface: 2026-09-05, Ed's call)
- **Status:** Accepted
- **Decided by:** Ed (direction and mock approved; spring / haptic / round-dots picked over the alternatives when asked; "remove transparency from this card only" on seeing the stack)
- **Amends:** [0096](./0096-next-up-goes-liquid-glass.md) — liquid glass is now the SINGLE card's surface; a deck card is opaque

## Context

The Today crown's payload shows ONE next-up card — `upcomingMine[0]` (ADR 0095).
A reader following several clubs sees only the soonest match even when three of
their clubs play the same afternoon; the other fixtures live six cards down in
UPCOMING, outside the screen's lead position. Ed asked for stacked cards:
multiple NEXT UP cards on one day, swipe left or right to shuffle the next one
to the top. An HTML mock (three states: rest, mid-swipe, shuffled) was approved
before this was built.

ADR 0070 is the on-record objection to swipe surfaces here: a swipeable news
reel was rejected because "stories 2–5 hide behind a gesture and the app has no
snapping carousel". Any deck had to answer both halves.

## Decision

**What stacks.** `nextUpDeck(upcomingMine, zone)` in `lib/cronogol/board.ts` —
`dayGroups(...)[0].items`, nothing more. The deck is every followed-club
fixture sharing the SOONEST kickoff's calendar day in the reader's zone, and
the day rule is `dayGroups`' (ADR 0035) reused verbatim: a TBD kickoff is a
floating day keyed in UTC and never merges with a confirmed one, so a
confirmed lead never drags a TBD fixture into the deck; an all-TBD deck is the
only mixed-looking case. `deck[0] === upcomingMine[0]` by construction — the
single card's fixture, unchanged. One fixture that day renders exactly the old
single card: glass, no peeks, no dots, no gesture.

**The organism.** `organisms/next-up-deck.tsx` stacks full `NextUpCard`s.
Waiting layers peek `Deck.peek` (10pt) below the lead and sit `Deck.inset`
(8pt) narrower per side via centre-origin scale + translate. At most
`Deck.layers` (3) draw; a `StepDots variant="dot"` row under the stack
carries the full count. The stack's height is FIXED at the tallest card plus
the peeks once measured — the body below never reflows, mid-swipe included.

**⚠⚠ Deck cards are OPAQUE (`NextUpCard surface="opaque"`, a solid `card`
base) — glass cannot stack, and three iterations proved it.** (1) Full cards
dimmed by a scrim behind the liquid-glass lead: the under-card's text
GHOSTED through the blur, kickoff double-exposed over the lead's. (2)
Featureless shells instead: even those GLOWED through the glass, smearing a
light band across the head row that made the venue illegible — and cutting
them down to slivers left near-black peeks that read as a pasted slab (Ed:
"the stacking looks a little off… I'm fine with removing transparency from
this card only"). (3) The answer is the surface, not the layers: an opaque
lead hides everything behind it completely, so the waiting cards are simply
VISIBLE — real cards dimmed by a black scrim (`Deck.scrimNext`/`scrimBack`,
0.42/0.69, landing the 0.45 accent ring at ≈0.26/≈0.14) that fades off the
next card as the drag reveals it. That is the approved mock's exact look.
The SINGLE card keeps ADR 0096's liquid glass — nothing sits behind it, so
the reason for glass still holds there and only there. On the opaque base
the club wash returns to the full 0087 alphas (`ClubWash2.edge`/`mid`) —
the whisper existed only because a tint over a translucent shell
double-blends.

**The opaque ground is the crown, BAKED (`DeckGround`).** `card`'s flat
charcoal read as a black slab on the bright band ("waay too dark" — Ed);
what made the glass card right was the crown's green showing through it,
and the deck card sits at a FIXED place in the crown, so a vertical ramp
echoing the gradient behind it holds at every scroll position. Stops are
calibrated against the glass card's rendered colours on the simulator, not
derived from `CrownGrad` — re-measure before moving one. The livelier top
killed `textFaint` for the venue, so the opaque variant takes `washInk` for
it — ADR 0068's ink, whose reason (legibility over a full-alpha wash)
returned with the full wash.

**Every card stays MOUNTED, hidden layers at opacity 0 — never strips, never
unmounted.** A card's own `Countdown` is the only observer of its kickoff
(ADR 0052/0078, traps 21/35): a hidden card whose match kicks off must still
fire `onKickoff` so the crown hands over to the kicked-off/live tiers. Every
deck card carries the screen's ONE `onKickoff` (bump + finished/recent/live
refetch, never `upcoming`) — the contract survives verbatim, and duplicate
fires from same-second kickoffs dedupe in react-query. Cost: one wall-second
tick per card, each re-rendering only its own countdown row; the gallery draws
a five-card deck to keep that honest (trap 56).

**Reset by remount, not by effect.** The screen keys the deck on
`` `${zone}:${ids}` `` — any membership or zone change remounts it with the
soonest back on top. A shuffle is a peek, not a preference; nothing persists,
no effect writes state (the screen's six-lint-errors rule).

**The gesture** — the app's first inside a scroll view.
`Gesture.Pan().activeOffsetX(±10).failOffsetY(±8)` (`Deck.activateX/failY`):
the pan FAILS at 8pt of vertical travel before it can activate at 10pt of
horizontal, so a mostly-vertical drag falls through to the scaffold's plain RN
`ScrollView` and the crown still scrolls away. The top card follows the finger
with a ±`Deck.tiltDeg` (4°) tilt; the next card rises to full pose as its
scrim fades over the commit distance. Release commits past
`Deck.commitFraction` (0.4) of the card's width or a `Deck.flickVelocity`
(800pt/s) flick, in either direction, wrap-around; otherwise it springs back.

**Depth runs on the UI thread.** Visual depth is computed in the worklets from
a `topSV` shared value; `commitTop` writes `topSV`, clears the drag and sets
the React `top` state in one JS task, so the swap lands in one UI batch — no
frame where the old top snaps back to centre. React's `top` feeds only the
dots and the VoiceOver label. A forward
commit is fully continuous (the riser is at full pose and opacity when the
depths swap; the old top pops straight onto its peek). Only a BACKWARD
shuffle in a deck of three-plus fades a card in over `Motion.quick` — the
back card taking centre stage; anything landing in a PEEK appears
INSTANTLY, because a fade there read as the below card arriving late (Ed).
The commit itself also lands promptly: the exit spring carries
`Deck.exitRest`'s loose rest thresholds, so the swap fires the moment the
card is effectively off-screen instead of a settle-tail later — the
spring-back keeps the tight defaults, where a 24pt rest would stop the card
visibly short of home.

**The app's first spring.** `Deck.spring` (damping 18, stiffness 180, mass 1)
— Ed chose spring-from-day-one over `withTiming`. It lives on `Deck`, not
`Motion`, whose contract is "durations, in milliseconds". Tuned calm (the
`orbit` lesson). Under `useReducedMotion` every spring becomes an assignment
and the commit is instant — the segmented control's rule (ADR 0081); the
finger-tracking itself stays, being direct manipulation, not an animation.

**Haptic.** `hapticShuffle()` (`.light`) on commit only — Ed's call. The same
weight as an XI token placing: a small object landing where the finger sent
it. Never on a spring-back.

**Accessibility.** The deck is ONE VoiceOver stop like the single card's
pairing; the label carries what collapsing hides — the pairing, the kickoff
(or the TBD note) and `copy.today.deckOf(n, total)`. `accessibilityActions`
increment/decrement (`deckNext`/`deckPrevious`) shuffle without the gesture.
The dots stay decorative, as `StepDots` always was.

**Answering 0070.** (1) Nothing the reader NEEDS hides behind the gesture:
the top card is always the soonest kickoff — the right default and exactly
what the screen showed before — and the waiting cards disclose themselves
structurally (peeks + counted dots). The gesture reveals a peek, not buried
content. (2) "The app has no snapping carousel" expired with ADR 0065's
gesture-handler landing; and this is deliberately a wrap-around DECK, not a
snapping pager — a pager's edge model has no honest wrap and hides count.

## Consequences

- `nextUpDeck` is harness-proven: **9 assertions** (same-day merge + order,
  the zone changing membership across a midnight straddle, TBD/confirmed
  never mixing in either direction, all-TBD merging, single, empty).
- New theme exports: `Deck` (geometry, scrims, gesture thresholds, exit
  overshoot, spring) and `DeckGround` (the baked crown ramp) — no literal in
  the organism. `StepDots` gains
  `variant="dot"` (active = 6pt accent dot; onboarding's bar untouched).
  `copy.today` gains `deckOf`/`deckNext`/`deckPrevious` in both languages.
- There is NO shadow, at rest or in flight. The mock's "lifted shadow" was
  tried as a static plate on the lead and dropped: through translucent glass
  a shadow reads as murk, and animating shadow props breaks the
  transform-and-opacity rule. The tilt and the motion carry the lift.
- ⚠ The commit exit flies to `Deck.exitFactor` (1.25×) of the card width —
  at exactly one width the tilted card's corner hung at the screen edge for
  the spring's settle tail, until the `runOnJS` commit landed (Ed caught
  it). The overshoot keeps the whole tail off-screen.
- ⚠ The glass-ghosting rule generalises: nothing with legible content may sit
  directly behind a liquid-glass card — the blur ghosts it through. Anything
  layered under glass must be featureless.
- A live match still outranks the whole payload; the kicked-off handover
  needed no new code — a hidden card's countdown fires, `upcomingMine` drops
  the fixture on the bump, the key remounts the deck, `kickedOff` takes the
  crown.
- One-time height settle at mount if a WAITING card is taller than the lead
  (possible in the all-TBD deck) — accepted; the fixed height takes over on
  first measure, before any interaction.
- Gallery: `?only=next-deck` renders 2/3/5-card and all-TBD decks at rest —
  three stacked `WashGradient` sets proving `useId` isolation (trap 40), the
  cap drawn (trap 56). All four verified on the simulator (2026-09-04), plus
  the `?only=next` single-card regression. ⚠ The simulator cannot script a
  swipe (HANDOFF): the
  gesture itself is a by-hand pass — both directions, wrap at both ends,
  flick, spring-back, a mostly-vertical drag starting ON the deck scrolling
  the page, Reduce Motion, VoiceOver actions.
- ⚠ Tilting a `GlassView` (the drag's rotation) is unproven on device — check
  the liquid-glass path AND the flat `glassFill` fallback on the first
  device pass.

## Alternatives considered

- **A horizontal pager (ScrollView `pagingEnabled` / snap points)** — the
  ClubRail precedent, no gesture arbitration to write. Rejected: a pager lays
  cards side by side, so nothing peeks, the crown's height gains nothing, and
  wrap-around is dishonest at the edges. The deck IS the design.
- **Only the top card mounted, strips behind** — cheaper, and wrong: a strip
  has no `Countdown`, so a hidden card's kickoff would go unobserved and the
  crown would hold a match that had already started (the exact failure ADRs
  0066/0078 exist to prevent).
- **Keeping the deck's cards GLASS** — tried twice (scrimmed cards, then
  featureless shells/slivers) and both failed on device; see Decision. The
  glass had to go from the deck, not the layers from behind the glass.
- **Deck order as state that survives data changes** — rejected; a preserved
  order must be reconciled against every membership change, and "the soonest
  on top" is the only defensible default anyway. Remount-on-key is the reset
  that needs no effect.
- **`withTiming` commit (no spring)** — zero new motion vocabulary; offered
  first, Ed picked the spring.
- **The onboarding bar as the active dot** — offered; Ed picked round dots
  per the mock. A bar under a swipeable card read as a control.
- **A "N today" counter in the card's head row** — rejected in the mock
  round: the head row belongs to the card (its label and venue), and the
  count is the deck's fact, not any one card's.
