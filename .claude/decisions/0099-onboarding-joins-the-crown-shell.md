# 0099 — Onboarding joins the crown + aurora shell; the picker's tiles become the liquid-glass bubbles

- **Date:** 2026-09-01
- **Status:** Accepted — all three screens verified on the simulator (ES copy); taps are a device pass
- **Decided by:** Ed Medina ("update our onboarding experience to include these new bubbles … and our new background with crown")
- **Reverses:** the repaint's onboarding carve-out (recorded in HANDOFF's 0087-era notes: "Onboarding deliberately does NOT take the mesh")
- **Amends:** [0076](./0076-onboarding-floodlight-redesign.md) — the floodlight LOOK goes; the flow, copy and structure stay
- **Upholds:** [0077](./0077-welcome-language-line-and-one-skip.md) in full — one skip, language line, club-first gate all untouched

## Context

0076 gave onboarding its own "Floodlight" look, and the 0087 repaint left it
there deliberately — the mesh and the floodlight `Glow` fought each other, so
onboarding kept its verified look while the app around it moved to the crown
+ aurora shell. That left the FIRST thing a reader ever sees as the one
surface not speaking the app's language: the picker's flat glass tiles
against the Clubs tab's liquid-glass bubbles, and a plain dark ground
against the crown every tab wears. Ed called the direction: onboarding
should look like the app it opens into.

## Decision

1. **All three screens sit on `MeshGround` with the crown's gradient head.**
   - **Welcome** keeps 0076's one-brand-moment structure (mark, headline,
     one button) but the floodlight `Glow` is replaced by the aurora: a
     `Crown` with NO title — its fixed gradient layer alone — which is why
     `CrownProps.title` became optional. The brand moment below carries the
     words.
   - **Picker and primer** take the full crown: step eyebrow, `crownTitle`,
     `StepDots` as the head's `meta`, body copy in `onCrownDim` ink riding
     the payload. The picker's search field and league pills ride the crown
     exactly as the Clubs tab's search does (0087's construction).
2. **The picker's clubs are `ClubBubble`s** — the same 88pt liquid-glass
   shells as the subscribed rail (0090), in a thirds grid (bubble centred
   per cell; no gap arithmetic to drift, short last rows stay left-aligned).
   The molecule grew a `checked?: boolean` prop: a boolean makes the tap a
   SELECTION toggle (checkbox semantics, check drawn only when true);
   omitted — the rail — keeps the permanent-indicator button it was.
   ⚠ This does NOT weaken 0082/0090's one-action rule for the rail: the
   picker precedes any follow, so there is no season of calendar entries to
   lose and nothing to confirm.
3. **Status bar per 0094's flip:** the picker scrolls, so it inlines the
   scaffold's arithmetic — `BRIGHT_BAND` is now exported from
   `screen-scaffold.tsx` rather than duplicated. Welcome and the primer do
   not scroll, so they pin `style="dark"` (the flip's degenerate case).
   ⚠ The picker cannot use `ScreenScaffold` itself: it needs a pinned CTA
   footer and keyboard-persistent taps the scaffold does not model.
4. **The primer's alert group goes GLASS** (`Surfaces.glass`) — it kept the
   old flat ground's `card` only because onboarding had kept the old
   ground. P1's glass-on-mesh rule applies now that the mesh is here.
5. **Dead code swept in the same change** (the P6 rule): `atoms/glow.tsx`
   deleted — onboarding was its only consumer — and `Size.crestPick` /
   `Size.pickBadge` dropped with the tile grid they sized.

## Consequences

- A reader's first three screens and the app behind them are one design
  language; the bubbles they pick from are the bubbles their follows become
  on the Clubs rail — the picker now literally previews the rail.
- `Crown` accepts a title-less render. Its head furniture is skipped
  wholesale; every tab still passes a title, and the docblock says the
  welcome is the reason for the option.
- The floodlight look survives only where it is the design: the app icon
  (0060) and the splash. `Glow` can be resurrected from history if a
  floodlight surface returns.
- ⚠ Verified by screenshot only (ES): picked-state checks, the language
  tap, the CTA crest stack and the permission prompt still need a device
  pass — the same list 0076 left open, for the same reason (taps cannot be
  scripted here).
- ⚠ The 3-up bubble grid shows ~9 clubs per screen where the old tile grid
  showed ~12 — the bubbles are physically bigger. Accepted: the picker is
  searchable and league-scoped, and the bubble IS the point.

## Alternatives considered

- **Bubbles only, old ground** — the cheapest read of the request, but the
  bubbles were designed ON the crown's fade (0090 retired their club-colour
  glow because the rail sits on the crown); on the flat dark ground they
  lose the context that justifies their glass.
- **Extending `ScreenScaffold` with footer + keyboard props** — one shell
  for everything, but the scaffold is the four tabs' load-bearing contract
  (the 0087 gutter note warns every bleed depends on it); teaching it
  onboarding's concerns risks four screens to restyle one.
- **A crowned welcome with a title in the band** — tried on paper; the
  centered brand moment under a top-left 40pt title read as two screens
  fighting. The gradient-only crown keeps 0076's intent intact.
