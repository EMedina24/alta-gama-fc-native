# 0162 — The league rail becomes a liquid-glass dropdown

- **Date:** 2026-09-13
- **Status:** **Superseded IN PART by [0163](./0163-the-dropdown-leaves-the-crown-and-leaves-glass.md)** (2026-09-13) — the dropdown, its placement logic and its catalogue arithmetic all stand. Its glass PANEL, its crown LIFT and its height animation do not: they produced four close artifacts in one day, and 0163 records why they could not be patched. ⚠ Read both; this entry is still where the control's shape is argued.
  drop directions, a commit, a cancel, and the lingering-bar regression Ed caught and its
  fix — and the two divergences behind the SECOND report of it (a 1.4s-late measurement
  re-opening the menu, and a hand-paired crown lift). ⚠ Not yet seen on a phone, and not on
  an SE, where the upward flip is the common case rather than the rare one.
- **Decided by:** Ed ("the league selector is getting crowded — can we implement some sort
  of fancy liquid glass dropdown"); full replacement and a naming trigger chosen over a
  hybrid rail-plus-overflow
- **Supersedes:** [0117](./0117-league-rail-liquid-plate-slide.md) · [0118](./0118-league-rail-static-and-plate-drags.md) ·
  [0119](./0119-league-plate-takes-the-navs-material.md) · [0120](./0120-league-rail-is-glass-untinted.md) ·
  [0121](./0121-league-plate-is-the-lens.md) · [0122](./0122-league-plate-two-states-lens-under-finger.md) ·
  [0123](./0123-league-marks-full-colour-at-rest.md) · [0124](./0124-league-rail-hovers-under-the-held-lens.md) ·
  [0153](./0153-sixth-chip-shrinks-the-crown-mark.md) · [0160](./0160-a-seventh-chip-shrinks-the-mark-again.md)
- **Amends:** [0031](./0031-league-filter-tiles-are-artwork-only.md) — the control names the
  competition again · [0116](./0116-crown-league-chips-larger-cut.md) — the 52pt crown
  height survives as the TRIGGER's height
- **Keeps:** [0090](./0090-clubs-bubbles-liquid-glass-and-trays.md)/[0091](./0091-club-page-hero-and-trays.md) (the
  panel is a tray) · [0113](./0113-same-day-next-up-deck.md)'s trap-59 rule ·
  [0133](./0133-ucl-lockup-replaces-the-spelled-name.md) (a drawn lockup outranks a wire logo)

## Context

[0160](./0160-a-seventh-chip-shrinks-the-mark-again.md) shrank the crown mark to 38×19 for a
seventh chip and said, in as many words, that there was no lever left:

> An eighth chip has no lever left and should not get one. At eight, 375pt gives 40.4pt a
> slot and the honest answers are a scrolling rail (reversing 0118) or a second control.

The rail's cost per league is structural, not cosmetic. Every slot is an equal share of one
fixed gutter, so each new competition takes width from all the others, and the app has added
three in a month — the Champions League (0150), Liga Hondubet (0159), LPR. Three mark cuts
already existed to absorb that, each one device-judged, each one smaller.

Ed asked for the second control.

## Decision

**`LeagueSwitch` is deleted. `LeagueMenu` replaces it on all three screens** — Matchdays and
Table on the crown, Clubs on the body — with the same props, so the call sites are a rename
plus a `copy` prop.

1. **A trigger capsule that NAMES the competition.** Artwork at the full
   `leagueChipMarkWCrown` (54×27) — bigger than the rail has drawn since five leagues — then
   the league's own name, then a chevron. The crown keeps `leagueChipHCrown` (52); the body
   gets `leagueMenuTriggerH` (44, which is `minTouch` exactly, where 0089's ground chip was
   36 and leaned on hitSlop).
2. **A panel that blooms out of it**, one row per competition: mark, name, and a check on
   the one in view. It is **placed by measurement** — down if the rows fit above the tab
   bar, up otherwise, and scrolling if neither side can hold them.
3. **The slot arithmetic retires with the rail.** `leagueChipMarkWCrownTight`/`...Tighter`,
   `leagueRailTightFrom`/`TighterFrom`, `leagueRailPad` and `leagueChipH` are deleted.
   0153 and 0160 keep the derivations if a rail is ever wanted back.
4. **0031's text branch is deleted, not kept.** It existed so a league with no artwork was
   not an unpickable blank chip, and 0160 records it breaking `Liga Hondubet` mid-word
   across three lines at 46pt. Every row now carries the name beside the artwork, so a
   league with no logo reads perfectly and the branch has nothing left to do.

### Where the glass is, and why it is only there

The panel hangs over a standings table, which puts it squarely inside trap 59: *a glass
surface refracts only the screen's own ground; anything layered behind it ghosts through.*
So the panel is the double-bezel **tray** (0090/0091) — a `GlassView` shell with an opaque
`trayInner` surface `Size.trayPad` inside it. The glass that can be seen is the rim.

⚠⚠ **The first build then put a `GlassView` lozenge on the selected row and it rendered as
nothing.** The reasoning had been that it would ride the panel's inner the way 0119's plate
rode the rail's capsule — but that capsule is itself glass over the live screen, so the
plate had a real backdrop to bend. An opaque slab has none. **Glass over an opaque fill is a
no-op, not a subtle effect.** With trap 59 that fully boxes this panel in: it may not be
transparent, and glass on top of it cannot be seen. The lozenge is paint — the segmented
thumb's `segThumb` fill with the app's hairline.

What remains genuinely liquid is the trigger and the panel's shell, each refracting the
screen's own ground.

⚠⚠ **The `GlassContainer` that used to hold both is GONE, and that reversal is the third
thing the simulator taught.** The point of it was `UIGlassContainerEffect`: the two surfaces
would merge while they overlapped and pull apart as the panel travelled, which is the liquid
in liquid glass. What it delivered was nothing at rest — they sit 12pt apart, past the merge
distance — a brief blob on the way open, and on the way CLOSED a pair of dark tapered
**wings** flaring off the trigger's bottom corners as the shrinking panel was dragged back
into it. Ed caught those on the third report. The overlap that caused them was
`leagueMenuTuck`, i.e. mine, so the artifact was self-inflicted and the effect it paid for
was invisible in the state the control spends its life in. Both the tuck and `Glide.merge`
are deleted; the panel simply grows from zero height at its resting gap. ⚠ Removing the
container also deleted the `stack` box and the trigger's compensating margin, which existed
only to keep everything inside a `UIVisualEffectView`'s bounds — about twenty lines of
geometry that served the effect rather than the control.

### A pick dismisses at once; only a cancel animates

⚠⚠ **The collapse animates the panel's HEIGHT, which is a layout prop — and
choosing a league is the exact moment the screen does its heaviest work.** New
query, new standings, a whole list re-rendered. The two compete, and the panel
stalls part-collapsed: a black bar left hanging under the trigger long after the
new league is on screen. Ed caught it on a screenshot within minutes of the first
build; the spring's completion callback took **762ms** to reach JS against a
spring that settles in ~300.

So a pick unmounts the panel in the **same commit** that switches the league —
there is nothing left to stall — while a cancel (the scrim, or the trigger
again) keeps the animated close, because a cancel does no work. Re-picking the
league already in view is a cancel wearing a row's clothes and takes that path
too. ⚠ The trigger's new artwork and name are the receipt; the animation was
never what confirmed the choice.

⚠ The first fix attempt was to keep the animation and unmount from the spring's
callback — which is what produced the 762ms measurement and proved it was the
layout commit, not the callback, that was late.

⚠⚠ **And that was still not enough, because the panel's DISAPPEARANCE was gated
on a React commit.** Ed hit the same black bar again, this time on a plain
cancel. The panel collapsed to a `leagueMenuShutH: 24` floor — put there so the
glass was "never born out of nothing" — and then SAT there, visible, until React
unmounted it. The panel now interpolates from **0** and clamps there, so the
spring ending and the panel vanishing are the same instant and the commit only
does cleanup. The floor token is deleted. **Anything whose visibility depends on
a React commit landing promptly will linger; animate to a state that is already
invisible.**

⚠⚠ **A zero-height panel is still not an invisible one.** Ed reported a remnant a
third time: a faint hairline under the trigger after the close. At height 0 the
`GlassView` shell still draws its rim, and the flat branch is worse — a 1pt
border on a 0-height box is a 2pt line. The panel now **clips itself**
(`overflow: 'hidden'`), which makes both impossible at every height with no state
to get out of step. ⚠ That deliberately contradicts a comment on the old rail
asserting "only the GLASS must never sit under `overflow: 'hidden'`" — a
generalisation of 0122, whose actual finding was narrower: a clip cropped the
LENS's press SWELL, which grew past its own bounds. Nothing here swells, and the
glass was checked under the clip on the simulator. The narrow rule is the true
one.

### Two more ways it diverged, both now impossible by construction

⚠⚠ **A `measureInWindow` callback outlived the interaction that asked for it.**
The open measures the trigger in a callback, and that callback was seen landing
**1.4 seconds** late on a busy screen — long after the reader had closed the
menu, at which point it dutifully re-opened it. What was left on screen was a
stuck bar and a hazed crown with no menu in sight. Every open now takes a ticket
(`openId`) and every close and pick voids it; a stale measurement returns
without touching anything.

⚠⚠ **The crown lift was raised and lowered BY HAND at the two ends, and the two
ends diverged.** When the stale open re-mounted the panel, the paired
`lift(false)` had already run and the crown sat lifted over nothing — the
matchday chips hazing under a veil. The lift is now **derived from `mounted`**
in an effect, with a cleanup for the screen unmounting mid-open. The scrim is
gated on that same `mounted`, so the lift and the thing that hides what it does
are one condition rather than two that have to agree.

### The crown lift, which is the subtle part

A crown payload cannot draw over the screen body on its own: the body is the crown's
**sibling**, and a z-index on a child never raises it past its parent's siblings. So the
crown itself rises — through `useCrownLift`, a context `ScreenScaffold` provides and the menu
consumes.

⚠⚠ **It must be temporary, and the first cut was not.** The crown's gradient is a
fixed-height LAYER that is deliberately taller than the crown and runs on behind the body
(0094/0095). Lift the crown permanently and that overflow paints **on** the body: the Table's
band legend and first two rows went hazy, measurably, in the screenshot A/B. The lift is
therefore held for exactly as long as the menu's own scrim — which is what hides the veil —
and the scrim reads the same spring as the panel, so the two can never end on different
frames. A body-tone control (Clubs) needs none of this and asks for none.

## Consequences

- **The control stops scaling with the catalogue.** An eighth league is one more 46pt row,
  not another division of a fixed gutter, and the artwork never shrinks again. This is the
  whole trade; what it costs is a tap.
- **Everything 0117–0124 built is gone**: the gliding plate, the drag-to-snap pan, the
  clear interactive lens, its composed magnifier, the hover inflate. That is ~780 lines and
  four device-judged calibrations retired in one change. ⚠ They are in git, and their ADRs
  keep the findings — 0122's three glass rules are load-bearing for the new control and are
  restated at the top of `league-menu.tsx`.
- **One-tap switching between two leagues is gone.** A reader flipping LaLiga ↔ Premier now
  taps twice. That is the honest cost of the second control and the reason the hybrid
  (short rail + overflow menu) was on the table; Ed chose the single idiom.
- ⚠ **`active` must still be the screen's STATE, not a slug read off a derived object.**
  The failure changes shape rather than going away: under the rail a `find(...) ?? [0]`
  fallback drew the wrong chip as selected AND made the right one unpressable (0157);
  under the dropdown there is no early-returning chip, but the trigger would simply *name
  the wrong competition* — quieter, and worse. Matchdays' comment on that line stays.
- ⚠ **Two placement numbers are estimates, not measurements.** The floor is
  `window.height − BottomTabInset`, because `NativeTabs` draws the real bar and JS cannot
  measure it; the ceiling is `insets.top + Spacing.two`. If a panel ever tucks under the bar
  or the notch, those two lines are where to look.
- ⚠ **The liquid-glass MERGE is the one part of the brief that did not survive contact
  with the device.** Everything else Ed asked for is there — the glass trigger, the
  glass-shelled panel, the bloom — but a container that fuses two glass surfaces has to look
  right in *every* frame of the close, and it did not. If it is ever wanted back, the close
  is the case to solve first, not the open.
- ⚠ **Anything else that animates a layout prop on this control will hit the same
  wall.** The open can afford it (nothing heavy happens when a menu appears); the
  close, on the one path that triggers a screenful of work, cannot. A future
  "fancier" dismissal has to be transform- or opacity-only — and on glass it can
  be neither (0122), which is why the answer here was to remove the animation
  rather than to change it.
- ⚠ The panel's rows always live in a `ScrollView`, scrolling only when capped. Clipping the
  overflow instead would be a silent truncation — a menu that looks complete and is missing
  its last leagues.
- `LeaguePills` (onboarding) survives untouched and is no longer the odd one out for naming
  its leagues. It stays because a first-run picker wants every option on screen at once,
  which is the one thing a dropdown will not do.
- The `_debug` gallery still has no league case, for the reason it never had one, plus a new
  one: an absolutely-positioned panel would hang over the next `Case`.

## Alternatives considered

- **Hybrid — a rail of 3–4 followed leagues plus an overflow menu.** Keeps one-tap switching
  for the common case and stops the rail growing. Rejected by Ed: two controls and two ways
  to pick the same thing, which is the shape 0153's consequences section warns about.
- **Dropdown on the crown only, rail on Clubs.** Smallest blast radius, and the same
  question answered two ways in one app. Rejected for the same reason.
- **Let the rail scroll past seven**, reversing 0118. The plate's drag-to-snap is built on
  every slot being measured and on screen; Ed declined this at six, at seven, and here.
- **A `Modal` for the panel** rather than an in-tree overlay. It would have solved z-order
  and the scrim for free, but glass inside a presented view controller is exactly the kind
  of compositing question that has cost this repo several findings already, and an in-tree
  panel needs no portal. ⚠ It was also rejected because a `Modal` cannot share a
  `GlassContainer` with the trigger — which stopped being a reason when the container was
  removed, so a modal is a legitimate option again if this ever needs one.
- **A transparent glass panel over a heavy scrim.** Reopens trap 59 by construction: the
  scrim dims what is behind the glass, it does not stop it ghosting through.
