# Handoff: AltaGama FC — iOS notifications

## Overview

Lock-screen designs for the three alerts the app sends: **kickoff reminder**,
**kickoff moved**, **postponed**. Both directions carry club crests, which is the
part of this that costs engineering time — read §"Crests" before estimating.

Scope is notifications only. The rest of the app (tabs, club pages, sheets, Live
Activity, widgets) ships in `handoff_AG-ios/`.

## About the design file

`AltaGama FC Notifications.dc.html` is a **design reference created in HTML** — a
mock of the intended look, not production code to copy. Recreate it in the app's own
environment: `expo-notifications` for the local reminder, APNs payloads plus (if
adopted) a Notification Service Extension and a Notification Content Extension in the
iOS target. Nothing about the HTML should travel.

Open it by double-clicking; `support.js` and `icons/` must stay alongside. Crests are
hot-linked from the product's CDN for the mock only — in the app use `logoUrl` from
`/cronogol/teams`.

## Fidelity

**High fidelity** for the app-owned surfaces: card content, hierarchy, colour and type
are final. The surrounding iOS chrome (wallpaper, clock, blur material, corner radii of
the notification container) is **approximated** — the system owns it and you should not
recreate it. Only what is inside a notification is yours: title, body, attachment, and
the content extension in `1b`.

## The two directions

### 1a — Composed crest thumbnail (recommended as the short look)

Standard iOS notification, no custom UI. Both crests are composed into the single
38pt attachment.

- Attachment plate: 38×38, radius 9, `rgba(12,15,18,.55)` on a
  `rgba(255,255,255,.09)` hairline. Home crest 20×20 at top-left inset 3, away crest
  20×20 at bottom-right inset 3.
- Header: app icon 16×16 radius 4.5, app name 12/500 uppercase at 62% white, relative
  time 12/500 at 52% white on the trailing edge.
- Title 15/600, −.012em, `#fff`. Body 15/400, −.012em, 78% white, 2px below the title.
- Card: `rgba(38,44,50,.72)`, `backdrop-filter: blur(28px)`, radius 22, padding 13/14,
  0.5px `rgba(255,255,255,.09)` border. 9px between stacked notifications.

Survives Notification Centre, Apple Watch forwarding and CarPlay unchanged, because
there is nothing custom in it.

### 1b — Long-look match card (recommended for moved + postponed only)

A Notification Content Extension shown on long-press. The short look underneath is
still `1a`.

- Card radius 24, same material. A type eyebrow sits on the header's trailing edge:
  `KICKOFF IN 30` accent `#c8f25a` · `KICKOFF MOVED` `#6fc9ff` · `POSTPONED` `#ff8f6b`,
  all 9.5/700 +.14em.
- **Kickoff reminder**: crests 44×44 with club names 12.5/600 beneath, kickoff time
  26/700 tabular centred between them, `TODAY` 8.5/700 +.14em under it, then
  `venue · matchday` 12.5/400 at 60% white. Two actions on a 0.5px divider, 46pt tall:
  `Open club` (accent) and `Mute this club`.
- **Moved**: crest 34 / fixture name 14.5/600 / crest 34 on one row, then the time
  change as **was → now** — old time 19/600 struck through at 42% white, a `#6fc9ff`
  arrow, new time 19/700 in white — with "Calendar entry moved for you" right-aligned
  at 11.5/400.
- **Postponed**: same header row, then the struck-through kickoff beside a
  `NO NEW DATE` chip (`rgba(255,143,107,.14)` fill, `.36` border, `#ff8f6b` text,
  radius 9) and "Removed from your calendar".

The kickoff reminder does not earn a custom view; if you build only one content
extension, build it for the two change alerts.

## Where each alert comes from

| Alert | Origin | Gate |
| --- | --- | --- |
| Kickoff reminder | **Local**, scheduled on device — `src/features/push/reminders.ts` | none |
| Kickoff moved | Server push | `alertMoved` |
| Postponed / abandoned | Server push | `alertPostponed` |

⚠ **The kickoff reminder is not a push.** It is scheduled locally at kickoff − 30 min
(`REMINDER_LEAD_MS`), 21-day horizon, 60-slot budget, soonest first, wholesale
re-armed on every change. A TBD kickoff is never scheduled — a provisional kickoff is
a date, not an instant. There is no `alertReminder` on the registration wire; it is
device state and must not leak into that body.

⚠ Its copy is already fixed in `src/lib/i18n/copy.ts` → `reminders`:
EN `${home} v ${away} · 30 minutes` / `Kicks off ${kickoff} at ${venue}.` (and the
venue-less variant), ES `· 30 minutos`. The mock uses these strings verbatim. Do not
re-word them here.

⚠ **The moved and postponed strings are server-owned and not yet signed off.** The
wording in the mock is a proposal.

## Crests — the load-bearing constraint

⚠ **iOS allows exactly one attachment per notification.** A home-and-away crest pair
must therefore be **one composed image**: either rendered server-side into a single
PNG whose URL the payload carries, or drawn in a **Notification Service Extension**
that downloads both crests and composites them.

⚠ **A local notification cannot run an NSE.** The kickoff reminder can only attach a
file already cached on disk, or ship with no crest at all. Three ways out, all
acceptable, none free:

1. Compose server-side, attach one URL — reminder still has no crest unless the app
   pre-caches a composed image per upcoming fixture.
2. Ship an NSE for the two server pushes; let the reminder go crest-less.
3. Drop to a single club crest everywhere (the followed club), pre-cached at follow
   time — the only option where all three alerts look alike.

⚠ **Crests are LaLiga-only.** Premier League, Bundesliga and Serie A clubs have no
published crest, so their notifications fall back to the **abbreviation tile**: radius
`0.28 × size`, `#1e2126` on a `rgba(255,255,255,.14)` hairline, three-letter label at
`0.32 × size` in `#8fa0a6`. That variant is not drawn in the mock yet.

## Grouping and routing

- Server pushes carry `thread-id: fixture-{uuid}` so a re-scheduled kickoff collapses
  instead of stacking.
- ⚠ `NotificationContentInput` in SDK 57 exposes `threadIdentifier` as **output only**,
  so a locally scheduled reminder cannot join that thread. A local reminder and a later
  server "kickoff moved" for the same fixture appear as two notifications, not one.
  Accepted — they say different things — but it is a real divergence from the rule above.
- `interruption-level: active` on a move: time-sensitive, not critical.
- Every payload routes to one destination — `altagamafc://club/{slug}` — through
  `routeFor()` in `src/features/push/deep-link.ts`. Local and server payloads share a
  shape deliberately so one handler serves both; an unrecognised `type` opens the app
  rather than throwing.
- Never send a goal or final-score payload until a live feed exists. The backend's
  scores job refreshes roughly every 4h; the type is reserved, not implemented.
- Banners stay **on** in the foreground (`capability.ts`) — a reminder arriving while
  the app is open must still be visible.

## Payloads

```jsonc
// 1 — kickoff reminder (LOCAL, expo-notifications; shown for shape parity)
{ "aps": { "alert": { "title": "Athletic Club v Getafe CF · 30 minutes",
                      "body": "Kicks off 18:30 at Estadio San Mamés." },
           "sound": "default" },
  "type": "kickoff_reminder", "fixtureId": 84213, "clubSlug": "athletic",
  "deepLink": "altagamafc://club/athletic" }

// 2 — kickoff moved (server push on sync diff)
{ "aps": { "alert": { "title": "Kickoff moved · Valencia v Real Madrid",
                      "body": "Now 21:00, was 19:00. Same day, Camp de Mestalla. Your calendar is already updated." },
           "thread-id": "fixture-84219", "interruption-level": "active",
           "mutable-content": 1 },
  "type": "kickoff_moved", "fixtureId": 84219, "clubSlug": "valencia",
  "oldKickoffUtc": "2026-09-05T17:00:00Z", "newKickoffUtc": "2026-09-05T19:00:00Z",
  "deepLink": "altagamafc://club/valencia" }

// 3 — postponed / abandoned
{ "aps": { "alert": { "title": "Postponed · FC Barcelona v Rayo Vallecano",
                      "body": "Matchday 4. No new date yet — we will tell you the moment there is one." },
           "thread-id": "fixture-84231", "mutable-content": 1 },
  "type": "fixture_postponed", "fixtureId": 84231, "clubSlug": "barcelona",
  "status": "postponed", "deepLink": "altagamafc://club/barcelona" }
```

`mutable-content: 1` is what lets the NSE swap in the composed crest attachment. Drop
it if you go with option 3 above.

## Tokens used here

**Accent** `#c8f25a` · **Moved** `#6fc9ff` · **Postponed** `#ff8f6b` ·
**Card** `rgba(38,44,50,.72–.74)` + `blur(28px)` · **Hairline** `rgba(255,255,255,.09)`
at 0.5px · **Ink** `#fff` / 78% / 62% / 52% / 45% white.
**Radius** 24 long look · 22 short look · 9 attachment plate and chips · 4.5 app icon.
**Type** 15/600 title · 15/400 body · 14.5/600 fixture name · 12.5/600 club name ·
12/500 app name and time · 9.5/700 +.14em type eyebrow · 8.5/700 +.14em micro-label.
26/700 kickoff, 19/600–700 times — **all tabular**.

Full token set: `theme.ts` in `handoff_AG-ios/`. ⚠ That file has drifted from
`src/constants/theme.ts`, which is the live one — and neither carried `#6fc9ff`
as an alert colour or `#ff8f6b` at all until ADR 0037 added both.

## Assets

- `icons/app-icon-60.png` — the shipping app icon, from `icons/AppIcon.appiconset/`.
  Used in every notification header so the glyph is the real one. Never redraw the
  mark by hand.
- **Club crests**: `logoUrl` from `/cronogol/teams`. Hot-linked in the mock for
  convenience only. LaLiga is covered; everything else uses the abbreviation tile.

## Files

| File | What it is |
| --- | --- |
| `AltaGama FC Notifications.dc.html` | The designs — `1a` short look, `1b` long look, plus a panel of the code-imposed constraints |
| `icons/app-icon-60.png` | App icon used in the mocks |
| `support.js` | Runtime the prototype needs to open locally. Not part of the design |

## Decide before build

1. **Which crest strategy** — server-composed, NSE, or single crest. This decides
   whether the iOS target gains an extension.
2. **Sign off the moved and postponed copy.** Everything else is already fixed in code.
3. **Draw the no-crest fallback** for Premier League, Bundesliga and Serie A, and the
   Spanish strings for both change alerts. Ask and I will add them.
