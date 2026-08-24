# Handoff: AltaGama FC — native iOS app

## Overview

The native iOS app for **AltaGama FC** (Expo / React Native, repo
`EMedina24/alta-gama-fc-native`). It ports the functionality of the `cronogol` web
app onto native: browse a league's published matchdays, read a league table, follow
clubs, and get told when a kickoff moves. Data comes from `senpai-backend`
(`crono-gol.com`) only.

This bundle is also the answer to **ADR 0014** — the app-specific design language
that decision was waiting on. Behaviour is inherited from the web app; **appearance
is not**. Exactly two things cross over: the **mark** and the accent
**lime `#c8f25a`**. Surfaces are graphite (not the web's navy), type is the system
face at iOS sizes (not Chivo / Bricolage), and every control is a platform control.

Four tabs: **Today · Matchdays · Table · Clubs.** Account is a sheet behind the
header avatar, not a tab — four tabs fit `NativeTabs` (ADR 0005) with room to spare.

## About the design files

The `.dc.html` files in this bundle are **design references created in HTML** —
working prototypes that show intended look, structure and behaviour. They are **not
production code to copy**. The task is to **recreate these designs in this
codebase's own environment**: Expo Router screens (ADR 0002), the atomic component
layer (ADR 0013), `NativeTabs` (ADR 0005) and the token module (ADR 0006). Nothing
about the HTML authoring format should travel — no CSS strings, no DOM structure.

Open them by double-clicking; `support.js`, `leagues/` and `brand/` must stay
alongside. All data in them is **mock**. Club crests are hot-linked from the
product's own CDN for the prototype; in the app use `logoUrl` from
`/cronogol/teams`.

## Fidelity

**High fidelity.** Colours, type sizes, spacing, radii, hit targets and copy (EN and
ES) are final and listed here and in `theme.ts`. Two areas are deliberately
unfinished and flagged in the UI itself:

- **Qualification bands** are a placeholder (`pos ≤ 4 / ≤ 6 / = 7 / ≥ 18`). They must
  come from per-league config before launch.
- **Live scores.** The backend has no live push (`/cronogol/scores` refreshes ~4h),
  so every score in the design states its age. Goal alerts are drawn **disabled**
  with the reason. Do not remove those lines to make the screen look cleaner — they
  are the difference between honest and broken.

## Screens / views

Full per-screen spec — layout, component anatomy, states, exact copy — is in
**`SPEC.md`** §3. Summary:

| Screen | Route | Purpose |
| --- | --- | --- |
| **Today** | `/` | What's happening now: an in-progress match (with score age) or last result + next kickoff; `FINISHED TODAY` across every tracked league; upcoming matches from your clubs — or, with nothing followed, the follow-a-club card |
| **Matchdays** | `/matchdays` | One league's published round: league selector, matchday strip 1…N, `Add all N matches` (jornada `.ics`), day-grouped match rows |
| **Table** | `/table` | One league's standings, LaLiga first. 3 columns at phone width; a row expands in place to W D L GF GA GD + form, then opens the club |
| **Clubs** | `/clubs` | Subscribed clubs pinned at the top with switches, then the league's full club list with `+ FOLLOW` |
| **Club page** | `/club/[slug]` | Crest + identity, the subscribe block (alerts + calendar), and the season spine (results behind, next fixture accented, `--:--` ahead) or the no-schedule state; Players tab |
| **Sheets** | modal | Match-alerts confirm · Add matches to (Google / Apple / `.ics` + feed URL) · Matchday feed · Account |
| **Onboarding** | first run | Club picker, then the alert primer — permission is asked **after** the explanation |

**Subscription model — the thing most likely to be got wrong:** a club is one
subscription (push + email + one season-long `.ics`). There is **no per-match**
subscribe, alert or add anywhere. A matchday feed is a separate, additional thing.

## Interactions & behaviour

- Tab switch is instant; no cross-fade. Row taps push; sheets present modally with a
  grabber and dismiss on scrim tap.
- Table rows expand in place, one at a time.
- Club switch in the Clubs tab subscribes/unsubscribes immediately — no confirm
  (reversible, and the feed regenerates). The only two-step action is **Delete
  account**.
- Matchday strip and prev/next both drive the same state; switching league clamps
  the round to that league's count (34 in the Bundesliga).
- Language and clock format switch live from the account sheet; every date, day name
  and H/A tag re-renders (`L`/`V` in Spanish).
- Motion: keep it to platform defaults plus the accent ring on the "next" node. The
  live dot may pulse; nothing else animates. Honour `prefers-reduced-motion` /
  Reduce Motion.
- Accessibility: nothing interactive below 44pt; the type scale is Dynamic
  Type-compatible; crest images are decorative (`accessible={false}`) with the club
  name carrying the label.

## State management

| State | Type | Notes |
| --- | --- | --- |
| `tab` | `'today' \| 'matchdays' \| 'table' \| 'clubs'` | router-owned |
| `club` | slug \| null | club route param |
| `league` | league id | Matchdays + Table selection; persist last used |
| `matchday` | number | clamped to the league's round count |
| `openRow` | position \| null | expanded standings row |
| `sheet` | `null \| 'alerts' \| 'calendar' \| 'matchdayFeed' \| 'account'` | one at a time |
| `subscriptions` | club slug[] | server-owned once signed in (`/cronogol/me/feeds`) |
| `alertTypes` | `{reminder, moved, postponed}` | **global**, not per club |
| `lang` | `'en' \| 'es'` | persist; default from device locale, Spanish first market |
| `clock` | `'24h' \| '12h'` | persist |
| `timezone` | tz id | persist; default to device zone |
| `onboarded` | boolean | gates the picker + alert primer |
| `clubTab` | `'fixtures' \| 'players'` | club page segmented |

Fetching lives in screens or a data layer — never in a molecule or atom (ADR 0013).
`SPEC.md` §6 maps every mock structure to its endpoint and lists the API traps that
otherwise produce convincing-looking bugs (exclusive vs inclusive `to`,
`lastSyncedAt === null`, non-chronological jornadas, the ~4h scores job, the ~3h
standings lag).

## Design tokens

`theme.ts` in this bundle is a **drop-in replacement** for
`src/constants/theme.ts`. Headlines:

**Surfaces** `#0a0b0c` ground · `#15171a` card · `#1e2126` raised · `#242830` control
track · `#12161a` active row · `#12151a` group header
**Hairlines** `rgba(255,255,255,.05)` row · `.07` section · `.12` outline
**Ink** `#f4f6f6` · `#a3abb0` · `#8fa0a6` · `#7c858b` · `#59626a`
**Accent** `#c8f25a`, ink on accent `#101806`, wash `rgba(200,242,90,.14)`, ring
`rgba(200,242,90,.45)`
**Live / danger** `#ff5c47`
**Bands** UCL `#c8f25a` · UEL `#6fc9ff` · Conference `#b79bff` · Relegation `#ff6b5e`
**Form chips** W fill `#c8f25a` · D fill `#3a4652` · L outline `rgba(255,107,94,.7)`
**Spacing** 2 / 4 / 8 / 12 / 16 / 20 / 24 / 32 / 44 — screen gutter 20, card pad
16–18, sheet pad 20
**Radius** 28 sheet · 22 card · 20 group · 18 tile · 14 control · 12 chip · 9
segmented · 6 form chip · 2 band rail · pill
**Type** system face (SF Pro). 34/700 large title · 26/700 title · 22/700 sheet title
· 17/600 headline · 15/600 row title · 15/400 body · 13.5 footnote · 12.5 caption ·
10/800 + 1.8 tracking uppercase eyebrow · 40/700 kickoff · 38/700 score. **Every
numeric run is tabular.**
**Elevation** none. The app has no shadows; depth is surface lightness. (The device
frame in the mock is the only shadow in the files.)

Rule from ADR 0014 that still binds: **no colour, space or font literal in a
component** — everything through the theme, so most of this can be re-skinned from
`atoms/`.

## Assets

- `brand/mark-accent.svg`, `mark-dark.svg`, `mark-light.svg`,
  `mark-currentcolor.svg`, `lockup-light.svg` — the AltaGama FC mark. `mark-dark`
  on the lime tile is the notification / Live Activity / widget app glyph.
- `leagues/laliga.png`, `premier-league.png`, `bundesliga.png` — supplied league
  artwork, trimmed. Bundesliga is the emblem only (its lockup's black wordmark dies
  on dark). **Serie A has no mark** — text label, don't invent one.
  Rule: marks that carry their own wordmark get **no** text label beside them;
  emblem-only and mark-less leagues get the text.
- **Club crests**: `logoUrl` from `/cronogol/teams`. LaLiga is covered; everything
  else falls back to the **abbreviation tile**, which is part of the design, not a
  bug. Never hot-link a football provider.
- Icons: simple stroked glyphs at 1.8–2.2 stroke on `currentColor` (bell, calendar,
  chevrons, clock, search, shield, download, close, check, warning). Use SF Symbols
  or Lucide in the app.
- No photography anywhere. Player headshots in the squad card are placeholders —
  no source exists and rights are per league.

## Files

| File | What it is |
| --- | --- |
| `AltaGama FC iOS.dc.html` | The prototype. Tabs, matchday strip, table expansion, club pages, sheets, onboarding, EN/ES switch. Tweak panel toggles language, clock, board state (live vs idle) and start-on-onboarding |
| `AltaGama FC iOS - explorations.dc.html` | The option set this was chosen from — three Today directions, two fixtures treatments, two table treatments, lock-screen notifications + Live Activity + widgets, onboarding, tab-bar A/B. Turn 2 at the top carries the club page and subscribe sheets |
| `SPEC.md` | Per-screen spec, atom → molecule → organism inventory (ADR 0013), APNs payloads, `ActivityKit` attributes, widget specs, mock-data → endpoint map, open questions |
| `theme.ts` | Drop-in replacement for `src/constants/theme.ts` |
| `support.js` | Runtime the prototypes need to open locally. Not part of the design |
| `leagues/`, `brand/` | Assets listed above |
| `screenshots/` | Rendered states of the prototype (2× PNG), listed below |

### Screenshots

| File | State |
| --- | --- |
| `01-today-live.png` | Today, a match in progress — note the score-age line |
| `02-today-idle.png` | Today on a quiet day: last result + next kickoff |
| `03-matchdays-laliga.png` | Matchdays, LaLiga round 4 |
| `04-matchdays-premier.png` | Matchdays, Premier League — abbreviation tiles where no crest source exists |
| `05-table-expanded.png` | Table with a row expanded (W D L GF GA GD + form) |
| `06-clubs.png` | Clubs: subscribed pinned above the league list |
| `07-club-page.png` | Club page: subscribe block + season spine |
| `08-sheet-alerts.png` | Match-alerts confirm sheet |
| `09-sheet-calendar.png` | Add matches to (Google / Apple / `.ics` + feed URL) |
| `10-sheet-account.png` | Account sheet: alert types, preferences, feeds, delete |
| `11-onboarding-clubs.png` | Onboarding step 1 — club picker |
| `12-onboarding-alerts.png` | Onboarding step 2 — alert primer before the permission prompt |
| `13-today-no-clubs.png` | Today with nothing followed — the follow card |
| `14-today-spanish.png` | Today in Spanish (`Jornada`, `FINALIZADOS HOY`) |
| `15-lock-screen-notifications.png` | Lock screen: Live Activity + the three alerts |
| `16-live-activity-widgets.png` | Dynamic Island, both widget sizes, alert settings |

Suggested reading order for whoever implements this: this README → `theme.ts` →
`SPEC.md` §3 for the screen you're building → the prototype for that screen.
