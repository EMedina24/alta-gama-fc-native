# 0172 — The deep crown learns gradients, and lightness stays out of the lerp

- **Date:** 2026-09-14
- **Status:** Accepted — simulator-verified on an iPhone 17 Pro against production:
  Serie A's Matchdays crown grades steel → vivid blue with the diamond art
  unchanged; harness passes with the mirror lerp and the "gradient actually
  happened" pin.
- **Decided by:** Ed — *"serie A has a weird background combo going on, I think
  they use a gradient with #225696 and #0D8EFE."* Direction asked and answered:
  `#225696` (the band's first stop) stays at the top behind the head; the vivid
  `#0D8EFE` builds toward the fade.
- **Amends:** [0164](./0164-the-crown-and-the-page-take-the-league-hue.md)'s
  first-stop-only rule for gradient bands — *"averaging buys nothing"* was right,
  but sampling one stop was the actual cause of the report: a vivid two-tone band
  rendered as one dull steel-blue ladder beside a vivid pill and mark.

## Decision

1. **`leagueInks` (internal)** returns one or two clamped `{h,s}` — gradient bands
   parse BOTH ends. `leagueInk`/`leagueHue` keep the first-stop contract, so every
   existing consumer and assertion reads the same number it always did.
2. **The crown lerps hue and saturation down the ladder**: stop i sits at
   `t = offset / lastOpaqueOffset` (derived from the ladder's second-to-last stop,
   not a hardcoded 0.92), hue along the SHORTEST arc, saturation linearly —
   endpoints clamped to `CrownDeepSat`, and the window is convex so interpolated
   values need no re-clamp. ⚠⚠ **Lightness and opacity are NEVER interpolated** —
   the ladder is the ink contract, and the harness rates both inks on stops 0/1
   against whatever hue lands there, so a gradient cannot move the AA numbers by
   more than hue ever could. The ground stop stays verbatim (the mesh seam).
3. **Mesh pools spread the arc**: pool i takes the lerped hue at `t = i/(n-1)`,
   S/L held — ADR 0164's hue-only rule, now per-pool.
4. **A solid band degenerates to `to === from`** — the identical code path emits
   byte-identical output for all six solid leagues (§3's exact assertions did not
   move).
5. Harness §3 mirrors the lerp independently, and a new pin asserts serie-a's (and
   LPR's) top and last-opaque hues actually differ — a lerp whose `t` is stuck at 0
   would pass every per-stop check on its own.

## Consequences

- A gradient band is now a first-class crown input; LPR used it the same day
  ([0173](./0173-puerto-rico-goes-deep-and-the-catalogue-is-fully-banded.md)).
- `gradient[0]` = top is now a convention with a consumer; reordering a band's
  stops reorders the crown.
- The mesh's three pools no longer share one hue on gradient leagues — anything
  assuming "the league hue" is singular should read `leagueCrownTheme`, not
  `leagueHue`.

## Alternatives considered

- **Vertical `WashGradient` between the two hexes directly** — discards the
  lightness ladder, which is the entire ink-contrast machinery; white ink dies on
  `#0D8EFE` (L 52%) exactly the way 0165 measured.
- **Averaging the two stops** — 0164 already rejected it; one wrong hue instead of
  two right ones.
