# 0069 — FINISHED TODAY rows are a stacked pair with a fixed goal column, and no `FT` word

- **Date:** 2026-08-29
- **Status:** Accepted — verified on the simulator (`/_debug/gallery?only=finished`); row expansion not driven
- **Decided by:** Ed Medina

## Context
The FINISHED TODAY row was one line: crest · name · `Score` chip · name · crest ·
`FT` eyebrow · chevron. The trailing `FT` cell cost ~50pt with its chevron and
the two name columns paid for it: on a 393pt screen `Nottingham Forest`,
`Brighton & Hove Albion` and `Real Sociedad` all truncated — the failure 0029
names as the one that must not ship. The section is already titled "Finished
today", so the row was repeating its own heading at the names' expense.

A preview of three treatments (trim the word; stack the pair; fold FT under the
chip) was approved before code: the stacked pair.

## Decision
1. **Each match is a stacked pair**: home over away, one `Size.crestRow` crest
   and one `bodyStrong` name per line, `Spacing.two` between the lines. The name
   gets the row's width minus one crest and the goal column, so the longest
   tracked club name fits at 393pt with room.
2. **Goals are a fixed right-aligned column**, `Type.numeral`, `tabular`,
   `Size.goalColumn` (22pt, measured — two digits) wide, with a `hairlineMid`
   rule on its left running the pair's height. Three matches in a group read
   down like a table. ⚠ The `Score` chip is NOT used here: it is a split pair
   and a per-line digit is a different shape. The chip stays on the live,
   last-result and jornada rows (0044) untouched.
3. **Emphasis per line** — `scoreEmphasis` mutes the loser's name AND goal to
   `textDim`; a draw leaves both full. Same rule as the chip, applied twice.
4. **No `FT` word.** `FinishedTodayProps.finishedLabel` is gone and the caller
   no longer passes `copy.today.finished`; the copy key stays (the widget may
   yet want it). ⚠ Nothing may be added to the right of the goals without
   re-measuring the longest name — that is how the last layout failed.
5. **The chevron keeps its own column** (`Size.chevron` + `Spacing.half`), centred
   on the pair. Still not a hit target; the row is (0045).
6. **Accessibility unchanged**: one VoiceOver stop per match, the same
   `"{home} {gh}, {away} {ga}"` label and expand/collapse hint.
7. The row is taller (~74pt from ~50pt), so 0062's "band thinner than the row"
   rule still holds without re-measuring the band.

## Consequences
- One organism and one token change; no atom or molecule touched.
- The section grows by ~24pt per match — at most ~140pt on a six-match day.
- `/_debug/gallery?only=finished` renders the section on fabricated long-name
  fixtures, one draw and one null-crest pair — the only screenshot path.

## Alternatives considered
- **Drop the word, keep the chevron** — ~40pt back; the longest pairs still
  truncated in the preview.
- **`FT` under the chip** — gained only the chevron's width.
- **Shrink the names to `callout`** — a smaller name to fit a label the section
  already carries is the wrong trade.
