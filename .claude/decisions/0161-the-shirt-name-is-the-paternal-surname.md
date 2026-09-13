# 0161 — The shirt name is the paternal surname, and the particle guard is the whole trick

- **Date:** 2026-09-12
- **Status:** Accepted — verified against every squad the app can reach (297 Honduran + 109 European players); ⚠ not yet seen on the XI board
- **Decided by:** Ed (chose the paternal-surname rule over always-last and over leaving names whole)
- **Caused by:** [0159](./0159-liga-hondubet-joins-the-catalogue.md) · **Extends** [0105](./0105-lpr-clausura-and-league-capability-flags.md), which introduced `playerFamilyName` for Puerto Rico's comma form
- **Reads:** [0065](./0065-starting-xi-builder.md) (the token this sizes)

## Context

`tokenName` is `player.shortName ?? playerFamilyName(player.name)`. Honduras serves
**`shortName: null` on every player** and a full legal name in the `name` field, and
`playerFamilyName` only shortened the **comma** form Puerto Rico serves. So a Honduran
name came back whole onto a shirt-sized token.

Measured across all twelve Honduran squads, 2026-09-12:

| | |
| --- | --- |
| players | 297 |
| **names ≥ 13 characters** | **296** — `nameSize`'s smallest step, so essentially every token clipped |
| four tokens (given · given · paternal · maternal) | 267 |
| three · two · five tokens | 21 · 7 · 2 |
| longest | `Edwin Alexander Rodriguez Castillo` (34) |

⚠ **This was never a Honduras-only problem.** Arsenal serves a `shortName` for **6 of
49** players, so 43 Premier League tokens were already rendering `David Raya` and
`Bukayo Saka` in full. LaLiga was the reason nobody noticed: Barcelona and Real Madrid
are 100% covered, so the fallback was almost never reached.

## Decision

`playerFamilyName` gains two arms below the comma one, and a deny-list:

1. **Comma form** — unchanged. The whole first half; both surnames belong to it.
2. **Fewer than four tokens → the LAST word.** `David Raya` → `Raya`.
3. **Four or more → the second-to-last**, the Spanish paternal surname.
   `Edrick Eduardo Menjivar Johnson` → `Menjivar`.
4. ⚠⚠ **…unless that word is a particle, in which case take the last.**

### The particle guard is not a polish item — it is the reason this is shippable

Without it, four real names in production resolve to a preposition on a shirt:

| Name | Naive `[-2]` | Guarded |
| --- | --- | --- |
| `Gabriel Fernando de Jesus` | **`de`** | `Jesus` |
| `Rodrygo Silva de Goes` | **`de`** | `Goes` |
| `Endrick Felipe Moreira de Sousa` | **`de`** | `Sousa` |
| `Bernardo Mota Veiga de Carvalho e Silva` | **`e`** | `Silva` |

Three of those four are also the *right* answer — Gabriel Jesus and Bernardo Silva are
the playing names. The guard steps past exactly one particle, which is all any name in
this data needs.

### ⚠⚠ What this knowingly gets wrong, and why it is safe anyway

**The Spanish and Portuguese orders are opposite.** Spanish is given · paternal ·
maternal, so the paternal surname is second-to-last. Portuguese is given · maternal ·
paternal, so it is *last*. `Gabriel dos Santos Magalhães` therefore answers `Santos`
where a Brazilian would say Magalhães. **Nothing in a name says which convention it
follows**, and no particle list fixes it.

This is survivable because of **where the function is reached**, not because the rule is
right: `tokenName` prefers `shortName`; LaLiga — the league whose squads are full of
Portuguese-convention names — serves one for every player; the Premier League's unnamed
rows are all two tokens (arm 2); and Honduras is Spanish. Every four-token Portuguese
name in production has a `shortName` and never reaches arm 3.

⚠ **So this ADR's real content is a tripwire:** a Portuguese-convention league arriving
with null `shortName`s needs a different answer, not a longer particle list. The harness
pins `Gabriel dos Santos Magalhães → Santos` deliberately, as a KNOWN answer rather than
a surprise.

## Consequences

- **Zero** Honduran tokens now exceed 12 characters, so none falls to `nameSize`'s 19pt
  step; the longest is `Villafranca` (11). Before this, 296 of 297 did.
- **43 Arsenal players get a real shirt name** — `Raya`, `Saka`, `Ødegaard`, `White` —
  where they previously carried their full name. An unlooked-for fix, and the reason
  arm 2 is a separate arm rather than folded into arm 3.
- LaLiga is **byte-identical**: every Barcelona and Real Madrid player has a `shortName`,
  so `playerFamilyName` is not called for them at all.
- Puerto Rico is **byte-identical**: the comma arm is untouched.
- `playerDisplayName` is **untouched** and still returns a comma-less name whole — lists,
  headers and the player sheet keep the full name, which is 0105's rule and still right.
  ⚠ The two now disagree on a trailing-comma name (`MALFORMED,` → `MALFORMED` here,
  `MALFORMED,` there); both were already true and the harness records it so neither is
  "fixed" into the other.
- 14 assertions in `scripts/team-window-harness.mjs`, including all four particle cases
  and the documented Portuguese miss.
- ⚠ **Not yet seen on the XI board.** The arithmetic says every token fits; the shirt is
  a visual judgement and has not been made.

## Alternatives considered

- **Always the last token.** Simpler, never guesses at structure — and wrong for all 267
  four-token Honduran names, where it returns the *maternal* surname (`Johnson`, not
  `Menjívar`). Wrong more often than this rule, just more predictably.
- **Leave names whole and cap the length**, falling back to initials past a threshold.
  Never prints a wrong name; prints a monogram for essentially every Honduran player,
  which is what the XI board already does for a missing portrait and would make a
  Honduran lineup a grid of initials.
- **Title-casing or normalising.** Refused for the third time, on 0105's grounds: no
  casing rule survives `O'NEILL`, `DE JESUS` and `McCARTHY` at once.
- **Asking the backend for a `shortName`.** The right long-term answer and not available:
  the Honduran source publishes none, so the backend would be inventing one with exactly
  this rule, one repo further from the screen that has to fit it.
