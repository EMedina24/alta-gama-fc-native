# Broadcast widget — lockscreen / Live Activity

Alta Gama FC's fixture card for the lockscreen. One card, two states: before
kickoff it shows form and kickoff time; once the whistle goes the bottom band
becomes scorer columns. Floodlight lime (`#c8f25a`) throughout — no broadcaster
red, no channel/where-to-watch tags.

## Files

| File | What it is |
| --- | --- |
| `Broadcast Widget.dc.html` | The design. Open in a browser; `state` and `minute` are tweakable. |
| `BroadcastActivity.swift` | ActivityKit attributes + the lockscreen view, values mapped 1:1 to the design. |
| `brand/mark-accent.svg` | The lime mark shown above the kickoff time (pre-match only). |
| `support.js` | Runtime for the design file. Not shipping code. |

## Geometry

- Card width 369pt inside a 393pt screen (12pt inset each side), radius 26.
- Padding `13 / 16 / 15`, vertical stack `gap: 12`.
- Crests 46×46, `object-fit: contain`, never cropped or masked.
- Abbreviation 30pt/800, `-0.02em`. Score 34pt/700, `-0.03em`, tabular.
- Kickoff time 21pt/600 tabular. Eyebrow and HOME/AWAY 11.5pt/500.
- Scorer names 12pt/600, minutes 12pt/400 tabular at 60% white.
- Clock bar 3pt, radius 2, `minute / 90` wide.

## Colour

| Role | Value |
| --- | --- |
| Card base | `#07080a` |
| Floodlight left | `radial-gradient(78% 120% at 0% 0%, rgba(200,242,90,.34), transparent 58%)` |
| Floodlight right | same at `100% 0%`, `.30` |
| Pitch pool | `radial-gradient(120% 90% at 50% 118%, rgba(11,40,32,.85), transparent 70%)` |
| Home goal glyph | `#c8f25a` |
| Away goal glyph | `rgba(200,242,90,.5)` — the 50% step is how "who is winning" reads pre-name |
| Yellow card | `#f2c14e` · Red card `#ff5c47`, count in `#ff8f7c` |
| Hairlines | `rgba(255,255,255,.09)` at 0.5pt |

The two top radials are deliberately unequal (34% / 30%) so the card looks lit
rather than branded, and neither club owns the warm side. The bottom green pool
exists to keep lime off the crests.

## States

**Pre-match** — eyebrow `2026-27 LALIGA · MATCHDAY 4`; record (`W-D-L`) and
`n PTS` under each abbreviation; lime mark + kickoff time in the centre column.

**Live** — eyebrow becomes a pulsing lime dot, the minute, and the venue;
records give way to `HOME` / `AWAY`; the centre becomes the score with the away
number at 58% white; the bottom band splits into two scorer columns, mirrored
inward (home glyph-first, away name-first) with discipline counts under each;
3pt lime clock bar closes the card.

Nothing else animates between pushes — only the pulse and the bar.

## Payload

```swift
home/awayCrest   URL      published LaLiga crests only
home/awayAbbr    String   3 letters, uppercase, never generated client-side
record           String   "2-1-0"
pts              Int
kickoff          String   pre-formatted in the reader's locale
score            (Int,Int)
minute           Int      1…90 (+ stoppage as "45+2" — string, not clamped)
scorers          [Goal]   max 3 a side, then "+n"; names arrive pre-truncated
cards            (y:Int, r:Int) per side
```

Names are never abbreviated or re-cased in the widget — the feed sends what the
card should print. A fourth scorer collapses to `+n` rather than growing the
card; the widget height is fixed.
