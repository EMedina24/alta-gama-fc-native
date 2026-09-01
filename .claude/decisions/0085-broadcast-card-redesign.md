# 0085 — The Live Activity becomes the "broadcast card": two states, a pre-kickoff start, and one scorer line a side because 160pt says so

- **Date:** 2026-08-31
- **Status:** Accepted — ✅ **rendered on a real device 2026-08-31** (build `5499ecc4`, all four states via `probe-apns.mjs --start --production`); not yet driven by a real kickoff
- **Decided by:** Ed Medina
- **Builds on:** [0055](./0055-live-activities-broadcast-channels.md),
  [0057](./0057-local-expo-module.md), [0047](./0047-widgets.md)
- **Design:** `handoff_alerts-redo/` — `BROADCAST-WIDGET.md`, `Broadcast Widget.dc.html`
- **Backend twin:** `senpai-backend/.claude/decisions/0040-live-activity-carries-the-pre-match-state.md`

## Context

0055 shipped the Live Activity on 2026-08-28 and it first rendered on a real
device on 2026-08-31 — production channel create, push-to-start, broadcast update
and end, driven by hand with `probe-apns.mjs --start`. What it rendered was a
placeholder: a venue eyebrow, `crest · ABBR · goals` on each side with a timer
between them, and a one-line last-moment.

`handoff_alerts-redo/` replaces it with the design this entry implements: one
card, two states, floodlight lime. Before kick-off it carries form and the
kickoff time; at the whistle the bottom band becomes mirrored scorer columns.

Three things in the handoff turned out not to survive contact — the wire, the
platform, and the extension sandbox — and each is a decision below.

## Decision

### 1. The handoff's `BroadcastActivity.swift` is a design artifact, not a port

It declares a **second, incompatible** `MatchAttributes` and four of its
mechanisms cannot work in a widget extension. The geometry and colour are its;
the mechanisms are this repo's.

| Handoff | Why it cannot ship | What ships |
| --- | --- | --- |
| `AsyncImage(url: crest)` | No reliable network and a hard memory budget in this process ([0025] step 4) | `CrestView` off the App Group, already warmed by `crests.ts` |
| `Image("mark-accent")` / `Image("goal-glyph")` | **No asset catalog exists in any target**, declined on purpose — a PNG flattens to a mask under Lock Screen tinting | `Mark.swift`, and a new `targets/_shared/Glyphs.swift` |
| `minute: String` pushed, bar at `minute / 90` | Pushing a per-minute tick is how Apple's budget dies inside one half (0055) | `Text(timerInterval:)` and `ProgressView(timerInterval:)` — system-drawn, zero pushes |
| `RadialGradient(endRadius: 300)` | SwiftUI's radial gradient is **circular**; `radial-gradient(78% 120% …)` is an ellipse | `EllipticalGradient` |
| `.clipShape(RoundedRectangle(cornerRadius: 26))` | The system already draws and rounds the container — a second corner double-rounds every edge | `.activityBackgroundTint` alone |
| `side.abbr == state.home.abbr` for HOME/AWAY | Two clubs can share a three-letter code | `homeTag` / `awayTag` on the wire |

⚠ Its `clockBar` also computes `Double(...prefix(2)) ?? 0 / 90 / 90 * 90 / 90`,
which is not a percentage of anything.

### 2. ⚠⚠ The card starts BEFORE kick-off, and the pre-match state is why

`LiveActivityService.dispatch()` returned early unless the fixture was already
`live`, so the design's pre-match state **had no lifetime at all**: the card
appeared at minute 1 and went straight to the live layout. Form, points and the
kickoff time would have been drawn for nobody.

A `scheduled` fixture is now allowed through. **This needed no config change** —
`liveWindowLeadMinutes` is already 10, so the session's window opens at T−10 and
the 3-minute supervisor tick makes the real start T−10 to T−7.

⚠⚠ **It also introduces a stale-date bug that is invisible until a real
kickoff.** `STALE_AFTER_MS` is 8 minutes and nothing is published between the
start and the first alertable moment — so a card started at T−10 greys itself out
about two minutes *before* the match it is advertising begins, on iOS's own clock,
with no push and nothing in any log. The start's stale date is now
`max(now, kickoff) + 8min`; see `staleAt()`.

⚠ It leaks a channel that could not leak before: `prune()` only deleted channels
whose fixture was `finished`, and a match called off inside its own window now has
a channel no full time will ever settle. `PRUNABLE_STATUSES` adds `postponed` and
`cancelled` — as a **positive list**, never `!== 'live'`, because deleting a live
fixture's channel kills every card on it and the id cannot be recreated.

⚠ A start push carries a required `aps.alert`, so this is now a **pre-kickoff
interruption**. `kickoffCopy` grows a pre-match branch. T−10 does not collide with
[0040]'s local reminder leads (1h / 30min / 15min).

### 3. ⚠⚠ ONE scorer line a side — and the number was MEASURED, not chosen

Apple caps the Lock Screen presentation at ~160pt. A layout harness rendering the
card at 369pt through `ImageRenderer` gives:

| Arrangement | Height |
| --- | --- |
| **The design as drawn**, 2 scorer rows | **203.5pt** — over by 44 |
| The design as drawn, 3 scorer rows | 225.5pt |
| The trims first proposed (cap 2, crest 46→40, gap 12→9, pills folded) | 173.5pt — **still over by 14** |
| 2 rows, HOME/AWAY dropped, gaps at 9/6/5 | 159.5pt — **zero margin** |
| 2 rows, HOME/AWAY kept, gaps at 7/5/5 | 159.5pt — **zero margin** |
| **One line a column, gaps at 10/9** | **152.5pt — 7pt spare** ✅ |
| pre-match, unchanged | 119pt — 41pt spare |

So each column is **one row**: glyph · name · minute · inline `+n` · discipline
pills. `ACTIVITY_SCORER_LIMIT` is **1** on the server, so the `+n` is a number the
server counted — a widget that slices the array it was given cannot know whether
it was already sliced, and would print `+0` for a hat-trick.

⚠⚠ **`+n` had to go INLINE.** On its own row it costs exactly what a second
scorer costs — 172.5pt measured — which would have made the whole trim pointless.

⚠⚠ **The crest is NOT what gives, and this is the reason to measure first.** The
obvious trim, 46 → 40, saves **exactly nothing**: the crest never binds the
fixture row, because the abbreviation-and-tag column beside it is 53.5pt. It
would have cost design fidelity for zero height.

⚠ The two zero-margin options were rejected on margin, not taste. 0.5pt is inside
the range a font-metric difference on a real device moves things, and what falls
off the bottom is the clock bar.

⚠ **A long name ellipsizes when the row also carries `+n` and bookings.** The
column is 163.2pt and `Lewandowski 45+2’` plus both counts wants 186pt. The name
carries `layoutPriority(-1)` so it gives first: **a truncated count would be
WRONG, where a truncated name is merely shorter.**

### 4. The two things that move between pushes, and nothing else

The pulsing dot and the clock bar. Both are system-drawn — `ProgressView(timerInterval:)`
is the same zero-reload mechanism [0058] uses for the NEXT widget's countdown.

⚠ At half time and full time `clockFrom` is nil, and the bar **freezes full**
rather than emptying: both states are further through the match than any running
bar, and an emptied bar at full time reads as "not started".

### 5. The state switch is `phase`, never a nil score

A not-started match reporting 0–0 is real observed provider behaviour — the rule
`LiveMatchState` already documents. Reading the score to pick the layout draws
every pre-match card as a goalless draw. `isLive` asks what `phase` is **not**, so
a phase the backend grows later degrades to the live layout rather than crashing
the switch.

### 6. `lastMoment` survives — for the Dynamic Island alone

The Lock Screen replaced it with the scorer columns. The island's bottom region is
one line tall and the columns do not fit there, so the field stays on the wire.

### 7. `CrestView` grows `showsAbbr`, closing the `ATH ATH` doubling

HANDOFF item 5 logged it as cosmetic. The redesign promotes the abbreviation to
30pt — the card's primary identifier — so the fallback tile printing it *as well*
became the loudest thing on the card. ⚠ The tile's fill and ring stay when the
letters go: an empty plate reads as "a badge we do not have", where nothing at all
reads as a layout bug.

### 8. The new tokens land in `theme.ts` as well as `Tokens.swift`

`activityGround` (`#07080a`), `activityPool` (`#0b2820`), `activityHairline`, and
the ink steps. **Nothing in the app draws them** — the widget extension does — but
`Tokens.swift`'s own header says every number in it is a copy of one in
`theme.ts`, and a colour that exists only in the Swift is trap 15's drift in the
direction nobody checks.

⚠ `activityGround` is a shade darker than `background` on purpose. The card sits
on the reader's wallpaper, not on the app, and the extra step is what keeps the
lime radials reading as light rather than as a lighter grey.

## Consequences

- ⚠ **Only the first scorer a side is named.** A second goal becomes `+1`. The
  design's own rule was "max 3 a side, then `+n`" — this is that rule at a
  tighter number, not a different one.
- ⚠ **Scorer columns and discipline pills move only when a push is SENT.** A
  yellow card is not an alertable moment, so the count it changes waits for the
  next goal. Correct against the budget rule, and harmless because `ContentState`
  is replaced wholesale: the counts are right *as of the last push*.
- ⚠ **Records are read once, at start.** They travel in `attributes`, which is
  immutable — correct, because they belong to a state that is gone by full time.
- ⚠ **A standings gap costs the record, never the card.** `league_standings` is
  derived from fixtures and under-reports on a coverage gap, so the record is
  nulled rather than printed as `0-0-0`.
- ⚠ **The channel is still one language, and it is Spanish** (0055 §7). Every new
  string — `LOCAL`/`VISITA`, `JORNADA 4`/`J4`, `PTS`, the own-goal `(p.p.)` — is
  resolved server-side. The kickoff TIME is the exception and is drawn from
  `kickoffEpoch` in the device's own locale, because a clock time needs no
  language to be right.
- ✅ **Confirmed on a device 2026-08-31.** Build `5499ecc4` (commit `470d75c`)
  installed on the reader's phone; `probe-apns.mjs --start --production` walked
  all four states and the card rendered correctly — **no clipping**, so the
  152.5pt measurement and the ~160pt cap both hold in practice. §3's numbers are
  `ImageRenderer` on macOS SF Pro metrics and they transferred.
  ⚠ What that run proves is the DRAWING and the WIRE. It says nothing about the
  data path: the probe supplies its own `RenderableActivity`, so the standings
  query, the matchweek column and the real feed's scorer names are still
  unexercised.
- ⚠⚠ **Still unproven against a real kickoff, and the probe cannot prove it.**
  The two riskiest changes in this entry — the T−10 start (§2) and the
  kickoff-aware `stale-date` — are both about WHEN the server acts, and the probe
  drives APNs by hand. First opportunity is Valencia v Barcelona, 2026-09-06
  14:15Z. Watch for the card appearing at ~T−10 rather than at the whistle, and
  for it surviving to kickoff without greying. Both fail silently.
- ⚠⚠ **Build with `yarn build:preview`** — a bare `eas build` turns the Broadcast
  capability off every time ([0083], trap 46).

[0025]: ./0025-widgets-deferred.md
[0040]: ./0040-kickoff-reminder-lead-times.md
[0058]: ./0058-next-widget-centres-and-ticks.md
[0083]: ./0083-eas-capability-sync-strips-broadcast.md
