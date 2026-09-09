# Plan — show Champions League timelines on the LAST RESULT card

**Written 2026-09-09** from the backend side (`senpai-backend`, the §116 Champions League session),
for whoever picks this up here. **Status: plan only — no code in this repo has changed.** The
backend needs nothing; every fact below was checked against production and is reproduced in
[EVIDENCE.md](./EVIDENCE.md).

## The symptom

Home → LAST RESULT: **Real Madrid 2 – 1 Inter, Tue 8 Sep**, the UCL lockup in the meta row, the W
pill — and no MATCH EVENTS disclosure under it (Ed's screenshot, 2026-09-09). A league result in the
same slot shows the chevron.

## The cause, in one sentence

`src/lib/cronogol/team-window.ts` → `matchEventsCapable()` returns `false` for every
`competition !== "league"` row (ADR 0132 §10), so `(tabs)/index.tsx` passes `matchEvents={false}` to
`LastResultCard` and the `EventsDisclosure` is never rendered. The gate was written as a placeholder
"until the first UCL matchday completes"; that matchday has completed and the backend serves the
timeline.

## What the backend serves now (verified 2026-09-09)

- `GET /cronogol/fixtures/0d457708-8ed5-406a-8d3f-c5686cfb887d/events` — the route
  `useFixtureEvents` already calls, with the id the card already holds — answers **200, 16 events**
  (3 goals · 4 cards · 9 substitutions), `Cache-Control: public, max-age=60`.
- They were written by the **live session's full-time hand-off** at 21:03Z on 2026-09-08 (Render log
  line in EVIDENCE.md), **not** by the finished-match sweep, which is league-only. All three finished
  UCL ties involving a followed club so far have events (3 of 3).
- **Side attribution on the wire holds:** every one of the 16 events carries `teamSlug` —
  `real-madrid` ×7, `inter-inter` ×9, none null — and the Inter scorer (77') has a name and a null
  `player.slug`, exactly as `CRONOGOL-API.md` says a foreign player arrives.
- The fixture itself arrives as `competition: "cup"`, `competitionName: "UEFA Champions League"`,
  **`leagueSlug: null`** (the window row wears the `''` sentinel). So the gate cannot key on a slug;
  it keys on the exact wire name, the way `competitionMarkKind()` already does for the lockup.
- The backend also has a new `GET /cronogol/ucl/fixtures/{id}/events` (same shape, every UCL match,
  foreign ties included). ⚠ **Not for this app** — it is documented as render-path only, keyed on
  a different id, and the club-centric route above already has what the card needs.
- **Other cups are NOT verified.** A Copa del Rey tie will travel the same hand-off path in theory;
  nobody has seen one. Keep them closed (ADR 0105: an always-dead disclosure is the failure to avoid).

## ⚠ The second bug the flip would expose — fix it in the same change

Opening the gate alone puts Inter's goal, cards and substitutions on the card **with no crest**:

- `GET /cronogol/teams/{slug}/fixtures` carries the opponent as a **name only** (`opponent: "Inter"`,
  `opponentLogoUrl`, no slug — EVIDENCE.md), so `opponentRef()` builds the away `TeamRef` with
  `slug: ''` (`TEAM_WINDOW_LEAGUE`, a deliberate non-key).
- `lib/cronogol/events.ts` → `eventSide()` compares `event.teamSlug` to `home.slug` and `away.slug`
  and returns `null` on no match. `'inter-inter'` matches neither `'real-madrid'` nor `''`, so every
  Inter event renders as "neither side" — the VAR-row treatment. Real Madrid's seven attribute fine.

This is precisely the check ADR 0132 §10 asked for ("confirm the payload's side attribution survives
a slug-less opponent"): the **payload** survives; the **app's comparison** does not. Two ways out:

- **(b) Elimination, app-only — recommended for this change.** In `eventSide()`: when the event's
  `teamSlug` is non-null, one side has a real slug and the other has none (`''`), and the slug is not
  the known side's, attribute it to the slug-less side. A VAR row (`teamSlug: null`) still returns
  `null`; a two-real-slug fixture is unchanged; the rule only fires on the team-window shape. Add the
  reasoning to the function's doc comment — it already explains why a second derivation belongs
  there and not at a call site.
- **(a) `opponentSlug` on the wire — backend follow-up, not blocking.** The backend has the slug (the
  opponent's `teams` row); adding it to `FixtureView` on the team route would let `opponentRef()` carry
  a real slug and `eventSide()` stay as it is. Touches `senpai-backend` and BOTH API-doc copies;
  filed there as `frontend-gaps.md` D11. Do (b) now; (a) can retire the elimination rule later.

## The change, file by file

1. **`src/lib/cronogol/team-window.ts` — `matchEventsCapable()`**
   - Widen the parameter to `Pick<WindowFixtureView, "leagueSlug" | "competition" | "competitionName">`
     (`WindowFixtureView` already carries `competitionName`; `toWindowFixture` copies it).
   - Keep the league branch **byte-for-byte**: unknown league → enabled (the segunda sentinel case),
     `matchEvents: false` league → disabled (LPR, ADR 0105).
   - Non-league branch: `return EVENTS_VERIFIED_COMPETITIONS.has(fixture.competitionName ?? '')`
     with `const EVENTS_VERIFIED_COMPETITIONS = new Set(['UEFA Champions League'])` — an explicit,
     dated allowlist keyed on the **exact wire string**, one entry, a comment pointing at
     EVIDENCE.md. Not `competitionMarkKind()`: having artwork and having verified events are
     different facts, and the Copa del Rey will get a mark before it gets a verified timeline.
   - Rewrite the doc comment: the "unverifiable until the first UCL matchday" paragraph becomes the
     dated verification; the "other cups" sentence stays.

2. **`src/lib/cronogol/events.ts` — `eventSide()`**: the elimination rule from (b), with its comment.
   `''` counts as no slug (`!side.slug`), matching `opponentRef`'s sentinel.

3. **`src/app/(tabs)/index.tsx`**: nothing — `matchEventsCapable(last)` already receives the full
   window row. Confirm `last.homeTeam`/`last.awayTeam` are the refs handed to `MatchEvents` (they
   are, ADR 0045's comment beside the card).

4. **`src/app/_debug/gallery.tsx`** — the `?only=last` section:
   - The existing cup case (UCL lockup, `matchEvents={false}`, label "NO events chevron (ADR 0132)")
     flips to `matchEvents={true}` and its label to "events chevron OPEN (this plan)". Feed it a
     `supplied` timeline that includes an opponent event with `teamSlug: 'inter-inter'` against an
     away ref with `slug: ''`, so the elimination rule is visible on the crest column.
   - Add a second cup case — Copa del Rey, no mark, text fallback (ADR 0133) — with
     `matchEvents={false}`, so the still-closed branch stays on screen. Both branches visible is
     the whole point of the gallery.

5. **Harness** — ADR 0132's 14-assertion plain-node harness was ad hoc; **check one in** as
   `scripts/team-window-harness.mjs` (transpile the pure modules with `npx tsc --outDir` to a temp
   dir, then plain `assert`). Cases, minimum:
   - `matchEventsCapable`: league + known league → true; league + `''` sentinel → true;
     league + `matchEvents:false` (LPR) → false; cup + `UEFA Champions League` → **true**;
     cup + `Copa del Rey` → false; friendly + anything → false; cup + `competitionName: null` → false.
   - `eventSide`: the 16-event Real Madrid v Inter payload (paste from EVIDENCE.md) against
     `home {slug:'real-madrid'}` / `away {slug:''}` → 7 home, 9 away, 0 null; a `teamSlug: null` row
     → null; the same payload against two real slugs → unchanged from today.

6. **Decisions**
   - Amend **ADR 0132 §10** in place, dated: the probe result, the flip, and that the pending line
     in its Verification section is closed by this.
   - New **ADR 0137** (next free number): "UCL timelines open on LAST RESULT — gate keyed on the
     exact wire name; `eventSide` elimination for a slug-less opponent; other cups stay closed until
     one is observed; backend `opponentSlug` as the tidier future". One README index line.

7. **`.claude/HANDOFF.md`**: the "Open — in priority order" entry added alongside this plan gets
   struck through with the date.

## Verification, in order

1. `npx tsc --noEmit` clean; `npx expo lint` at the 6-error baseline; `npx expo export --platform ios`
   clean — the trio ADR 0132 used.
2. `node scripts/team-window-harness.mjs` — every assertion above.
3. Gallery `?only=last`: league case unchanged; UCL case shows the chevron, expands, Inter rows carry
   the Inter crest on the away side; Copa case shows no chevron.
4. Live data on the simulator, a Real Madrid follower: LAST RESULT is Real Madrid 2–1 Inter until the
   next result lands — expand it. Expect Goals tab: Mbappé 14', Valverde 23' (home), Carlos Augusto
   77' (away, crest present, **no player link** — `player.slug` is null). ⚠ Do this soon: a Barcelona
   or Atlético follower's card moves on after tonight's ties (Barcelona v Feyenoord 16:45Z,
   Liverpool v Atlético 19:00Z), and those two will be the next real cases.
5. One more league result, expanded, to prove the league branch is untouched.

## Deliberately not in this plan

- **No backend change** and no use of `GET /cronogol/ucl/...` from this app.
- **No opening for Copa del Rey, friendlies or `other`** — unverified; ADR 0105 stands.
- **No caching change** — `STALE.feed` stays; the hand-off writes at full time, so the "not published
  yet" window for a UCL result is minutes, not the sweep's three hours.
- **No short-form competition label** — still the deferred design call from ADR 0132/0133.

## Traps

- `findLeagueByApiSlug('')` is `undefined` — that is what keeps the league branch's segunda sentinel
  enabled. Do not "tidy" the league branch while you are in there (ADR 0132's pure-league parity).
- `''` and `null` both mean "no slug" on different objects (`TeamRef.slug` is typed `string`; the
  wire's `leagueSlug` is `null`). The elimination rule must treat `''` as absent.
- A UCL tie whose live session missed full time (a dropped lease, a deploy at the wrong moment —
  `senpai-backend` §97) will have **no club-centric events at all**, ever: the league-only sweep does
  not backfill cups. The panel's "not published yet" copy is honest there. The backend's UCL table
  does hold them; bridging twins is a backend decision (`frontend-gaps.md` D11 names it), not this
  app's.
