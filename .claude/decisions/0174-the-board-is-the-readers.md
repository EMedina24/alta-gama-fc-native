# 0174 — The Board is the reader's: an edit mode for the home screen

- **Date:** 2026-09-14
- **Status:** Accepted — simulator-verified on an iPhone 17 Pro against production
  (enter/exit, drag reorder, remove → tray → add-back into the remembered slot,
  reset, and persistence across a cold relaunch); EN **and** ES re-measured at a
  335pt clamp three times — the clamp changed the copy once, Ed's weight pass
  changed it again, and the row rebuild (§9) changed what is on a row at all. **Reduce Motion verified** on both paths it touches: the DONE
  halo holds still at full strength and a drag still reorders. ⚠ VoiceOver's move
  actions and the edge auto-scroll are **not** yet checked by hand.
- **Decided by:** Ed, from `handoff_edit-homescreen/` — *"the Board is the user's,
  not ours"*. Three calls made before building: the crown lead stays **pinned**,
  `table`/`season` are a **follow-up**, and the drag lifts on a **short hold**
  rather than on pointer-down. Two more off the first build, both on finding the
  mode's chrome: more weight and no caption for the remove control, then *"give
  this an attention grabbing border along with the DONE button. The DONE button
  should pulse"* (§13, §18). And one on the ROWS — *"this still looks off"* — which
  ended with the handoff's veiled card measured and dropped (§9).
- **Amends:** [0063](./0063-next-up-leads-the-board.md) — its editorial order
  becomes the DEFAULT rather than the rule.
- **Follows:** [0088](./0088-live-match-is-the-crown-payload.md) /
  [0095](./0095-next-up-joins-the-crown.md) (the crown owns the lead card),
  [0166](./0166-the-preferences-comparator-walks-its-own-keys.md) (array fields
  in the store), [0013](./0013-atomic-design-components.md).

## Context

[0063](./0063-next-up-leads-the-board.md) fixed the Board's order editorially —
lead card, last result, news, finished today, rest of the round, counters — and
explicitly rejected letting the reader decide. `handoff_edit-homescreen/`
reverses that. Nothing in the screen carried a card IDENTITY: the sections were a
hardcoded JSX sequence, so there was nothing to order, hide or store.

## Decision

1. **A card catalogue, in a pure module.** `lib/board-layout.ts` holds
   `BOARD_CARDS`, the default order and hidden set, and the rules over a stored
   layout. No native import, so `scripts/board-layout-harness.mjs` runs it in
   plain node — the repo's rule for logic worth pinning.

2. **⚠⚠ `normalizeLayout` grows a stored layout to fit the build.** Unknown ids
   are dropped; ids the stored order has never heard of are INSERTED after their
   nearest surviving `DEFAULT_ORDER` predecessor, taking their own
   `defaultHidden`. Without that second half a card added in a later release
   would be invisible **forever** to everyone who had already arranged their
   board — the layout would pin the catalogue it was written against. This is the
   harness's main subject.

3. **`applyVisibleOrder` is the join between what is dragged and what is
   stored.** Rows are only the visible, eligible cards; the store holds the whole
   catalogue's order. A drag rewrites only the slots those rows occupied, so a
   hidden card keeps its absolute position — which is what makes "add it back"
   return it **where it was** rather than somewhere plausible.

4. **`bdOrder` / `bdHidden` on `preferences.ts`; `SCHEMA_VERSION` 6 → 7.** One
   small fixed record, so it belongs in the existing store rather than a sibling.
   ⚠ `FOLLOWED_RULE_VERSION` does not move. ⚠⚠ Both are arrays and therefore both
   carry a `DEEP_EQUAL` comparator ([0166](./0166-the-preferences-comparator-walks-its-own-keys.md));
   the comparison is ELEMENT-WISE, because for a layout the order IS the value —
   a comparator that only counted ids would call a reordered board unchanged and
   leave every drag dead on screen. `scripts/preferences-harness.mjs` asserts
   exactly that.

5. **⚠ The order is persisted on RELEASE, not per swap** — a deliberate
   divergence from the handoff's "the order is committed as it happens". Every
   `commit()` serialises the whole preferences record, `savedStories` and all
   (tens of KB), so a drag crossing four neighbours would be four of those
   writes. The reorder is live in a shared value while the finger is down.

6. **⚠⚠ The crown lead is PINNED, so the catalogue has SEVEN cards, not the
   handoff's eight.** Live and NEXT UP are the crown's payload (0088/0095), not
   body cards: the match being played is the reason the screen exists on a
   matchday and is not the reader's to move. The handoff's `next` card is
   dropped. `table` and `season` ship **declared but unbuilt** (`built: false`) —
   held in the stored order so that building them later is a one-flag change that
   resets nobody's arrangement, and filtered out of the stack, the tray **and the
   count**: a total naming two cards that appear nowhere is a number with nothing
   behind it, so the bar reads `5 OF 5 ON`.

7. **The screen builds a `cards` map and `BoardStack` renders it.** Every
   derivation in `(tabs)/index.tsx` stays exactly where it was; only the render
   changed. ⚠ A `null` card means "nothing to draw today", never "put away": an
   ineligible card is absent from the stack AND from the editor's rows, because a
   slot that is not on screen cannot be dragged to. ⚠ Each section is wrapped in a
   `gap: Spacing.four` box — the scaffold's body already has that gap, so
   FINISHED TODAY (three siblings) spaces exactly as it did and view mode is
   pixel-identical. The wrapper must never clip: every `-Spacing.five` bleed in
   the fixture rows depends on it.

8. **⚠⚠ The drag lifts on a 150 ms hold on the handle** — Ed's call over the
   handoff's §4 pointer-down. A pan that activates the instant a 34pt target is
   touched must win a race against the scroll view on every touch-down; a hold
   wins it outright and makes a mis-grab mid-scroll impossible. `hapticLift` is
   the accommodation for the delay, or the reader learns the hold by failing at
   it. The row body is not a drag target and scrolls the page.

9. **⚠⚠ A row is a NAME and a SUMMARY LINE — the handoff's veiled card is built,
   measured and deliberately NOT shipped.** The design draws the live card inside
   the row, clipped to its height under a scrim. We built exactly that, Ed called
   the rows wrong twice (*"these are a bit too transparent"*, then *"this still
   looks off"*), and the second report is what forced the measurement that
   settled it. Ghost contrast above the row's own ground, on the News row:

   | | contrast |
   | --- | --- |
   | `handoff_edit-homescreen/shot-edit.png` | **9 levels** |
   | our first build (scrim 0.93) | 15 levels |
   | our last build (scrim 0.985) | **4 levels** |

   We were already more than twice as faint as the thing we were copying and it
   still read wrong — so the defect was never how MUCH showed, and no third
   opacity would have found it. It was **what**: a fixed window onto a card of
   some other height lands mid-sentence (Ed's screenshot cut `inicio defensivo en
   Primera` through its x-height), and every section opens with its own
   `SectionHeader`, so the row printed its name twice — once ghosted at the top,
   once solid across the middle. Neither is an opacity problem.

   So the row is a plate: the card's name over a line saying what it is holding —
   `3 stories`, `3 matches`, `4 clubs`. ⚠ That line is the better answer on its
   own merits: it is what the reader wants at the moment they are deciding
   whether to take a card off. It cost **no new copy** — `phrases.stories` /
   `matches` / `clubs` are the counted phrases the rest of the app already uses,
   so Spanish agreement was solved before we got here — and no new query: every
   number was already on the screen. ⚠ LAST RESULT has no count and takes the
   card's own meta line (the date) instead; a fabricated `1 match` there would be
   a number pretending to be information.

   ⚠ **`rowHeight` drops 104 → 72 with the slice.** That number existed to hold
   the card; a name over a summary needs 72, and seven cards at 114 apiece were
   most of why a drag needed edge auto-scroll at all.

   ⚠ **Judge anything in this range by MEASUREMENT, never by a screenshot.** Every
   viewer in the chain lifts shadows: the 0.97 pass looked unchanged on screen and
   measurably was not, and the design's own rows look far fainter than they are.

   ⚠ The rows are still uniform and absolutely positioned, which is what makes the
   swap pure arithmetic — `round(y / slot)` with a half-slot + `swapBias`
   hysteresis (at exactly half, a row on the boundary swaps back and forth on
   sub-pixel jitter) — and the handoff's "measure every height at drag start" is
   still not needed. ⚠ The cards are no longer RENDERED in edit mode, but the
   screen still BUILDS them: a null node is how eligibility is decided (§7).
   Creating elements is cheap; mounting is what we avoid.

10. **⚠⚠ A drop commits only a sequence of exactly the rows on screen NOW.** The
    stack is seeded at the lift and the board can change under a finger that is
    still down — a kickoff takes LAST RESULT away, a refetch brings a card back.
    Committing a sequence for a membership that no longer exists would fold a
    card into the wrong slot, silently and permanently.

11. **The gesture is built in `BoardStack`, not in the row.** A child mutating
    shared values it reached through its own props is what
    `react-hooks/immutability` rejects, and the rule is right: the writer and the
    values belong together. `EditRow` reads them and takes the gesture as a prop.
    ⚠ A row at rest takes its position from the PROPS' index and consults the
    shared order only while a finger is down — that removes the effect that would
    otherwise copy one into the other, and with it trap 72's shape.

12. **⚠⚠ VoiceOver cannot drag**, so every row carries `Move up` / `Move down`
    accessibility actions — the `CardDeck` shuffle-action precedent (0126). Under
    Reduce Motion the lifted row still follows the finger (direct manipulation
    stays, 0113's rule) and the neighbours step aside without the spring.

13. **⚠⚠ The hint bar names ONE action, and says it loudly.** Ed, on the first
    build: *"give this a bit more importance so the user recognizes it and sees
    it quicker"* and *"remove the '− to remove', that's a given already within
    the UI"*. Both notes point the same way. **Removal is unsaid**: every row
    carries a red `−` disc in the position iOS has used for exactly that since
    the first editable list, and captioning it spent the bar's whole width
    teaching what the control already says. What that width bought is
    **weight** — a near-opaque ground (0.5 → 0.92 alpha, where the lime had been
    reading straight through), `bodyStrong` ink over `caption`, a full `eyebrow`
    count in `textSecondary` over a dim `eyebrowSm`, and two more points of
    height. It reads as a sibling of the DONE pill now rather than as a caption
    on the band.

    ⚠ The two halves still share one row, and the handoff's original wording
    truncated mid-sentence at a 335pt clamp — a 375pt device's content width — in
    **English as well as Spanish**; the count lost the word the number implies at
    the same time (`5 OF 5 ON` → `5 OF 5`, `5 DE 5 ACTIVAS` → `5 DE 5`). The copy
    has room to spare now. Re-word either half and re-measure at that clamp; a
    402pt simulator will not show you the problem. ⚠ The hint is the elastic half
    and the count takes `flex: 0` — a fixed-width thing given a flex share is
    trap 56.

14. **Chrome, and what it reuses.** `ChipButton` gains a `crown` tone — an OPAQUE
    dark capsule with a lime label, the flat half of the league trigger's own
    shell, because a transparent chip on the bright band shows lime through
    itself and its lime label disappears. ⚠ The payload is `lead` ALONE unless
    editing, never a fragment around it: `Crown` collapses its bottom padding
    when it has NO payload, which is Today's idle state, and a fragment is always
    truthy. ⚠ The hint bar rides inside the crown above the pinned lead card and
    needs no crown API — `Crown.inner` already gaps its children; never by
    raising the crown over the body (trap 70). ⚠ Pull-to-refresh is off while
    editing. Two new drawn glyph atoms (`MinusGlyph`, `HandleGlyph`) — there is
    no icon set. ⚠ The tray's `+` passes `color="onAccent"`: `PlusGlyph`'s default
    IS the lime, and on a lime disc it drew nothing (caught on the simulator).

15. **⚠ `ScreenScaffold` gains `scrollRef` / `onScrollY` / `scrollEnabled`** for
    the edge auto-scroll — seven rows at 114pt do not fit under a crown carrying
    a live plate, so a drag that cannot scroll cannot reach the top of the stack
    from the bottom of it. A PLAIN ref and a JS `scrollTo` loop, deliberately:
    making it an `Animated.ScrollView` for a worklet `scrollTo` would put an
    animated ancestor over every screen in the app for one screen's benefit, and
    an animated ancestor has already cost the tab bar its glass rail once (trap
    64). ⚠ The lifted row's offset takes the accumulated scroll, or the content
    slides out from under a finger that has not moved.

16. **⚠ No backdrop blur.** The design asks for a 3pt blur under a 93 %-opaque
    scrim, where it is invisible; `expo-blur` is not installed and glass here
    would cost the whole of traps 59/69/74 for nothing. Flat fill — ADR 0129's
    conclusion for the reel, reached again. ⚠ The lifted row DOES take a shadow,
    against SPEC §2's "there are no shadows in the app": a card held off the page
    is the one case where depth is literal, and it is the design's own call.

17. **Debug hooks.** `?boardEdit=1` on the Today route (`__DEV__` only) opens
    straight into edit mode — ⚠ DERIVED from the param, not copied into state by
    an initialiser, because the tab is already mounted when the deep link arrives,
    which is exactly the case the hook exists for; DONE clears the param.
    `_debug/reset-board` is a BUTTON screen rather than `skip-onboarding`'s
    effect-on-mount: writing from an effect is a lint error this repo carries
    several of, and a deep link that silently wiped an arrangement mid-check would
    be its own bug.

18. **⚠⚠ The mode wears a LIME RING, and the way out of it BREATHES.** Ed:
    *"give this an attention grabbing border along with the DONE button. The DONE
    button should pulse."* Both pieces of chrome that belong to the MODE rather
    than to the board — the hint bar and the DONE pill — take a full point of
    `accent`, at opposite ends of the crown, so the mode announces itself as one
    object. ⚠ A full point, not the 0.5pt glass hairline: `chip-button.tsx`
    already records that a 0.33pt lime ring vanishes against the mesh.

    The pill additionally carries a second ring outside the first, breathing —
    new `ChipButton pulse` and a new `Pulse` token group. ⚠⚠ **The halo never
    fades to zero** (`Pulse.dim`): the ring is the affordance and the breathing
    is only how it asks twice, so the dimmest frame must still ring the control.
    The justification for animating at all is that **edit mode has no other way
    out** — the avatar is stood down, this pill is the only control in the crown,
    and a reader who does not find it is stuck in a mode.

    ⚠⚠ **It is the app's THIRD looping animation**, after `skeleton.tsx` and the
    signed-out avatar's orbit — whose own docblock calls itself a sanctioned
    exception. What makes this one payable is that it is scoped to a TRANSIENT
    MODE and leaves with it; a fourth needs its own argument. ⚠ Reduce Motion
    holds the halo at full strength rather than hiding it (`avatar.tsx`'s rule for
    the orbit) — verified on the simulator, both rings static across frames.

    ⚠ **It spends the lime budget, and that was flagged before building.**
    SPEC §2 says *"if two things on a screen are lime, one is wrong"*, and edit
    mode now has the DONE label, two lime rings, a moving halo and the tray's add
    discs. Judged acceptable because none of it outlives the mode and none of it
    is on the board itself — the same call as 0157 and 0158. Ed's call.

## Consequences

- The Board's order is now a **preference**, so any future card must be added to
  `BOARD_CARDS` — a section added only to the screen will never render.
- `table` and `season` are owed. Until they are built the add tray is empty on a
  fresh install (`Every card is on your board.`) and fills the moment a card is
  removed; flipping `built: true` is the whole of the follow-up on this side.
- The handoff's `bd*` state names survive in `copy.board`'s keys only in spirit —
  the group name carries the prefix's meaning, so the keys are `edit`, `done`,
  `hint`, `count`, `addTitle`, `allOn`, `reset` plus the per-card `cards` map.
- ⚠ Not verified: Reduce Motion, VoiceOver's move actions, the edge auto-scroll
  under a finger, and a drag on a physical device.

## Alternatives considered

- **Make `next` editable (the handoff's eighth card).** Would reverse 0095 and
  collapse the crown on a quiet day. Rejected — Ed's call.
- **Build `table` and `season` now.** Rejected — Ed's call; they are default-off
  and would roughly a third the work for cards nobody has seen yet.
- **Pointer-down drag, per the handoff.** Rejected on contention: see §8.
- **A sibling store (`altagama:board`), like `starting-xi.ts`.** That store is
  unbounded and club-keyed; this is one small fixed record, and a sibling would
  add a third `hydrate*` to the root layout's gate for two arrays.
- **Extracting `upcoming` and `counters` into organisms.** Planned, then dropped:
  both are pure JSX the screen already owns, the `cards` map reads as a list
  either way, and the move would have been churn with no tier boundary crossed.
