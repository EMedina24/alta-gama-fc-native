# 0165 — The league crown goes DEEP, the head restructures around a banner pill, and the crest comes back

- **Date:** 2026-09-13
- **Status:** Partly superseded — on Matchdays, Table and Clubs the scrolling deep ramp, re-hued mesh and bled crest give way to the fixed league scene of [0201](./0201-league-screens-wear-the-kits-scene.md); the deep crown stands elsewhere. Was: Accepted — simulator-verified on an iPhone 17 Pro against production:
  all seven ramps side by side at true height, the Premier League and LaLiga on the real
  Matchdays screen, the Premier League on Table, LaLiga on Clubs, the `_debug/menu` harness
  on the brand path, and Today unchanged with a league stored.
  ⚠ Not seen on a phone, not on an SE, not at large Dynamic Type, and the provisional-dates
  (`datesPending`) state has not been caught on real data.
- **Decided by:** Ed, from a delivered design mock of the Matchdays crown — *"can we move
  forward with making a plan to implement this across the matchday screen and the table
  screen… Note the removal of the arrows and the updates to the UI elements positions. PL svg
  file has been added to the assets/images folder."* Four calls were put to him first and he
  took all four: all three league screens go deep, the crest is PL-only for now, the strip
  becomes the only matchday navigation, and the pill's second line names each screen's scope.
- **Amends:** [0164](./0164-the-crown-and-the-page-take-the-league-hue.md) §1 and §10 — the
  per-league crown STANDS; its hue-only rule, its dark ink on a league, and its deferral of
  the crest do not. Both premises expired rather than being wrong; see below.
- **Supersedes:** [0028](./0028-matchday-pager.md) — `MatchdayPager` is deleted.
- **Keeps:** [0087](./0087-crown-aurora-shell-adopted.md)/[0094](./0094-crown-runs-to-the-top.md)
  (the gradient stays a fixed layer inside `Crown`, no z-index) ·
  [0131](./0131-one-display-voice-for-screen-titles.md) (no fourth title size is minted) ·
  [0163](./0163-the-dropdown-leaves-the-crown-and-leaves-glass.md) (no new animation) ·
  [0098](./0098-hero-crest-dissolves-not-clips.md) · traps 40, 42, 71

## Context

The mock changes four things at once and they are not independent: a **deep** crown with
**white** text, the league pill promoted **above** the title with the avatar beside it and a
new second line, the prev/next **arrows deleted** with the date meta collapsed to one line
under the title, and the league **crest as background art** bled off the right edge.

Two of those contradict ADR 0164, which shipped hours earlier. Neither contradiction is a
reversal of judgement — both premises expired:

**§1 chose hue-rotation because holding the BRIGHT ladder's lightness is what kept
`onCrown`'s dark ink legal**, and it rejected the literal brand hex on measurement: white
ink dies on the Bundesliga's light red (`#FF404A`, **3.45**). What it did not try is
clamping lightness *down*. That rescues exactly the case that killed the literal version —
it is `ClubWash`'s own trick, pull every brand hex into one lightness band before it goes
behind white text, at crown scale.

**§10 deferred the crest on one ground: the Premier League's mark is pure white, so it
vanishes on a *bright* same-hue crown.** The mock makes the crown dark, which is precisely
where white reads. The **1.11** that justified §10 was a full-opacity mark on a bright
crown; a white silhouette at 8.5 % on the deep ramp reads at ~1.26, which is what a
watermark should be. Nor is it a recolour — the Premier League's own dark-background cut
*is* pure white — so the trademark objection §10 raised does not apply to drawing it white.

⚠ The device made the second point for us: on the bright crown LaLiga's red mark was the
measured 1.11 and looked weak in the trigger; on the deep red crown it is the most legible
it has been.

## Decision

**1 · There are two crowns, and one function decides which.** `leagueCrownTheme(apiSlug)`
returns `{ stops, pools, tone, art }`. `bright` is the brand's `CrownGrad` with dark
`onCrown*` ink; `deep` is `CrownDeep` with white `onDeep*` ink.

**⚠⚠ `tone` ships WITH `stops`, and that is the whole shape of the file.** The ink is legal
only for the ramp it was measured against, so the two may never be decided separately. A
competition with no `LeagueBand` row wears the **brand** ramp and must therefore keep
**dark** ink — the case that breaks the moment a screen derives ink from "do I have a
league?" instead of from the ramp it got back. The harness pins it on all three unbanded
competitions (trap 72).

**2 · `CrownDeep` is a lightness + opacity ladder with no hue of its own** (L 22/19/15/12/9/6
→ ground, at `CrownGrad`'s offsets so the two can be read against each other). Hue and
saturation come from `LeagueBand`, saturation clamped to `CrownDeepSat` 45–85. Both ends of
that window earn their keep: without the floor a desaturated brand hex draws a grey crown
that reads as a fault, and without the cap the Bundesliga's and the Premier League's
100 %-saturated brand colours glare at full-screen size in a way they never do in a 3pt band.

Measured, and the harness asserts it over `LeagueBand` **itself** so a league added later
cannot skip the check — both inks, on the top **two** stops, because the title sits at stop 0
and the eyebrow and meta line around stop 1:

| | top stop | `onDeep` | `onDeepDim` |
| --- | --- | --- | --- |
| laliga / segunda | `#5f1411` | 13.17 | 5.83 |
| premier-league | `#600868` | 12.12 | 5.33 |
| bundesliga | `#68080d` | 12.89 | 5.54 |
| serie-a | `#15345b` | 12.54 | 5.83 |

It also asserts the **inverse** — that dark ink FAILS on every deep ramp. If `onCrown` ever
passes there, the ramp is not deep and the tone split has no meaning.

**3 · `onDeep`/`onDeepDim` are white and 62 % white, a new family beside `onCrown*`.**
⚠ NOT `text`/`textDim`: `textDim` measures **4.47** on the Premier League's top stop, under
AA, and a cool grey on a saturated purple reads muddy. 62 % white is 5.33 at its worst and
carries no hue of its own.

**4 · The brand path returns the LITERAL tables, by reference**, and the harness asserts
that identity. Unchanged from 0164, and the reason is unchanged: the mesh's pools 2 and 3
are teal, so round-tripping the brand would turn every league-less screen olive.

**5 · The mesh keeps 0164's hue-only rule.** Its bright pool sits behind the crown's opaque
stops and is not visible on these screens; re-tuning it is a separate lever.

**6 · The head restructures.** `Crown` gains `banner`, `metaLine`/`metaTone`, `tone` and
`art`. Matchdays and Table compose the banner as `[LeagueMenu][AvatarButton]` and stop
passing `accessory`. Clubs takes the deep crown and white ink only — its league control
lives in the body by design (hidden while searching, ADR 0032), so no banner and no crest.

⚠ **`banner` renders OUTSIDE the `title` gate**, deliberately: Matchdays passes `title=''`
until its matchweek resolves, and the head is gated on the title, so the whole header used
to vanish on first paint. The banner is the screen's identity and its way out.

⚠ **The avatar takes `tone="ground"` on all three**, not `crown` — the crown tone's
near-black ink is invisible on a deep band.

⚠ `CrownHighlight` is suppressed when deep. At alpha 0.26 the white radial reads as a grey
veil across the shoulder: it lifts a lime band and washes out a dark one.

**7 · The arrows go and `MatchdayPager` is deleted.** With the meta line moved under the
title, nothing was left of that component. `copy.matchdays.previous`/`.next` go with it. The
strip already auto-scrolls and already owned the single clamped `goTo(n)`.

**8 · The Calendar pill is PINNED into the strip's row** via a `trailing` slot on
`MatchdayStrip`, and the `MATCHDAY` label row is deleted with `copy.matchdays.stripLabel`.
⚠ **The label was load-bearing and its own comment said so**: it was what taught the reader
that the lime word opposite was a button. With it gone that lesson has to come from the pill,
which is why the pill gains a calendar glyph — ring plus glyph plus verb reads as a control
with nothing to lean on. New `atoms/calendar-glyph.tsx` and a `leading` slot on
`ChipButton`, whose `pillBare` style zeroes the gap and had to have it back.

**9 · The pill carries a second line**, `38 MATCHDAYS · SWITCH` on Matchdays and
`20 CLUBS · SWITCH` on Table — each screen's own scope, from the league's own config, plus a
shared affordance word. `leagueMenu.switch` is the **first visible string** in a copy bag
that was VoiceOver-only, so `hint` and it must not drift into saying the same thing twice.
`phrases.matchdays(n)` already existed and was unused; `phrases.clubs(n)` pluralises where
`copy.table.clubCount` does not. The trigger grows to `leagueChipHCrownTall` 64 — ⚠ the
one-line 52 SURVIVES for the ground control and the harness, because there are two controls.

⚠ Both halves are gated on data: `total`/`clubCount` are null while the index loads and drop
that half rather than printing a placeholder, and `SWITCH` is gated on `leagues.length > 1`,
because with one competition the chevron is hidden and the trigger disabled.

**10 · The crest is DRAWN, not loaded.** There is no SVG transformer, so `PL.svg` cannot be
imported as a component; its two paths are ported into `atoms/premier-crest.tsx` the way ADR
0133 ports the UCL lockup. ⚠ `fillRule="evenodd"` is load-bearing — the crown and lion have
interior counters and fill as a blob on `nonzero`. ⚠ The viewBox passes through verbatim,
non-zero origin and all, so the path data is never re-measured and 0133's
`.378.756`-is-two-numbers parsing trap cannot arise. ⚠ Drawing also sidesteps the trap that
would bite the `expo-image` route: `PL.svg` declares **no `width` and no `height` at all**,
and a vector can decode while reporting no intrinsic size.

**The fade is the fill.** Not `FadeOutImage`, whose `uri: string` and square `size` both
fight a bundled portrait vector: the paths take a vertical gradient running to zero, so the
foot dissolves inside one `Svg` with no mask and no seven stacked `Image` instances.
ADR 0098's rule is then satisfied at both edges — the **bottom** dissolves because the crown
ends in transparency and offers no visible edge to explain a cut, while the **right** edge is
the physical screen edge, where a cut always reads as intentional. `Crown` still never clips
and never takes a z-index.

**11 · Bundling, against ADR 0159's test.** 0159 says a league *with* a wire row takes its
artwork from the API, and the Premier League has one. The case for bundling is that the wire
serves a **lockup** — crest plus wordmark, sized for a chip — where this is a **crest
silhouette** at 872×1113, one flat fill, for use as a full-bleed watermark. A different asset
for a different job, which is the argument 0133 §1 made. It does not replace the wire artwork
and the trigger still draws that. ⚠ **`PL.svg` is stamped `Source: https://football-logos.cc`
— third-party, and its provenance should be confirmed before this ships to the App Store.**

**12 · No animation.** The recolour and the relayout land on the same commit as the content.
Trap 71: picking a league is already the heaviest frame in the app, and 0163 measured that
gesture stalling a spring for 762ms against a ~300ms target.

## Consequences

- ⚠⚠ **The panel now takes the trigger's own width**, because the trigger is a flex child
  beside the avatar and placement measures the host. It aligns under the pill, which is
  desirable — but it is a consequence of the layout, not an independent choice.
- `ART_DROP`/`ART_OFF` are **device-judged and were wrong twice, in opposite directions**.
  At `top: 0` with a small bleed the mark sat behind the status bar and the pill with its
  widest circle under the title, reading as a second subject rather than wallpaper. Pushed
  clear and 104pt off the edge it became unidentifiable — barely half of it on screen — and
  Ed asked for it back: *"can we make the PL logo come a little to the left so its more
  visable. its ok if it needs to be smaller."* Settled at `ART_OFF` 44 with the mark SHRUNK
  to `CrownArt.height` 0.55 to pay for it, so ~76 % of the crest reads while it still sits
  beside the title rather than crowding it.
- ⚠⚠ **The art costs the quiet ink real margin, and that is why its alpha is a token.**
  White art over a deep ramp lightens the band the head sits on: at `CrownArt.alpha` 0.095
  the Premier League's `onDeepDim` falls **5.33 → 4.72**. It still clears AA, but the
  harness now rates both inks with the crest composited under them — verified to FAIL at a
  raised alpha — so the next nudge to the art cannot quietly push the quiet ink under.
  ⚠ If the art ever needs to be louder, the ink moves first, not the threshold.
- `leagueChipHCrownTall` 64 is derived (a 17pt headline box, a 9.5pt eyebrow box, a half-gap,
  the trigger's own padding) but must still be device-judged the way 52 was.
- The harness's tolerances are **measured quantisation, not slack**: the ladder's darkest
  stops are L 6–9, where a channel is a value like `(26, 2, 28)` and one 8-bit step is 0.392
  in L% terms. Worst case over every stop of every banded league is L 0.18, S 1.75, H 1.75.
  The mesh, rotated from an 8-bit source, still round-trips S and L exactly.
- `Colors.dark.onDeepLine`/`onDeepFill` are declared and **unconsumed** — the deep crown has
  no bordered control on it yet, and the pair is declared so the family is complete rather
  than half-named. Delete them if nothing takes them by P6.
- `cupCaption` (`lib/cronogol/competitions.ts`) **lost its only consumer** when Table's
  subtitle dropped the club count. It is left in place because it is harness-proven and its
  assertion still guards the `afterMatchday(done, total)` denominator this screen now calls
  directly. A cleanup, not a feature.
- ⚠ `ScreenScaffold.meta` is still dead (zero call sites) and its docblock still describes
  0100's abandoned right-shoulder block. `Crown.meta` is live — the two onboarding screens'
  `StepDots` — which is why `metaLine` is a new slot rather than a repurposing.
- `_debug/splash.tsx` mounts a bare `Crown`, which is why every new prop is optional.
- ⚠ Judge colour on the simulator, not from the tables here: the device renders these ramps a
  step louder than the computed hexes suggest, the warning `ClubWash`'s own tokens carry.
