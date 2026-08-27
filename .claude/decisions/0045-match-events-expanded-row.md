# 0045 — A finished match expands into its event timeline

- **Date:** 2026-08-26
- **Status:** Accepted
- **Decided by:** Ed

## Context

`handoff_event-expansion/` asks for a panel that a played match expands into in
place: goals with assists, cards and substitutions on a minute-stamped timeline.
Its design half — `MATCH-EVENTS.md`, `Match Events Spec.dc.html` and two 2x
screenshots — was written when **no events endpoint existed**, and ends by saying
so: *"it gates on that feed, not on UI work."*

The feed shipped on 2026-08-26. `API-MATCH-EVENTS.md`, the folder's second half,
lifts the gate and then contradicts the design in five places. This entry records
what was built at each of them, because in every case the design's instinct was
right and only its assumption about the data was wrong.

Until now nothing in this app showed anything beneath a scoreline.

## Decision

`GET /cronogol/fixtures/{id}/events`, read on expand, at `STALE.feed`. Four types
copied verbatim into `types.ts`; `getFixtureEvents` in `client.ts` (`getOrNull`,
because the route 404s); one key, one hook; and the mapping in a pure
`lib/cronogol/events.ts` that has no native import and can be run in a harness.

Seven decisions sit on top of that.

**1. Six event types are drawn, not four.** The design draws goal, yellow, red
and sub. The API serves those plus `var` (11 rows in 60 fixtures),
`missed-penalty` (3) and `unknown`. Filtering was defensible and was rejected:
**a disallowed goal is what explains a scoreline that otherwise looks wrong**, and
`unknown` has to render anyway — it means the source described something the
backend has no name for yet, and dropping it is how a goal disappears. Given a
neutral row was needed regardless, drawing the other two cost almost nothing.
An eighth mark, `own-goal`, was split off `goal` because painting an own goal in
the scoring side's lime credits the wrong club at a glance.

**2. The live board card gets no chevron; the last-result card gets one instead.**
The design put the panel on the live card's footer — that is what
`17-events-live-expanded.png` shows. It cannot be built: the ingest selects
finished fixtures with a settled scoreline and runs three-hourly, so **an
in-progress match has no events at all**. Rule 1 already covers it. The
last-result card is the finished match of a followed club, has the data, and
takes the disclosure the live card cannot. ⚠ This is the same missing feed the
score-age line has been waiting on since ADR 0027 — not a separate gap.

**3. Rule 1 is inverted: disclosure is gated on STATUS, not on data.** The design
says *"a match with no published events shows no chevron. An empty panel is never
correct."* Honouring that literally means knowing the count before the tap, which
means pre-fetching — ten requests per matchday for nine panels nobody opened, on
a route whose own header is `max-age=60`. §8 forbids exactly that. So every
**finished** row discloses, and a panel with nothing behind it says
*"this match's events aren't published yet."*
⚠⚠ **That copy is load-bearing and must never be tidied into "no goals".** An
empty array does not mean a goalless match — it means we have not swept the
fixture. A 4-1 that ended twenty minutes ago and a real 0-0 are the same
response, and the API cannot tell them apart for us.

**4. `react-native-svg` is adopted — the app's first SVG.** It has been a
dependency since the start and imported nowhere; `player-photo.tsx` turned it
down because "a circle over a dome does not justify being its first use". That
was proportionality, not a rule about the package. A pentagon inset in a disc
with three trails on its rim cannot be drawn with `View`s, and there are seven
marks plus a chevron. ⚠ It is a **native module**: it autolinks, so no config
changes, but a dev client built before it was declared throws at runtime rather
than degrading. `/_debug/gallery` carries the case that checks this first.

**5. Player links are deferred, explicitly.** Every person carries `player.slug`
and 47% resolve. ADR 0033's sheet keys on `{club slug, person id}` and reads the
cached squad — the event gives a **player** slug, so linking needs a squad fetch
per opened panel and a slug→id map, on top of a fallback for the 53% (all of
Serie A and the Bundesliga, always) that cannot link. Half a timeline tappable
with nothing on screen explaining why is worse than none of it. Plain text in v1.

**6. The club page's season spine is not a surface.** `FixtureView` is
team-relative: it has `homeAway` and an `opponent` that is a **name, not a slug**,
so there is nothing to compare `teamSlug` against and §7's second derivation is
needed. Out of scope; when it is built, it belongs beside `eventSide` in
`events.ts`, not at the call site.

**7. Feed order, never sorted, and the minute is composed not summed.** Both are
the API's own warnings. Events share a minute constantly — a substitution pair, a
goal and the booking after it — and the array encodes each source's chronology, so
a client sort on `minute` flips pairs between renders. `45+2` is the 45th minute
plus two; ⚠ **`47` is a minute that did not happen**.

⚠⚠ **Two of the API doc's claims did not survive first contact, checked against
production on 2026-08-26.** Neither changes what was built, and both are worth
knowing before the next session trusts that document:

- *"`minuteExtra` is populated by Serie A only."* **It is not.** LaLiga jornada 1
  (Alavés–Getafe, `c56084e3-df56-420d-9a05-714b3eadaaa5`) serves a booking as
  `minute: 45, minuteExtra: 3`. Harmless — the rule was always "render what you
  are given" — but a build that special-cased Serie A would have been wrong.
- *"Order comes from the server"*, implying it is chronological. **On that same
  fixture it is not:** a 46' substitution is served at index 5 and the 45+3'
  booking at index 6, so the panel renders `46′` above `45+3′`. The upstream
  appears to have ordered on `minute` alone and read `45+3` as 45. **Shipped as
  served**, per the instruction and per design rule 2. A **stable** sort on the
  composed `(minute, minuteExtra)` would correct exactly this inversion without
  the pair-flipping point 4 warns about — equal keys keep their feed order — but
  that reverses an explicit backend instruction and needs its own entry.

New tokens: `sunken` (the panel ground, one step below `card`), `cardYellow` /
`cardRed`, `eventName` / `eventMinute`, and the fixed glyph, minute and crest
sizes.

## Consequences

- **The panel's slot is fixed at 18 × 15 for every mark and must never be sized
  to the glyph.** A card is 11pt wide and a goal disc 24; sizing to content
  raggeds every player name in the panel. That is the one measurement in the
  spec that carries a reason rather than a number.
- **A tap on an uncovered match is wasted**, and there are real ones: the
  Bundesliga has zero fixtures back-filled and its season opens 2026-08-28, and
  any match is uncovered for up to three hours after it ends. That is the price
  of decision 3 and it was taken knowingly. ⚠ An empty German panel is not a bug
  until that has been checked.
- **Segunda is reachable from Matchdays but not from the board** — it is covered
  by the events sweep and absent from `GET /cronogol/fixtures`, which is
  league-competitions-only.
- The chevron costs the name column ~13pt on FINISHED TODAY and 11pt on the
  matchday rows, both of which were already the column paying for everything
  else. Truncation there is the first thing to check on a resize.
- `subtype` is treated as a **label, never a union**. The two copy maps are
  looked up defensively and an unrecognised key renders no detail line — never
  the raw slug. A closed type would reject real data the day a seventh VAR name
  appears, which the backend says will happen.
- This does not supersede 0033 or 0044. It amends one comment in each of
  `client.ts` (`getTeamSquad`'s "no statistics" now says **season** statistics)
  and `player-photo.tsx` (its `react-native-svg` note).
- **There are still no player statistics, no lineups and no live events.** None
  of the three exist at any provider on this route; no slot was left for them.

## Alternatives considered

- **Filter `var` and `missed-penalty`** — the handoff calls this a defensible v1.
  Rejected: see decision 1. The neutral row was needed for `unknown` regardless.
- **Pre-fetch each visible row so the chevron can be data-gated**, honouring rule
  1 literally — rejected as the pattern §8 exists to prevent.
- **Collapse the row again and drop its chevron when the result is empty** — a
  tap that visibly does nothing reads as a broken button, which is worse than a
  sentence saying why.
- **Animate the expansion** — rejected for consistency: the standings expansion
  (0033's alternative, shipped in `standings-table.tsx`) is a plain conditional
  mount, and `Skeleton` is the app's only Reanimated use.
- **Draw the glyphs with plain `View`s** to avoid the dependency — rejected: the
  goal disc is the panel's signature mark and it is not a rectangle.
- **Put the panel on the live card anyway, empty** — rejected by rule 1, which is
  the one place the design and the API agree without qualification.
