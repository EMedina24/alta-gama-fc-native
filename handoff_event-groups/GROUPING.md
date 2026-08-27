# Match events — grouping (segmented tabs)

Code handoff for the grouping control only. Everything else about the expanded row
(disclosure, glyphs, row anatomy, data contract) is in `export/match-events/`.

- `tabs-goals.png` — Arsenal 2–0 Brighton, Goals active (786×1704, 2x).
- `tabs-empty-group.png` — Leverkusen 3–1 Wolfsburg, no bookings: `Cards 0` dimmed.
- `EventTabs.tsx` — reference implementation (grouping + control).

## What it is

The expanded panel opens on a three-way segmented control — **Goals · Cards · Subs**,
each with its count — and shows one group at a time. It replaces the `MATCH EVENTS`
eyebrow; the tabs label themselves, so both would be redundant.

Chosen over: filter chips over a whole timeline, type-labelled sections, and grouping by
half. Tabs won on panel height — the row stays short enough that the matches under it are
still on screen.

## Grouping

Four event kinds collapse into three groups. `yellow` and `red` share one group: a card
is a card to someone scanning, and splitting them would leave two one-row tabs.

| Group | Kinds |
|---|---|
| `goals` | `goal` |
| `cards` | `yellow`, `red` |
| `subs` | `sub` |

Yellow and red are still told apart at row level by the glyph colour — never rely on the
tab to carry that.

## Behaviour

- **Opens on the first non-empty group.** A 0–0 with two bookings opens on Cards, never on
  an empty Goals tab.
- **Resets per match.** Opening a row always lands on its first non-empty group, never on
  whatever the previous match was showing.
- **Empty groups stay visible**, dimmed and non-interactive, reading `0`. The count is
  information — a four-goal game with no bookings is worth seeing.
- Within a group, events stay in feed order — chronological. Never re-sort inside a group,
  and never group by team.
- One row open at a time across the whole screen; opening a second closes the first.

## Values

| | |
|---|---|
| Track | `#15171A` on the panel ground, `#101317` inside the live card |
| Track radius / padding | 10 / 3 |
| Segment | `flex: 1`, height 28, radius 8 |
| Segment active | `#242830` |
| Label | 700 · 11 · `+0.02em` — active `#F4F6F6`, idle `#7C858B`, empty `#3D444A` |
| Count | 700 · 10 · tabular — active `#C8F25A`, idle `#59626A`, empty `#3D444A` |
| Gap below control | 12 |

The count is the only lime in the panel, and only on the active tab.

## Strings

| Key | EN | ES |
|---|---|---|
| `evGoals` | Goals | Goles |
| `evCards` | Cards | Tarjetas |
| `evSubs` | Subs | Cambios |
