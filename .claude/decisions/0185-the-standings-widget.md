# 0185 — The standings widget

- **Date:** 2026-09-17
- **Status:** Accepted
- **Decided by:** Ed. He asked for a large Home Screen widget showing a table:
  long-press to pick the league, tap to open that league's table. The design is
  in `handoff_standings_widget/`. Three scope calls were made while planning:
  the Champions League is in the picker, the whole tile is the only tap target,
  and crests come from the new backend route.
- **Amends:** [0061](./0061-news-widget.md). This adds a THIRD App Group snapshot
  file on the pattern that decision set.

## Context

The fourth widget. The design is a 20-row LaLiga table at 7–8pt in the
`systemLarge` tile, with followed clubs on a lime wash and a zone rail per
row. The handoff's reference Swift can't be used as it stands:

- It uses an `altagama://` scheme.
- It draws the mark from an image asset the target doesn't ship.
- It loads crests with `AsyncImage`, which doesn't work in a widget.
- It hardcodes hairlines above rows 7 and 18.
- It assumes exactly 20 rows.
- It bands every table unconditionally.

The real catalogue has tables of 20, 18, 12 and 11 clubs, plus the Champions
League's 36.

The widget also needed crests per CLUB. Every other widget draws the backend's
composed PNG per FIXTURE side, and a table row has no fixture.
`senpai-backend` §135 shipped `GET /cronogol/crests?league=|club=` for this.
It returns every crest URL in a competition, but not bytes and not format
conversions.

## Decision

1. **A third file, `widget/standings.json`, holding EVERY table.**
   - It sits beside `snapshot.json` and `news.json`, the precedent from 0061:
     tables move on a different clock from fixtures.
   - Every table the picker can offer is written, not just one. The league is
     picked in the widget's Edit sheet, which runs in the extension and never
     tells the app, so the app can't know which table a placed tile wants.
     Seven tables come to a few kilobytes.
   - The writer is `src/features/standings/sync.ts`. It debounces for 1 s and
     reloads only when the content key changes; `writtenAt` is excluded from
     the key (trap 34).

2. **All policy is decided in JS; Swift only paints.**
   - `buildStandingsSnapshot` is pure, with a plain-node harness (33
     assertions over real production payloads).
   - It decides `band`, `ruleAbove`, `seamAbove` and the row window using the
     Table tab's own functions: `bandsApply` / `cupBandsApply`, `zoneFor` /
     `cupBandFor` and `completedMatchweek`.
   - The Table tab's league filter moved into `editorialTables()`, so the
     screen and the tile list the same leagues in the same order.
   - A second implementation in Swift would be a tile that can disagree with
     the screen it opens.

3. **Hairlines are data-driven.** A rule is drawn where the band GROUP changes.
   - Domestically, the three European places are one group. That reproduces
     the mock's rules above 8th and 18th for LaLiga, and gives the Bundesliga
     its own 7th and 17th.
   - In the league phase, each of the three bands is its own group.

4. **The Champions League is cut to 20 SLOTS.** This generalises the handoff's
   `fallbackRows` fixed point:
   - Show the head of the table, then a `···` seam that takes a slot of its
     own, then every followed club below the cut.
   - With no followed club below the cut, show ranks 1–20 and no seam.
   - The cup table is left OUT of the snapshot while its request is pending or
     has failed. An empty league in the picker reads as broken.

5. **`SelectLeagueIntent`, with nil meaning the app's current league.**
   - The query runs offline over the snapshot, like `ClubQuery`.
   - `defaultSlug` is `prefs.leagueSlug`, so a freshly placed tile shows the
     table the reader was last looking at.
   - A configured league that has dropped out of the snapshot falls back the
     same way instead of blanking the tile.

6. **The whole tile is one tap target: `altagamafc://table?league=<slug>`.**
   - The handoff's per-row club links are dropped. They are too small to hit,
     and only the last `.widgetURL` in a view tree takes effect.
   - The Table tab applies the param with **`setLeagueSlug`, the shared,
     persisted pick** (0164), then clears the param.
   - This is deliberately not trap 72's derive-don't-copy rule. The tap is the
     reader choosing a league, the same act as picking it in the menu, so
     Matchdays and Clubs follow it. Deriving the tab from the param would show
     one league while every other tab held another.
   - Unknown slugs are dropped, never stored.

7. **Crests are downloaded per club, resized on the device, and kept in their
   own directory.**
   - Crest URLs come from `/cronogol/crests`. `useCrestSets` covers every
     `LEAGUES` apiSlug plus `champions-league`, with `STALE.catalogue`, because
     a crest set changes when a club rebrands, not on matchdays.
   - URLs are picked through `crestSrc` with a new raster-first, SVG-free
     `widget` ladder.
   - Each crest is resized with `expo-image-manipulator` to at most 33×33 px
     (11pt @3x) and written as `standings-crests/{slug}.{contentHash}.png`.
   - The row carries `crestFile` only for a file that exists (warm, then
     build). A club's changed badge therefore gets a new file.
   - **Every format draws, so Serie A and the Bundesliga get real crests
     here**, which the fixture-crest widgets don't:
     - Rasters, WebP included, decode straight through the manipulator.
     - SVG-only clubs (all of the Bundesliga, a few UCL clubs) are loaded with
       `expo-image`'s bundled SVG coder (`Image.loadAsync`, bounded at 132px),
       and that image ref is handed to the manipulator.
   - The API doc's "lettered tile forever" describes surfaces the SERVER draws.
     It doesn't bind a client that can rasterise.
   - The first build refused SVG and shipped Bundesliga tiles; Ed caught it on
     a placed tile the same day.
   - The directory has its OWN sweep, because `pruneCrestCache` keys on fixture
     ids. The sweep keeps every crest on disk rather than only the windowed
     rows, and runs only after every crest set has answered: a failed set would
     otherwise look like clubs that no longer exist.
   - `CrestView` gained an optional `groupPath`; every existing caller is
     unchanged.

8. **Names use `displayName`, not `widgetName`.**
   - The first render with `widgetName` printed `Madrid` for Atlético and a
     second `Barcelona` for Espanyol, two rows apart.
   - The name column is the flexible one and fits the longest real name,
     `Brighton and Hove Albion`, at 292pt.
   - The rows now match the Table tab's names.

9. **Where the view departs from the handoff:**
   - **Band colours are the app's `BAND_COLOR`**, not the mock's sky blue and
     70% red, and include `conf`, `playoff` and `out`. The tile's rails and the
     Table tab's must be one key.
   - **Inks are white-alpha** transcriptions of the mock's greys (0114).
   - **Ground:** `MeshPlate` is the container background, and padding adds the
     tray's 2pt (0128).
   - **Rows are measured, not fixed at 15pt.** Each slot gets
     `min(height / slots, 22)`, and type scales with the row between 0.85 and
     1.3. Numbers are capped at 1.1 and may shrink, because Puerto Rico's
     `-204` truncated at the 11-row scale on the first render.
   - **No Dynamic Type branch.** `.system(size:)` fonts don't scale in a
     widget, so it would be unreachable code.

10. **Refresh:** no network, and a `.never` reload policy. The app's
    change-guarded reload drives refreshes. A reader who never opens the app
    sees their last visit's table, and the meta line (`AFTER MD 5`) says which
    round that is.

## Consequences

- Every foreground now costs two cached requests the Table tab already shares,
  plus the cup table and seven crest-set requests (catalogue-stale, so daily).
  The cup table and crest sets are gated on `WIDGETS_AVAILABLE`.
- The first launch downloads and resizes about 150 crests one at a time. After
  that, each foreground is an existence check per club.
- A new band kind in JS decodes as nil in Swift, costing one rail rather than
  the whole file.
- Tapping the widget changes the league on Matchdays and Clubs too. That is
  intended, and a surprise to anyone expecting a one-off view.

## Alternatives considered

- **Write only the configured table.** Not possible: the app never learns the
  widget's configuration.
- **The fixture crest route, looked up via a season fixture per club.**
  Indirect, fails for a club with no fixture yet, and leaves Serie A as tiles.
- **A new backend PNG route per club.** Ed had the backend ship the URL set
  instead. Resizing on the device reads WebP and SVG, neither of which the
  backend compositor can.
- **Widget fetches `/cronogol/standings` itself.** That would be a second
  carve-out from 0025's no-network rule (0080 is the first), and would
  duplicate zone, window and caption logic in Swift.
- **Row taps into club pages (the handoff).** 15pt targets, and half the
  Champions League field has no club page (0154).
