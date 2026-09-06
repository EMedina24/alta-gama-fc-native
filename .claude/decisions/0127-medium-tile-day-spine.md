# 0127 — The medium tile becomes a DAY SPINE: one timeline, three stops

- **Date:** 2026-09-06
- **Status:** Accepted — typechecked at every floor; layout harness-measured
  (`ImageRenderer`, numbers below); simulator pass pending
- **Decided by:** Ed (`handoff_widget-redo/` — the whole folder is the design;
  tap behaviour and shell scope confirmed in-session)
- **Supersedes:** [0086](./0086-week-widget-hero-and-rail.md) (hero + rail
  split), [0109](./0109-rail-solo-card.md) (the rail's one-fixture card — no
  rail, no card)
- **Amends:** [0108](./0108-widgets-speak-the-day.md) — the MEDIUM parts only:
  the spoken `Viernes` hero line and the `Dom 6` rail form are gone; the small
  tile's spoken footer stands, so `kickoffDayName`/`kickoffDayDate` still
  travel on the wire

## Context

Ed dropped `handoff_widget-redo/`: the split-panel YOUR WEEK (hero column +
nested rail card) "read as two widgets stapled together and truncated club
names in the rail". The redo puts the whole week on one spine: a fixed date
gutter, a vertical rail with three stops, the next match's stop opened up to
hold the kickoff, the other two collapsed to a line each.

Source of truth is the mock (`Your Week Widget.dc.html`, drawn at 2× a
338×158 tile); `YOUR-WEEK-WIDGET.md` is its token table, and where the two
disagree on a width the mock wins (its `1px` strokes are 0.5pt on device; the
MD converted some and not others). The handoff's own `YourWeekWidget.swift` is
a reference, NOT an ancestor of ours: it invents snapshot types, draws crests
with `AsyncImage` (a widget cannot — `CrestView` reads pre-downloaded files),
and ignores rendering modes.

## Decision

`targets/widget/YourWeekWidget.swift` is rewritten as the day spine. The
mechanics that survive translation into this codebase:

- **Snapshot v6 adds `kickoffDateLabel`** (`12 SEP` — day + pinned short
  month, uppercase in BOTH languages: it sits under the uppercase
  `kickoffDay` in a stacked gutter, where caps are the design). One injection
  point: `formatWidgetKickoffParts` gains `dateLabel`. ⚠ Optional in Swift; a
  v5 file HIDES the date line — `kickoffDayDate` is not a fallback, because
  `SÁB` over `Sáb 5` says the weekday twice in one column.
- **Per-row `Link`s, overriding the handoff's "one tap target" note** — Ed's
  call: three stops are three destinations, and `widgetURL` carries one.
- **Row bands are measured arithmetic, not `layoutPriority`** (which cannot
  express a ratio — 0086's own finding): hero `1.34` shares, each collapsed
  row `1`, of the `GeometryReader` height. Fewer fixtures drop terms, so two
  stops split 1.34:1 and one stop hands the opened row the whole area — a
  blank bottom band would read as a failed load. The collapsed rows' 0.5pt
  hairline is an OVERLAY so it costs no height.
- **The mock's opaque greys are transcribed as WHITE-ALPHA over the plate**
  (file-private `Ink`, e.g. `#e7ebec` → white .92, `#59626a` → white .35;
  within ~2 RGB points in fullColor). An opaque grey under the system's
  Tinted/Clear glass flattens to FULL white — the tint is applied at the
  colour's OWN opacity (0114) — which would erase the tile's whole hierarchy.
- **The collapsed stop dodges trap 60**: the mock runs the rail through a
  plate-filled dot; a near-black fill INVERTS under the tint. Ours is a
  clear-filled 5pt ring over a rail drawn as TWO segments — identical in
  fullColor, nothing that can bloom in accented.
- **The spine's lime is one accent group** (node + halo + rail gradient), like
  the day label, the side tag, and the followed names
  (`.widgetAccentable(followed)`) — the "which stop is next / which side is
  yours" channel survives the mode that erases colour (0114). Spine colour
  carries only WHICH STOP IS NEXT — a fact of the schedule, never liveness
  (the old `Plate` rule; this tile still reads no live data, 0086's rule).
- **The hero branches on measured height, 0108's idiom.** Harness
  (`ImageRenderer`, macOS): the full form — 23pt time framed to the mock's
  `line-height: 1` (SwiftUI's own 23pt line box is ~27.5 and those phantom
  points are what overflowed), 6pt gap, 15pt crest row — is **44.0pt**,
  against hero bands of 46.9 (standard 158 tile), 45.7 (mini), **42.9 (SE)**,
  **40.1 (zoomed SE)**. `compact` (band < 44) drops the time to 20pt and the
  gap to 4 → **39.0pt**. Only three stops on a small tile ever take it.
- **The hero pair is ONE row** (`crest · name · v · crest · name`), where 0086
  stacked — its stacking constraint died with the split panel: the worst
  realistic pair (`R. Sociedad` v `Villarreal`) measures 160pt against a
  ~244pt content column (227 on an SE). Names keep `minimumScaleFactor(0.81)`
  = exactly the 8.5pt floor; the collapsed line truncates rather than shrinks
  (0086's rule), and its time is a number, which never gives.
- **7pt is the design's ONE step under its 8.5 floor** — the collapsed date
  only, accepted by the handoff explicitly. Nothing else may join it.
- **No TBC branch**: the handoff's `timeLabel: "TBC"` cannot occur —
  `selectWidgetFixtures` drops `kickoffTbd` fixtures before the wire.
- **Header**: `Mark(size: 11)` at .92 (the handoff's `mark-accent.svg` is
  already transcribed as `Mark` — nothing is bundled), plain tracked lime
  YOUR WEEK (the 0114-era capsule is gone), quiet club count.
- The empty states are untouched (`EmptyState`, both sentences).

`_debug/widgets.tsx` grows `&clock=12` on the `?sample=` deep links — the
12-hour clock (`10:15 pm`, the tile's widest time) was not scriptable before.

## Consequences

- A new NATIVE build is needed to reach a device; the compact branch has been
  harness-measured, never seen on a real SE.
- v6 snapshots feed old extensions harmlessly (every addition optional); a v5
  file under the new extension shows day-only gutters until the app's next
  foreground rewrite.
- `Tok.accentWash`/`accentRing` lose their last widget-target caller (the old
  capsule); they stay — the tokens are shared with the notification targets.
- Two flags to judge on screenshots with Ed: the opened row filling the whole
  tile at one fixture, and the LAST collapsed row's rail running to the tile's
  bottom edge (the mock draws it; "the spine ends at the last node" was read
  as "no stubs for dropped rows" — stopping the last rail at its ring is a
  one-line change).

## Alternatives considered

- **The handoff reference file as-is** — dead crests (`AsyncImage`), no
  rendering modes, parallel snapshot types; a second wire for the same data.
- **One `widgetURL` tap target** (the handoff note) — declined by Ed.
- **Opaque hex inks verbatim** — erased by the accented mode's white tint.
- **`layoutPriority` ratios** — cannot express one; 0086 already recorded it.
