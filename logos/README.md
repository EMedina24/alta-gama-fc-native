# Logo files — Alta Gama FC

SVG is the master in every case. `png/` holds 4× rasters for places that won't
take vector.

```
lockup-accent.svg   primary — lime mark, lime "FC", on dark
lockup-light.svg    one colour, for dark or busy backgrounds
lockup-dark.svg     one colour, for white and light paper
mark-accent.svg     mark alone, 42 × 30
mark-light.svg      mark alone, one colour light
mark-dark.svg       mark alone, one colour dark
mark-currentcolor.svg   inherits the colour of whatever holds it
png/                4× rasters, on their own background panel
```

## Two things to know before editing

**The halfway line is two segments, not one line under a dot.** In the app the
centre spot is filled with the surface behind it, and that fill is what breaks
the line. A vector file has no surface to match, so the line stops either side
of the circle instead — that is what lets the SVG sit on any background without
a seam. Don't "fix" it back to a full line plus an opaque circle.

**The lockup SVGs keep the wordmark as live text** (Archivo 900 for the name,
800 for the sub-line). Anyone opening one without Archivo installed gets a
fallback face. Convert to outlines before sending a file outside the team, or
send the PNG.

## Colour

| | mark | name | "FC" | sub-line | lifted F / C |
|---|---|---|---|---|---|
| primary | `#c8f25a` | `#edf3f4` | `#c8f25a` | `#6d7d84` | `#8fa0a6` |
| one colour, dark bg | `#edf3f4` | `#edf3f4` | `#edf3f4` | `#8fa0a6` | `#b0c0c4` |
| one colour, light bg | `#0b1015` | `#0b1015` | `#0b1015` | `#4a5a61` | `#2c3a41` |

Never lime on white — it measures about 1.5:1 and disappears.

## Sizes and clear space

Clear space is the height of the pitch on all four sides: 30px of air around a
42px mark. Minimum 42px wide for the full lockup, 30px for the mark alone, 12mm
in print. Below 42px drop the sub-line and use the mark.

See `Brand guidelines.dc.html` pages 01–02 for construction and misuse.

---

⚠ **Nothing in this folder is read by a build.** This is a CNG project: `expo
prebuild` regenerates `Images.xcassets/AppIcon.appiconset` from `app.json` and
overwrites anything else. The only files that reach a build are the ones in
`assets/images/` that `app.json` names. Kept as design source — see
`.claude/HANDOFF.md` traps 22–23 and
`.claude/decisions/0041-app-icon-1b-and-a-splash-of-its-own.md`.
