# 0155 — The band legend LEADS the table, in one row, in its own colours

- **Date:** 2026-09-11
- **Status:** Accepted — verified on the simulator in EN and ES, and against a clamped 375pt width
- **Decided by:** Ed ("can we make this a bit more visible — maybe in a single row at the top of the standings")
- **Amends:** [0151](./0151-positional-bands-are-the-format.md) (the legend's placement, ink and copy shape) · [0152](./0152-standings-organism-takes-bands-not-a-league.md) (the organism's `bands` prop)

## Context

The legend shipped where it had always sat on the domestic table: **under the
last row**, as `micro` text in `textFaint` (`#59626a`) beside a 3pt swatch.

On a twenty-club table that is merely quiet. On the Champions League league
phase it fails: **the rails start at rank 1 and the key arrives after
thirty-six rows.** A reader looking at the lime rail beside the leaders has to
scroll the entire table to learn it means the round of 16 — which is the one
thing the colour exists to say.

## Decision

**Above the table, in one row, on its own track, in its own colours.**

1. **Placement.** The legend is the first child of the organism, above the
   column head. The rails begin at row 1, so the key has to arrive before them.
2. **A track.** `Colors.dark.recess` at `Radius.control` with its own padding,
   so it reads as a defined element rather than floating text.
3. **Ink.** The RANGE takes the **band's own colour** — the colour now appears
   twice per item, once as the shape that matches the rail and once as type —
   and the label steps up from `textFaint` to `textSecondary`.
4. **The range comes from CONFIG, the words from copy.** `bandRangeLabel` reads
   `League.zones` / `Competition.bands`; `cupBandLabels` drops back to bare
   names. Carrying `1–8` inside a translated string would let the words and the
   rails drift apart the day a format changes — silently, and in one language
   only.
5. **Size stays `micro`.** See below: it is what buys the single row.

⚠ **The swatch stays 3pt, the row rail's exact width.** Widening it for presence
was the obvious move and it is the wrong one: that exact match is the entire
mechanism by which a reader connects the key to a row. The visibility is bought
with placement, track, ink and colour instead.

## ⚠ 0151 said not to ink labels in the band colour. The reason does not travel.

0151 recorded: *"Do NOT port the poster's lighter `CORAL_INK #ff9b8f`. That
exists because the poster inks band labels in the band colour and coral fails
contrast there."*

Measured before reversing it. The poster's field is **blue**; ours is
near-black. Against this ground:

| Band | Colour | Contrast |
| --- | --- | --- |
| `bandOut` (the weakest) | `#ff7a6b` | **7.4:1** |
| `bandPlayoff` | `#d3c2ff` | 11.5:1 |
| `bandR16` | `#c8f25a` | far above |

All three clear AA comfortably, so no lighter ink is minted and 0151's
instruction not to port `CORAL_INK` **still stands** — it was never about the
colour, it was about the ground.

## ⚠ The single row is a TYPE SIZE decision, and it was measured, not eyeballed

`caption` (12.5) was the first cut — bigger being the obvious reading of "more
visible". Spanish is the binding case (`Octavos` / `Play-off` / `Eliminados` is
three characters longer than the English set) and the narrowest supported device
is 375pt, where the content width is 335.

There is no SE or mini simulator installed here, so the track was **clamped to
335pt on a 402pt device** and screenshotted — the same layout question, answered
exactly. At `caption` Spanish **wrapped to two rows**. At `micro` (11.5) it fits
on one with room to spare, in both languages, at both widths.

So the legend is the same SIZE it always was. Every other lever was pulled
instead, and the result is dramatically more legible than the `textFaint` line
it replaces.

## Consequences

- **The domestic legend moves too, and gains its ranges.** It is one component
  and one treatment; a legend at the top on one tab and the bottom on another,
  on the same screen, would be worse than either. LaLiga's four bands
  legitimately take two rows — `flexWrap`, not a scroll — and the table now
  states *which positions* each zone is, which it never did before.
- ⚠ **Not `justifyContent: space-between`.** With wrapping, each line is
  justified independently, so a two-item last line spreads to both edges and
  reads as a broken grid. Left-aligned with a `columnGap` is predictable at
  every width and in both languages.
- ⚠ **`cupBandLabels` is short on purpose** — `Octavos`, not `Octavos de final`.
  `Octavos` is the ordinary Spanish shorthand, not an abbreviation invented
  here, and the footnote still carries the long explanation.
- `Legend` takes `LegendItem[]` (kind + label + range) rather than a kind array
  and a label map, which also retires 0152's `Partial<Record<BandKind, string>>`
  workaround: pairing a kind with its words is the screen's job, because only
  the screen knows which competition it is drawing.
- A single-position band prints `6`, never `6–6` — Serie A's Conference place is
  position 7 alone, and a range there reads as a rendering fault. Harnessed.

## Alternatives considered

- **Keep it at the bottom, just brighter** — does not fix the actual problem,
  which is that the key arrives thirty-six rows after the colour it explains.
- **A chunkier swatch** — trades away the one thing that links the key to a row.
- **Shorten `Eliminados` to `Fuera`** to buy width at `caption` size. It is the
  poster's own word, so it was tempting; `micro` buys the same room without
  spending precision, and `Eliminados` is the clearer term.
- **Let it wrap on narrow devices** — Ed asked for a single row, and the clamp
  test showed one is achievable in both languages rather than only the lucky one.
