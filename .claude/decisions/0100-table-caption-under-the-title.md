# 0100 — The Table crown's caption moves UNDER the title: the right shoulder cannot hold Spanish

- **Date:** 2026-09-01
- **Status:** Accepted — verified on the simulator (ES)
- **Decided by:** Ed Medina (flagged the wrap); fix same day
- **Amends:** [0087](./0087-crown-aurora-shell-adopted.md)'s Table-crown construction (the mock's right-shoulder caption block)

## Context

0087 built the Table crown to the mock: the `AFTER MD 3 OF 38 / 20 CLUBS`
caption as two right-ragged lines on the crown's right shoulder, beside the
title. The mock is English, where "Table" is five characters. In Spanish the
title is **"Clasificación"** — beside the shoulder block it got ~130pt of a
353pt row and wrapped MID-WORD (`Clasifica / ción`), which reads as a
rendering fault, not typography. The construction cannot hold the lead
market's own language.

## Decision

The caption becomes the crown's **`subtitle`** — one quiet line under the
title (`Tras la jornada 3 de 38 · 20 clubes`), the slot and style the Clubs
crown already uses for `{n} clubs followed`. The title keeps the full row in
both languages; the two-line right-shoulder block and its `Eyebrow` styling
are gone. `completedMatchweek` returning null still degrades honestly to
the club count alone (trap 2).

## Consequences

- A deliberate divergence from the mock, recorded here: the design pack
  still draws the caption on the shoulder. Any future crown caption should
  reach for `subtitle` first — a right-shoulder `meta` block only survives
  next to titles that are short in EVERY language.
- The caption drops the uppercase eyebrow treatment for the subtitle's
  sentence-case caption style — the price of using the shared slot, and it
  now matches the Clubs crown instead of being the one uppercase caption.
- `Crown`'s `meta` slot keeps no consumers today but stays: it is the right
  answer where it fits, and removing it is not this decision.

## Alternatives considered

- **`adjustsFontSizeToFit` on the crown title** — shrinks "Clasificación"
  while every other tab stays 40pt; inconsistent tab-to-tab type is worse
  than a moved caption.
- **Stacking the shoulder block BELOW the title, still right-aligned** — a
  floating right-side sub-text with nothing to align to; the stacked-under
  subtitle is the established pattern here and elsewhere.
- **Shortening the Spanish title** ("Tabla") — the reader-facing word for a
  league table in Spain is la clasificación; renaming the tab to fit a
  layout is backwards.
