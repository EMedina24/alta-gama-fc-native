# Your Week widget — systemMedium

Alta Gama FC's week-ahead tile. One hero kickoff on the left, the remaining
fixtures as a rail on the right, inside a nested double-bezel shell.

## Files

| File | What it is |
| --- | --- |
| `Your Week Widget.dc.html` | The design, drawn at 2× a 338×158pt medium tile. `lang` and `rowCount` are tweakable. |
| `YourWeekWidget.swift` | WidgetKit view + snapshot types, values mapped 1:1 to the design. |
| `brand/mark-accent.svg` | The lime mark in the header. |
| `support.js` | Runtime for the design file. Not shipping code. |

Points below are pt at 1× (the design file draws them at 2×).

## Shell

Two nested containers so the curves stay concentric:

- **Tray** — radius 24, padding 2.5, `rgba(255,255,255,.045)`, hairline
  `rgba(255,255,255,.09)`, ambient `0 15 35 rgba(0,0,0,.55)`.
- **Plate** — radius 21.5 (`24 − 2.5`), `#0b0d0f`, inner highlight
  `inset 0 0.5 0 rgba(255,255,255,.10)`, padding `11 / 13`.

Decoration only, never a data channel:

- Lime floodlight `radial-gradient(70% 90% at 100% -8%, rgba(200,242,90,.20), transparent 62%)`
- Pitch pool `radial-gradient(80% 70% at -6% 108%, rgba(11,40,32,.9), transparent 66%)`

## Layout

Header (mark 12pt, `YOUR WEEK` pill, club count) then a
`1.32fr / 0.5pt / 1fr` grid with a 13pt gap; the divider is a vertical
gradient hairline that fades out at both ends.

**Hero (left)** — time 27pt/200 tabular `-0.035em`, day 9.5pt/600 lime
`0.16em`; fixture row with 20pt crests and 11.5pt/600 names; side tag on its
own line, 8.5pt/600 in a 13pt outlined chip.

**Rail (right)** — one row per remaining fixture, 13pt crests butted 1pt
apart, names stacked 9pt/600 (home) over 9pt/500 (away), day 8pt/600 over
time 10pt/500 tabular, right-aligned. Rows are separated by a 0.5pt
`rgba(255,255,255,.07)` rule; the first row draws none.

## Colour

| Role | Value |
| --- | --- |
| Plate | `#0b0d0f` |
| Followed club | `#c8f25a` |
| Other club | `#e7ebec` |
| Rail day / `v` | `#6b747b` / `#4f575d` |
| Club count | `#59626a` |
| Hairlines | `rgba(255,255,255,.07–.12)` |

Only the followed club is lime. It is the widget's single accent — the side tag
and day labels stay neutral so nothing competes with it.

## Payload

```swift
struct WeekSnapshot: Codable {
    struct Fixture: Codable {
        let homeCrest: URL?      // published LaLiga crests only
        let awayCrest: URL?
        let homeShort: String    // "R. Madrid", never "Real Madrid CF"
        let awayShort: String
        let followed: Side       // .home | .away
        let dayLabel: String     // "SAT" / "SÁB"
        let timeLabel: String    // "21:00", pre-formatted for the reader
    }
    let fixtures: [Fixture]      // hero is fixtures[0]; rail is the rest, max 2
    let copy: Copy               // YOUR WEEK / 3 CLUBS / HOME / AWAY / v
}
```

All furniture and all dates are formatted in the snapshot, so the widget
localises without `.lproj`. A club outside LaLiga has no published crest and
draws its abbreviation tile instead — never a generic crest. Smallest type on
device is 8.5pt (day label and side tag), the established widget eyebrow step;
nothing goes below it.
