# 0122 — The plate wears two states: frosted at rest, the lens under the finger

- **Date:** 2026-09-06
- **Status:** Accepted
- **Decided by:** Ed ("the main nav has an effect when you tap and hold on
  the glass pane, it sort of magnifies and i can see light destortion, thats
  the effect im after")
- **Amends:** [0121](./0121-league-plate-is-the-lens.md) — the lens is the
  TOUCH state, not the whole plate; [0119](./0119-league-plate-takes-the-navs-material.md)'s
  frosted regular returns as the REST state

## Decision

The selection is **two stacked plates on the same shared values**, matching
what the nav actually does:

- **Rest** — 0119's frosted `regular` dark glass, rendered BEHIND the marks
  (first child), so the selected mark stays crisp.
- **Touch** — 0121's lens (`clear` + `isInteractive`), rendered OVER the
  marks (last child), and **MOUNTED only while a finger is down**
  (`touching` state via `runOnJS`): raised by `onTouchesDown` on the plate's
  span (before any movement — the tap-and-hold) or by the pan activating,
  dropped by `onFinalize` so the lens never outlives the finger on release,
  cancel, or failure alike. `lensUp` (0 ↔ 1, assigned) hides the resting
  plate while the lens is up.

The magnify-and-distort under the finger is the lens MATERIAL refracting the
mark it now sits over, plus OUR press swell — `Glide.swell` (1.06), sprung on
touch. The system's own interactive touch response was abandoned: it could
not be made to fire reliably under RN compositing, so neither plate takes
touches at all (`pointerEvents="none"`; the slot under the lens is the
already-selected chip, a no-op tap — nav-identical — and the rail's pan
still drags).

Three glass-rendering findings, each simulator-caught in sequence, each a
way the plate "disappeared" or died under a held finger:

1. **A crossfade kills the glass** — fractional alpha on any ancestor
   disables a `UIVisualEffectView`; wrapper opacity on glass may only ever
   land on exactly 0 or 1 (hence the discrete swap).
2. **Glass mounted hidden stays blank** — a glass view set up inside an
   alpha-0 ancestor does not come back when the alpha returns to 1 (hence
   mount-on-touch, born visible, never parked at opacity 0).
3. **A transform scale kills the lens** — scaling the wrapper rasterizes the
   glass's sampled backdrop and the vivid refraction dies to a murky smear
   (A/B'd via scripted hold). The swell is therefore BOUNDS growth
   (width/height sprung, recentered by translate), which re-renders the
   effect crisp at every size.
4. **The public material BLURS close content, whatever its flags** —
   interactive on and off render identically (A/B'd); the bar's crisp
   magnified lens is not reachable through the public glass. So the
   magnification is COMPOSED: sharp mark copies at `Glide.magnify` (1.18)
   ride inside a clipped viewport in the lens, counter-translated
   (`p·MAG + T`, `T = lensCentre − MAG·railCentre`) so the bubble is a TRUE
   magnifier window onto the rail; the glass supplies only rim, ambience,
   and the soft backdrop ghost around the sharp copy.

Why 0121's always-on lens died: at rest it smeared the LaLiga mark into
unreadable red streaks (screenshotted) — the lens's refraction is the point
under a finger and vandalism as a resting state. The nav agrees: its resting
lozenge sits behind crisp icons; the warping bubble appears on touch.

Supporting mechanics:

- The plate wrapper lost `overflow: 'hidden'` — a clipping wrapper cropped
  the swollen rim; the pill radius lives on the `GlassView` itself.
- The lens rides OVER the marks — a deliberate, recorded divergence from
  trap 59's ordering: refracting the content is this element's job.

## Consequences

- Without liquid glass there is no lens state at all: the flat fallback is
  the whole selection and the lens is never mounted.
- Reduce Motion: the state swap is already an assignment; the swell spring
  is skipped (the lens appears at rest size).
- The tap-and-hold swell, the drag ride, and the release return are all
  device checks — statics can only show the two resting truths (crisp mark,
  invisible lens).
