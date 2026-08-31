# 0084 — The widget's live gate takes the API league slug (`laliga`), and the `_debug` sample must carry wire values

- **Date:** 2026-08-31
- **Status:** Accepted — fix confirmed against the real `snapshot.json` on disk; not yet watched through a live kickoff
- **Decided by:** Ed Medina
- **Fixes:** [0080](./0080-widgets-live-scores-poll-plus-push.md) — the live path shipped dead; 0080's decision stands, only the comparand changes

## Context

0080 shipped in the `preview` build of 2026-08-31 02:10 and **the live ledger never
drew for a real match.** Barcelona v Rayo kicked off at `19:30Z` that day and both
widgets kept their upcoming layout throughout.

The snapshot carries a `leagueSlug` per row, added by 0080 as the poll gate — only
LaLiga has a live route behind it, and a ledger of dashes that never resolves is
worse than the row simply dropping. `Snapshot.swift` gated on it:

```swift
var liveEligible: Bool { leagueSlug == nil || leagueSlug == "la-liga" }
```

The app's own `snapshot.json`, read off the simulator's App Group container:

```
leagueSlug='laliga'          kickoff=2026-08-31T19:30:00+00:00  club=barcelona
leagueSlug='premier-league'  kickoff=2026-08-31T19:00:00+00:00  club=arsenal
```

`"laliga"` is not `"la-liga"`, so **`liveEligible` was false for every real fixture
the app has ever written.** The damage is not limited to drawing: `rows(inPlayAt:)`
filters on it, and `FixtureProvider` computes `anyInWindow` from the same call — so
`/cronogol/live` was never polled at all. Every mechanism 0080 built was unreachable.

Two slugs exist and `src/lib/cronogol/leagues.ts` holds both: `slug: 'la-liga'` is
ours, for routes and league identity; `apiSlug: 'laliga'` is the backend's.
`CRONOGOL-API.md` is explicit that these diverged on 2026-08-05 and that "`la-liga`
no longer matches anything". `GET /cronogol/fixtures` serves `"leagueSlug": "laliga"`,
and `src/features/widgets/snapshot.ts` writes `fixture.leagueSlug` straight through —
so the wire has always carried the API slug. Only the Swift comparand was wrong.

### Why nobody caught it

0080's status line read *"verified on the simulator (LIVE and FT ledgers on both
widgets via `_debug/widgets?sample=`)"*, and that verification was real — the ledgers
drew exactly the design canvas. It was also the **only** thing that ever exercised the
gate, and the fabricated sample hardcoded `leagueSlug: 'la-liga'` — the one value that
satisfies the broken comparison. The test fed the bug the input the bug wanted.

This is a sharper version of a trap the handoff already lists: a `_debug` sample is
not a fixture, it is a **stand-in for the wire**, and any field it invents rather than
copies is a field the test cannot check.

## Decision

**1. The gate takes the API slug.** `laliga`, matching what the writer has always put
on the wire and what `LiveFetch` already sends as `?league=`:

```swift
var liveEligible: Bool { leagueSlug == nil || leagueSlug == "laliga" }
```

Fixing the *reader* rather than translating in the writer, for three reasons: the
value is `WindowFixtureView.leagueSlug` passed through, and translating it would make
the snapshot the only place in the app that rewrites a server slug; `LiveFetch`
already speaks the API slug one file away, so the target now uses one vocabulary
throughout; and it repairs the `snapshot.json` already sitting in every container
without waiting for a foreground write.

The `nil` arm is untouched — a v2 snapshot still means "assume eligible, never skip".

**2. `WidgetSnapshot.placeholder` carries `laliga` too.** The gallery preview is the
other place these rows are constructed by hand; leaving it on the dead value would
re-plant exactly the thing that hid this.

**3. The `_debug` sample carries wire values, and that is the point of it.** Both
fabricated rows in `src/app/_debug/widgets.tsx` move to `laliga`. A sample field that
does not match what the server sends is worse than no sample at all, because it
converts a red test into a green one.

**4. Both `leagueSlug` doc comments say API slug, loudly.** The old ones said "OUR
league slug (`la-liga`)" on both sides of the wire — the comment agreed with the bug,
which is why reading the code did not find it. They now name the trap and point here.

## Consequences

- The live path is reachable for the first time. Everything 0080 describes — the
  rationed poll, the HT heuristic, the FT hold, the per-minute entries — has still
  **never run against a real match**, so 0080's pending list is unchanged, not shortened.
- Native change: it needs a build. The next LaLiga fixture in the snapshot window is
  Real Madrid, **2026-09-04 19:00Z**.
- ⚠ The push writer in the notification service extension does not consult
  `liveEligible` — it writes `live.json` for whatever fixture the push names. That
  path was never blocked by this bug, and was never exercised either.
- 0080's status line is amended to record that its simulator verification did not
  cover the gate. Its decision is not reversed; only the comparand was wrong.

## What was rejected

- **Accepting both slugs** (`"la-liga" || "laliga"`). It would have worked, and it
  would have left the snapshot contract genuinely ambiguous about which vocabulary it
  speaks — the ambiguity that caused this. One wire, one slug.
- **Translating in the writer** via `leagues.ts`. Keeps the doc comments literally
  true, but puts a slug rewrite in the one file whose job is to copy the server's
  answer to disk, and leaves every existing container broken until a foreground.
- **Deriving the gate from `League.live`** in `leagues.ts` instead of a slug literal.
  Right in principle — the extension cannot import TypeScript, so it would mean
  writing a boolean rather than a slug into the snapshot. Worth doing when a second
  league goes live; not worth a v4 today.
