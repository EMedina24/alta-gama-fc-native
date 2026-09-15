# 0182 — The EDIT chip becomes a pencil; DONE keeps its word

- **Date:** 2026-09-14
- **Status:** Accepted — `tsc`/lint clean; simulator-verified (pencil capsule
  beside the avatar on a club wallpaper, LISTO pulse pill unchanged in edit
  mode). VoiceOver announcement not hand-checked.
- **Decided by:** Ed — *"Can we replace the 'edit' text with an edit icon
  glyph"*, pointing at flaticon's pencil set as the visual idea.
- **Amends:** [0174](./0174-the-board-is-the-readers.md) — the crown EDIT
  chip's face only; the mode, the crown tone and the DONE pulse stand.

## Decision

The Board's crown EDIT chip drops its "EDITAR"/"EDIT" label for a drawn
pencil: new `PencilGlyph` atom (`react-native-svg`, stroke style of
`person-glyph.tsx` — there is still **no icon set** in this app, so no
flaticon asset and no icon font), passed as `ChipButton`'s `leading` with
**no `label` at all**. `ChipButton.label` becomes optional to allow it: a
label-less chip draws only its `leading` and **requires**
`accessibilityLabel` — the board passes `copy.board.edit`, so VoiceOver
still says "Editar"/"Edit" and the string survives in `copy.ts` for that
alone. One component extended rather than an icon-button fork —
`chip-button.tsx`'s own header rule against near-duplicates drifting.

⚠ **DONE stays TEXT.** It is the only way out of edit mode (0174 §13's
whole argument for `pulse`); a glyph-only escape hatch trades the one
word that must be understood for style. Only the way IN wears the icon.

Geometry: new `pillIconOnly` style — a CIRCLE at the pill's own height
(`Size.followPillH` square; Ed on the first cut's ~38×32 capsule: *"make
this more circular"*) with a SOLID `accent` border (Ed again — the crown
tone's hairline left a wordless glyph reading as decoration), outranking
`crown`'s border in the style array. Glyph at 13pt / 1.6 stroke in
`accent`, the label's lime.
