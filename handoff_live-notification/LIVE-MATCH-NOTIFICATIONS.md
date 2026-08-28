# Handoff: AltaGama FC — live match notifications

## Overview

The alert sent while a followed club is playing. One design, one layout: a standard
iOS notification whose title carries the running score, whose body names the player,
and whose meta row carries **only the three things the product supports — goals,
cards (yellow/red), and time left**.

Scope is the notification. The Live Activity and Dynamic Island designs from the same
exploration are **not** in this export — ask for them separately. Kickoff, moved and
postponed alerts ship in `design_handoff_notifications/`.

## About the design file

`Live Match Notification.dc.html` is a **design reference created in HTML** — a mock of
the intended look, not production code to copy. Recreate it in the app's own
environment: an APNs payload plus (if the crest attachment is adopted) a Notification
Service Extension in the iOS target. Nothing about the HTML should travel.

Open it by double-clicking; `support.js` and `icons/` must stay alongside.

## Fidelity

**High fidelity** for the card's content: title, body, meta row, attachment, colour
and type are final. The wallpaper, clock, blur material and container radius are
**approximated** — the system owns them and you should not recreate them.

## What is in the alert

| Slot | Content | Notes |
| --- | --- | --- |
| Title | `GOAL · Athletic Club 2–1 Getafe` | Event word uppercase, then the score **after** the event |
| Body | `Nico Williams 58', assisted by Sancet. Athletic ahead for the first time.` | Scorer + minute, assist if known, one clause of consequence. Two lines max |
| Meta | `28' left · 🟨 3 · 🟥 1 · Getafe 10 men` | Only these three data classes. Segments drop out when zero |
| Attachment | Struck-ball glyph on an accent plate | 38×38, radius 9 |

⚠ **Nothing else goes in this notification.** No possession, no shots, no xG, no
win probability — the feed does not carry them and the product does not claim them.
If a future feed adds a stat, it is a new design decision, not a free slot.

## Measurements

- **Card** radius 22, padding 13 / 14, 12px gap to the attachment. Mock material
  `rgba(30,37,44,.72)` + `blur(28px)`, 0.5px `rgba(255,255,255,.09)` hairline.
- **Header** app icon 16×16 radius 4.5 · app name 12/500 uppercase 62% white ·
  relative time 12/500 52% white trailing. 5px below.
- **Title** 15/600, −.012em, `#fff`.
- **Body** 15/400, −.012em, 78% white, 2px below the title.
- **Meta row** 9px below the body. 11/600 **tabular** at 62% white; card glyphs 7×10;
  1px × 10 dividers at `rgba(255,255,255,.14)`; 10px gaps; red-card consequence in
  `#ff8f7c` 11/600.
- **Attachment** 38×38 radius 9; goal plate `rgba(200,242,90,.13)` on a
  `rgba(200,242,90,.3)` hairline, glyph 21×18 centred.
- **Stacking** 9px between notifications.

## Copy rules

1. The **score is always in the title**, never only in the body — the title is all
   that survives a banner glance, Notification Centre and the Watch.
2. Minute is written `58'` with a typographic prime, not `58min`.
3. The consequence clause is one short sentence and only when it is true: *ahead for
   the first time*, *level again*, *back in front*. Never invented drama.
4. Meta row order is fixed: **time left → yellows → reds → red-card consequence.**
   Zero-value segments are omitted, along with their divider. If only the clock would
   remain, drop the whole row.
5. `10 men` / `9 men` is the only consequence phrase in the meta row, and only after a
   red. Name the club, not the abbreviation.

## Which events alert

| Event | Alerts | Gate |
| --- | --- | --- |
| Goal | yes, sound | `alertGoals` |
| Red card | yes, sound | `alertGoals` (same switch — do not add a second one) |
| Yellow card | no | updates counts only, silently |
| Half time / full time | FT only, no sound | `alertGoals` |

⚠ **Every live payload is server push.** Unlike the kickoff reminder, none of this can
be scheduled locally — a goal is not knowable in advance.

⚠ **Do not ship this until a live event feed exists.** The current scores job refreshes
roughly every 4h; an alert arriving 3h after the goal is worse than no alert. The
`type` values below are reserved.

## Grouping and routing

- `thread-id: fixture-{uuid}` — the same thread as the kickoff and moved alerts for
  that fixture, so a match collapses to one stack rather than one row per goal.
- `interruption-level: time-sensitive` on goals and reds; `active` on FT.
- ⚠ **Coalesce, do not queue.** If two goals land inside 60s, send the later one and
  let the thread collapse the first. Never send two banners for one passage of play.
- One destination — `altagamafc://club/{slug}` — through `routeFor()` in
  `src/features/push/deep-link.ts`, same handler as the existing alerts. An
  unrecognised `type` opens the app rather than throwing.
- Banners stay **on** in the foreground (`capability.ts`).

## Payloads

```jsonc
// goal
{ "aps": { "alert": { "title": "GOAL · Athletic Club 2–1 Getafe",
                      "body": "Nico Williams 58', assisted by Sancet. Athletic ahead for the first time." },
           "sound": "default", "thread-id": "fixture-84213",
           "interruption-level": "time-sensitive", "mutable-content": 1 },
  "type": "match_goal", "fixtureId": 84213, "clubSlug": "athletic",
  "minute": 58, "minutesLeft": 28,
  "score": { "home": 2, "away": 1 },
  "cards": { "yellow": 3, "red": 1 },
  "consequence": "away_ten_men",
  "deepLink": "altagamafc://club/athletic" }

// red card
{ "aps": { "alert": { "title": "RED CARD · Getafe down to 10",
                      "body": "Djené sent off 61' for a second yellow. Athletic lead 2–1 with 28 minutes left." },
           "sound": "default", "thread-id": "fixture-84213",
           "interruption-level": "time-sensitive", "mutable-content": 1 },
  "type": "match_red_card", "fixtureId": 84213, "clubSlug": "athletic",
  "minute": 61, "minutesLeft": 28, "secondYellow": true,
  "score": { "home": 2, "away": 1 }, "cards": { "yellow": 3, "red": 1 },
  "deepLink": "altagamafc://club/athletic" }

// full time
{ "aps": { "alert": { "title": "FT · Athletic Club 2–1 Getafe",
                      "body": "Nico Williams 58' settled it. Getafe finished with ten." },
           "thread-id": "fixture-84213", "interruption-level": "active",
           "mutable-content": 1 },
  "type": "match_full_time", "fixtureId": 84213, "clubSlug": "athletic",
  "score": { "home": 2, "away": 1 }, "cards": { "yellow": 3, "red": 1 },
  "deepLink": "altagamafc://club/athletic" }
```

`minutesLeft` is sent by the server, not computed on device — the client has no
authority on stoppage time. Omit it and the meta row's first segment disappears.

`mutable-content: 1` lets an NSE swap in the attachment. Drop it if you ship without one.

⚠ Only the goal alert is drawn. The red-card and FT payloads above reuse the same
anatomy with the card glyph / no glyph; **their layouts are not yet mocked** — ask and
they will be added.

## Tokens used here

**Accent** `#c8f25a` · **Yellow** `#f2c14e` · **Red** `#ff5c47` · **Red text**
`#ff8f7c` · **Card** `rgba(30,37,44,.72)` + `blur(28px)` · **Hairline**
`rgba(255,255,255,.09)` at 0.5px · **Ink** `#fff` / 78% / 62% / 52% white.
**Radius** 22 card · 9 attachment plate · 4.5 app icon.
**Type** 15/600 title · 15/400 body · 12/500 app name and time · 11/600 meta — tabular.

Full token set: `theme.ts` in `design_handoff_altagama_ios/`.

## Assets

- `icons/app-icon-60.png` — the shipping app icon. Never redraw the mark.
- **Glyphs** — goal, yellow, red are the same SVGs as the match-events timeline in
  `export/match-events/`. Take them from there.

## Files

| File | What it is |
| --- | --- |
| `Live Match Notification.dc.html` | The design plus an anatomy panel |
| `LIVE-MATCH-NOTIFICATIONS.md` | This document |
| `icons/app-icon-60.png` | App icon used in the mock |
| `support.js` | Runtime the mock needs to open locally. Not part of the design |

## Decide before build

1. **Live event feed** — this design is inert without one. Everything else waits on it.
2. **Attachment strategy** — glyph plate rendered server-side, drawn in an NSE, or no
   attachment at all. The design works crest-free by intention; no composed-crest
   problem here.
3. **Whether reds share `alertGoals`** or earn their own switch. The design assumes
   shared; a second toggle is a settings change, not a design one.
