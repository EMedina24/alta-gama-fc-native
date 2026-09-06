# Your Week — systemMedium (day spine)

Replaces the split-panel version (hero column + nested rail card). That layout
read as two widgets stapled together and truncated club names in the rail. This
one puts the whole week on **one spine**: three date stops, the next match's stop
opened up to hold the kickoff, the other two collapsed to a line each.

Source of truth: `Your Week Widget.dc.html` (drawn at 2× a 338×158pt tile).
SwiftUI reference: `YourWeekWidget.swift`.

## Shell

| | pt |
|---|---|
| Tile | 338 × 158 (systemMedium) |
| Outer tray radius | 23, 1px border `white 9%`, fill `white 5%` |
| Tray thickness | 2 |
| Inner plate radius | 21, fill `#0b0d0f`, inset top highlight `white 10%` 0.5px |
| Plate padding | 10 top / 13 sides / 8 bottom |
| Corner glow | radial `lime 16% → clear`, centre (100%, −10%), r 185 — decoration only |

Radii stay concentric (23 outer / 21 inner over a 2pt tray) at any size.

## Grid

Three-column grid, identical on every row, so the spine stays plumb whatever the
labels say:

```
| date gutter 48 | spine 7 | content (indent 9) → fill |
```

Row heights are proportional, not fixed: next match `1.34`, each collapsed row
`1`. Hairline `white 7%` 0.5px above each collapsed row.

## Spine

State lives in the spine, not in a background fill:

- **Next match** — 7pt solid lime node with a 2pt `lime 16%` halo, top-aligned
  (4pt down); rail below it is a 1px gradient `lime 75% → white 10%`.
- **Collapsed rows** — 5pt plate-filled circle with a 1px `white 32%` ring,
  vertically centred; rail is flat `white 10%`.

## Type

| Element | Size / weight | Colour | Tracking |
|---|---|---|---|
| `YOUR WEEK` | 8.5 bold | `#c8f25a` | 1.7 |
| `3 CLUBS` | 8.5 medium | `#59626a` | 1.2 |
| Next day (`SAT`) | 8.5 bold | `#c8f25a` | 1.4 |
| Next date (`12 SEP`) | 7.5 medium | `#6b747b` | 0.45 |
| Kickoff | 23 ultralight, monospaced digits | `#e7ebec` | −0.8 |
| Side tag (`HOME`) | 7.5 bold | `#c8f25a` on `lime 12%` / `lime 28%` border, r4, h13 | 1.05 |
| Next club name | 10.5 semibold | followed `#c8f25a`, other `#e7ebec` | −0.21 |
| `v` | 8 regular | `#4f575d` | — |
| Collapsed day | 8 semibold | `#8d979d` | 1.3 |
| Collapsed date | 7 medium | `#59626a` | 0.42 |
| Collapsed fixture | 9 semibold | `#dfe4e6` | −0.14 |
| Collapsed time | 10 medium, monospaced digits | `#aab3b8` | −0.2 |

Smallest type on device is 7pt (the collapsed date step). Everything else sits at
or above the 8.5pt widget eyebrow.

Crests: 15pt in the next-match row, 12pt paired (1pt gap) in collapsed rows.
Published for LaLiga only — anything else draws its abbreviation tile, never a
generic placeholder crest.

## Snapshot payload

```swift
struct WeekSnapshot: Codable {
    let fixtures: [WeekFixture]   // [0] is the next match; max 2 more
    let copy: WeekCopy
}

struct WeekFixture: Codable {
    let homeCrest: URL?, awayCrest: URL?
    let homeShort: String, awayShort: String
    let followed: Side            // .home | .away → which name goes lime
    let dayLabel: String          // "SAT" / "SÁB"
    let dateLabel: String         // "12 SEP"
    let timeLabel: String         // "21:00"
}
```

Every string arrives pre-formatted and localised, including the furniture
(`YOUR WEEK`, `3 CLUBS`, `HOME`, `v`) in `WeekCopy` — the widget localises
without `.lproj` and never formats a date or shortens a name itself.

## Behaviour

- Fewer than 3 fixtures: drop collapsed rows; the next-match row keeps its
  proportional height and the spine ends at the last node.
- No fixtures at all: not covered here — reuse the existing empty-state tile.
- Kickoff TBC: pass `timeLabel: "TBC"` (still monospaced, still 23pt).
- The tile is one tap target; deep-link to the next match.

## Files

- `Your Week Widget.dc.html` — interactive source of truth (crests load from live URLs)
- `YourWeekWidget.swift` — SwiftUI reference implementation
- `brand/mark-accent.svg` — header mark, 11pt wide at 92% opacity
- `support.js` — runtime for the DC file
