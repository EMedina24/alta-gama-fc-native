# Standings widget — Home Screen, systemLarge

The full LaLiga table in the largest Home Screen widget iOS offers (338×354pt on
a 6.1"/6.3" phone). Twenty rows at 15pt each, no scrolling, no truncation of the
table. Followed clubs sit on a lime wash; a zone band at the left of the
position carries the qualification/relegation colour.

## Files

| File | What it is |
| --- | --- |
| `Standings Widget.dc.html` | The design at 2×. `lang` (en/es) and `followed` (comma list of club slugs) are tweakable. |
| `StandingsWidget.swift` | WidgetKit timeline provider + view, values mapped 1:1 to the design. |
| `brand/mark-accent.svg` | Lime mark in the title line. |
| `support.js` | Runtime for the design file. Not shipping code. |

## Geometry (pt)

- Tile padding `10 / 14 / 8` (top / sides / bottom), radius from the system.
- Title line 13pt tall, 3pt gap below. Columns: mark 11 · `TABLE` 41 · meta flexible · PL 18 · GD 22 · PTS 22, 5pt gutters.
- Rows 15pt tall, radius 4, highlight bleeds 4pt past the content edge (`margin: 0 -4`).
- Row columns: position 15 · crest 11 · name flexible · PL 18 · GD 22 · PTS 22, 5pt gutters.
- Zone band 1.5×8pt, radius 1, 3.5pt before the position number.
- Crests 11×11, `contentMode: .fit`, never masked.
- Rows are laid out with `space-between` so the stack fills the tile; nothing is clipped at default text size.

## Type

| Element | Size / weight |
| --- | --- |
| `TABLE` | 7.5pt / 700, tracking `.2em`, lime |
| `LALIGA · AFTER MD 4` | 6.5pt / 500, tracking `.14em`, `#59626a` |
| Column heads `PL GD PTS` | 6pt / 800, tracking `.14em`, `#59626a` |
| Position | 7.5pt / 700 tabular |
| Club name | 8pt / 600, `-0.01em`, single line, tail-truncated |
| PL · GD | 7pt / 500 tabular, `#6b747b` |
| PTS | 8pt / 800 tabular |

All body copy is below Apple's 11pt guideline — accepted for a data-dense
table; under Dynamic Type "Larger" and above the 20-row layout overflows.
Fall back to a 10-row head-of-table with a `···` seam for followed clubs
below the cut (see `sizeCategory` branch in the Swift file).

## Colour

| Role | Value |
| --- | --- |
| Tile base | `#0b0d0f` |
| Corner glow | `radial-gradient(58% 60% at 100% -10%, rgba(200,242,90,.16), transparent 64%)` |
| Followed row wash | `rgba(200,242,90,.12)` |
| Followed position / name / PTS | `#c8f25a` |
| Other position | `#7c858b` · name `#e7ebec` |
| PL · GD | `#6b747b` |
| Champions League band (1–4) | `#c8f25a` |
| Europa League band (5–6) | `#5ac8fa` |
| Relegation band (18–20) | `rgba(255,92,92,.7)` |
| Zone hairlines (above 7th, above 18th) | `rgba(255,255,255,.10)` at 0.5pt |

No legend: the bands and the two hairlines are the only zone markers.

## Payload

```swift
rows          [Row]   exactly 20, already sorted
  position    Int
  crest       URL?    published LaLiga crests only; nil → abbr chip
  abbr        String  3 letters, uppercase
  name        String  short display name, pre-truncated ("R. Sociedad")
  played      Int
  goalDiff    Int     printed with explicit "+" when positive
  points      Int
  followed    Bool
  zone        Zone    .ucl / .uel / .none / .relegation
copy
  title       String  "TABLE" / "TABLA"
  meta        String  "LALIGA · AFTER MD 4", pre-formatted
  pl, gd, pts String  column heads in the reader's locale
```

Names and column heads arrive pre-localised; the widget never abbreviates or
re-cases. Tapping a row deep-links to `altagama://club/<slug>`; the title line
opens `altagama://table`.
