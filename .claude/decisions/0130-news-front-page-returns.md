# 0130 — News front page returns; the reel retires

- **Date:** 2026-09-07
- **Status:** Accepted — typechecked and linted; simulator pass pending
- **Decided by:** Ed Medina, from a pasted mock ("lets go back to the old card style, but lets try this approach")
- **Supersedes:** [0129](./0129-news-reel.md)'s **presentation** — the snap
  pager, the pinned crown band, the ribbon washes, the scroll-linked motion.
  0129's data layer (the infinite keyset query), saves, Saved screen, and the
  enriched story sheet all STAND.

## Context

The reel lived for a day of iteration (0129 and its amendments) and Ed called
it back: News returns to a scrolling card list, styled per his mock — a FRONT
PAGE. The newest story's photo bleeds from behind the status bar with the
white `News` title on it; a glass LEAD CARD (topic pill · publisher · age,
big headline, lime `Tap to read ›`) overlaps the photo's foot; compact glass
rows run beneath (thumb left, two-line title, meta line below); the header's
right block carries the DAY and the `4 NEW` count.

Four calls locked with Ed (2026-09-07): the neutral **chip rail** returns for
league filtering; **Save moves into the story sheet** (Share · Save · Close
thirds) with a bookmark circle by the date block as the Saved screen's
doorway; the lime **`‹ Board` back link stays**; the list is **flat and
infinite** — no day groups, no 48h cutoff, the keyset pager carries it.

## Decision

1. **The screen** ([news.tsx](../../src/app/news.tsx)) is one `FlatList`:
   `ListHeaderComponent` = the hero block (`NewsHero` tokens: 0.52-window
   photo, `dim` for title legibility, a `fadeH` foot fade into `background`),
   the overlaid furniture (back link, title, day + `newCount` + bookmark
   doorway), the lead card pulled up by `NewsHero.overlap`, the chip rail;
   rows = `items.slice(1)` through `NewsRow`; footer = caught-up line (only
   at feed end) + the standing attribution. `MeshGround` returns; the status
   bar is the root's light again (the reel's focused dark flip deleted).
2. **`4 NEW` brings back trap 41 verbatim**: the count reads `seenAtOpen`
   (lazy `useState` capture), never the live preference the mount stamp
   overwrites. `newsCardPick` supplies it, over the whole selected feed.
3. **New molecule `NewsLeadCard`** (flat props); **`NewsRow` restyled** to
   the mock — title first at `headline`, two lines, `NewsMeta` BELOW — and
   **`NewsMeta`'s topic became lime TEXT** (the one pill per screen is the
   lead's). The row serves the News list and the Saved screen alike.
4. **Save on the sheet**: `NewsLinkSheet`'s secondary row is Share ·
   Save/Saved (lime `primary` when on) · Close; the route builds the
   url-keyed snapshot (projections grew `imageUrl` + `isFirstParty`),
   `hapticSaveStory` on save-ON only. ⚠ Known gap, accepted: first-party
   stories open the browser directly and so have no save affordance.
5. **Renames, for honesty**: `useNewsReel`→`useNewsFeed`
   (`keys.newsFeed`, `['news','feed',id]`), `selectReelItems`→
   `selectFeedItems`, `Size.reelAction`→`newsAction`.
6. **The deletion sweep** (grep-verified zero refs): organisms `news-reel`,
   `reel-card`, `reel-crown`, `reel-filter-panel`; molecules
   `reel-meta-chip`, `reel-actions`; atoms `rise-glyph` and `share-glyph`
   (orphaned — the sheet's actions are text buttons); theme `ReelBand`,
   `ReelWash`, `ReelMotion`, `ReelPhoto`, every `Type.reel*`, every
   `Size.reel*` bar the renamed action circle, and the reel-only colours;
   copy `news.reelRead` and `news.leagueFilter`. Kept: `savedFill`,
   `newsMetaDot`, `BookmarkGlyph`, `leadCta` (new — `Tap to read` /
   `Toca para leer`), `caughtUp` (now the list's foot).

## Consequences

- 0129 remains the record of the reel's design journey and of everything
  that survives it; its status line marks the presentation superseded.
- The hero geometry (`NewsHero.height` 0.52, `overlap` 56, `fadeH` 140,
  `dim`) is one token group — the expected device-feedback round is one edit.
- `saveStory` copy shortened to `Save`/`Guardar` for the third-width button.
- Trap 61 (fast-refresh preference wipe) and its `commit()` guard stand.
