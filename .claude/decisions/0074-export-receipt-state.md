# 0074 — After a save, the Save button is the receipt: outline, check, disabled, with a lime banner and a success haptic

- **Date:** 2026-08-30
- **Status:** Accepted — verified on the simulator (`/_debug/xi?status=saved|failed`); haptic and re-arm by the reader's tap
- **Decided by:** Ed Medina

## Context
The export sheet confirmed a save with a `caption` in `textSecondary` under
two full-width buttons — the quietest element on the sheet carrying the one
message that stops a reader tapping Save again. The Save button stayed lime
and enabled, which is an invitation to exactly that second tap. The ask: make
"Saved to Photos" unmistakable, so nobody saves the same card five times.

## Decision
1. **The control encodes the state.** On `saved` the Save button becomes
   `tone="outline"` with a `Check` glyph and the label `Saved to Photos`, and
   is disabled. The thing the reader would tap again says it is done.
2. **It re-arms on any change that would make a different PNG** — size,
   title, the lineup — because the route clears the status in those handlers
   (no effect). Share never disables: sharing again is a different act.
3. **A `StatusBanner` molecule** replaces the caption: tinted ground + hairline
   in one hue + glyph + `bodyStrong`. `success` is lime (`accentWash`/
   `accentRing`), `error` the live red, `warning` the postponed amber. Enters
   with a 220 ms `FadeInDown`; none under Reduce Motion. A red panel can
   never read as "saved".
4. **A Success notification haptic** on `saved` through `hapticSaved()` in
   the haptics module — still the one file importing `expo-haptics`; not an
   `Effect`, because those are the builder's own moves.
5. `ExportStatus` is typed `{ kind: 'saved' | 'denied' | 'failed'; text }`;
   `shared` clears it — the system share sheet was the receipt.
6. New `Check` atom, drawn (no icon set), `Size.chevron + 2` so it sits on a
   button's text line.

## Consequences
- No new copy: `saved`, `photosDenied`, `exportFailed` are reused.
- `/_debug/xi?status=saved|denied|failed` renders the sheet in each state —
  the tap itself still cannot be scripted.

## Alternatives considered
- **A toast** — leaves the sheet; the reader looks at the button, not the
  top of the screen.
- **Closing the sheet on save** — takes away Share and the size choice the
  reader may want next.
- **Disabling Save for N seconds** — a timer says nothing; a changed input
  is the honest re-arm.
