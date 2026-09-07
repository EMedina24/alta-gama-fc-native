# 0129 — News becomes a full-screen snap reel; saves persist as url-keyed snapshots

- **Date:** 2026-09-06
- **Status:** Accepted — typechecked and linted; simulator pass pending
- **Decided by:** Ed Medina, from `handoff_newsreel/` (NEWS-REEL.md is the spec, `News Reel.dc.html` the pixel truth, `NewsReel.tsx` the RN paging reference)
- **Supersedes:** [0092](./0092-news-uniform-story-cards.md)'s **News-screen half** (day groups, the uniform-card list). 0092's Today-card half — the 96pt-thumb doorway — stands untouched, and its `NewsRow` card survives its own screen's death as the Saved screen's row.

## Context

0092's screen was a day-bucketed list of glass story cards. The new handoff
replaces it with a **reels feed**: one story per viewport, vertical snap
paging, a full-bleed photo dimmed at source, a pinned transparent crown, and a
pull-down league filter. Three product calls were made with Ed on 2026-09-06:
the crest is **dropped** in v1 (no club field exists on the wire — `categories`
is a publisher label, never a club key), Share is the **native share sheet**
(not the prototype's copy-link toast), and Save **persists AND ships with a
Saved-stories screen** in the same pass.

## Decision

1. **One story per full-window card.** `NewsReel` (organism) is a `FlatList`
   with `pagingEnabled` + `snapToInterval` + `disableIntervalMomentum` +
   `getItemLayout` — the reference's recipe, the RN spelling of
   `scroll-snap-stop: always`. The card height is MEASURED by the screen's
   `onLayout` and gates the first render, so the snap interval and the drawn
   cards cannot disagree. `windowSize` stays small: every row is a
   screen-sized photo.
2. **The pinned crown is a NEW organism (`ReelCrown`), not `templates/crown.tsx`.**
   Crown's contract — scrolls away, lime band, `onCrown` ink — is the opposite
   on every axis of pinned/transparent/dark-ink. The veil is `WashGradient` +
   the new `ReelVeil` stops (hex + `stopOpacity`, trap 42), run behind the
   status bar (0094's reasoning). The crown also carries the Saved doorway —
   a 44pt bookmark circle the handoff did not draw (it had no Saved surface).
3. **The league filter is a pull-down panel (`ReelFilterPanel`), and the
   attribution's only home on the reel.** Chips are the SAME `ChipButton
   tone="neutral"` as every filter in the app — the active/quiet colour
   semantics already match the dc's values exactly (lime plate + `onAccent` /
   `card` + `textSecondary`); only its geometry differs from the mock, a
   deliberate reuse over a one-off pill that would drift.
4. **Real keyset pagination replaces the prototype's `REEL_LAPS`.**
   `useNewsReel` is a separate `useInfiniteQuery` (`keys.newsReel`) that
   chains `nextBefore` → `before` and SEEDS page one from the `useNews()` /
   `useNewsLeague()` cache — the widget writer, Today card and link sheet keep
   their keys and shapes, and opening the reel stays a cache read.
   `selectReelItems` applies the unprintable-row rules but **not** the 48h
   cutoff — the reel pages back in time; a cutoff would empty every page after
   the first. Feed end (`nextBefore: null`) is a quiet caught-up card.
   `mergeNewsPages` dedupes by `id`, first wins (pages can overlap after a
   page-one refetch). The link-out sheet reads the reel cache FIRST — a story
   on page three exists in no other query.
5. **Saves are url-keyed SNAPSHOTS** (`SavedStory`, preferences v4→5;
   `FOLLOWED_RULE_VERSION` untouched): articles are purged from the API 30
   days after publication and their ids die with them, so a saved story
   renders entirely from local data. Newest-saved-first, capped at 100.
   Haptic (`hapticSaveStory`, `.light`) on save ON only — un-saving is the
   reader changing their mind, not the world moving.
6. **The story sheet grew the article's own facts** (Ed's mock, 2026-09-06):
   the excerpt paragraph (server-truncated quote — clamped at most, never
   re-cut; null draws nothing), a hairline, and an inline byline —
   `By {author} · {publisher} · {filed}` with a lime-initial chip (a one-off
   View: `Avatar` is account-scoped, `Crest` is a club mark). The name is the
   author or, when the wire has none (every LALIGA article), the publisher —
   named ONCE, never doubled after its own fallback. `formatFiled` renders
   `2 Sep, 06:22` in the reader's zone and clock (the web pins news to 24h;
   the account sheet's synced line set the clock-aware precedent), month
   sentence-cased in both languages. The third button reads **Close**
   (`sheets.close`, reused); the gone-state keeps Cancel. `SavedStory` carries
   `excerpt`/`author` so a saved sheet renders identically after the purge —
   parsed defensively, so pre-field rows survive.
7. **The Saved screen (`/news-saved`)** sits outside `(tabs)/` like `/news`,
   lists snapshots through `NewsRow` (new optional `accessory` slot carries
   the un-save control), keeps the attribution line — third-party headlines
   live there indefinitely, which is when it matters most — and opens rows
   through the same `isFirstParty` branch. The link-out sheet gains a `url`
   param mode that renders from the snapshot when the caches have long
   forgotten the article.

## Deliberate deviations from the handoff

- **No tab bar under the cards** — `/news` stays outside `(tabs)/` (0064's
  deviation, re-affirmed): cards get the whole window, not the mock's 695px
  band.
- **No backdrop-filter.** The meta chip / action circles / filter pill are
  FLAT translucent fills (`reelGlass` + `reelGlassLine` hairline): neither
  blur package is installed, and liquid glass over a photo refracts sibling
  layers (trap 59). The handoff's own RN reference made the same call.
- **44pt action circles** (the spec's stated minimum hit target and
  `Size.minTouch`) — the RN reference's 40 was the drift.
- **Share is the native sheet** with the URL — the same
  `Share.share({ message, url })` the link sheet already makes; the
  prototype's clipboard toast (and its copy) is not built.
- **The read hint is a tap affordance, and says so** — tap opens the story
  sheet / `openArticle`. The dc's `PULL UP TO READ` became `TAP TO READ` /
  `TOCA PARA LEER` at 12pt (up from 9.5) on Ed's device feedback (2026-09-06):
  the copy must not promise a pull the screen does not implement. It stays
  lime (white was tried and reversed in the same pass).
- **No crest** — no club exists on `NewsArticleView`; a `categories` mapping
  is explicitly forbidden as a key. Separable follow-up if the wire grows a
  club field (a backend milestone, scoped with Ed separately).
- **No bottom scrim** (the spec forbids it twice): the photo is dimmed by the
  `reelDim` overlay — RN has no CSS filters — plus the headline's own shadow.
- **The imageless card is DESIGNED, not a failure state**: `reelGround` +
  `ReelFallbackPool` (Mesh's mid-teal re-aimed) behind pure type; `onError`
  flips to it without reflow. On a photo-first screen fed by hot-linked RSS
  thumbnails (~1 in 50 null, 404 at will, never re-hosted), that branch is
  routine.

## Consequences

- **Deleted:** `news-list.tsx` (organism), `groupNewsByDay` + `NewsDayGroup`,
  copy keys `news.today` / `news.yesterday` / `news.lead`.
- **Kept:** `news-card.tsx` (Today doorway), `news-link-sheet.tsx`,
  `news-meta` / `news-thumb` / `news-row`, `selectNewsItems`, `newsCardPick`,
  `news.newCount` — the widget and Today card still read all of them.
- The `newsSeenAt` MOUNT stamp survives (it zeroes the Today card's pill).
  The reel prints no `N NEW` pill — the crown carries a story count — so
  0070's frozen-at-open capture has no reader; trap 41 still governs any
  future NEW count.
- New theme groups: `reel*` colors, `ReelVeil`, `ReelFallbackPool`,
  `Type.reel*`, `Size.reel*`. New atoms `BookmarkGlyph` / `ShareGlyph` /
  `RiseGlyph`; molecules `ReelMetaChip` / `ReelActions`; organisms
  `ReelCard` / `NewsReel` / `ReelCrown` / `ReelFilterPanel`.
- Known cost: past `STALE.feed`, tanstack refetches every loaded page in
  sequence on the next mount — acceptable at 15 min; `maxPages` is the lever.
