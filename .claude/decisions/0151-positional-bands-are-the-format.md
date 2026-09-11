# 0151 — Positional bands are the COMPETITION'S FORMAT, and trap 20 still holds

- **Date:** 2026-09-11
- **Status:** Accepted — the three guard clauses are harness-proven against a captured production payload
- **Decided by:** Claude
- **Builds on:** [0150](./0150-champions-league-is-a-competition-not-a-league.md), [0082](./0082-clubs-screen-rail-redesign.md) (the rank badge shares `BAND_COLOR`)

## Context

The league phase sends ranks 1–8 straight to the round of 16, 9–24 into a
two-legged play-off and 25–36 out. None of that is on the wire — the payload has
no `zone` field — and `CRONOGOL-API.md` says plainly that `zoneFor`/`bandsApply`
are **not** the thing to reach for, because `ZoneKind`'s `'ucl'` answers a
different question.

Trap 20 in the handoff says bands are per-league CONFIG, never position
arithmetic. Slicing on rank looks like exactly what that forbids.

## Decision

**It is still config, and trap 20 is untouched.**

Trap 20's reason is epistemic, not stylistic: which *domestic* rank earns which
European ticket is coefficient-driven, per-season and per-federation — not
derivable from a table, not on the wire, and `leagues.ts` records that our own
values are unconfirmed for 2026/27. Arithmetic there is guessing.

1–8 / 9–24 / 25–36 is a different kind of fact: the competition's own published
format. There is no allocation to look up and no federation to consult. So it is
expressed the same declarative way `League.zones` is — `Competition.bands`, a
required `readonly CupBand[]` of `{ kind, from, to }` — and **no component
anywhere writes `rank <= 8`**. If the format changes, the slice changes and
nothing else does.

### `cupBandsApply` takes THREE clauses, and the API doc names one

```ts
view.clubs === 36 && view.rows.length === 36 && view.lastMatchUtc !== null
```

1. The doc's own: refuse below a full field, because the order under a missing
   club is wrong in a way that looks entirely normal.
2. `rows.length` as well, because `clubs` is a server *assertion* and `rows` is
   the thing being painted.
3. ⚠⚠ **The one the doc omits** — trap 20's second clause, applied here.
   Between the July rollover and the first September kickoff the route serves 36
   clubs on zero. That is a *correct* table, and its ties fall to a club-slug
   sort, so banding it would paint nine real clubs "Eliminados" on alphabetical
   order alone. This is precisely the failure that painted Sevilla, Valencia and
   Villarreal into relegation on the web app: every number right and the colour
   a lie. The payload carries no `matchesPlayed`, so `lastMatchUtc` — a kickoff,
   null until one has happened — is the proxy.

`scripts/ucl-standings-harness.mjs` asserts all four cases against the captured
payload, so clause 3 is demonstrated rather than merely described.

### One colour map, two closed unions

`BandKind = ZoneKind | CupBandKind` widens the **key** of `BAND_COLOR`.
`ZoneKind` itself is not widened — and `competitions.ts` now carries a
compile-time proof of that (`CUP_BANDS_ARE_NOT_ZONES`), which stops compiling
the moment someone merges them. Widening it would let `League.zones` accept
`{ kind: 'r16' }`, let `zoneFor` return `'r16'` for a domestic league, and
oblige `copy.table.zoneLabels` to carry strings for three kinds no domestic
legend can show.

⚠ **`legend.tsx`'s duplicate `BAND` map is deleted** in the same change. It was a
live violation of `band-rail.tsx`'s own header — *"a second copy would let a band
recolour repaint the table and not the rail"* — and three new keys would
otherwise have gone in twice.

### Three new tokens, not reuse

`bandR16` / `bandPlayoff` / `bandOut`. ⚠ `bandR16` is the **same hex** as
`bandUcl` and is a different statement; the `moved`/`bandUel` pair already
carries that trap, and the token comment names it. `bandPlayoff` and `bandOut`
are the backend poster's exact hexes and deliberately **not** `bandConf`/`bandRel`
— reusing those would have two surfaces of one product draw the same table in
different violets.

## Consequences

- The legend's labels are `Partial<Record<BandKind, string>>`, necessarily: no
  caller holds both vocabularies. A band with no words is skipped rather than
  drawn wordless — the same rule as "never caption a colour nobody can see".
- ⚠ The poster's lighter `CORAL_INK #ff9b8f` is **not** ported. It exists because
  the poster inks band *labels* in the band colour and coral fails contrast
  there; our legend inks labels `textFaint`, so the problem never arises. Do not
  "improve" the legend into it.
- The play-off band runs sixteen consecutive rows, which makes `BandRail`'s
  inset-not-stretched rule matter more than it ever did domestically.

## Alternatives considered

- **Add the three kinds to `ZoneKind`** — one union, and it loses a build error
  that should exist. See above.
- **Reuse `bandConf`/`bandRel`** — cheaper, and puts the app and the poster in
  different violets for the same band.
- **Band on `matchday !== null` instead of `lastMatchUtc !== null`** — nearly
  equivalent, and wrong in the common case: `matchday` is null on two nights in
  three mid-round, over a table that is perfectly bandable.
