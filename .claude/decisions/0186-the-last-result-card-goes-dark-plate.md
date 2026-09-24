# 0186 — The last-result card goes dark plate, and the board pair stacks

- **Date:** 2026-09-24
- **Status:** Accepted — tsc clean, lint at its 5-error/1-warning baseline. Verified on the simulator (iPhone 17 Pro, ES) at `?only=last`, `?only=live` and on the real Today tab in the reported idle state: brand crown, no lead card, Atlético de Madrid 2–1 Real Madrid. At a **335pt clamp** (a 375pt phone, 0155's method) every name fits except `Mönchengladbach`, which loses two letters; recorded, not fixed. VoiceOver not hand-checked.
- **Decided by:** Ed, on a screenshot of the idle Board: *"the text is too light to read and on longer team names 'athletic de madrid' the font shrinks"*. He chose the plate strength and the stacked layout from measured options.
- **Amends:** [0087](./0087-crown-aurora-shell-adopted.md) (LAST RESULT leaves the glass system), [0088](./0088-live-match-is-the-crown-payload.md) (LivePlate takes the stacked row too), [0044](./0044-scores-render-as-split-digits.md) (the board score is still bare, now in a crest-high column).

## Context

**Contrast.** LAST RESULT was 6 % white glass with the fixed dark-theme inks. With no live match and no NEXT UP, the crown collapses to eyebrow + title, but its gradient layer keeps its fixed 432pt (`CrownRamp`, [0094](./0094-crown-runs-to-the-top.md)). The card therefore lands at y ≈ 141–283 on the lime→green band. Measured WCAG ratios there:

| ink | on glass | on a 0.6 plate |
| --- | --- | --- |
| `text` (names, digits) | 2.7 | 8–13 |
| `textDim` (losing side) | 1.1 | 3.3–5.1 |
| `textSecondary` | 1.0–2.1 | 3.9–5.9 |
| `textFaint` (label, pill, MATCH EVENTS) | 2.1–3.0 | ≤ 2.2 |

**Shrinking names.** `ScoreLine` at board size was a row: crest+name | 38pt score | name+crest. Each side got ≈ 60pt, so names shrank with `adjustsFontSizeToFit`, each side on its own. The `0.7` floor never applied: on Fabric (RN 0.86) `minimumFontScale` is parsed (`ReactCommon/react/renderer/attributedstring/conversions.h:1025`) but the iOS layout manager reads only `minimumFontSize` (`RCTTextLayoutManager.mm:247`, default 4.0), which JS never sends. Paper computed the floor (`RCTTextShadowView.mm:236`). Names rendered at 8–13pt. HANDOFF trap 77.

## Decision

1. **A new `plateBody` token, `rgba(4,9,8,0.6)`**, one step lighter than LivePlate's `plateDark`. The card takes LivePlate's ring (`Size.glassBorder` + `plateLine`) and a `plateTop` lit edge in NEXT UP's four-sided form.
2. **Quiet inks step up to `textSecondary`**: the header label, the outcome pill through a new `Pill tone="plate"`, and `EventsDisclosure`'s label and chevron. The disclosure changes in place, because both its consumers are plates.
3. **The losing side keeps `textDim`** (0044's emphasis rule). It measures ≥ 3.3 on the plate, and the names are large text.
4. **`ScoreLine`'s board size is NEXT UP's stacked pair.** Crest over a centred `bodyStrong` name, two lines, no `adjustsFontSizeToFit`. The score sits in a crest-high column. Each name bleeds `Spacing.two` past its side under the empty space beside the score. Without the bleed `Mönchengladbach` ellipsised at 402pt. Each side is one VoiceOver stop.
5. **The `row` size is untouched.** It is only used by the gallery.
6. **No `Surfaces.plate` spread.** The two plates differ in fill on purpose, so there is no pair to share.
7. Two gallery cases: Atlético de Madrid v Real Madrid, and Borussia Mönchengladbach v Bayern München.

## Consequences

- LAST RESULT is a plate on every day. Under NEXT UP it sits on the mesh and reads a step darker than the glass cards below it.
- LivePlate inherits the stacked row and grows by up to ~44pt. Nothing measures its height.
- The events panel's `recess` stacks on the plate to ≈ 0.71 black, between the card and LivePlate's ≈ 0.86.
- `Mönchengladbach` still truncates by two letters on a 375pt phone. It is one unbreakable word. Fixing it means a smaller name size or a shorter display name for that club.
- `ScoreLine.center` is kept but has no consumer.
- A fourth plate earns a ring-only `Surfaces.plateRing`.

## Alternatives considered

- **LivePlate's `plateDark`** — passes everything, but it is the ceiling Ed rejected as too dark on NEXT UP (0184).
- **`recess` scrim (0.28)** — leaves `textDim` under 2.
- **Dark `onCrown` ink on the band** — 3.6 at the card's foot, and it dies when the events panel expands or NEXT UP pushes the card onto the mesh.
- **A light frosted card** — a surface the dark-only system does not have.
- **Keep the row and fix the floor** — RN has no JS prop for `minimumFontSize`.
- **Names on their own row under the crests** — offered; Ed chose the NEXT UP pair.
- **A `widgetName`-style contraction ("A. Madrid")** — a naming-policy change made for one card.
