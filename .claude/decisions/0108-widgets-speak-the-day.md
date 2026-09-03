# 0108 — The widgets speak the day: `Viernes`, not `VIE`

- **Date:** 2026-09-03
- **Status:** Accepted — typechecked at both floors; simulator pass in the same change
- **Decided by:** Ed Medina — picked direction B ("Spoken day") off the mockup at
  `claude.ai/code/artifact/5458faa7-9532-47c3-8d28-cc3d01bde348`, and asked for
  the small widget to follow

## Context

Ed looked at the medium YOUR WEEK tile and asked *"what is VIE?"* — the tile's
own author couldn't be glanced at. The failure is dress, not data: `VIE` sits
on the hero baseline in **lime + tracking, which is this tile's TAG voice** —
`TU SEMANA` and `FUERA` wear exactly the same treatment — so a day abbreviation
set that way reads as furniture. The same cluster also told one fact in three
voices (27pt ultralight numeral, 9.5pt tracked code, glass chip), and the rail
repeated the code (`DOM` over the time).

A design review with four directions was mocked at widget scale on live
snapshot data (the artifact above): A dated eyebrow (`VIE 4 SEP`), B spoken day
(`Viernes`), C calendar leaf, D countdown hero. **Ed picked B.**

## Decision

The widgets say the day as a **word, in sentence case** — words are read, tags
are decoded.

- **Medium hero:** `Viernes` at 15pt semibold in the accent, on its own line
  above the time; the baseline row drops to two voices (numeral + side chip).
  The inline `VIE` tag is gone from that row — the spoken line replaces it,
  never joins it.
- **Rail column:** `Dom 6` — sentence case with the date number, replacing the
  tracked `DOM`. A code beside a number reads as a date; alone it reads as a
  badge. Costs no width: the time under it is wider on every clock (28 v ~42pt,
  measured).
- **Small NEXT footer:** `Sábado 21:00` (`kickoffDayName + kickoffTime`),
  replacing `Sáb 21:00` — one date voice across the family. Widest form
  (`Wednesday 10:15 am`, 118pt) rides the footer's existing
  `minimumScaleFactor` on the SE floor's 115pt and is full-size everywhere
  else.

### The spoken line draws only where it fits — measured, not hoped

The `ImageRenderer` harness (0086's method): the spoken hero is **114pt**
against a body of **124pt on a standard tile, 112 on a mini, ≤109 on an
SE-class tile**. So `heroColumn(_:spoken:)` branches on the body's measured
height (`geo.size.height >= 118`, off the GeometryReader the columns already
use): standard tiles get `Viernes`; compact tiles keep today's inline tag
form. ⚠ This is why `kickoffDay` still travels on v5 — it is the compact
fallback, not dead weight. ⚠ Do not add height to the hero without re-running
the harness; the branch threshold is that measurement plus 4pt.

### Wire: snapshot v5, additive, the 0059 pattern

Two fields per entry, both pre-formatted by JS (widgets translate nothing —
0047):

- `kickoffDayName` — `Sábado` / `Saturday`. From `Intl` long weekdays via
  `phrases.intl` (the `formatWeekdayLong` precedent — the pinned tables hold
  only short forms), sentence-cased in `formatWidgetKickoffParts` because
  Spanish arrives lowercase and the widget prints verbatim.
- `kickoffDayDate` — `Sáb 5`. Sentence-cased pinned short weekday + day
  number.

`formatWidgetKickoffParts` was already the one injection point at all three
`buildSnapshot` call sites (use-push-sync, both `_debug/widgets` paths), so no
call-site changed; the `?sample=` fixtures flow through the real builder (trap
48) and only the hand-built live/ft sample entries needed the fields typed.
Both fields are optional in `Snapshot.swift`; a v4 file degrades to the tag /
`kickoffLabel`, never to a blank. `snapshotKey` picks the new fields up
automatically — one extra reload on first run after update, then quiet.

## Consequences

- ES: `Viernes` · `Dom 6` · `Sábado 21:00`. EN: `Friday` · `Sun 6` ·
  `Saturday 21:00`. The lime tag voice now means TAGS only.
- The complaint's answer ("which day?") is spelled out; **"which Friday?" is
  still unanswered on the hero** — direction B carries no date number there.
  The rail's `Dom 6` has one; if the hero ever needs one, that is direction A's
  `VIE 4 SEP` and a new ADR.
- Mini/SE readers keep the old tag hero. Two presentations by tile height is
  the cost of B's tallest-of-the-four hero; the mockup's tradeoff note said as
  much before the pick.
- Accessories and the FT hand-off footer keep `kickoffLabel` — Lock Screen
  width is spoken for.
- 0059's "UPPERCASE stacked column" rationale is superseded for the rail by
  this entry; `formatWidgetKickoffParts.day` still serves it as the fallback.

## Alternatives considered

The other three mocked directions: **A dated eyebrow** (`VIE 4 SEP` — the
in-app card's `dateLabel` idiom; was the mockup's recommendation, carries the
date number, and fits every tile height); **C calendar leaf** (glass mini-tile;
most added furniture); **D countdown hero** (zero wire change; duplicates the
small tile and hides the plannable day). Ed chose B with the tradeoffs stated
on the mockup.
