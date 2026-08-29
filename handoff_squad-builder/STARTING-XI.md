# Alta Gama FC — Starting XI, iOS

Scope of this pack: **the squad builder and the club-page row that opens it.**
Nothing else about the app is in here — the rest of the iOS design lives in
`design_handoff_altagama_ios/`.

| File | What it is |
| --- | --- |
| `Starting XI.dc.html` | The builder, interactive. Tap slots, tap players, change shape, open the sheets |
| `formations.ts` | Slot geometry for all nine shapes + `lineOf` / `autoFill` / `reseat`. Drop under `src/features/starting-xi/` |
| `ClubStartingXIRow.tsx` | The club-page entry row, ready to drop into `src/app/club/[slug].tsx` |
| `support.js` | Runtime the design file needs to open locally. Not part of the design |

Built against `https://altagamafc.com/en/starting-xi/athletic-club`. Squad,
numbers and formation list are the site's; nothing is invented.

## Why it is not the web builder

| Web | iOS |
| --- | --- |
| Drag a name from a column onto the pitch | **Tap a slot, tap a player.** A dragging finger covers the 46pt slot it aims at |
| Squad in a column beside the pitch | **Rail under the pitch**, filtered to the line you tapped — the mobile web fallback opens a sheet per placement, eleven sheets to fill a pitch |
| Formation / pitch / export side panels | Three detented sheets, each closing on *Done* |
| Instagram + Facebook + X buttons (browser has no share target) | One render → the system share sheet |
| Placed players grey out in the list | Placed players leave the rail; the count chip carries progress |

Dragging survives for the one case where it beats tapping: dragging a **placed**
token onto a teammate to swap, where both ends are already visible.

## Screen anatomy (393 × 852)

Status bar · nav (back to club, title, **Export**) · club row with crest, source
line and the `n / 11` count chip · pitch 361 × 424 · toolbar (Shape · Look ·
Auto fill · Clear) · hint line · line filter chips (All / GK / Def / Mid / Fwd) ·
squad rail · home indicator. Rail sits 58pt off the bottom so cards clear the
corner radius.

**Slot token**: 46pt circle. Empty — dashed ring, position label inside, nothing
under it. Filled — lime fill, shirt number, name caption (max 66pt, ellipsised)
below. Selected — lime ring plus a 4pt lime halo.

**Hint line** is the only instruction on screen and it changes with state:
`Tap a slot, or tap a player to fill the next one` → `Pick the LB` →
`Tap a player to swap into LB` (with a **Remove** action) →
`Eleven placed — export or keep tinkering`.

## Interactions

- **Tap empty slot** → selects it, rail filters to that line.
- **Tap filled slot** → selects it; a rail tap swaps, **Remove** clears.
- **Tap rail player with nothing selected** → drops him in the first empty slot
  of his own line, falling back to the first empty slot at all.
- **Tap rail player with a slot selected** → placed there, selection clears,
  filter returns to All. Same reset when a sheet opens: a narrowed rail with no
  selected slot explains nothing.
- **Auto fill / Clear** — see `autoFill`; Clear is destructive and asks first
  (action sheet), because eleven taps sit behind it.
- **Shape change** keeps the eleven and re-seats them (`reseat`).

## Native notes

- **Haptics carry the state change**: `.light` impact on place, `.rigid` on
  swap, `.warning` on clear. The pitch is too small for motion to read as
  confirmation.
- **Long-press a token** for the context menu — Swap, Remove, Player page. Keeps
  three actions off the toolbar.
- **Persist per club**: formation, look and placements. A half-built XI that
  vanishes on backgrounding is why people stop mid-build.
- **Export renders off-screen** at a true 1080 × 1350 / 1080 × 1080 /
  1080 × 1920 — never a screenshot of a 361pt pitch scaled up. Same rule the web
  page states. `Save to Photos` and the share sheet take the same asset.
- **Squad caveat stays visible**: official league registrations, a new signing
  takes days to appear. Put it at the end of the rail, not in a footnote — the
  reader looking for a missing player is looking at the rail.
- **Crests**: LaLiga only, abbreviation tile otherwise (`CrestView` rule).

## Entry point — the club-page row

`ClubStartingXIRow.tsx`. Goes on the club page **between the subscribe block
and the Fixtures / Players segmented control** — a club action, not a squad
detail, and above the fold without pushing the season spine off it.

38pt tile in accent wash with the pitch glyph · `Starting XI` at 15/600 ·
one-line promise at 12.5 in muted ink · chevron in accent. Card is
`raised` (#15171a) at radius 22, 14/16 padding, 16 below. It pushes
`/club/[slug]/starting-xi`, and the builder's back button returns here.

⚠ The row needs a published squad, so it is live on **LaLiga Primera clubs
only**. Elsewhere it stays in place but is inert and carries the `squadEmpty`
copy — a removed row reads as a missing feature, an explained one reads as
missing data. Wired in `AltaGama FC iOS.dc.html` and specced in SPEC.md §3.5.

## Open
- **Club switching.** The web builder has a full club picker; on iOS this screen
  is reached *from* a club, so switching mid-build would throw the XI away. Left
  out — say if it should be a sheet with a "this clears your XI" warning.
- **Card title.** The web export takes a custom title ("My starting XI"); not
  drawn here. Add it to the export sheet as one text field?
- **Look presets** are Line art / Turf / Angled, as on the web. Angled tilts the
  pitch only; whether the export card tilts too is undecided.
