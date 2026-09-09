# 0137 — UCL timelines open on LAST RESULT: the events gate takes a verified-competition allowlist, and `eventSide` learns elimination for a slug-less opponent

- **Date:** 2026-09-09
- **Status:** Accepted — checked-in harness green, tsc + lint at baseline, export clean
- **Decided by:** Ed Medina (reported the missing disclosure off a live
  screenshot; the backend session's probe and plan are
  `handoff_ucl-events/PLAN.md` + `EVIDENCE.md`)
- **Amends:** [0132](./0132-team-windows-feed-the-today-board.md) §10 — the
  non-league branch of `matchEventsCapable` opens for the UCL; the league
  branch and everything else stand byte-for-byte.

## Context

Home → LAST RESULT: Real Madrid 2–1 Inter (UCL jornada 1), the lockup, the W
pill — and no MATCH EVENTS disclosure, while a league result in the same slot
has the chevron. 0132 §10 gated every non-league row off as a dated
placeholder ("unverifiable until the first UCL matchday completes") with an
explicit follow-up. That matchday completed 2026-09-08, and the backend
session verified production the next day (`handoff_ucl-events/EVIDENCE.md`):
`GET /cronogol/fixtures/{id}/events` — the route `useFixtureEvents` already
calls, with the id the card already holds — answers 200 with all 16 events,
written by the **live session's full-time hand-off** (not the league-only
finished-match sweep), for all 3 of 3 finished UCL ties involving a followed
club. Every event carries a `teamSlug`.

The probe also confirmed §10's second worry, in the direction nobody wanted:
the **payload's** side attribution survives a slug-less opponent, but the
**app's comparison** does not. The team route serves the opponent as a name
(`opponent: "Inter"`, no slug), so `opponentRef()` builds the away `TeamRef`
with `slug: ''` — and `eventSide()` compares `teamSlug` against both sides'
slugs, so `'inter-inter'` matched neither and all nine Inter events would
have rendered as "neither side" (the VAR-row treatment, no crest). Opening
the gate alone would have shipped that.

## Decision

1. **`matchEventsCapable`'s non-league branch reads a dated allowlist keyed
   on the EXACT wire `competitionName`** — `EVENTS_VERIFIED_COMPETITIONS`,
   one entry: `'UEFA Champions League'`. A cup row's `leagueSlug` is the `''`
   sentinel, so the name is the only key the wire offers. Deliberately NOT
   `competitionMarkKind` (0133), though it keys on the same string: having
   artwork and having a verified timeline are different facts, and the Copa
   del Rey will get a mark before it gets a proven events feed. The league
   branch is untouched — unknown-league-enabled (the segunda sentinel case)
   and the LPR denial (0105) both stand, harness-asserted.
2. **`eventSide` gains an elimination rule** for the team-window shape: when
   the event names a club, one side holds a real slug it did NOT match, and
   the other side exists but holds none (`''` counts as absent — the
   sentinel's meaning), the event belongs to the slug-less side. A VAR row
   (`teamSlug: null`) still answers null before the rule; a two-real-slug
   fixture never reaches it; two slug-less sides stay null — never guess
   between two unknowns. The derivation lives in `events.ts` beside its
   sibling, per that file's own rule.
3. **`LastResultCard` gains `suppliedEvents` and the controlled
   `eventsOpen`/`onToggleEvents` pair** — LivePlate's existing seams (0126),
   mirrored so the gallery can render the expanded UCL case tap-free and
   request-free. Absent, the card is byte-identical to before.
4. **The harness is checked in** as `scripts/team-window-harness.mjs` (0132's
   14-assertion jig was scratch and thrown away) with the REAL 16-event
   payload at `scripts/fixtures/ucl-rm-inter-events.json`, captured from
   production 2026-09-09 (trap 48). 16 assertions: the seven gate branches,
   and 7 home / 9 away / 0 dropped by elimination, its mirror, the
   two-real-slug parity, and the three null cases.
5. **Other cups, friendlies and `other` stay closed.** A Copa del Rey tie
   travels the same hand-off path in theory; none has been observed, and an
   always-dead disclosure is 0105's failure. The gallery keeps a closed Copa
   case on screen next to the open UCL one so the flip never reads as "cups
   are open now".

## Consequences

- A finished UCL tie's timeline opens on the card within minutes of full time
  (the hand-off writes at FT), faster than a league result's 3-hourly sweep.
  No caching change — `STALE.feed` stands.
- ⚠ A UCL tie whose live session missed full time (a dropped lease, a deploy
  — `senpai-backend` §97) has **no club-centric events, ever**: the
  league-only sweep does not backfill cups. The panel's "not published yet"
  copy is honest there; bridging from the backend's UCL table is a backend
  decision (`senpai-backend/.claude/cronogol/frontend-gaps.md` D11), not ours.
- The elimination rule is a second derivation the backend could retire:
  `opponentSlug` on the team route (D11's follow-up) would let `opponentRef`
  carry a real slug and the rule go dormant — harmlessly, since a
  two-real-slug fixture never reaches it.
- A new verified competition is one allowlist entry plus its evidence — but
  the verification is the work, not the line: probe a real finished tie
  first, or the chevron opens onto "not published yet" forever (0105).

## Alternatives considered

- **Key the gate on `competitionMarkKind`** — conflates artwork with a
  verified feed; rejected above.
- **`opponentSlug` on the wire first** (backend change) — the tidier fix,
  but it touches `senpai-backend` and both API-doc copies, and the app can be
  honest today without it. Filed as D11 there; not blocking.
- **Attribute by roster/name matching** — 0022/0027 prohibit name joins;
  elimination uses only the slugs already on the row.
- **`GET /cronogol/ucl/fixtures/{id}/events`** — documented render-path
  only, keyed on a different id; the club-centric route already serves the
  card.
