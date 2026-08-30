# 0076 — Onboarding is redesigned around the icon's "Floodlight"

- **Date:** 2026-08-30
- **Status:** Accepted — not yet run on the simulator
- **Decided by:** Ed Medina (Option A of three mocked directions)

## Context
The first-run flow worked but was plain, and it worked against itself: four 84pt
league chips ([0056](./0056-onboarding-league-chips-name-themselves.md)) took half
the picker before a single club was visible, the club tiles were 2-up where SPEC
§3.7 asks for 3-up (HANDOFF backlog item 6), selection was a literal `✓` text
glyph beside a `Check` atom that already existed, and the alert primer was a bare
list asking for the one system prompt iOS grants with nothing to show for it.

The app icon ([0060](./0060-app-icon-1a-floodlight.md)) had meanwhile settled a
visual idea — graphite field, lime glow from above, lime mark — that the app's
first screen did not share. Three directions were mocked on a design canvas;
"Option A" was chosen.

## Decision
- **A welcome screen** (`onboarding/welcome.tsx`) opens the flow: the mark under a
  radial glow, one headline, one primary. The gate in `_layout.tsx` and the
  account sheet's *Replay onboarding* route to `/onboarding/welcome`. Its skip is
  the picker's skip — `onboarded` flips, nothing is asked of iOS. *(Amended by
  [0077](./0077-welcome-language-line-and-one-skip.md): both skips removed.)*
- **Two new atoms carry the icon's idea**: `Mark` (the 42×30 geometry, lifted from
  `lineup-card.tsx`, which now uses it) and `Glow` (a `react-native-svg`
  `RadialGradient`, stop `opacity` not `rgba()`, per `wash-gradient.tsx`'s
  warning). No `expo-linear-gradient` ([0062](./0062-league-band-colours.md)).
- **`LeagueChips` → `LeaguePills`.** The 2-up grid becomes a horizontal row of
  40pt pills that bleed to the screen edge. 0056's rules are unchanged and travel
  with the component: the pills NAME themselves, no light plate, no 50% idle
  opacity, height-only mark sizing. 0056 is amended, not superseded.
- **The picker goes 3-up, crest-led**: crest (`Size.crestPick` 44) above a
  one-line name, picked = `raised` ground + `accentRing` border + an 18pt lime
  disc holding `Check` in `onAccent`. Names use a new `pickerName` (`Atlético`,
  `Espanyol`, `R. Vallecano`): a `de` tail dropped first, then the widget's
  initial contraction — `widgetName` alone put `Madrid` and `Barcelona` under
  the wrong crests.
- **The CTA carries a `PickStack`** — up to three picked crests in `onAccent`
  discs, resolved against the UNSCOPED corpus so a pick from another league still
  draws. This revisits the picked-clubs strip 0056 rejected: the objection was a
  second selection surface, and this is not one — it cannot remove a pick, it only
  shows what the count already says. `Button` gains `tall` (`Size.ctaH` 50) for
  the onboarding primaries only.
- **The primer shows a sample notification** (`AlertPreview`, SAMPLE copy under
  `copy.onboarding.preview*`) above the three rows, which get `AlertGlyph` stroke
  icons on `accentWash` tiles and the `Check` atom. Behaviour is untouched: `Not
  now` still never spends the prompt.
- **`StepDots` + a `STEP n OF 2` eyebrow** head the two decision screens; the
  welcome shows three dots and no eyebrow, since it decides nothing.
- New tokens: `Size.leaguePillH/leaguePillMarkH/crestPick/ctaH/ctaDisc/
  ctaDiscCrest/pickBadge/markWelcome/alertIconTile/alertGlyphTile`; retired:
  `leagueChipH/leagueChipMarkH`. Copy gains `welcome*`, `step`, `preview*` in
  both locales.

## Consequences
- Three screens before the tabs, not two. The welcome adds one tap for a reader
  who knows what they want; the skip is on it.
- `pickerName` and `widgetName` are deliberately separate helpers with different
  width budgets; tune either alone.
- The `PickStack` inside the button is decorative (`accessible={false}`); the
  label is the accessible count.
- Not yet seen on the simulator. The glow opacities (0.22 / 0.12 / 0.10) were set
  in a browser preview and the simulator renders a step louder — tune there.

## Alternatives considered
- **Option B, a crest wall** (no tiles, 4-up, ring alone as selection): airiest,
  but ~80pt per name truncates too much of LaLiga.
- **Option C, league first then a list** (one decision per screen): calmest to
  read, but a step per extra league and nowhere natural for search.
- **Dropping the welcome screen** and going straight to the picker as before:
  kept for the brand moment; the skip makes it cheap.
