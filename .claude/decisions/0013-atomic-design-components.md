# 0013 — Atomic design for the component layer

- **Date:** 2026-08-24
- **Status:** Accepted
- **Decided by:** Ed Medina

## Context
`src/components/` is currently a flat folder of starter components. The app will
grow to roughly the size of `cronogol`'s component layer (~120 components), which
already decomposes along the same instinct: an organism at
`components/foo.tsx` with its smaller parts co-located in `components/foo/`
(e.g. `standings-table.tsx` + `standings-table/{standings-row,form-strip,following-pill}.tsx`).

The request is to make that structure explicit and consistent.

## Decision
Organize `src/components/` by **atomic design**:

```
src/components/
  atoms/        indivisible primitives — no domain knowledge, no data fetching
  molecules/    small compositions of atoms with one job
  organisms/    self-contained domain sections
  templates/    page-level layout scaffolding (add when a second screen needs it)
```

Screens stay in `src/app/` ([0002](./0002-expo-router-file-based.md)) and act as
the "pages" tier — they compose organisms and own routing/params.

**Which tier does something belong in?**

| Tier | Test | Examples |
| --- | --- | --- |
| **atom** | Cannot be usefully split. Knows nothing about football. | `text`, `badge`, `crest`, `skeleton`, `pill` |
| **molecule** | A few atoms doing one job. Takes props, not queries. | `fixture-timing`, `form-strip`, `score-line`, `list-controls` |
| **organism** | A section a screen would name. May take a whole domain object. | `fixture-list`, `standings-table`, `squad-list`, `news-feed` |
| **template** | Arranges organisms; no domain data of its own. | `screen-scaffold` |

**Rules**

- **Dependencies point downward only.** Organisms may use molecules and atoms;
  molecules may use atoms; **atoms import no other component.** No upward or
  sideways imports within a tier's siblings — if two molecules need the same thing,
  it is an atom.
- **No data fetching below organisms.** Atoms and molecules are pure and prop-driven.
  Fetching lives in screens or a data layer; organisms may accept already-fetched
  domain objects.
- **Co-locate parts that serve one organism**: `organisms/standings-table/` holds
  `index.tsx` plus its private pieces. Promote a piece to `molecules/` only when a
  *second* organism needs it — not in anticipation.
- Existing `ui/` primitives fold into `atoms/`.
- File naming stays kebab-case, imports stay `@/components/<tier>/<name>`
  ([0003](./0003-src-directory-and-alias.md)).

## Consequences
- A component's tier is legible from its path, and "where does this go?" has an
  answer that doesn't need a meeting.
- The downward-only rule is what actually keeps this from decaying into three
  folders with the same tangle. It is worth enforcing on review.
- Atoms are where the design system lands
  ([0014](./0014-app-specific-design-language.md)) — when the design is settled,
  most of it should be absorbable by changing atoms alone.
- Some churn now: the starter's `themed-text`, `themed-view`, `hint-row`,
  `web-badge`, `animated-icon`, `external-link`, `ui/collapsible` need sorting into
  tiers. Worth doing before the first real screen, not after.
- Mapping from `cronogol` is not mechanical — its organism/parts split translates,
  but its flat top level does not.

## Alternatives considered
- **Mirror `cronogol` exactly** (flat files + co-located parts folder) — familiar
  and less migration, but it is the structure that made the request for something
  explicit come up in the first place.
- **Feature folders** (`src/features/standings/…`) — good isolation, but the shared
  primitive layer this app needs would end up homeless or duplicated.
