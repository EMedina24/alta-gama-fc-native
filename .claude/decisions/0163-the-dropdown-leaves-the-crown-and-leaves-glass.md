# 0163 — The dropdown leaves the crown, and leaves glass

- **Date:** 2026-09-13
- **Status:** Accepted — simulator-verified on an iPhone 17 Pro: the close stepped frame by
  frame at ×10 through the new `/_debug/menu` harness and settling to a byte-identical
  closed profile, plus both tones on the real screens. ⚠ Not seen on a phone, and not on an
  SE.
- **Decided by:** Ed, after reporting the same close artifact three times — *"we're still
  running into issue when closing"*, then *"still some wings"*, then *"still a faint line…
  very quick but it's there. I had to screen record to get it in a screenshot."* He chose
  both moves: *"maybe we should move away from a glass surface to make things smoother"* and
  the scaffold overlay.
- **Supersedes in part:** [0162](./0162-the-league-rail-becomes-a-dropdown.md) — the dropdown
  stands; its glass panel, its crown lift and its height animation do not.
- **Amends:** [0122](./0122-league-plate-two-states-lens-under-finger.md) — its rules are
  reaffirmed, and the conclusion drawn is to stop putting glass where they bind.
- **Keeps:** [0094](./0094-crown-runs-to-the-top.md)/[0095](./0095-next-up-joins-the-crown.md)
  (the gradient layer stays inside `Crown`, untouched) · [0013](./0013-atomic-design-components.md)
  (the new context lives in `hooks/` for the tier rule) · trap 59

## Context

ADR 0162's dropdown shipped and Ed reported a visual artifact on **close** three times. Each
had a different cause, each was patched, and each patch revealed the next:

1. The collapse animated `height` — a layout prop — against the heaviest re-render the
   screen does, and stalled part-collapsed for ~760ms.
2. The panel collapsed to a `leagueMenuShutH: 24` floor and sat there, visible, until React
   unmounted it.
3. A `GlassContainer` merge flared "wings" off the trigger's corners as the shrinking panel
   was dragged into it.

After all three, something remained. The fourth diagnosis is the one that explains why
patching was never going to end:

**`Glide.spring` is `{damping: 26, stiffness: 340, mass: 1}` → ζ ≈ 0.705, underdamped.**

| t | `grow` | panel height | scrim opacity | crown lift |
| --- | --- | --- | --- | --- |
| 0 ms | 1 | full | 0.28 | **on** |
| ~180 ms | crosses 0 | 0 (clamped) | 0 (clamped) | **on** |
| ~350 ms | settles | 0 | 0 | released |

`shut()` — the unmount, and with it the crown-lift release — ran from the spring's
`finished` callback, which fires at **settle**, not at the zero crossing. Both animated
styles clamped at zero. So for **~150ms the crown was lifted with the scrim already fully
transparent**, and a lifted crown paints its over-tall gradient layer (`topInset +
CrownRamp` ≈ 494pt against a crown box of ~250pt) **on top of the screen body**. An
unmasked haze across the page — screen-wide, and gone before you could screenshot it.

Two structural facts made it unfixable by tuning:

1. **The crown lift is released by a React commit**, so *any* scrim fade leaves a window
   where the veil shows. Shortening the window changes the size of the bug, not whether it
   exists.
2. **The panel was a `GlassView`**, and 0122 forbids the two techniques that give a clean
   dismissal — a fractional alpha on a glass ancestor disables the effect view, a transform
   scale rasterises it. That is *why* the close animated `height`, and a height animation is
   what produced artifacts 1 and 2.

## Decision

**Two moves, and each removes a cause rather than a symptom.**

1. **The panel stops being glass.** It is one opaque `sheetGround` surface with the app's
   hairline — whose own token comment reads *"modal sheets — glass over a scrim reads
   muddy"*, which is exactly this case. The **trigger stays a `GlassView`**: it sits on the
   crown's own ground, which is the only place trap 59 permits glass anyway.
   ⚠ What was actually lost is a **5pt rim**. Trap 59 already forced the body opaque, so
   that rim was all the glass the panel ever had — while the glass *rules* governed the
   entire animation. The trade was always bad; it took three reports to see it.
2. **The scrim and panel leave the crown** for a render slot on `ScreenScaffold`,
   published through the new `useScreenOverlay` and painted over the `ScrollView`.
   `useCrownLift`, `Crown`'s `lifted` prop and its `zIndex` are deleted.

Off glass, opacity and scale are legal, so the motion becomes:

- `withTiming(…, { duration: Motion.quick })` both ways — **never a spring**. A timing curve
  ends where it ends, so the unmount fires on the frame the fade reaches 0.
- `opacity` 0↔1 and `scale` 0.96↔1, anchored at the trigger's edge.
- Both are UI-thread props, so a heavy re-render cannot stall them — which means **a pick
  animates again** like every other close, undoing the concession 0162 had to make.

## Consequences

- **Three whole classes of artifact are now impossible**, not patched: nothing animates a
  layout prop, nothing shrinks to a hairline, and nothing visible waits on a React commit.
- **The scrim finally blocks page scrolling.** It sat *inside* the `ScrollView` for as long
  as it lived in the crown, so a drag on it scrolled the page under the open menu.
- **`accessibilityViewIsModal` means something now.** On the panel inside `host` it hid the
  scrim and the trigger and nothing else — the standings stayed in the VoiceOver rotor. On
  the overlay root its siblings are the mesh and the scroll view, so the modality is real.
- **The panel's inner `ScrollView` left the page's**, so the nested-scroll gesture conflict
  in the capped case is gone.
- ⚠⚠ **The overlay provider must wrap the WHOLE screen, not just `payload`.** Clubs renders
  its control in `children`; a payload-only provider would leave it publishing into the
  default no-op and opening into nothing. That default now warns in `__DEV__`, because the
  symptom — a dead trigger — gives no hint of the cause.
- ⚠⚠ **The provider's `value` must stay the bare `useState` setter.** Context changes
  propagate *through* React's bail-outs; an object literal there would be a new value every
  render, which re-renders the publisher, which publishes again — an infinite loop the
  moment the menu opens. Publishing from an effect is safe only because `payload` is the
  screen's element and React bails out of re-rendering it.
- ⚠ **The scrim now dims the trigger**, which it never did when the trigger painted over it.
  `recess` is 0.28 and it reads as "the menu is open"; if it ever reads wrong, the lever is
  the scrim's alpha, not a hole-punch.
- ⚠ **Two placement numbers are still estimates**: the floor is
  `window.height − BottomTabInset`, because `NativeTabs` draws the real bar and JS cannot
  measure it, and the ceiling is `insets.top + Spacing.two`.
- ⚠ The overlay cannot cover the **native tab bar**, so tapping another tab with the menu
  open switches tabs and leaves it open on a blurred screen. Unchanged from before.
- **One slot, last write wins.** A second publisher under one scaffold would clobber the
  first; it needs a keyed map before that day.
- `Size.leagueMenuScrimReach`, the row `FadeIn` stagger, the panel's glass branch, the
  `host` z-index and the lozenge's shared value all go. The lozenge was documented as
  *"springs"* and never did — both writes were plain assignments — so it is a static `top`.
  With it goes the last `Glide` reference: **this control's motion is `Motion` tokens only.**

## The tool that should have existed first

`/_debug/menu` (ADR 0134's splash harness, applied to this): the control over a real
`ScreenScaffold`, **Replay** to remount without a rebuild, and **Slow ×10** so a 160ms
transition can be stepped with `simctl io screenshot`. Three artifact reports each cost a
cold launch and a lucky capture. ⚠ The gallery cannot hold this control — its panel would
hang over the next `Case` — which is why it gets its own route.

## Alternatives considered

- **Keep the glass and tune the spring.** Tuning ζ shortens the window in which the veil
  shows; it does not close it, because the lift is a React commit and the fade is an
  animation. The fourth patch would have been followed by a fifth.
- **Hoist the crown's gradient layer so the crown's content can carry a permanent z-index.**
  Smaller, and it does fix the flash. It fixes nothing else — the scrim stays inside the
  scroll view, the modality stays fake, the nested scroll stays — and it breaks `crown.tsx`'s
  own ⚠ *"Never move the gradient outside this component"*, a rule with a vanished title
  attached to it. Rejected.
- **An RN `Modal`.** It would cover the tab bar and give real modality for free, and the
  old objection (glass cannot sample the app from another window) dies with decision 1. But
  it needs its own `SafeAreaProvider`, interacts with `expo-status-bar` and the native-stack
  sheets, and introduces a second presentation system into an app that has none. Worth
  revisiting only if covering the tab bar becomes a requirement.
- **`transformOrigin` for the scale anchor.** The direct way to say it, and supported since
  RN 0.74 — but whether Reanimated preserves a statically-declared origin while writing
  `transform` on Fabric is unverified here, and the failure is silent (the panel scales from
  its centre). The anchor is composed into the transform instead: RN applies a transform
  array as T·S, so scaling first and translating by half the shrinkage pins the chosen edge
  with no platform question to answer.
