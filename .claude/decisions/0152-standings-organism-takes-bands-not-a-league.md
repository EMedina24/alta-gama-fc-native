# 0152 — The standings organism takes BANDS, not a league

- **Date:** 2026-09-11
- **Status:** Accepted
- **Decided by:** Claude
- **Builds on:** [0013](./0013-atomic-design-components.md) (atomic design), [0151](./0151-positional-bands-are-the-format.md)

## Context

`StandingsTable` took `{ table: StandingsTableView, league: League }` and called
`bandsApply` / `zoneFor` / `usedZones` itself. Four things then blocked reuse for
the Champions League, which bands on a different rule over a different payload:

- `UclStandingsView` is not a `StandingsTableView` — no `league`, no
  `matchweek`, no `matchesPlayed`, no `matchesTotal`.
- No `League` exists for it, by [0150](./0150-champions-league-is-a-competition-not-a-league.md).
- `copy.zoneLabels` is `Record<ZoneKind, string>`.
- ⚠ **`row.form` was read in TWO places**, and the parent's was the one that
  would have red-screened first: `formLabel={copy.formLabel(Math.min(row.form.length, 5))}`
  is a *prop expression*, evaluated before `ExpandedRow` ever mounts.

## Decision

The organism takes `rows`, a `bandFor(rank)` and a `bands[]` already resolved by
the caller, plus an optional `canOpenClub`. `bandsApply` / `zoneFor` /
`usedZones` move up to the screen, and this file imports no catalogue at all.

`row.form` becomes `form?: readonly FormResult[]` on a new
`StandingsTableRowView` — **optional, never nullable**, because the cup route
omits the field entirely and the API doc says it does so deliberately "so
nothing has to guess what an empty array meant". The type says the same thing.
The guard sits at the prop expression, where the crash was.

## Consequences

- **Five small edits and zero new components**, against a fork's four new files
  (~250 lines) duplicating the head row, the one-row-open state machine, the row
  layout and the legend — a permanent second copy of the very thing whose parts
  already carry a header warning about second copies.
- **Better independent of the cup.** "May this table be coloured?" is a question
  about the DATA, and it now lives where the data is. The organism stops
  importing `League` and stops being a domestic-table component by construction.
- ⚠ The guards it used to own are now the caller's responsibility, and they are
  the whole feature. The organism's header names both and points at them; the
  screen calls them in one place each.
- `bandLabels` is `Partial<Record<BandKind, string>>` — no caller holds both
  vocabularies (see 0151).
- 0013 is unchanged: dependencies still point downward, and the organism now
  fetches *less* policy than it did.

## Alternatives considered

- **Fork `UclStandingsTable`** — see the line count above, and the two copies
  would drift on the row layout first.
- **Keep `league` and add an optional `competition` beside it** — two nullable
  props where exactly one is ever set, and every internal read becomes a branch.
- **Make `UclStandingsView` structurally assignable to `StandingsTableView`** by
  filling sentinels — `matchesPlayed: 0` on a played table is a lie the guard
  would then read.
