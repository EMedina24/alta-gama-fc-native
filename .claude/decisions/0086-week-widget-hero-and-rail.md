# 0086 — YOUR WEEK becomes a hero kickoff and a rail, on a flush floodlit plate — and the hero STACKS, because the mock's row is 26pt too wide

- **Date:** 2026-08-31
- **Status:** Accepted — harness-measured; **not yet seen on a simulator or a device**
- **Decided by:** Ed Medina
- **Design:** `handoff_week-widget/` — `YOUR-WEEK-WIDGET.md`, `Your Week Widget.dc.html`
- **Builds on:** [0047](./0047-widgets.md), [0058](./0058-next-widget-centres-and-ticks.md), [0085](./0085-broadcast-card-redesign.md)
- **Supersedes:** [0059](./0059-your-week-widget-names-both-sides.md) — the medium row's whole layout
- **Partially supersedes:** [0080](./0080-widgets-live-scores-poll-plus-push.md) — the ledger and the poll, on the **medium** widget only. The small NEXT widget is untouched.

## Context

The medium tile drew three equal rows: `crest · name · v · crest · name · SAT/21:00`,
one per followed club, each competing with the other two for the same eye.
`handoff_week-widget/` argues that **a week has one next match, not three** — it
spends the left column on that kickoff and demotes the rest to a rail, on the
floodlit plate [0085](./0085-broadcast-card-redesign.md) just gave the Live Activity.

**Nothing on the wire changes.** Snapshot v3 already carries every value the design
prints — `copy.yourWeek`, `clubCount`, `homeTag`/`awayTag`, `homeName`/`awayName`,
`kickoffDay`/`kickoffTime`, `isHome`, `fixtureId`. No new `Copy` key, no
`SNAPSHOT_VERSION` bump, no `snapshot.ts` edit, no backend work. This entry is a
Swift view rewrite, one provider gate, and a `_debug` sample.

## Decision

### 1. The handoff's `YourWeekWidget.swift` is a design artifact, not a port

The same situation as `handoff_alerts-redo/BroadcastActivity.swift`, and the same
resolution ([0085](./0085-broadcast-card-redesign.md) §1). **The geometry and
colour are its; the mechanisms are this repo's.** Read `YOUR-WEEK-WIDGET.md` for
the tokens, not the `.swift` for the code.

| Handoff | Why it cannot ship | What ships |
| --- | --- | --- |
| `AsyncImage(url: homeCrest)` | No reliable network and a hard memory budget in a timeline provider ([0025](./0025-widgets-deferred.md) step 4) | `CrestView` off the App Group, warmed by `crests.ts` |
| `Image("mark-accent")` | **No asset catalog exists in any target** — `expo-target.config.js` declines `images:` on purpose | `Mark(size: 12)` |
| `enum Ink` — 7 raw `Color(red:…)` | Trap 15; `Tokens.swift`'s "keep this list SHORT" | `Tok.*` — **zero new tokens**, §5 |
| `WeekSnapshot` / `WeekFixture` / `WeekCopy` / `Side` | A second, incompatible contract; nothing in `src/` writes it | `WidgetSnapshot.Entry`, unchanged |
| `StaticConfiguration(provider: WeekProvider())` | Drops the Edit-Widget club picker (0047); `WeekProvider` does not exist | `AppIntentConfiguration` + `SelectClubIntent` + `FixtureProvider` |
| `RadialGradient(endRadius: 190)` | `radial-gradient(70% 90% at …)` is an **ellipse**; SwiftUI's radial gradient is circular, and a fixed radius lands nowhere at any tile width | `EllipticalGradient`, as `MatchActivity.floodlights` already does |
| No `Link` anywhere | Three fixtures are three destinations; `widgetURL` carries one, and the two together silently swallow row taps | `Link` per hero and per rail row |
| No empty state | A reader following nothing gets a blank plate | `EmptyState(copy:followsNothing:)`, kept |

⚠ The handoff's own `YOUR-WEEK-WIDGET.md` states the correct crest rule ("a club
outside LaLiga draws its abbreviation tile, never a generic crest") while its
`.swift` contradicts it with `AsyncImage`. Trust the doc — trap 32's rule that a
handoff document is evidence, not scripture.

### 2. ⚠⚠ The hero STACKS home over away, and the number is why

The mock draws the hero fixture as one row — `crest · name · v · crest · name`.
Measured through an `ImageRenderer` harness (SF Pro metrics on macOS, the method
[0085](./0085-broadcast-card-redesign.md) §3 established), against a hero column
of **157.3pt on an SE** / 162.4 standard / 177.2 Max:

| Arrangement | Ideal width | vs SE 157.3 |
| --- | --- | --- |
| **The mock as drawn**, its own sample pair (`Valencia` v `R. Madrid`) | 168.0 | **over by 10.7** |
| The mock as drawn, realistic worst (`R. Sociedad` v `Villarreal`) | **183.0** | **over by 25.7** |
| …minus the `v` | 172.0 | over by 14.7 — saves 11.0 |
| …crests 20 → 18 | 179.0 | over by 21.7 — **saves 4.0** |
| …both trims | 168.0 | over by 10.7 |
| **Stacked, crests 24** | **95.0** | **62.3 spare** ✅ |

⚠⚠ **The crest is not what binds — the two NAMES are.** 20 → 18 buys 4pt against
a 26pt deficit. This is the identical trap 0085 §3 paid for, and measuring first
is the only reason it cost nothing this time.

`R. Sociedad` (11 characters) against `Villarreal` (10) is the longest pair
`widgetName` can actually produce; both were taken from the helper, not guessed.

The tile meanwhile had **33pt of unused HEIGHT** (header 24 + hero 79 = 103 of a
136pt content box). Stacking spends height, which is free here, to buy width,
which is not. It also lets the hero crests go 20 → **24** — the size the ledger
used on this widget before it — so the badges stay the subject. Final vertical:
header 24 + hero 92 = **116 of 136, 20pt spare**.

⚠ Stacking is also what the RAIL already does, so the two columns now read as one
system rather than two ideas.

### 3. The shell is a flush plate, not the mock's nested tray

The mock nests a tray (r24, 2.5pt) around a plate (r21.5). A second corner radius
inside the system's own container mask double-rounds every edge — the mistake
0085 §1 caught on the Live Activity. **The system corner IS the tray.**
`.contentMarginsDisabled()` is what puts the plate against it; without it the
system's ~16pt margins leave the plate floating in a black frame, a card inside a
card, which is the look the flush plate exists to avoid.

⚠ First use of `.contentMarginsDisabled()` in this repo — content supplies the
mock's own 11/13 padding instead.

⚠ The two gradients are **decoration only, never a data channel.** Nothing may
encode liveness or the followed side in the light. The pool keeps the lime off
club artwork we do not own, exactly as on the broadcast card.

### 4. ⚠⚠ The medium tile drops the live ledger — and stops paying for it

The mock has no in-play state, and Ed's call is that live belongs to the small
NEXT widget and the Live Activity. `YourWeekView` reads neither `entry.live` nor
`entry.liveStale`; `LiveLedger.swift` and `NextFixtureView` are untouched.

**The poll had to go with it.** `FixtureProvider` is shared, and its 5-minute
live cadence would otherwise spend WidgetKit's rationed reloads on a score this
tile never prints — a budget of ~40–70 a day whose overspend freezes every widget
for the rest of the day with nothing in any log (trap 34). `.systemMedium`
identifies YOUR WEEK on its own (NEXT is `.systemSmall` plus the three
accessories), so `context.family` gates both `LiveFetch.fetch()` and the
`Cadence.liveEntryDates` branch. No second provider.

⚠⚠ **The consequence is that a match in play is ABSENT from this tile.**
`rows(after:)` filters on `kickoffUtc > now`, so at kickoff the row leaves and the
hero becomes the next fixture behind it. That is the tile answering what is
*coming*, which is what its name promises — but it is a real behaviour reversal
from 0080 and the reader loses the medium widget as a way to see a live score.

### 5. Zero new tokens

Every colour in the handoff already exists in `Tok`. This matters because
`Tokens.swift` is a hand-copy of `theme.ts` and 0085 §8 requires a genuinely new
number to land in **both** files — a colour that exists only in the Swift is trap
15's drift in the direction nobody checks.

| Handoff | `Tok` |
| --- | --- |
| `#c8f25a` lime | `accent` (exact) |
| `rgba(11,40,32,.9)` pool | `activityPool` (exact, `#0b2820`) |
| `#0b0d0f` plate | `ground` (`#0a0b0c`) — 1–3 steps of 255 apart; reused rather than adding a fourth near-black |
| `#e7ebec` club | `ink90` |
| `#9aa4aa` side tag | `ink62` |
| `#6b747b` rail day | `ink45` |
| `#59626a` club count | `ink34` |
| hairlines `.07`–`.12` | `hairline` (`.10`) — three near-identical values collapsed to the one this widget already drew |

Point sizes stay literals at their call sites — 0058 settled that ("38 and 20 are
layout, not theme"). ⚠ `Tok.micro()` forces `.bold`, so the design's 600-weight
labels are written as explicit `.semibold` fonts; only the club count goes through
`W.eyebrow`.

### 6. One fixture draws the hero at FULL WIDTH

The mock's `rowCount` prop goes to 1 but its Swift renders an empty rail beside a
live divider. A hairline with nothing next to it reads as a widget that failed to
finish loading — the same lie the filler rows 0059 refused would have told. With
one fixture there is no divider and no rail; the hero takes the tile.

### 7. What 0059 keeps, and what it loses

Keeps: **both sides named, home first** (a match must not read two ways for two
readers), and the followed side lit in `accent`.

Loses: the accent `HOME`/`AWAY` capsule. On the hero it becomes a **neutral**
outlined chip in `ink62`; on the rail rows it is **gone entirely**. The lime is
now spent on the followed club's name *and* the day, and a third lime object
beside them makes the reader hunt for which one means "yours". The followed name
is still the accent, which is what 0059 said the mark was for.

### 8. The `_debug` sample fabricates the WIRE, not the snapshot

`?sample=week1|week2|week3|week3es` builds `WindowFixtureView`s and runs the real
`buildSnapshot` over them, so `widgetName`, `abbreviate`, the day and time labels
and the pluralised club count all come from production code.

⚠⚠ **This is trap 48's rule applied before it could bite again.** 0080's
simulator verification passed against a dead gate because the sample typed
`leagueSlug` by hand and agreed with the bug. A field a sample invents is a field
the test cannot check — so this one invents only the club names and the kickoff
instants, and derives everything else. The clubs are deliberately the layout's
**worst case** (`R. Sociedad` / `Villarreal`), not a flattering one, and one row
is away-followed so the away tag and away lighting are exercised.

## Consequences

- ⚠⚠ **Not yet seen.** The numbers here are `ImageRenderer` on macOS SF Pro
  metrics — the same method that transferred correctly for 0085, but this design
  has never been drawn by WidgetKit. `.contentMarginsDisabled()` in particular is
  new to this repo: if the system mask clips the top hairline or the floodlights
  read wrong at the edges, the fallback is to keep the margins and draw the plate
  inside them.
- ⚠ **A long rail name truncates on an SE, by design.** The rail column is 119.2pt
  there and the worst pair wants 129. The NAME gives — it carries `lineLimit(1)`
  and no `minimumScaleFactor`, because a scale low enough to rescue it would put
  9pt type under the design's own 8.5pt floor. The kickoff beside it is a NUMBER
  and must never give: a truncated count is wrong where a truncated name is merely
  shorter (0085 §3's rule).
- ⚠ Hero names carry `minimumScaleFactor(0.74)` — 11.5 × 0.74 is exactly the 8.5pt
  floor. Measured, it never engages; it is a floor, not a mechanism.
- ⚠ **`copy.versus` is now unused by this widget.** It stays on the wire — the
  small widget's `CrestPair` draws it — but the medium tile no longer prints a `v`.
- The column split stays the mock's **1.32fr : 1fr**, expressed through a
  `GeometryReader` rather than `layoutPriority`: a priority decides who gets its
  ideal size first, not how slack is divided, and cannot express a ratio.
- ⚠ **A new build is needed to see any of this** — Swift is native and a Metro
  reload will not carry it. ⚠ Build with `yarn build:preview`, never a bare
  `eas build` ([0083](./0083-eas-capability-sync-strips-broadcast.md), trap 46).

## Alternatives considered

- **Keep the ledger, give live the hero slot.** Rejected by Ed: the mock has no
  live state, and the small widget plus the Live Activity already carry it. The
  cost is §4's absence, accepted knowingly.
- **The mock's nested tray, drawn literally.** Rejected — §3. It costs 5pt of a
  158pt tile and puts a second radius inside the system's mask.
- **Trim the single-row hero instead of stacking.** Rejected by measurement — §2.
  No combination of the available trims closes a 26pt gap.
- **A `minimumScaleFactor` on the rail name.** Rejected: it can only close the gap
  by going under the design's 8.5pt floor. Truncation is the honest loss.
- **A second provider for the medium widget** so the poll could be dropped
  cleanly. Rejected — `context.family` already distinguishes them, and a second
  `AppIntentTimelineProvider` would duplicate the snapshot load, the club filter
  and the cadence for one boolean.
