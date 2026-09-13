# 0164 — The crown and the page take the league's HUE, and the lightness ladder is what makes it possible

- **Date:** 2026-09-13
- **Status:** Accepted — simulator-verified on an iPhone 17 Pro against production: all seven
  preview ramps side by side at true height, LaLiga and the Premier League on the real
  Matchdays screen, the Premier League on Table and Clubs, Today unchanged with a league
  stored, and the v5→v6 migration exercised on this device's own pre-existing payload.
  ⚠ Not seen on a phone, not on an SE, and not at large Dynamic Type.
- **Decided by:** Ed — *"can we experiment with changing backgrounds per league… when a user
  picks a league like LaLiga or premier league the background of the crown and page gradient
  should change to that leagues colors and maybe even logo. similar to how the club pages
  work."* Four calls were put to him before any code and he took all four recommendations:
  hue-rotation over literal brand colour, crown **and** mesh, no logo in this pass, and one
  shared league across the tabs.
- **Second consumer of:** [0062](./0062-league-header-bands.md) — `LeagueBand` is now read
  by something other than FINISHED TODAY, which 0062's own consequences anticipated.
- **Keeps:** [0087](./0087-crown-aurora-shell-adopted.md)/[0094](./0094-crown-runs-to-the-top.md)
  (the gradient layer stays inside `Crown`, at `topInset + CrownRamp`, with no z-index) ·
  [0163](./0163-the-dropdown-leaves-the-crown-and-leaves-glass.md) (no new animation
  anywhere) · [0150](./0150-champions-league-is-a-competition-not-a-league.md) · trap 42
- **Reverses a note in:** `clubs.tsx` — "the league being browsed. Screen state, not a
  preference." It was right until the crown had a colour.

## Context

Every crown in the app is the brand's lime→teal `CrownGrad`, and every page ground is the
same three-pool `Mesh`. Ed asked for a league-scoped surface instead, pointing at the club
pages, which already tint from a club's own hex ([0068](./0068-club-colour-wash.md)/[0091](./0091-club-page-hero-redesign.md)).

There was nothing to port. `cronogol`'s only per-league colour in the whole product is a
**3pt × 16pt pill** driven by `accentColor` (`components/home-week/match-row.tsx`), and its
palette is one global accent. `SCOPE.md`'s "appearance is not inherited" applied literally:
this is new design.

The obstacle is not the gradient. It is the **ink**. The crown is the app's one inverted
surface: `onCrown #0d1a08` is near-black *because* `CrownGrad`'s top stop is bright lime,
and both `BRIGHT_BAND = 0.42` and the scaffold's status-bar glyph flip are derived from that
brightness. Nine files read the `onCrown*` family.

## Decision

**1 · The rule is hue-only.** Replace the hue of every stop; hold saturation, lightness and
opacity exactly. `lib/cronogol/league-theme.ts` — `leagueHue`, `leagueCrown`, `leagueMesh` —
pure, and harness-proven before it reached a screen (`scripts/league-theme-harness.mjs`),
the contract `club-wash.ts` keeps.

**⚠⚠ Holding lightness is the entire reason this is a two-file change and not a re-design of
the ink system.** Measured, `onCrown` against each rotated top stop:

| | top stop | `onCrown` |
| --- | --- | --- |
| brand | `#c8f25a` | 13.95 |
| laliga / segunda | `#f25e5a` | 5.58 |
| premier-league | `#e55af2` | 6.06 |
| bundesliga | `#f25a62` | 5.49 |
| serie-a | `#5a9ef2` | 6.51 |

All clear AA, so `onCrown`/`onCrownDim`/`onCrownLine`/`onCrownFill`, `BRIGHT_BAND`, the
status-bar flip, `AvatarButton tone="crown"` and [0101](./0101-signed-out-avatar-attention-ring.md)'s
attention ring are **untouched**. ⚠ The cost is real and is not nothing: ~14 → ~5.5 is AA,
not AAA. The harness asserts ≥ 4.5 over `LeagueBand` **itself**, so a league added later
cannot skip the check.

**2 · No clamp constants, unlike `ClubWash`.** That rule exists because `colorPrimary` is
raw and unvalidated. The source here is `CrownGrad`, already device-calibrated; its own
saturation ladder is 85/46/51/65/64/60, so a floor is a no-op and a lightness band would
undo the very thing keeping the ink readable.

**3 · The hue source is `LeagueBand`, keyed by `apiSlug`.** A gradient entry (Serie A)
contributes its first stop's hue. ⚠ **Not `LeagueRef.accentColor`** — 0062 rejected it and
the wire confirms why: `laliga #ff563c` is the retired pre-Floodlight house colour,
`premier-league #7db6ff` and `bundesliga #f5c451` are the two hexes `cronogol` repurposed as
qualification bands, and Serie A, segunda and the UCL are null.

**4 · Brand is the LITERAL table, never a round-trip at H 77.** `leagueCrown(null)` and
`leagueMesh(null)` return `CrownGrad` and `Mesh` by reference, and the harness asserts
reference identity. This is not a micro-optimisation: the mesh's pools 2 and 3 are teal and
blue-teal, so routing the brand through the hue swap would turn **every screen with no
league olive** — Today, News, the club pages, onboarding.

**5 · Absence is the fallback, not a bug** (0062's rule). `lpr-pro-clausura`,
`liga-nacional-apertura` and the UCL league phase have no band row and wear the brand crown.
Two preview columns exist specifically to prove that path still fires.

**6 · The mesh takes all three pools to the one hue**, each keeping its own S, L and alpha —
a league's page is a single-hue aurora; the brand's three-hue one stays the brand's
signature. ⚠ Rotating the three by a shared *delta* preserves the spread and was discarded:
it lands LaLiga on green pools and the Premier League on olive, because the source pools sit
~120° apart.

**7 · The pick becomes ONE shared, persisted value** — `Preferences.leagueSlug`, schema
version 6. It stores our route `slug` (what `LeagueMenu` speaks on both `active` and
`onSelect`), leaving exactly one conversion site: `tintLeague={…apiSlug}`.

⚠ **It became shared *because* the crown is tinted.** Three tabs holding three independent
leagues was invisible while every crown was lime; tinted, the app changes colour on a tab
switch with nothing on screen explaining it.

⚠ **Each screen CLAMPS for itself and never writes the clamp back.** Matchdays lists only
`ROUND_LEAGUES` and Clubs lists no cup, so a value one tab cannot show falls back locally —
writing that fallback would silently overwrite a pick the other two can honour, just by
visiting a tab. `parseLeagueSlug` validates against `LEAGUES` **and** `COMPETITIONS`, because
validating on `findLeague` alone resets a UCL reader to LaLiga on every relaunch.

**8 · No animation. The recolour snaps.** Trap 71: picking a league is already the heaviest
frame in the app, and 0163 measured that gesture stalling a spring for 762ms against a
~300ms target. Recolouring two full-screen SVG layers on that commit is the worst possible
place for a tween, and the snap reads honestly because the content changes with it. If a
cross-fade is ever wanted, it is two stacked layers with a Reanimated opacity on the UI
thread — never animated stops, and never a spring where a callback must mean "done" (trap 73).

**9 · Today and News keep the brand crown, deliberately.** Both are multi-league by
construction, so "the selected league" has no meaning there — the same shape as the
front-end backlog's §8 Today-eyebrow question, and answered the same way. News cannot tint
even by accident: it renders a bare `<MeshGround />` and never touches `ScreenScaffold`.

**10 · No league mark as background art, this pass.** The marks cannot be recoloured — a
recoloured league mark is a trademark problem, not a styling choice — and they disagree on
ink: the Premier League's is pure white, LaLiga's is its own `#ff4b44` red. On a bright
same-hue crown those two vanish. Colour alone is the cheap, reversible half.

## Consequences

- `Crown` gains `stops`, `MeshGround` gains `pools`, `ScreenScaffold` gains `tintLeague`
  (an **`apiSlug`**) and derives both. Three tabs read the store. `/_debug/gallery` gains
  `?only=league-tint`: seven ramps at **true `CrownRamp` height**, side by side — a fraction
  of a shorter box would compress the ramp and put a different colour at the title's height,
  which is 0094's whole finding and would make the comparison a lie.
- ⚠⚠ **`apiSlug` vs `slug` is the bug this feature is most likely to ship** (trap 34 /
  [0084](./0084-widget-live-gate-takes-the-api-slug.md)). `LeagueBand` is keyed `laliga`;
  the tabs and `leagueOptions` carry `la-liga`. Get it wrong and **LaLiga alone** falls back
  to the brand crown while the other four look perfect. The harness asserts the wrong key
  gives the wrong answer, so the trap stays demonstrated rather than described.
- ⚠⚠ **On Matchdays the tint must be `isCup ? null : league.apiSlug`.** On the cup tab
  `league` is the LaLiga *fallback* that file already warns about twice, so `league.apiSlug`
  alone paints the Champions League crown LaLiga red.
- ⚠ **A league mark on its OWN hue is now a 1.11.** `#ff4b44` against the crown at the
  dropdown's height falls 1.65 (brand) → 1.11 (LaLiga); Serie A's `#0373ff` triangle falls
  2.13 → 1.34. Both stay legible **only because the trigger carries its own plate**, and
  that was confirmed on device. Nothing may put a mark directly on a tinted crown — which is
  §10's real justification, and it is the same finding 0062 made when it picked a dark
  `#A8231F` over brand red.
- ⚠ Checked and NOT a regression, against first impressions: the qualification-band inks on
  the Table. `bandConf #b79bff` reads 1.29–4.75 down the Premier League ramp against
  1.14–2.66 down the brand's — comparable or better. These inks were always low-contrast on
  the crown, which is why the legend sits below the fade; the violet-on-violet collision the
  screenshot suggested is not in the numbers.
- `DeckGround` (theme.ts) is a baked screenshot-calibrated copy of the crown and is
  **not** re-hued. It is safe today only because it lives on Today, which stays brand. A
  future tinted deck must derive it, not copy it.
- The onboarding screens that bypass `ScreenScaffold` and use `Crown` directly keep the
  brand defaults automatically, because both new props default to the literal tables.
- ⚠ Values judged on the simulator, not from the table above — the device renders the tinted
  ramps a step louder than the computed hexes suggest, exactly the warning `ClubWash`'s own
  `lightMin/lightMax` carry. Trap 53 is the same lesson for the mesh.
- Unresolved, for Ed's eye: the lime accents that now sit on a tinted ground — the CALENDAR
  chip, the active matchday pill, FOLLOW. 0068 ruled "on a wash the chrome goes white, not
  lime"; this is the first surface where that rule and the brand accent meet at full size.
