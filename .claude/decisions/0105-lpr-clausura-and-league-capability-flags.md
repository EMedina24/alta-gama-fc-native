# 0105 — LPR Clausura joins the catalogue, and league capabilities become flags that are read

- **Date:** 2026-09-02
- **Status:** Accepted — verified against production data and on the simulator
- **Decided by:** Ed Medina

## Context
`senpai-backend` added FPF Puerto Rico on 2026-09-02 (provider `fpf`, scraped
from the federation's Genius Sports pages). `lpr-pro-clausura` is registered and
serving in production; `lpr-pro-apertura` is configured but has **no league row
yet** and is deliberately excluded from the backend's squad sweep.

Puerto Rico is the first league here whose source cannot feed the whole app. The
federation publishes a standings table and a schedule and nothing else:

| | Puerto Rico | The other four |
| --- | --- | --- |
| Fixtures, kickoff, venue | ✅ | ✅ |
| Crests | ✅ | ✅ |
| Standings, with `form` | ✅ | ✅ |
| Squads and portraits | ✅ (~every player) | LaLiga + PL |
| `matchweek` / the jornada route | ❌ **never** | ✅ |
| Live scores, goal push | ❌ **never** | LaLiga only |
| Player statistics | ❌ never | ❌ never |

That table is prose in `senpai-backend/CRONOGOL-API.md`. **There is no
capabilities field on the wire** — no endpoint says what a league supports, and
none is planned — so a client either copies the table by hand or infers
capability from data, which is how "an empty array" becomes "no goals" (trap 32).

The catalogue already had two capability booleans, `live` and `rounds`, and
**nothing read either of them.** ADR [0032](./0032-clubs-browse-by-league.md)
said so explicitly and left them for the first league that needed one: *"today
all four are live, so filtering would be untestable code."* That league is here.

## Decision
**`lpr-pro-clausura` is one more entry in `LEAGUES`, and the capability flags
beside it are now read.** No new screen, no per-league component, no branch on
a league slug anywhere.

`League` gains two required fields, joining `zones` in the rule that a new league
is a **build error** until someone has looked its answers up:

- `matchEvents` — whether a finished match here can ever grow a timeline.
- `calendarYearSeason` — whether the season is named `2026` or `2026/27`.

Wired this change:

- **`rounds`** — `ROUND_LEAGUES` is exported and the Matchdays screen takes it
  for its state seed and its chip row, and `useAllSeasonJornadas` maps over it.
  Puerto Rico therefore cannot be selected on Matchdays and is never asked for a
  matchweek index. `leagueOptions` grew an optional league list for this; its
  default is the whole catalogue, so Clubs and onboarding read as before.
- **`matchEvents`** — the events disclosure is removed (not merely left to open
  on empty) in `finished-today.tsx` and `last-result-card.tsx`.
- **`calendarYearSeason`** — `leagueSeasonLabel(league, season)` replaces bare
  `seasonLabel` on the player sheet. Resolving a club's league needs the
  standings, so `leagueOfClub` joins `standings.ts` — **ungated by `bandsApply`,
  unlike the club page's stats strip**: that gate asks whether a table may be
  coloured, which is a completeness question; this one asks which competition a
  club is in, and a half-played table answers it fine.
- **`live` stays untouched and still unread.** It means "has clubs to browse",
  and Puerto Rico has 11 — so this league is not the one that motivates it, and
  0032's note stands for whenever Ligue 1 arrives.

Puerto Rican names arrive `"SURNAME SURNAME, GIVEN NAMES"`. `playerDisplayName`
flips on the **first comma only** (two surnames belong to the same half) and
`playerFamilyName` returns the surname half for a lineup token, which is
shirt-sized. **Neither title-cases** — the backend keeps the source's caps
deliberately and no casing rule survives `O'NEILL`, `DE JESUS` and `McCARTHY` at
once. A name without a comma is returned untouched: verified against Real
Madrid's squad, 0 of 24 names changed.

Also settled here:

- **The display name is ours: `LPR Clausura`**, not the wire's `LPR Pro
  Masculina Clausura`. The name has to fit a 36pt chip, and `LPR Apertura` has
  to sit beside it later. `finished-today`'s league header now prefers our name
  too; it was printing the wire's (`LALIGA EA SPORTS`).

  **Update, later the same day:** the backend added a league crest and this is
  no longer the league with no artwork. `logoUrls.primary` is now an **SVG** — a
  circular mark on a white disc in the island's red and blue — so the chips draw
  it and 0031's text branch goes back to being the unexercised fallback it was.
  **No client change was needed:** `leagueOptions` and the Table's own resolver
  both already fell through to `primary`, and `LeagueSwitch` already routes SVG
  sources to `expo-image` at 0.45 opacity because 0089's grayscale `FilterImage`
  draws bitmaps only and renders a vector as an empty chip. Puerto Rico is now
  the second league on that path, after Serie A. The display name still does
  real work: it is the chip's `accessibilityLabel`, the `FINISHED TODAY` header
  and the fallback if the artwork ever fails to resolve.
- **`zones: []`** — no continental qualification, no published relegation. Empty
  says "no bands"; omitting would not compile, which is the point.
- **`clubCount: 11`**, checked against the live table. `bandsApply` compares the
  standings' `clubs` against it, so a wrong number silently drops the rank badges
  and the club-page strip rather than failing loudly.
- **No `LeagueBand` entry.** The neutral header is 0062's designed fallback and
  the palette is provisional; inventing a brand band for a league whose own
  federation ships no mark is not this change's call.
- **Apertura is not added.** It would be a second entry, and one asked for today
  returns an empty table rather than a 404 — a chip browsing to nothing.

## Consequences
- Puerto Rico appears on the Table (text chip, full table, form strips, an "11
  clubs" caption), on Clubs (browse, follow, search, rank badges with no band
  colour), on club pages (hero, standing strip, season spine, squad, calendar,
  alerts), in onboarding, and in the player sheet — **all of it from the one
  catalogue entry**, because every one of those screens was already written
  against the catalogue rather than against a league.
- The Table screen makes one fewer request than it would have: four jornada
  indexes, not five. Its caption for Puerto Rico degrades to the club count via
  the `null` branch that trap 2 already required.
- `fixture-list.tsx` — the Matchdays row expansion — is **deliberately not
  gated.** It is only reachable from a rounds league, so a gate there would be
  unreachable code guarding an unreachable case. `live-plate.tsx` likewise: no
  Puerto Rican match can ever be live.
- A future league that publishes events keeps its chevron with no change: every
  gate is `!== false`, so an unconfigured or unknown league behaves as today.
- ⚠ The backend's own docs are **stale** in two places — `CRONOGOL-API.md` still
  says Puerto Rico is "NOT SERVED YET" and still describes squads as "LaLiga
  Primera only". Both were true before `d123b0c` and are not now. Raised with Ed;
  not fixed here, since this repo does not edit that one.
- ⚠ Adding Apertura later is one entry plus its `order` — but the two share a
  calendar year, so whoever adds it should check that the Table's editorial sort
  puts them together and that `LPR Apertura` still fits the chip.
- **It found a shipped layout bug.** Puerto Rico's completed season is the first
  `form` array to reach the club page's standing strip with a full five results,
  and the strip's form column was `flex: 1.45` — a fraction of the screen, where
  five 22pt chips are a fixed 142pt. They ran out of the tray's right edge. The
  column now sizes to its chips (`club-stats-strip.tsx`, trap 56). Every
  European table was three games old, so nothing had ever drawn five.

## Alternatives considered
- **A date-grouped fixtures view on Matchdays**, so Puerto Rico could keep the
  tab. Rejected for now on Ed's call: it is a new screen state for a league whose
  season is already over, and its fixtures are fully visible on the club page.
  Worth revisiting when Apertura brings a live season.
- **Inferring capability from the payload** — treating `matchweeks: []` as "no
  rounds", `count: 0` as "no events". Rejected: those are exactly the shapes a
  *working* league serves while its sweep catches up, and the app has already
  been bitten by reading absence as an answer (traps 1, 32).
- **A `capabilities` object on `League`** instead of sibling booleans. Rejected
  as premature — three flags do not need a namespace, and the flat fields are
  what the web app's catalogue already uses.
