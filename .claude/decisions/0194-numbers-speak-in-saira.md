# 0194 — Numbers speak in Saira

- **Date:** 2026-09-25
- **Status:** Accepted
- **Decided by:** Ed. He approved the Medina adoption plan
  ([0193](./0193-medina-digital-becomes-the-design-system.md)) and asked to
  *"proceed on the other phases"*.
- **Amends:**
  - [0131](./0131-one-display-voice-for-screen-titles.md): `heroTitle` leaves
    SF 300.
  - [0188](./0188-crown-titles-trial-saira-extra-condensed.md): answers its
    open `heroTitle` question.

## Context

The Medina iOS kit puts Saira Extra Condensed on titles, scores, clocks, KPI
numbers, table positions and points, and tab labels. It is always uppercase and
always tabular. Prose, buttons and labels stay SF.

The kit does this with a `DisplayText` atom and its own `Display` scale. The
app already has one semantic `Type` token per number role, so under 0193's remap
the tokens change and the components stay as they are.

## Decision

1. **The number tokens switch to Saira.** Each token carries three things
   itself, so a caller that forgets `tabular` still lines up:
   - `fontFamily` from `DisplayFont`
   - `fontVariant: ['tabular-nums']`
   - uppercase

   No token sets `fontWeight`: each face is a single weight. Sizes step up,
   because a condensed digit reads smaller than SF at the same point size.

   | Token | Was (SF) | Now | Face | Kit role |
   |---|---|---|---|---|
   | `scoreLarge` | 38/700 | 48, lh 58 | ExtraBold | score |
   | `kickoff` | 32/700 | 44, lh 53 | Bold | clock (hero) |
   | `kickoffSm` | 26/700 | 32, lh 38 | Bold | clock |
   | `countdownNum` | 26/700 | 32, lh 38 | Bold | clock |
   | `numeral` | 16/800 | 20, lh 24 | Bold | pos |
   | `numeralLg` | 19/700 | 24, lh 29 | Bold | pos |
   | `eventMinute` | 11/700 | 14, lh 17 | Bold | clock |
   | `rankBadge` | 9.5/800 | 12, lh 14 | Bold | pos |
   | `statHero` / `statLg` / `statMd` | 44/34/30 | 54/42/36 (lh 65/50/43) | ExtraBold | kpi |
   | `heroTitle` | 36/300 | 40, lh 48 | ExtraBold | largeTitle |
   | `statSm` (new) | was `title3` 22/700 | 26, lh 31 | ExtraBold | kpi (small) |
   | `clockMd` (new) | was `title3` 22/700 | 26, lh 31 | Bold | clock (small) |

   - **Line heights: about 1.2× on every token.** This matches the crown
     titles.
     - The first cut used about 1.05× for digits. It **sheared the tops off
       `12:30 PM`** on NEXT UP, which Ed caught from a screenshot.
     - The reason is in the TTF: ascent 1.135em, descent 0.439em. When a line
       is shorter than that, iOS keeps the whole descent and takes the deficit
       off the top.
     - So any line under cap height plus descent (0.688 + 0.439 = 1.127em)
       clips the digits. That floor is recorded in the `Type` comment.
   - **Welcome title.** The welcome screen's 39pt `lineHeight` override was
     sized for SF 36 and would clip an accent, so it is dropped.
   - **Score rule.** `Size.scoreRule*` (the rule between the two numbers,
     "a little under the cap") scales with the digits: 30/17/14 → 38/21/17.
2. **Four new tokens.** `statSm` and `clockMd` take the numbers that sat in
   `title3`: the club stats strip's #/PTS/GD, `StatTile`'s value, and
   `LivePlate`'s minute. `title3` stays SF for headings. The other two:
   - `tablePos` (Bold 18) for the standings row's position and points. Played
     stays SF `body`.
   - `tabLabel` (Bold 12, uppercase) for the tab bar.
3. **Tab labels.** `NativeTabs`' `labelStyle` takes `fontFamily` and
   `fontSize` but not `textTransform`, so `(tabs)/_layout.tsx` uppercases the
   string with `toLocaleUpperCase()`. If the native bar can't resolve the face,
   it falls back to SF. The kit accepts that.
   - **Observed on the iOS 26.5 simulator:** the labels are uppercase but
     render in **SF**. The liquid-glass tab bar ignores the custom
     `fontFamily`. The uppercasing and `tabLabel` stay, so the labels pick up
     Saira if a later expo-router or iOS version honours the font. Revisit only
     if Ed wants Saira there badly enough to replace the system bar, which
     0005 rules out.
4. **These stay SF:**
   - `countdownUnit` and the `eyebrow*` tokens: labels, and the kit keeps labels
     on SF
   - body and prose
   - the XI board tokens (`xiNumeral` and the others): shirt numbers measured
     against a 46pt disc, not a display number

## Consequences

- Every score, kickoff, countdown, stat and table figure is now in the brand's
  voice through the token, with no component edits beyond the standings row,
  the tab layout and the welcome title.
- Condensed digits are narrower than SF digits, so the fixed-width columns
  gain room: `eventMinuteColumn` 38, standings 26/34, and `AnimatedNumber`'s
  sizer.
- Line boxes grow taller, though, and that is the thing to check on the
  simulator:
  - the NEXT UP time row
  - the countdown row
  - the board `ScoreLine` column (it overflows its 40pt crest-high box on
    purpose)
  - the season-stats grids
- The screen titles and the hero title are one voice again. 0131's "one
  display voice" is restored, in Saira.

## Alternatives considered

- **The kit's `DisplayText` atom beside `Text`.** Every caller would have to
  pick the right atom, and a missed one stays SF forever. With tokens, each
  role is right everywhere it is used.
- **Keep the SF sizes.** Saira at 38 reads like SF at about 32. The hero
  numbers would shrink visually, which is the opposite of the kit.
