# 0132 — Team windows feed the Today board: cups, European ties and segunda reach NEXT UP, LAST RESULT, reminders and the widget

- **Date:** 2026-09-07
- **Status:** Accepted — 14-assertion harness, tsc + lint at baseline; simulator pass recorded below
- **Decided by:** Ed Medina (reported the bug off a live screenshot; scope and
  the competition label are his explicit picks)
- **Amends:** [0022](./0022-finished-today-from-fixtures.md)/[0027](./0027-board-lead-cards-from-fixtures.md)'s
  *"everything reads `GET /cronogol/fixtures`"* posture for the board — the
  name-matching prohibition itself is REAFFIRMED, not touched.

## Context

Ed noticed the up-next cards pull from the league schedule, not the followed
clubs' schedules: upcoming **Champions League matches never appeared**. The
diagnosis went one level deeper than the report: the Today cards, the kickoff
reminders and the widget snapshot are all fed by `GET /cronogol/fixtures`
date windows, and that route is **league-scoped by design** — the backend
filters on published league ids, so cups, UEFA ties, friendlies and segunda
are structurally absent (its own code comments say so, and
`FixtureWindowView`'s caveat in `types.ts` recorded it). Verified live on
2026-09-07: Barcelona's true next match was **UCL v Feyenoord, 2026-09-09**
(`competition: "cup"`, `competitionName: "UEFA Champions League"`), while the
window route's first Barcelona row was Levante, 2026-09-13 — so NEXT UP
announced the wrong match with a countdown on it. The same gap silently
blanks the board for followers of the five tracked segunda clubs (Girona, Las
Palmas, Leganés, Mallorca, Valladolid), who appear on NO window ever.

`GET /cronogol/teams/{slug}/fixtures` is the other read the backend offers:
**team-id-scoped, every competition the club plays**, already wired here as
`findTeamFixtures` for the club page. Its bounds are INCLUSIVE (trap 5), its
DTO 400s unknown params (trap 6), it has **no 31-day span cap** (that cap is
the window route's — verified in the backend DTO), and its envelope's `team`
is a full `TeamView`. Push dispatch is already team-id-scoped server-side, so
goal alerts for cup ties worked all along; the app's surfaces were the gap.

## Decision

**Per followed club, fetch one team window and merge it UNDER the window
routes at every board consumer.** No backend change.

1. **`lib/cronogol/team-window.ts`** (pure, harness-runnable): converts a
   club-perspective `FixtureView` to the neutral `WindowFixtureView` the
   selectors speak — the club's `TeamRef` (from the response's own `team`) on
   its `homeAway` side, `goalsFor/Against` unfolded to home/away. Sentinels,
   each audited against every reader on the path: `leagueSlug: ''` (resolves
   no league; keeps the widget's Swift live gate false so a cup tie can never
   open the rationed poll), `season: 0` (read by nothing this side of the
   club page), `matchweek: null`, and the opponent as a **slug-less
   `TeamRef`** (`slug: ''` — a deliberate non-key: every keyed site misses
   and falls to its null/name path; `abbreviate` derives the code). ⚠ The
   join is by fixture id and slug ONLY — never by name (0022/0027 stand).
2. **`teamWindowRows` answers `[]` for `lastSyncedAt: null`** — trap 1: an
   opponent-only club's partial schedule must never claim a "next".
3. **`mergeTeamRows` — the cup-derby complementary merge** (trap 49's
   pre-emption): two followed clubs meeting each other are one fixture id in
   two windows, each half knowing only its own club's slug on its own side;
   folding by id and taking the resolved slug per SIDE gives the row both
   real slugs, so owner-keyed filters (`involvesFollowed`, the widget's
   `involves`) miss neither club.
4. **`mergeWindows` — dedupe by id, window route WINS** (full `TeamRef`s,
   real `leagueSlug`), so for pure-league data every team row dedupes out and
   the board is byte-identical to pre-0132. Keep-all rather than
   cups-only, because segunda clubs' league fixtures are also absent from the
   window routes — this is what un-blanks their boards.
5. **`sliceWindow` guards the deck** — a bug guard, not tidiness: the team
   window reaches 14 days BACK, and a past TBD row would sail through
   `upcomingMine`'s `kickoffTbd ||` predicate into the deck as a `--:--` card
   for a match long over. The half-open instant slice mimics the server's
   own comparison. NEXT UP stays a 7-day horizon — extending it is a
   separate decision nobody has made.
6. **`queries/use-team-windows.ts`** — `useQueries` over the follow list
   (hard cap 20 by the push contract, realistically ≤5; the route answers
   `max-age=60`; `STALE.feed` on top), bounds −14d…+21d local midnight
   (`TEAM_WINDOW_BACK_DAYS = RECENT_DAYS`, `TEAM_WINDOW_AHEAD_DAYS =
   WIDGET_WINDOW_DAYS` — the SAME constants, which is what lets `lastResult`
   read the merge unsliced), bounds re-read inside the `queryFn` (0052's
   lesson), key on the day. The `combine` option builds the merged rows;
   its **structural sharing is load-bearing** — the rows sit in
   `use-push-sync`'s re-arm deps, and an unstable identity would burn the
   widget reload budget (trap 34) in ordinary renders.
7. **These queries MAY be refetched at kickoff and on pull-to-refresh** — the
   opposite of `upcoming`'s rule, and safely: a window starting 14 days back
   cannot drop a just-kicked-off fixture; a refetch only flips `status`. For
   a cup tie the team window is the ONLY feed that ever will. `onKickoff`
   therefore adds `teamWindows.refetch()` beside the existing three.
8. **Board integration** (`(tabs)/index.tsx`): merged into `upcomingMine`
   (sliced + sorted; `deck[0]` is the soonest kickoff whichever route served
   it), `boardLives`' `held` (a kicked-off cup tie holds the crown honestly —
   dashes + `kickedOffNote`, up to the 150-min hold; no live row will ever
   upgrade it, same as any league outside the live route) and `swept` (a
   sweep-flagged live cup row gets the tier-2 age-captioned card), and
   `lastResult`'s input.
9. **Competition labels (Ed's pick):** a non-league fixture names its
   competition where a league one says the matchday — "MD 1" for a UCL
   jornada reads as LaLiga's. NEXT UP meta becomes `NEXT UP · UEFA Champions
   League`; the LAST RESULT and upcoming-row metas swap the `MD n` slot for
   `competitionName`; the widget's `roundLabel` goes null for non-league rows
   (the pill drops — the full name cannot fit a tile row).
   `competitionName` is the provider's proper noun, rendered verbatim — no
   new i18n keys; a short form is a later design call.
10. **Events disclosure: OFF for non-league rows** (`matchEventsCapable`,
    absorbing the raw gate the card carried). Whether the backend's
    finished-only events sweep reaches cup fixtures is unverifiable until the
    first UCL matchday completes; an always-dead disclosure is 0105's
    failure. League rows keep today's exact semantics, unknown-league-enabled
    included (that is what a segunda sentinel row inherits).
    **Follow-up, dated:** after 2026-09-09/10 finish, probe
    `GET /cronogol/fixtures/f90e8609-…/events` — if a timeline comes back,
    confirm the payload's side attribution survives a slug-less opponent,
    then flip the cup branch and amend here.
11. **Phase B (same change):** `use-push-sync` merges the rows into
    `buildSnapshot` (gated on `widgetWindow.data` ALONE — a slow team query
    must not blank the widget; `selectWidgetFixtures` already drops what the
    back-reach could smuggle in) and into `selectReminders` (sliced to the
    same 7-day band `upcoming` asks for — the selector's own horizon is 21
    days and would otherwise arm cup reminders further out than league ones).
    Snapshot slug hygiene: `''` becomes `null` on the wire (`|| null`), which
    Swift's `involves` already handles; **no `SNAPSHOT_VERSION` bump** — no
    field added or retyped. Free fix recorded: the Edit-Widget club picker
    can now find a segunda club's `TeamRef`. Crest artwork needs nothing:
    pins are FIXTURE-ID keyed and the compositor answered `200 image/png`
    for the Feyenoord cup id (probed 2026-09-07).

## Deliberately not done

- **No NEXT UP horizon extension** past 7 days (the 21-day reach serves the
  widget alone). — **No activity-crest widening**: cup ties get no Live
  Activity push today; pinning their crests is spend without a consumer.
- **No live coverage claim for cups**: the sentinel keeps every live gate
  honestly false. — **FINISHED TODAY, Matchdays, Table stay window/jornada-
  fed**: converted rows never reach them (FINISHED TODAY's league grouping
  would have nothing to group a sentinel under).
- **No backend change**: widening `GET /cronogol/fixtures` to cups would
  reverse a documented backend decision and ripple into the web app.

## Cost

≤N requests per 15-minute stale window, N = follows (≤20 hard, ≤5 real),
each `max-age=60` server-side. The board's behavior for pure-league data is
byte-identical (harness assertion 10).

## Verification

- 14-assertion plain-node harness over the transpiled pure modules
  (perspective unfold, opponent ref, sentinels, trap-1 gate, derby merge,
  window-wins dedupe, half-open TBD slice, events gate branches, pure-league
  parity, deck order with the REAL Feyenoord/Levante wire rows — trap 48,
  kicked-off hold, tier-2 sweep source). All pass 2026-09-07.
- `npx tsc --noEmit` clean; `npx expo lint` at the 6-error baseline;
  `npx expo export --platform ios` clean.
- Gallery: `?only=next` gains the cup card (competition in the meta,
  one-sided wash); new `?only=last` section — league regression (the real
  Valencia 0–5 Barcelona row) beside the cup case with no events chevron.
- Live data on the simulator (2026-09-07): the crown leads with
  `NEXT UP · UEFA CHAMPIONS LEAGUE` — Barcelona v Feyenoord, WED 9 SEP, both
  crests real (the opponent's off the wire's `opponentLogoUrl`), countdown
  running — with the league LAST RESULT (Valencia 0–5, `MD 4`, events
  disclosure) intact beneath. Girona's team window probed live:
  `lastSyncedAt` set, segunda fixtures served — their board un-blanks.
- ⚠ Sighted for the design pass Ed deferred: the verbatim competition name
  crowds its row — the NEXT UP meta truncates the venue to `SPOTIFY CAM…`,
  and the cup LAST RESULT meta wraps to two lines against the W pill. The
  short-form label decision should read these two screenshots.
- ⚠ Pending: the 2026-09-09 kickoff sequence on real data (countdown →
  kicked-off hold → sweep flip via the team refetch), and the §10 events
  probe.
