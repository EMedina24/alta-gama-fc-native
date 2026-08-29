# 0056 — Onboarding browses every league, behind chips that name themselves

- **Date:** 2026-08-28
- **Status:** Accepted
- **Decided by:** Ed Medina

## Context
The first screen a new reader ever sees offered one league. `onboarding/clubs.tsx`
browsed `useTeams(DEFAULT_LEAGUE.apiSlug)` and nothing else, with no on-screen
indication that the scope was LaLiga at all — unlike the Clubs tab, which at
least prints `EXPLORAR PREMIER LEAGUE` over its list. An Arsenal or a Bayern
supporter could reach their club only by typing its name into a field whose
placeholder says "Search for a club", with nothing anywhere to suggest the other
three leagues existed.

This is also the screen where the follow list is built, and that list is what
drives the calendar, the Today board and every push alert. A reader who finishes
onboarding having found nobody is not likely to come back later and discover the
Clubs tab's league row.

[0032](./0032-clubs-browse-by-league.md) had already solved the data half of this
for the Clubs tab, and its two-query split ports over unchanged.

## Decision
- **`LeagueChips` — a new molecule, a 2-up grid of chips carrying artwork AND the
  league's name** — sits on onboarding and drives `useTeams(league.apiSlug)`.
- **The selected league is screen state**, exactly as in 0032. It is a place in a
  list; nothing about a reader's follows depends on it, so it is not a preference
  and `Preferences` gains no field (`SCHEMA_VERSION` stays at 3).
- **The chips hide while searching**, as the Clubs tab's row does — search spans
  every tracked club, so a league filter over those results would claim a scope
  the list does not have.
- **The search field sits above the chips**, which inverts nothing on the Clubs
  tab but matters here: the chips unmount on the first keystroke, and anything
  below them gets yanked upward under the reader's finger mid-type.
- **Only the grid waits on the roster.** The screen had no loading state at all —
  `shown` was `[]` while pending and it painted an empty grid, which was
  survivable when the roster loaded once and is not when every chip tap refetches.
  `browse.isPending` now gates the grid alone, skeleton first.
- **Picks survive a league switch.** A reader can take Barça, move to the Premier
  League and take Arsenal; the footer's `Continue with 2 clubs` is the only
  feedback that the off-screen one is still held. No picked-clubs strip.

### The chips name themselves, and [0031](./0031-league-filter-tiles-are-artwork-only.md) does not
0031 made the `LeagueSwitch` tiles artwork alone, and said plainly that "a league
chip that names itself on one screen and not the other would be worse than either
rule applied consistently." This entry does exactly that, on two grounds:

1. **0031's premise expires on this screen.** Its reasoning is that "the reader is
   choosing between four marks they already recognise; the row is a filter, not a
   legend." In onboarding the reader has never opened the app before and is
   choosing a league for the first time. Here it *is* a legend.
2. **A wrapping 2-up grid has the width a fixed-height row did not.** 0031's actual
   failure was the Bundesliga tile — emblem plus a nine-character eyebrow — running
   off the right edge of the Jornadas screen. A chip at `48%` has room for
   `Premier League` on two lines and structurally cannot overflow.

⚠ **0031 is narrowed, not superseded.** Its rule still governs `LeagueSwitch` on
Matchdays, Table and Clubs, and that component is untouched. What is scoped down
is its reach: artwork-alone is the rule for the horizontal filter row, not for
every surface that offers a league.

`LeagueChips` is a separate component rather than a `size`/`labelled` prop on
`LeagueSwitch`, because that component's contract is "artwork alone, one fixed
size, horizontal scroll" and every line of it encodes 0031. A variant flag would
make one component argue with its own doc comment.

### No light plate — 0031's nominated fix was wrong
0031 closed by warning that the Premier League's mark is faint on this ground, and
that "if it proves unreadable, the fix is the light plate `cronogol` puts behind
them, not the label coming back." Both halves of that turn out to be wrong, and
the plate would have been actively harmful:

- **`cronogol` puts no plate behind them.** Its `ui/atoms/league-mark` renders the
  transparent marks directly and accepts the low contrast on Bundesliga and Serie A.
- **The Premier League's `primary` became a PURE WHITE mark on 2026-08-08** — the
  API doc calls it "the correct mark for a dark UI" and "the one league whose
  `logoUrl` you cannot drop onto an arbitrary background." A light plate would
  render invisible the one league the plate was meant to rescue.
- **What actually made it faint is `LeagueSwitch`'s 50% idle opacity**, which turns
  a white mark grey. `LeagueChips` does not carry that: on a first-run screen an
  idle chip at half opacity reads as a disabled option, so selection is the accent
  ring alone — which is how the club tiles directly below it already work.

⚠ `lib/cronogol/types.ts` still says every league mark is "drawn for a **light**
background" and needs a plate. That comment predates the 2026-08-08 artwork change
and is stale for the Premier League; it is left alone here rather than edited
blind, since it is still true of the other three.

### `leagueOptions()` resolves `onDark` first
The chain becomes `onDark ?? icon ?? primary ?? logoUrl`. `onDark` exists for the
Premier League alone and today *equals* `primary`, so this changes no pixel on any
screen — it is insurance for the next time that artwork changes ink, which it has
already done once. Every surface in this app is dark (`Colors.light` is an alias of
`dark`), so there is no case where the `onLight` half of the API's theme-aware
chain applies. Keeping it in the catalogue is what 0032 decided: the semantic-key
trap gets encoded once, not at each screen that draws a mark.

## Consequences
- Every tracked league is reachable at first run, and a fifth league appears in
  onboarding with no front-end work — the chips read `LEAGUES`, and the artwork
  comes off the wire.
- Switching league costs one `catalogue`-cadence fetch per league, cached by
  `keys.teams(apiSlug)` for the session; a second visit is instant. Onboarding and
  the Clubs tab share that cache, so a reader who browsed the Premier League here
  finds it already warm on the tab.
- No new copy. League names come from `LEAGUES` (proper nouns, untranslated) and
  the chips name themselves, so no header restating the scope is needed and
  `copy.onboarding` is unchanged in both locales.
- **Segunda is served by the API and does not appear**, because `LEAGUES` holds
  four and has no entry for it. That is the same filter the Table screen applies
  deliberately; admitting Segunda is a catalogue decision of its own, not a side
  effect of this one.
- Not addressed, as in 0032: a league with `live: false` (Ligue 1, when it lands)
  will draw a chip and browse to an empty grid. `LIVE_LEAGUES` exists for that and
  the chips should take it once a non-live league is actually in the catalogue —
  today all four are live, so filtering would be untestable code.
- Still open: the grid has no error state. It had none before this change either,
  but a chip tap now makes a failed roster fetch reachable in a way a single
  page-load fetch was not.

## Alternatives considered
- **Reuse `LeagueSwitch` unchanged.** Zero new code and perfectly consistent, but
  it puts four unlabelled marks at 50% opacity in front of someone who has never
  seen the product, and the one screen where a mark most needs naming is the one
  where the reader knows the app least.
- **A `size="large"` prop on `LeagueSwitch`.** Keeps 0031's one-rule-everywhere
  intact and scales the tiles up, but a bigger unlabelled mark is still unlabelled
  — it addresses the wrong half of the problem.
- **A picked-clubs strip above the grid**, so cross-league picks stay visible and
  removable. Real feedback, but it is a second selection surface on a screen whose
  footer already counts the picks, and onboarding is the wrong place to spend
  complexity.
