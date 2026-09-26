# Handoff: Starting XI creator, iOS (mobile)

## Overview
This is the mobile version of the Starting XI creator, made to go inside the iOS app. A fan picks a club, then taps positions on a flat or 3D pitch to fill a formation with players. They can bench up to 7 players, compare against a predicted XI, and save up to 5 lineups per club. Data comes live from the public CronoGol API at `https://crono-gol.com/cronogol`, which needs no auth. If the API can't be reached, the prototype falls back to sample data in `xi-data.js`.

This screen matches the desktop creator (`design_handoff_starting_xi/`) in behaviour and data, but its look follows the Medina iOS kit: graphite surfaces, liquid glass over a club-tinted scene, and a lime accent. It differs in three ways: **drag-and-drop is replaced by tap and bottom sheets**, **touch gestures** control the pitch, and the bench **folds away**.

## About the design files
`Starting XI Mobile.dc.html` is a **design reference built in HTML**: a working prototype showing how the screen should look and behave, not production code. Rebuild it in the iOS app using its own patterns (SwiftUI/UIKit, or React Native if that's what the app uses). `support.js` is the prototype runtime and is not part of the design. The iPhone bezel, status bar, Dynamic Island and home indicator are presentation only. Open the HTML in a browser to try it. On desktop, drag with the mouse to rotate and use the scroll wheel to zoom.

## Fidelity
**High fidelity.** Colours, type, spacing, radii, motion and interactions are final. The visual language follows the **Medina iOS kit** (`ui_kits/medina-ios/` in the Medina Digital design system: the "Lineup builder" card, `ios-screens-5.jsx` / `ios-parts.jsx`). If the app already has the RN drop-ins from `templates/medina-ios-rn/`, build on those. The design is built on a **393×852pt screen** (iPhone 16 Pro class). Lay it out fluidly; the pitch card flexes to fill the space left over.

## Theme and tokens
**Dark only.** The graphite kit has no light theme, so the old Dark/Light setting has been removed.

**Surfaces**
- screen bg `#0a0b0c`, raised `#1e2126`, hairline `rgba(255,255,255,.05)`, strong hairline `rgba(255,255,255,.12)`
- text `#f4f6f6`, text2 `#a3abb0`, muted `#7c858b`, faint `#59626a`
- lime **`#c8ff3d`** (via `--md-accent`, tweakable), text on lime `#101806`, lime wash `rgba(200,255,61,.14)`
- live/critical `#ff5c47`, wash `rgba(255,92,71,.14)`
- iOS fill (search, segmented track) `rgba(118,118,128,.24)`

**Club scene (screen background)**
- `radial-gradient(90% 46% at 0% 6%, c2@50%, c2@0 70%)` over `linear-gradient(180deg, c1 0%, c1@80% 34%, #0a0b0c 80%)`.
- `c1/c2` come from the kit's `CLUB_TINT` table (RMA `#0b1f66/#3b5bd9`, BAR `#141d5a/#8a1538`, ATM `#3d0b12/#c8202d`, ARS `#4a0a0e/#e0212b`, LIV `#4a0a12/#c8102e`, BET, GET, VIL). Other clubs fall back to the kit colour for c2 and a 32% shade of it for c1.
- Crest watermark: 290pt, left −56, top 66, opacity .15, grayscale .3. Crossfades over 500ms when the club changes.

**Liquid glass (GLASS2)**, used by every control over the scene:
- fill `linear-gradient(180deg, rgba(255,255,255,.085), rgba(255,255,255,.02))` over `rgba(16,18,22,.34)`
- `backdrop-filter: blur(28px) saturate(1.8)`, border .5px `rgba(255,255,255,.16)`
- shadow `inset 0 1px 0 rgba(255,255,255,.14), 0 12px 30px rgba(0,0,0,.22)`
- Sheets and pop-overs use the same recipe over `rgba(20,22,26,.8)`.

**Type**
- UI text uses the system font (SF Pro): headline 17/600 (−.2), callout 14.5/600 (−.15), body-strong 15/600, footnote 13.5/400, caption 12.5/500, micro 11.5/500.
- Eyebrow labels: 9.5/800, tracking 1.3, uppercase, muted.
- Display text uses **Saira Extra Condensed**, uppercase, line-height .92, tabular figures. It is used for formations (19–20/700), player initials (700), the player card name (30/800) and stat values (30/800).

**Radii:** screen 54; pitch card 28; sheets 40 (inset 8pt from the edges); bench tray 22; segmented tracks 22 (glass) / 11 (iOS); chips 18–20; buttons 14; stat tiles 16; circles fully round.

**Motion:** one easing, `cubic-bezier(.32,.72,0,1)`.
- Sheets slide up over 500ms; the backdrop `rgba(0,0,0,.35)` fades in over 300ms.
- The formation pop-over fades up over 350ms.
- Pitch transforms 700ms (instant while a gesture is in progress).
- A placed token pops in over 700ms, with a 900ms ripple and shimmer.
- Tokens breathe (scale 1.015) on a 6s loop, each starting 0.37s after the previous one.

**Icons:** Phosphor **Bold** for UI glyphs (they match the kit's 2–2.4 stroke): caret, check, plus, x, search, sliders, bookmarks, arrows. Fill is used for the status bar only.

## Layout (top → bottom)
The content is a flex column: padding 58 top (clears the status bar), 16 sides, 30 bottom, with 12pt gaps between rows.

### 1. Header row
- **Club button**, fills the row. Crest 34pt (real crest image with `drop-shadow(0 2px 6px rgba(0,0,0,.25))`; fallback is a `#1e2126` tile, radius 12, with the 3-letter code at 12.5/800 text2). Next to it the club name (headline, ellipsis, caret) and `League · Season 2026/27` (micro, text2) plus a 5pt source dot (lime = live, amber = sample). Tapping opens the **club sheet**.
- **Lineups**, 44pt glass circle, bookmarks icon. An 18pt lime count badge shows when the club has saved lineups.
- **Save**, 44pt circle with a check icon. **Lime fill with `#101806` icon** when the XI is valid; otherwise `rgba(255,255,255,.08)` with a hairline and a faint icon.

### 2. Controls row
- **My XI | Predicted XI**: glass track (padding 3, radius 22), 34pt segments at callout. The active segment has a `rgba(255,255,255,.16)` fill with text colour; inactive segments are transparent with text2.
- **Formation** chip: 40pt glass, radius 20. Saira 19/700 value plus caret. Dimmed to 50% and disabled in Predicted mode.
- **Settings**: 40pt glass circle.

### 3. Pitch card (flex: 1)
- Glass card, radius 28, fill `linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.01))`.
- **Top bar**, 12pt inset:
  - **Status pill**, 28 tall, radius 14, blur 12, 6pt dot plus caption:
    - `n of 11`: `rgba(255,255,255,.1)` / text
    - `Ready`: lime wash / lime
    - `No goalkeeper`: live wash / live
  - Then a spacer.
  - **Reset** (zoom %, only shown when the view is off its default).
  - **3D/Flat** toggle.
  - **Flip**, 28pt circle.
  - All three buttons are 28 tall, with `rgba(255,255,255,.08)` fill, a .5px `rgba(255,255,255,.16)` border and blur 12, at 12.5/600.
- **Scene:** starts 48pt below the top of the card. Perspective 1400, origin 50% 30%, `touch-action: none`.
- **Pitch plane:** 520×800 logical units, scaled to fit.
  - Flat scale = `min((h − 28)/800, (w − 20)/520)`; 3D scale = `min((h + 40)/760, w/540)`; both multiplied by the zoom.
  - Transform: `translate(pan) scale(base × zoom) rotateX(tilt) rotateZ(rot)`. Default flat and portrait; 3D starts at tilt 34°.
  - Fill: `linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.015))` over `rgba(10,11,12,.28)`, so the scene shows through.
  - 10-band stripes: `rgba(255,255,255,.025)`.
  - Markings: `viewBox 0 0 100 154`, stroke `rgba(255,255,255,.18)` at .4.
  - Radius 10, 1px `rgba(255,255,255,.12)` edge.
- **Tokens** (plane units; about 0.66pt per unit at default scale):
  - **Filled:** 100u circle, `linear-gradient(160deg, #f4f6f6, #c9cfd4)`, initials in Saira 36u/700 `#14161a` (or a photo, cover 50% 12%). Ring 4u `rgba(255,255,255,.9)`; **lime** if the player is not in My XI while viewing Predicted, or if the slot is the one currently selected. Halo 12u `rgba(255,255,255,.06)`, drop shadow.
  - **Shirt badge:** 40u, top-right −10, `#0a0b0c` fill, 3u `rgba(255,255,255,.3)` ring, 21u/700.
  - **Name label:** 23u/600, padding 6×16, radius 16, `rgba(10,11,12,.72)`, 2u lime inset outline for predicted differences. Sits below the token when flat and above it in 3D, counter-rotated to face the viewer.
  - **Empty slot:** 3u dashed `rgba(255,255,255,.35)` circle, `rgba(255,255,255,.04)` fill, bold `+` in text2. The slot id sits underneath as an eyebrow (19u/800, tracking 2.6). The targeted slot turns lime (border, wash, icon, label). The GK slot pulses lime before the first placement.
- **Hints**, bottom-centre: 32pt pill, `rgba(10,11,12,.72)` with blur 12, caption text, leading icon (lime hand-tap for "Tap a position to pick a player").

### 4. Bench row
- **Bench** glass chip, 36 tall, radius 18: caret (points up when open), "Bench" callout, `n/7` caption muted. Folded by default; the open/folded choice is saved.
- On the right: **Mirror** and **Clear** glass chips (caption 600, no icons). Dimmed in Predicted mode.
- **Bench tray** (open): glass, radius 22, padding 10, 7 columns.
  - Filled: 38pt orbs (same light gradient, 2pt white ring, 20pt shirt badge at top-right −5).
  - Empty: 38pt, 1.5pt dashed `rgba(255,255,255,.25)` circle with a `+`.

## Sheets
All sheets are liquid-glass cards inset 8pt from the sides and bottom, radius 40, padding 10/16/24, 14pt gap between sections.
- Each has a 38×5 grabber (`rgba(255,255,255,.28)`) and a headline title.
- The close button is a 40pt circle: `rgba(255,255,255,.08)` fill, hairline border, bold x.
- Tapping the backdrop closes everything.

- **Player picker** (top 180). Opens from an empty slot, **Replace player**, or an empty bench slot.
  - Header: `Pick for {SLOT}` or "Bench", with "Goals · Assists" as a muted caption on the right.
  - iOS search field: 38 tall, radius 12, iOS fill, 16pt text.
  - iOS segmented control All / GK / DEF / MID / FWD: track padding 2, radius 11; 30pt items; active item `#1e2126`. It **defaults to the tapped slot's position group**.
  - Rows are grouped by eyebrow headers (Goalkeepers, Defenders…). Each row: 38pt orb with shirt badge, short name (body-strong), and `goals · assists` (footnote, text2, tabular) on the right, with a .5px hairline between rows.
  - A second line under the name shows where the player already is: the slot id in lime ("LCB") or "Bench" in muted. Those players are dimmed to 50%.
  - The player currently in the target slot has a `rgba(200,255,61,.08)` row fill.
  - Tapping places the player; if they were in another slot, **the two swap**.
- **Player card**
  - 60pt orb, name in Saira 30/800, caption meta line (full name · #shirt · position · nationality), close button.
  - **4 stat tiles** (radius 16, padding 12, `rgba(255,255,255,.06)`): eyebrow label plus Saira 30/800 value for Goals (lime), Assists, Yellows and Age. Then a muted caption saying Season or Career.
  - Buttons: 44pt, radius 14, body-strong.
    - **Replace player**: lime fill with `#101806` text.
    - **Move to bench**: `#1e2126` with a hairline.
    - **Remove**: live wash with `#ff5c47` text.
  - Bench players only get Remove. In Predicted mode the card is read-only.
- **Club** (top 64): search field, then an iOS segmented control (All + one item per league), then league sections with sticky eyebrow headers showing the club count. Rows: 30pt crest (fallback tile radius 6), name in callout, lime check on the current club, and `rgba(255,255,255,.07)` fill for the current club. Search ignores accents and matches the 3-letter code. Picking a club clears the pitch and bench.
- **Formation pop-over:** 170pt wide, anchored right 64 / top 160, glass, radius 20, padding 6, max height 560 (scrolls). Eyebrow "Formation", then 44pt rows with the Saira 20/700 value; the active row has a `rgba(255,255,255,.1)` fill and a lime check. There's no dimming backdrop; tapping outside closes it.
- **Settings:** eyebrow-labelled glass segmented controls (38pt items, radius 19): Stats Season | Career; Language English | Español.
- **Lineups** (top 200): cards at `rgba(255,255,255,.06)`, radius 20, padding 14/16.
  - Each card: name (body-strong), formation (Saira 19/700), 11 × 24pt light initials dots, date (caption muted), and a 36pt glass trash button.
  - The loaded lineup has a 1px lime border.
  - Empty state: lime 135° hatch tile.
- **Save:** headline, caption `{Club} · {formation} · up to 5 per club`, a 44pt iOS-fill name field, and a 48pt lime **Save** button (radius 14).

## Gestures

| Gesture | Flat | 3D |
| --- | --- | --- |
| Tap | Empty slot → picker; filled slot → card | same |
| One-finger drag | Pans, only when zoomed in past 100% | Rotates (0.4° per pt horizontally) and tilts (vertical drag, 14–64°) |
| Pinch | Zoom 70%–260% and pan with the fingers' midpoint | same, plus a two-finger twist rotates |
| Release at or below 101% | Snaps back to 100% and re-centres | same |

- Panning is limited to `(zoom − 1) × 200` horizontally and 1.4× that vertically.
- A gesture only counts once the fingers move more than 6pt. After a gesture, **taps are ignored for 80ms** so a drag never counts as picking a slot.
- Switching between Flat and 3D resets zoom and pan. Reset returns to rotation 0°, tilt 34°, zoom 1, pan 0.

## Validation and rules
- **Save** is enabled only when all 11 slots are filled, the GK slot holds a goalkeeper, the view is My XI (not Predicted), and the club has fewer than 5 saved lineups.
- **Predicted XI** is read-only and uses the club's usual formation. It is currently a **placeholder**: slots are filled by position group, lowest shirt numbers first. Replace it with the backend's expected-XI route once that's public.
- **Mirror** swaps left and right within each row of the formation. **Clear** empties the pitch and the bench.
- Tapping a slot plays a short sine+triangle chime whose pitch rises with the row. It can be turned off with the `sound` setting.

## State
- **Saved between visits** (`localStorage['xi.creator.mobile.v1']`): `lang, clubSlug, formation, placements{slot→playerId}, bench[≤7], lineups{clubSlug→[≤5]}, statsMode, rotZ, tiltX, flat, flatRot, benchOpen`.
- **Not saved:** `zoom, panX, panY, picker{slot|bench}, pickBand, action{slot|bench, pid}, settings, lineupsSheet, saveSheet, clubMenu, clubQuery, clubLeague, formationMenu, query, predicted`.

## Data contracts
These are the same as the desktop handoff; see `cronogol-api.md` and the "Data contracts" section of `design_handoff_starting_xi/README.md`. In short:
- `GET /teams?league=laliga|premier-league`: clubs, kit colours and crests (`logoUrls.large`).
- `GET /teams/{slug}/squad`: the squad. `photoUrl` can be missing, so an initials fallback is required.
- `GET /players/{slug}/stats`: stats. The prototype reads `seasonTotals[0]` for Season and `overall` for Career, taking `goals`, `assists` and `yellows`. **A null value is not zero; show an em dash.** Fetch lazily, 4 requests at a time.
- Formations, slot order and `bandOf` come from `ig-xi-formations.ts`, transcribed into `xi-data.js`. Slot ids are protocol values; do not rename them.

## Copy (EN / ES)
Shared strings live in `STRINGS` in `xi-data.js`. Mobile-only strings:
- Tap a position to pick a player / Toca una posición para elegir jugador
- Pick for / Elegir para
- Replace player / Cambiar jugador
- Move to bench / Al banquillo
- Remove / Quitar
- Settings / Ajustes
- Stats / Estadísticas
- Language / Idioma
- Search clubs / Buscar club
- No clubs match / Ningún club coincide
- All / Todos
- Save lineup / Guardar alineación
- up to 5 per club / hasta 5 por club
- Pinch to zoom / Pellizca para hacer zoom
- Drag to rotate · pinch to zoom / Arrastra para girar · pellizca para zoom

## Files
- `Starting XI Mobile.dc.html`: the prototype. The template holds the layout and inline styles; the logic class holds state, gestures, placement, and the API calls with sample fallback.
- `xi-data.js`: formations, geometry, `bandOf`, club abbreviation, strings, and sample clubs and squads.
- `_ds/`: Medina Digital design system (token CSS and fonts; the visual reference is its `ui_kits/medina-ios` kit).
- `cronogol-api.md`: API contract.
- `support.js`: prototype runtime only.
