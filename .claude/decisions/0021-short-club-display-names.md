# 0021 — Club names are shortened for display

- **Date:** 2026-08-24
- **Status:** Accepted
- **Decided by:** Ed Medina

## Context
Since 2026-07-29 the API's `TeamView.name` is the club's **display** name carrying
its legal prefix: `FC Barcelona`, `RCD Espanyol de Barcelona`, `CA Osasuna`,
`Villarreal CF`. On the web that is fine — a table row has room.

The native table gives a club name roughly 150pt at phone width. Rendered as-is,
row 5 read `RCD Espanyol de Ba…` on production data. The design mock shows short
names throughout (`Barcelona`, `Villarreal`, `Athletic`, `Betis`).

There is no short display name on the wire. `shortName` is the **3-letter code**
(`BAR`), which is the monogram, not a name.

## Decision
Add `displayName(name)` to [derive.ts](../../src/lib/cronogol/derive.ts): drop
leading **and** trailing club-type tokens, reusing the `NOISE` set that
`abbreviate` and `sortClubs` already share.

```
FC Barcelona              → Barcelona
Villarreal CF             → Villarreal
Athletic Club             → Athletic
CA Osasuna                → Osasuna
RC Deportivo              → Deportivo
RCD Espanyol de Barcelona → Espanyol de Barcelona
Real Madrid               → Real Madrid      (unchanged — not noise)
Atlético de Madrid        → Atlético de Madrid
Deportivo Alavés          → Deportivo Alavés
```

## Consequences
- ⚠ **Display only. Never a key, never persisted, never sent to the API.** `slug`
  is the identifier, always. This is the same discipline `shortName` needs —
  Valencia and Valladolid collide on it.
- ⚠ It never strips every word: a name made entirely of club-type tokens keeps
  the original, so nothing can render as an empty string.
- It is a **derivation, not a table**. A hand-maintained short-name map would be
  more editorial and would drift the moment a league is added — this reuses the
  noise set the monogram and the sort order already depend on, so the three stay
  consistent by construction.
- `Espanyol de Barcelona` is still long. Accepted: shortening further means
  deciding that "de Barcelona" is droppable, which is editorial judgement about a
  club's name rather than a mechanical rule.
- This is an addition, not a port — `cronogol` has no counterpart, so it will not
  appear in a diff against the web app.

## Alternatives considered
- **Render the full name and let it ellipsise** — what production showed; the
  design explicitly does not.
- **A per-club short-name map** — precise, but 100+ clubs and growing, and it
  drifts silently the day a league is registered.
- **Ask the backend for a short name** — the right long-term answer if this ever
  needs editorial control. Not worth a backend change for a mechanical strip.
