# 0201 — League screens wear the kit's scene

- **Date:** 2026-09-25
- **Status:** Accepted
  - `tsc` is clean; lint is unchanged (the 5 errors and 1 warning were already
    there); `league-theme-harness` passes, including the new scene pass (§7).
  - **Simulator-verified on an iPhone 17 Pro (iOS 26.5) against production,
    Premier League:**
    - Matchdays, Table and Clubs share one scene.
    - Pixels sampled against the kit screenshot agree to within about 5° of
      hue and a few points of saturation and lightness.
  - ⚠ **Not hand-checked:**
    - the scene holding still on a scroll (it is outside the `ScrollView` by
      construction; Ed's editor was in front of the Simulator, so no synthetic
      drag was sent)
    - LaLiga's colour-logo watermark
    - the UCL's drawn fallback
- **Decided by:** Ed: *"lets make the background match the screenshot"* (the
  kit's Matchdays mock). Two calls, asked before building:
  - **All three league tabs**: Matchdays, Table and Clubs.
  - **The watermark is the backend's logo image**, wordmark and all.
- **Supersedes, on those three tabs:**
  [0165](./0165-the-league-crown-goes-deep-and-the-head-restructures.md)'s
  scrolling deep ramp, the re-hued mesh, and the bled drawn crest. The deep
  crown stays wherever `tintLeague` is used without `scene`, and for the
  Board's club and league wallpapers (`crownOverride`).

## Context

The kit draws each league screen on a fixed **scene**: a dark league tint washed
down the screen, a vivid glow at the top right, and the league's own lockup as
a faint watermark. The header and the rows scroll over it.

Ours was 0165's deep crown: a 432pt ramp that scrolls away with the header,
over the brand mesh re-hued to the league. So the colour died under the
header, the rows sat on near-black, and a crest-only silhouette sat small and
high.

## Decision

1. **`SceneGround`** (a new atom) replaces `MeshGround` on an opted-in screen.
   It is fixed behind the scroll, with three layers:
   - a vertical wash of `base`: opaque at 0, 0.8 at 0.34, handed to the page
     ground at 0.8 (`LeagueScene.wash`, fractions of the screen)
   - a `WashRadial` glow of `glow` at 0.5, centred at (1, 0.18) with radii
     0.9 × 0.46, faded by 0.7
   - the watermark, 330pt wide, 80pt off the right, 140pt down, at 0.15
2. **`ScreenScaffold scene={{ logo }}`** opts a screen in.
   - It applies only when `tintLeague` resolves to a banded league and there
     is no `crownOverride`.
   - `Crown` gains a `bare` prop that drops its gradient layer, so the header
     is content only. Ink stays white (`deep`).
   - Matchdays, Table and Clubs pass it. Table adds `useLeagueArtwork`, which
     is the same query the other two hold, so a cache hit.
3. **The tints are the kit's, per league (`LeagueScene.tints`).**
   - The first cut derived them from `LeagueBand`, at the kit's lightness.
   - Sampled against the kit screenshot, that matched lightness to a point but
     sat about 18° magenta of it (h294 against h276) and 15–20 points more
     saturated.
   - So the kit's own pairs are used for the six competitions whose kit tint
     is in the same colour family as Ed's band: Premier League, LaLiga, Serie
     A, Bundesliga, the UCL and Honduras.
   - ⚠ **Puerto Rico is left out on purpose.** The kit gives it green, which
     contradicts Ed's blue→red flag (ADR 0173). It derives from its band
     (blue base, red glow), as any future league will.
4. **The watermark is the wire's lockup** (`leagueSceneLogo`: `onDark`, then
   `primary`, then `logoUrl`).
   - This is the full lockup, wordmark included, which is what the kit shows.
     It is not the chip precedence, which reaches for LaLiga's icon.
   - Where there is none (the UCL), the bundled `ART_MARK` silhouette is drawn
     at the scene's alpha.
   - ⚠ The kit greys its logo 30% with a CSS filter, and React Native has no
     equivalent. LaLiga's and the Bundesliga's colour lockups will tint
     faintly, which Ed accepted with the choice.
5. **The harness (§7) rates the head over the scene, with a white watermark as
   the worst case:**
   - **White** is rated at the glow's hottest point and must clear AA: 5.19 to
     6.95 across all eight banded competitions.
   - **The quiet ink** is rated where it can reach: the eyebrow's right edge,
     half the width and 20% down, with the radial's own linear falloff. It must
     clear 3:1: 4.32 to 5.08.
   - The first cut rated the quiet ink at the glow centre, and LaLiga failed
     at 2.99. That centre is the right screen edge, behind the avatar and the
     menu trigger, which have their own grounds. A guard that rates ink where
     no ink sits only pushes the design dimmer for nothing.

## Consequences

- A league's colour now reaches most of the way down the screen, under the
  rows, on three tabs. Moving between them on one league keeps one background.
- There are now two lightness treatments of a league colour: the deep crown
  (the Board's league wallpaper, and any unopted screen) and the scene. They
  share hue only where the tint is derived. Where it is the kit's, the scene
  can sit a few degrees off the crown (the Premier League's 276° against
  294°).
- The watermark loads over the network, so on a cold cache it fades in after
  first paint. Offline it is simply absent. The scene's colour never depends
  on it.
- `LeagueScene` tokens; `leagueSceneTheme` / `SceneTheme`; `leagueSceneLogo`;
  the `SceneGround` atom; `Crown.bare`; `ScreenScaffold.scene`.
