# Handoff: Season Stats (club page child screen)

## Overview
A stats screen for AltaGama FC, opened from a club page. It has two views behind one
segmented control:

- **Club** — season shape: cumulative goals, clean sheets / failed-to-score rings, scoring
  run, goals per matchweek with a home/away split, conceded-by-minute bands, comebacks,
  discipline.
- **Players** — one player at a time (Lewandowski is the mock): goals / assists /
  involvements, penalty split, goal timing by 15-minute band, assist partnerships, braces
  and streak tiles, discipline.

All numbers count up on entry and every chart animates in. Switching the segment replays
both.

## About the design files
The HTML in this bundle is a **design reference**, not production code. It is a prototype
of look and behaviour. Recreate it in the target codebase (this app is React Native /
Expo) using its existing components, navigation and data layer. Do not ship the HTML.

## Fidelity
**High fidelity.** Colours, type, spacing, radii and motion below are final. Data is mock
until the stats endpoints exist.

## Screens

### 1. Entry point — club page row (see `screenshots/03-club-page-entry.png`)
A tappable row on the club page, directly under the Starting XI row, same shell:
outer card `padding 5px`, `radius 26`, `background rgba(255,255,255,.045)`,
`border 1px rgba(255,255,255,.07)`; inner `radius 21`, `background #13161a`,
`inset 0 1px 0 rgba(255,255,255,.06)`, `padding 13px`, row `gap 13px`.
- Leading tile 40×40, `radius 13`, `background rgba(200,242,90,.14)`, icon `#c8f25a`
  (bar-chart glyph, stroke 1.8).
- Title `600 15px/1.2`, `-0.015em`: "Season stats" / "Estadísticas".
- Sub `400 12.5px/1.4 #7c858b`: "Goals, runs, timings and discipline — club and players."
  / "Goles, rachas, minutos y disciplina — club y jugadores."
- Trailing chevron in a 32px `rgba(255,255,255,.06)` circle, stroke `#c8f25a`.
- Press state: `transform: scale(.987)`, `.5s cubic-bezier(.32,.72,0,1)`.

### 2. Season stats — Club view (`screenshots/01-club-view.png`)
Header block, `padding 59px 20px 18px`:
- Back chip: height 34, `radius 17`, `background rgba(8,9,10,.5)`,
  `border 1px rgba(255,255,255,.11)`, label = club short name, `600 13px`.
- Club crest watermark, right `-70px`, 230×230, `opacity .10`.
- Hero background = the club-tinted gradient already used by the club page header.
- League wordmark (height 12) + eyebrow `800 9px`, `letter-spacing .2em`,
  `rgba(244,246,246,.58)`: `<LEAGUE> 2025/26 · <N> MATCHES` — league name and match total
  come from the league record, never hard-coded (Bundesliga = 34).
- Title `700 36px/.96`, `-0.042em`: "Season in numbers" / "La temporada en cifras".
- Segmented control: `background rgba(0,0,0,.34)`, `border .5px rgba(255,255,255,.12)`,
  `radius 13`, `padding 3`, items height 34 / `radius 10` / `700 12.5px`. Selected =
  `#c8f25a` on `#101806`; unselected = transparent on `#a3abb0`; `transition .35s`.
  **Only shown when the club has a published squad (LaLiga Primera).** Elsewhere the Club
  view renders alone.

Cards below share the shell described in §1 and stack with `gap 10px`, `margin 0 20px`.
Each animates in with `rise` (`opacity 0→1`, `translateY 16px→0`, `.7s
cubic-bezier(.2,.7,.2,1)`), staggered `0 / .08 / .16 / .24 / .32 / .4s`.

1. **Goals scored** — big number `700 44px`, `-0.045em`, `#c8f25a`, tabular; "2.7 per
   match" `600 12px #8fa0a6`; right column BIGGEST WIN `700 17px` + meta `600 10.5px
   #7c858b`. Chart: cumulative-goals area line, 124px tall.
2. **Clean sheets / Failed to score** — two-up grid, 104px doughnut rings (`cutout 78%`,
   `borderRadius 6`, track `rgba(255,255,255,.08)`), lime and `#ff5c47`; centre value
   `700 30px` over `/ <total>` `700 9px #59626a`; caption `600 11.5px #8fa0a6`.
3. **Scoring run** — value `700 44px #c8f25a`; strip of one cell per league match,
   `grid-template-columns: repeat(ceil(total/2), 1fr)`, `gap 3`, cell `height 16`,
   `radius 3`, lime when inside the run else `rgba(255,255,255,.07)`.
4. **Goals per matchweek** — bar chart 110px, home bars `#c8f25a`, away `#2f8f78`, legend
   swatches 8×8 `radius 2`; below, two progress bars (track `rgba(255,255,255,.07)`,
   height 6, `radius 3`) with W-D-L and goal totals.
5. **Conceded · by minute** — horizontal bars (6 bands, `barThickness 10`, `radius 4`),
   last band `#ff5c47`, rest `rgba(255,255,255,.22)`; right rail (width 108, `border-left
   1px rgba(255,255,255,.06)`) with LATE GOALS `#c8f25a` and CONCEDED LATE `#ff5c47`,
   both `700 30px`.
6. **Comebacks / Discipline** — two-up. Comebacks: `700 34px` + W/D chips (`height 22`,
   `radius 5`, `900 9px`, lime for W). Discipline: card glyphs 13×18 `radius 3` in
   `#f2d63b` and `#ff5c47` above `700 26px` counts.
7. Footnote `400 11.5px/1.5 #59626a`, `max-width 44ch`.

### 3. Season stats — Players view (`screenshots/02-players-view.png`)
1. **Player card** — club-tinted gradient ground; 62px round portrait with `1.5px
   rgba(255,255,255,.14)` ring; `#9 · FORWARD` eyebrow `800 9px .16em #a2adb2`; name `700
   22px/1.05`; "Change" chip (height 30, `radius 9`, `#c8f25a` label) opens the player
   picker (not built — currently a toast). Three stat columns split by `1px
   rgba(255,255,255,.08)`: goals (lime), assists, involvements, each `700 34px` over `800
   8.5px .16em #8fa0a6`.
2. **Penalty split** — 118px doughnut (`cutout 74%`, 3px `#13161a` segment borders), lime
   open play vs teal `#2f8f78` spot; centre = non-penalty goals. Right: legend rows,
   CONVERSION percentage + `6/7`, lime progress bar.
3. **Goal timing** — `700 40px #c8f25a` share after 75'; stoppage-time count top-right;
   6 bars by 15-minute band, final band `#f4f6f6`; below, first/second-half split bar
   (teal / lime, height 8, `gap 2`).
4. **Assisted by** — horizontal bars, `barThickness 14`, top partner lime, rest
   `rgba(200,242,90,.38)`; labels `600 11px #e9eeee`.
5. **Four tiles** — braces, hat-tricks (lime value), longest run, super-sub: label `800
   9px .18em #59626a`, value `700 30px`, note `600 11.5px #8fa0a6`.
6. **Discipline + quickest booking** — split row, `border-left 1px rgba(255,255,255,.06)`.
7. Footnote, same style as the Club view.

## Interactions & behaviour
- Club row tap → push Season stats, always opening on **Club**.
- Back chip → pop to the club page. Bottom tab taps also exit the screen.
- Segment tap → swap view, destroy and rebuild all charts, restart the count-up.
- Count-up: 1500ms, eased `1 - (1-t)³`, all integers/percentages animate from 0.
- Chart animation: bars/rings 800ms `easeOutQuart` with a per-item stagger
  (22ms matchweek bars, 90–110ms band/timing/partner bars); rings animate rotation over
  1500ms; the cumulative line draws point-by-point at 34ms per point.
- Press feedback on tappable cards: `scale(.987)`, `.5s cubic-bezier(.32,.72,0,1)`.
- Charts must be torn down on unmount / view switch (no leaked instances).

## State
- `statsOpen: boolean` — child screen visibility (reset when a bottom tab is used or
  another club is opened).
- `statsMode: 'club' | 'player'` — segment; forced to `club` on open, and effectively
  `club` for clubs with no squad.
- `countT: 0…1` — count-up progress; drives every number.
- Per-club data: season totals, per-matchweek goals + home/away flags, conceded bands,
  form letters; per-player: goals, assists, penalties, timing bands, partners, discipline.

## Design tokens
Colours: ink `#f4f6f6`; screen `#0f1316`; card `#13161a`; card shell
`rgba(255,255,255,.045)` + `1px rgba(255,255,255,.07)`; muted `#8fa0a6`; dim `#7c858b`;
label `#59626a`; lime `#c8f25a` (ink on lime `#101806`); teal `#2f8f78`; red `#ff5c47`;
yellow card `#f2d63b`; track `rgba(255,255,255,.07–.08)`; grid line
`rgba(255,255,255,.06)`.
Radii: 26 outer, 21 inner, 17 chip, 13 tile, 10 segment item, 3–6 bars.
Spacing: screen gutter 20; card gap 10; inner padding 14–16.
Type: SF Pro / system. `800 9px .18–.2em` labels, `600 11.5–12px` notes, `700 22/26/30/34/
40/44px` values (tabular numerals, `-0.03…-0.045em`), `700 36px/.96` screen title.
Motion: `rise` `.7s cubic-bezier(.2,.7,.2,1)`; press `.5s cubic-bezier(.32,.72,0,1)`;
segment `.35s`.

## Assets
- `players/p-lewa.png` — mock player portrait.
- `leagues/laliga.png` — league wordmark (one per league already exists in the app).
- Club crests come from the existing crest CDN; non-LaLiga clubs fall back to the
  abbreviation tile, as elsewhere in the app.
- Charts: Chart.js 4.4.1 in the prototype. On device use the codebase's charting library
  (e.g. Victory Native / Skia) — match the shapes and motion described above, not the API.

## Files
- `AltaGama FC Stats.dc.html` — standalone prototype of both views (this is the one to
  read; open it in a browser).
- The same screen also lives inside the full app prototype, `AltaGama FC iOS.dc.html`
  (project root), reachable at Clubs → a club → Season stats; that copy shows the real
  entry point and the league-aware header.
- `support.js` — runtime for the prototype file; not part of the design.
- `screenshots/` — 01 Club view, 02 Players view, 03 club page with the entry row.
