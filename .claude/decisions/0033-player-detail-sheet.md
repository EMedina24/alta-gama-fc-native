# 0033 — Tapping a squad row opens a player sheet, read from the squad payload

- **Date:** 2026-08-25
- **Status:** Accepted
- **Decided by:** Ed

## Context

The Players tab rendered shirt + name and nothing else, on inert rows. Every
other field the API returns per player — portrait, nationality, age, height,
weight, foot — was fetched, typed and thrown away; a grep for `heightCm`,
`weightKg` or `photoUrl` outside `types.ts` returned zero hits. The web app has
shipped a player dialog on `?tab=players` for a while, so the native app was the
odd surface out.

Three things constrained how it could be built:

1. **There is no single-player endpoint and none is coming.** `GET
   /cronogol/teams/{slug}/squad` returns the complete per-player dataset; there
   is no `/cronogol/players/{id}` and none in the API's "what is coming".
2. **Most of the fields are nullable, and one is null forever.** LaLiga publishes
   no `foot` at all, so on a Spanish club that cell is *always* empty.
3. `SPEC.md` §club said "Players = squad list … identity fields only", which
   described the list before this sheet was asked for.

## Decision

A `formSheet` route at `(sheets)/player`, registered in the root stack per
[0030](./0030-sheets-are-presented-by-the-root-stack.md), taking `{ slug, id }`
and reading the **already-cached `useClubSquad(slug)` query**. It issues no
request of its own — the same thing the web dialog does with its list payload.
`id` is the stable person id; the shirt is not a key, because a Premier League
squad can carry two players wearing the same number.

Two deliberate divergences from the web:

- **A null renders an empty cell that keeps its label and its place in the
  grid**, where the web dialog drops the whole row. The six fields are a fixed
  2×3 block, so a blank is visible rather than invisible — and the footnote is
  what pays for it, naming the league's silence as the reason. (Chips are the
  exception: a chip has no blank form, so a null field drops its chip.)
- **Weight and registered season are shown.** The web renders neither, though
  both are on the payload.

Rows gain a portrait thumb and a chevron. A press handler with no visible
affordance is a feature nobody finds.

`sheetAllowedDetents: 'fitToContents'` rather than a fraction: the sheet is one
fixed block, and a `0.6` detent either clips the Done button or leaves dead space
under the footnote.

## Consequences

- Opening the sheet is free and works offline for a squad already viewed. It is
  also **not deep-linkable in practice** — a cold open on `/player?slug=…&id=…`
  refetches the squad, which is why the route has a pending branch and a
  not-found branch rather than assuming a warm cache.
- The empty-cell rule now has a visible cost: on every LaLiga club, FOOT is
  blank. **Removing the footnote turns that from honesty into an apparent bug.**
- `PlayerPhoto` must never assume an aspect ratio. Sources are 256×278 (LaLiga),
  110×140 (Premier League), and unconstrained for an operator-uploaded stopgap —
  hence `contain` on the card. Its silhouette is a designed state, not an error
  state: `photoUrl` is null for ~1 in 5 LaLiga players and ~1 in 2 PL ones.
- This supersedes `SPEC.md` §club's "identity fields only" as a description of
  the *tab*, not as a statement about the data. **There are still no statistics
  and none are coming** — no slot exists here for one.
- `dateOfBirth` and `placeOfBirth` stay unrendered, permanently. They are exact
  birth dates and home towns of named living people, minors included, on an
  unauthenticated cacheable route.

## Alternatives considered

- **Expand the row in place**, as the standings table does — rejected: the
  portrait needs more room than a row can give without pushing the rest of the
  band off screen.
- **A local Spanish country-name table** for the nationality cell — rejected: ~100
  hand-maintained entries keyed on FIFA (not ISO) codes, where a miss is a blank
  cell. Shipping the API's English name is the trade-off `cronogol` already made
  and documented.
- **`react-native-svg` for the silhouette** — rejected: it is a dependency but is
  imported nowhere in `src/`, and a circle over a dome does not justify being its
  first use.
- **Fetching a player by id** — not available, and not coming.
