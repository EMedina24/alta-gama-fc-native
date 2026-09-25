# 0193 — Medina Digital becomes the app's design system

- **Date:** 2026-09-25
- **Status:** Accepted
- **Decided by:** Ed: *"Lets make a plan to incorporate our new
  /medina-digital-design system in our app. We have an IOS specific section."*
  - Asked two things before planning, he chose:
    - **remap our own tokens**, over the kit's parallel theme adopted screen
      by screen;
    - **all four areas in scope:** type + accent, glass, lime glow, and orbs +
      Live Activity.
- **Amends:** [0015](./0015-handoff-design-system-adopted.md). The accent that
  was "the ONE carry-over from the web app" (`#c8f25a`) changes, and a brand
  face is added.
- **Accepts:** [0188](./0188-crown-titles-trial-saira-extra-condensed.md).
  The Saira crown-title trial stops being a trial.

## Context

The Medina Digital design system is a local skill at
`~/.claude/skills/Medina Digital Design System/`. It has an iOS section:

- mocks in `ui_kits/medina-ios/`
- React Native drop-ins in `templates/medina-ios-rn/`

Its look is graphite surfaces, lime `#c8ff3d`, Saira Extra Condensed for
titles, scores, clocks and KPIs, liquid glass, one lime glow, and thinking-orb
loaders.

The kit was written against the old `handoff_AG-ios` theme. Its README proposes
a **parallel** `medina-theme.ts`, with `MedinaColors` and `DisplayText`, that
screens adopt one at a time. The app has moved past that:

- `theme.ts` already has semantic display tokens (`scoreLarge`, `kickoff`,
  `countdownNum`, `numeral`, `statHero`…).
- 0188 already bundles Saira.
- Tabs are already `NativeTabs`.
- A Live Activity already exists.

A second theme would drift from the first on day one.

## Decision

1. **Medina lands as a remap of `@/constants/theme`, not a second theme.**
   - The kit is a *reference*. Its ideas are merged into the matching existing
     component (`DisplayText` → `Text` variants, `MedinaButton` →
     `atoms/button`, `LargeTitleHeader` → `templates/crown`, and so on).
   - Kit files are never copied in verbatim.
   - The kit's rules are adopted:
     - one lime element per screen (the tab bar is exempt)
     - Saira only on titles, scores, clocks, KPI numbers, table positions and
       tab labels, always uppercase
     - every number tabular
   - Not adopted:
     - the kit's closed-up "AltaGama" spelling ([0042](./0042-brand-spelling-spaced-form-reinstated.md) holds)
     - its i18n file wholesale
     - its `modules/live-match` (ours is `modules/live-activity`)
2. **Accent `#c8f25a` → `#c8ff3d`.** This covers every derivative in
   `theme.ts`:
   - `accentWash`, `accentRing`, `accentWashStrong`, `accentDim`
   - `bandUcl`, `bandR16`, `formWin`
   - the pitch art, `savedFill`
   - the `Mesh`/`MeshTile`/`CrownGrad` pools and the splash sweep

   The Swift copies were updated in the same change (trap 15):
   - `targets/_shared/Tokens.swift` (`accent`, `accentWash`, `accentRing`,
     `plateAccent*`)
   - `StandingsWidget.swift`
3. **A `DisplayFont` token pair** (`extraBold`, `bold`) holds the PostScript
   names, and the crown titles read it.
   - **`SairaExtraCondensed-Bold.ttf`** is bundled beside the ExtraBold file,
     from `google/fonts`, OFL, with the licence already in `assets/fonts/`.
   - It is embedded by the `expo-font` plugin and runtime-loaded with it in
     the root hydration, as 0188 set up.
   - The PostScript name was checked in the TTF's name table.
4. **Five follow-up entries carry out the rest,** each shipped on its own:
   display type (0194), glass (0195), the lime glow (0196), orbs (0197), and
   the widget extension (0198). The plan is at
   `~/.claude/plans/lets-make-a-plan-moonlit-clock.md`.

## Consequences

- The lime is a touch greener and more saturated everywhere at once: tabs,
  buttons, bands, form chips, pitch lines, the splash and widgets.
- Nothing forks, and a screen is never "half on Medina".
- The cost is that one change touches the whole app. Screenshots of every tab
  are the check.
- The Bold face does nothing until 0194 points tokens at it. It is embedded
  now so one dev-client rebuild covers both.
- `handoff_AG-ios/` still shows `#c8f25a`. It is a historical mock, not a
  token source.

## Alternatives considered

- **The kit's parallel `medina-theme.ts`, adopted per screen.** Lower risk per
  step, but it means two themes, `MedinaColors` re-spreading `Colors.dark`,
  and a long tail of unmigrated screens. Ed chose the remap.
- **Keep `#c8f25a`.** The difference is small, but the brand system names
  `#c8ff3d`, and web, widget and app should share one lime.

## Follow-up: the one-lime audit (open, for Ed)

The kit's rule is one lime element per screen: a primary button, *or* an
accent tile, *or* the active tab (the tab bar is exempt). Screens were counted
on the iOS 26.5 simulator after 0193–0198. **Nothing was demoted.** Most of
these limes are semantic uses the kit's own theme also colours lime
(`bandUcl`, `formWin`, switch tints), so which ones go is a design call.

| Screen | Lime elements besides the tab |
|---|---|
| **Today** | edit (pencil) ring · signed-out avatar ring · NEXT UP eyebrow · countdown seconds · pager dot · NEWS eyebrow · news topic text |
| **Club page** | FOLLOWING chip · rank `1` · GD `+24` · five W form chips · NEXT UP dot and eyebrow · "Alerts on" button · Starting XI chevron |
| **Account sheet** | Sign in (primary) · three switches · reminder chips · EN and 12h segmented selections |
| **Table** | UCL band rails (semantic, like the kit) |

Likely candidates to demote to `textSecondary` or `outline`, if Ed wants the
kit's strictness:

- the Today eyebrows
- the countdown seconds
- the club page's GD
- the segmented-control accent tone ([0147](./0147-segmented-control-gains-an-accent-tone.md))
