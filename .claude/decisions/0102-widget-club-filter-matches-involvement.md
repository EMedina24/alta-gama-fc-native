# 0102 — The widget club filter matches INVOLVEMENT, not ownership: `homeSlug`/`awaySlug` join the snapshot (v4)

- **Date:** 2026-09-01
- **Status:** Accepted — verified in the node + swiftc harness against live API data; device pass pending
- **Decided by:** Ed Medina (reported the bug from a device screenshot); fix same day
- **Extends:** [0029](./0029-derby-resolves-to-home-club.md)'s home-wins-the-tie
  rule to the widget's Edit Widget filter; amends the snapshot contract
  ([0047](./0047-widgets.md))

## Context

Configuring a widget to one club (long-press → Edit Widget, the
`SelectClubIntent` picker) filtered snapshot entries with
`$0.clubSlug == selected`. But `clubSlug` names ONE side: the followed club
`upcomingRow` resolved, home winning the tie when both sides are followed
(0029) — and `selectWidgetFixtures` deliberately dedupes a derby between two
followed clubs to a single entry, consuming both clubs' next-match slots.

So a reader following both sides of an upcoming meeting who selected the AWAY
side got **"Sin partidos programados"** while their club's fixture sat in the
snapshot. Reported from a device on 2026-09-01, and reproduced that day with
live data: with `athletic-club` and `atletico-madrid` both followed, ATH v ATM
(Sep 5) wrote `clubSlug: "athletic-club"`, and every row-filter for
`atletico-madrid` returned zero. The picker cannot warn — `ClubQuery` rightly
offers every followed club.

## Decision

Entries carry **both sides' slugs** — `homeSlug`/`awaySlug`, straight off the
wire's team refs — and the Swift filter asks `Entry.involves(club)`:
`clubSlug == club || homeSlug == club || awaySlug == club`. Both
`rows(after:clubSlug:)` and `rows(inPlayAt:clubSlug:)` use it.
`SNAPSHOT_VERSION` is 4; the fields are optional in `Snapshot.swift`, so a v3
file written by an older app degrades to the old owner-only match — quieter,
never a crash (the standing decode rule).

## Consequences

- A derby row now answers a filter for EITHER followed side. The derby still
  writes ONE entry — the medium widget's one-match-one-row rule is untouched.
- Two accepted cosmetic wrinkles, recorded here: on a widget configured to the
  derby's away side, the lime "followed" accent still marks the side `clubSlug`
  resolved (home), and the row's deep link opens that club's page. Fixing both
  means passing the configured slug into the views; not this change.
- A club-filtered widget still shows at most ONE row — the snapshot holds one
  fixture per club by design (`WIDGET_ENTRY_BUDGET` comment). That is a
  contract fact, not a regression.
- The `_debug` `writeSample` literals carry the new fields with real slugs
  (trap 48: a field a sample invents is a field the test cannot check).

## Alternatives considered

- **Two entries for a derby, one per followed side** — puts the same match on
  the unfiltered medium widget twice, the exact wrong-looking output
  `selectWidgetFixtures`'s docblock warns about.
- **Filter on `homeAbbr`/`awayAbbr`** — already in the snapshot, but abbrs are
  derived display strings and not unique (`abbreviate` exists because
  `shortName` collides); slugs are the identity the whole ecosystem keys on.
- **Resolve the tie toward the SELECTED club at write time** — the writer
  cannot see widget configurations; the snapshot is one file shared by every
  placed widget.
