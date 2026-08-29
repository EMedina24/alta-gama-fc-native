# 0059 — The YOUR WEEK widget names both sides, and marks the followed one

- **Date:** 2026-08-28
- **Status:** Accepted — verified on the simulator
- **Decided by:** Ed Medina

## Context

`YourWeekWidget`'s medium row ([0047](./0047-widgets.md)) drew the FOLLOWED club's
crest, then the opponent as `Real Madrid` or `at Girona`, then `Sat 21:00` at 14pt.
The reader's own club was never named — it had to be inferred from a 22pt crest and
a preposition. For a club drawn as a lettered tile (every Bundesliga and Serie A
side) that inference is a three-letter code.

A design pass replaced the row with a **named fixture**:

```
[crest] Valencia (HOME)   v   [crest] Real Madrid        SAT
                                                        21:00
[crest] Girona            v   [crest] Athletic (AWAY)    SUN
                                                        18:30
```

## Decision

### Both sides named, home first, the followed side lit and tagged

Each row is `side(home) · v · side(away) · kickoff`. A side is crest, name, and —
only on the followed side — a `HOME`/`AWAY` capsule. The followed name is accent;
the other is ink. **Home is always on the left**, the rule `W.pairLabel` already
states, so the reader's club lands on whichever side it actually plays.

⚠ **This deliberately marks the followed side, which [0043](./0043-upcoming-cards-name-the-sides.md)
deliberately does not.** That is not a contradiction: 0043's cards ALL involve a
followed club, so a mark would light every card and say nothing. This widget is a
per-club list and *which end is yours* is its point.

### Kickoff is a stacked column, UPPERCASE

`SAT` (10pt tracked, `ink45`) over `21:00` (20pt heavy tabular). `format.ts`'s
`formatWidgetKickoff` is documented as sentence case *because* it is inline; the
stacked block is where the module says caps are the design, so a new
`formatWidgetKickoffParts` returns `{ day, time }` uppercased. `kickoffLabel`
survives untouched — it still carries the small widget and all three accessories.

### The snapshot grows, and every new field is optional in Swift

`snapshot.ts` v1 → **v2**: `homeName`, `awayName` (via `displayName`, the Today
board's call), `kickoffDay`, `kickoffTime`, and copy `homeTag`/`awayTag`.
`Snapshot.swift` mirrors them all as `String?`. A v1 file written by an older app
still decodes; the row then draws the abbrs and the one-line `Sat 21:00`. The
header's promise — "a missing field is a quieter widget, never a crash" — holds.

⚠ **Two new copy keys rather than reusing `copy.widgets.away`.** That key is the
preposition `at`/`en`. Repurposing it to `AWAY` would have been a silent semantic
swap between two files that must agree; it stays, now unused by the widget.

### Two tokens cross into `Tokens.swift`

`accentWash` and `accentRing` — the capsule `versus-badge.tsx` already draws in the
app. Nothing else; the header's "keep this list SHORT" stands.

## Consequences

- ⚠ **Width is the trap.** On an iPhone SE the row is ~300pt for two 22pt crests,
  two names, a pill, a `v`, and a two-line kickoff. The pill and the kickoff are
  `fixedSize()`; the **names** carry `minimumScaleFactor(0.7)` and are what give
  way. `Valencia HOME v Real Madrid` is the case to check first on the SE.
- Row padding 7 → 5 so three two-line rows fit `systemMedium`. Header unchanged.
- `W.opponentLabel` is deleted; nothing drew it.
- ⚠ **`R. Madrid` turned out to be a rule, not a width trick.** The first
  simulator run with `displayName` drew `Real Mad…` beside a full `Málaga`; with
  the followed side given `layoutPriority`, the opponent collapsed to `Mál…`
  instead. Two full names and a pill do not share a 329pt row. `widgetName` in
  `derive.ts` now contracts a multi-word name past nine characters to an
  initial (`R. Madrid`, `D. Alavés`, `R. Vallecano`), display-only, on both
  sides — and a contraction still past eleven characters falls to its last
  word (`R. Vallecano` → `Vallecano`), because `R. Val…` was the next thing the
  simulator drew. The followed side keeps `layoutPriority(1)` so that if
  anything still gives way it is the opponent.
- The final row is name 13pt, pill 8pt, time 18pt — each one step under the
  plan's 13.5 / 9 / 20, bought back for the opponent's name. Verified on an
  iPhone 17 Pro with four real clubs; not yet on an SE-width simulator.
- `buildSnapshot` takes a second formatter; both call sites
  (`use-push-sync.ts`, `_debug/widgets.tsx`) pass it.
- `handoff_AG-ios/SPEC.md` §4 now describes the old row, as it already does for
  [0058](./0058-next-widget-centres-and-ticks.md).

## Alternatives considered

**Keep the opponent-only row and just split the kickoff.** Cheaper, but leaves
the followed club unnamed — the complaint that prompted the pass.

**Reuse `copy.widgets.away` for the pill.** Rejected above: a preposition and a
tag are different words in Spanish (`en` vs `FUERA`), and the key already means
one of them.

**Required (non-optional) Swift fields with a `v` check.** Would turn every v1
snapshot into the "Open Alta Gama FC" empty state until the app's next foreground
— a working widget going blank on an app update, for no gain over degrading.
