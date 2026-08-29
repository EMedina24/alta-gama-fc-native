# 0064 — News in the app: a card on the Today board and a pushed News screen, over the global feed

- **Date:** 2026-08-29
- **Status:** Accepted — verified on the simulator (iPhone 17 Pro, 2026-08-29)
- **Decided by:** Ed Medina

## Context
`handoff_news-card-page/` asked for news inside the app without a fifth tab
(ADR 0005 holds): a card on the Today board that pushes a News screen, and a
link-out sheet that names the publisher before a third-party article opens.
The NEWS widget (ADR 0061) already held the feed — `useNews()`, `plainText`,
`articleTopic`, `selectNewsItems` — and the handoff's rule was *one feed, two
consumers*: the screen must read what the widget writer already caches.

Three things in the handoff did not survive contact with the API and the app:

- Its `NewsItem` carried `clubSlugs`, `leagueSlug` and `ours`. **The wire has
  none of them.** `NewsArticleView` has no club attribution; the web's "Your
  clubs" view is a fan-out over `/cronogol/teams/{slug}/news`, one request per
  followed club, merged by id.
- It drew the tab bar still visible under the pushed screen. Every pushed route
  here (`club/[slug]`) lives in the root stack and covers the tab bar; keeping
  it would mean nesting a Stack inside the Today tab under `NativeTabs`.
- Its `groupByDay` bucketed on `toISOString().slice(0, 10)` — UTC.

## Decision
1. **Global feed only, in phase 1.** The card and the screen read
   `useNews()` — the same query `PushSync` fills for the widget. The card's
   header is **NEWS**, not the handoff's AROUND YOUR CLUBS, because over a
   global feed that label is false. The "Your clubs" chip is deferred to phase
   2 with the fan-out (`getTeamNews` + `useQueries` + a port of the web's
   `mergeArticles`). `FEED_LIMIT` goes 20 → 30; the widget still selects 8.
2. **`src/app/news.tsx` is a root-stack push**, the club-page precedent: chevron
   back, transparent header, tab bar covered while open. A deliberate deviation
   from the handoff's drawing.
3. **The link-out sheet ships now; phase 1 opens the reader's default browser.**
   `features/news/open.ts` is the one seam — `Linking.openURL` today,
   `expo-web-browser`'s `openBrowserAsync` (already installed for Google
   sign-in) in phase 2, one line. First-party rows (`publisher.isFirstParty`,
   never the host, never `publisher.id`) skip the sheet and open directly, as
   0061 already does from the widget.
4. **`newsSeenAt` is marked on OPENING the News screen**, not on scrolling
   past a row — the handoff's open question. `null` counts zero new, so a
   first run never opens on `20 NEW`. Preferences schema 3 → 4;
   `FOLLOWED_RULE_VERSION` untouched.
5. **The chip rail is `GET /cronogol/news/leagues` ∩ `LEAGUES`**, matched on
   `apiSlug`, in the **server's order**, labelled with our `League.name`. Not
   hardcoded and not re-sorted (the contract forbids both); the intersection
   keeps nine registry leagues down to the four a reader here can follow a
   club in. A league chip is the only thing on the screen that spends a
   request, and only while active.
6. **Day groups are bucketed in the reader's zone** — `groupNewsByDay` takes a
   `dayKey` function and the screen passes `zonedDayKey`. Age (`newsAge`) and
   groups are computed against `now` at render, mirroring Swift's `W.age`.
7. **Three stories on the card, hard** (`newsCardPick`): lead with picture, two
   rows, `All news` at the foot. ⚠ Revised 2026-08-29 after the first
   simulator pass: the rows carry their OWN thumbnails (`Size.newsCardRow`,
   56pt) and two-line headlines, and the lead grew to 96pt — a picture-less
   single line read as a footnote to the lead rather than a story of its own.
   The card is taller than the handoff's; the three-story cap still holds. The whole card is one tap target that
   pushes the screen; nothing on the board links out.
8. **Attribution on every row and a footnote at the end of the list** that is
   true about both kinds of row — third-party headlines that open at the
   publisher, and our own pieces that open on altagamafc.com.

## Consequences
- New: `molecules/news-{meta,thumb,row}`, `organisms/news-{card,list,link-sheet}`,
  routes `news.tsx` and `(sheets)/news-link.tsx` (declared in the root stack,
  ADR 0030, `fitToContents`), `features/news/open.ts`, `getNewsLeagues`,
  `useNewsByLeague`/`useNewsLeagues`, `Size.newsLead`/`newsThumb`, a `news`
  copy block, `phrases.stories`.
- The sheet looks the article up **in the same query cache** the screen
  rendered from (`id` + `league` params), the player-sheet pattern. Nothing
  is serialised through the router and the id is never persisted — it is
  purged at 30 days. Share sends the URL.
- `lib/cronogol/news.ts` stays native-free and harness-proven: the 0061
  assertions plus a 20-assertion pass (age boundaries 59m/60m/47h/48h and a future clamp,
  `newsCardPick` at 0/1/5 items and null/older/newer/garbage `seenAt`, a
  23:30-Madrid story landing in YESTERDAY at 00:05, newest-first inside a
  group, `isOurs`).
- `tsc` clean; lint at its unchanged 6-error / 9-warning baseline.
- **Seen on the simulator against production, 2026-08-29:** the card under
  LAST RESULT with three SPORT stories drawing NO chip; the pushed screen with
  its chevron, `ALL · LALIGA · PREMIER LEAGUE · SERIE A · BU…` in server
  order, `TODAY · 3 STORIES` / `YESTERDAY · 27 STORIES`; the sheet at
  `fitToContents` on a MARCA row — `PRIMERA DIVISIÓN` chip, `MARCA 5h`, the
  headline, `Open at MARCA`, Share, Cancel.
  ⚠ It found a bug: every first-party row drew a **`STORY` chip** —
  `categories[0]` is the editorial KIND on those rows, not a topic.
  `articleTopic` now returns `null` for `isFirstParty`, which also fixes the
  widget tile (it shares the function).
  ⚠ The wire spells our own publisher **`AltaGama FC`** (closed-up) and it is
  printed verbatim — a publisher name is a quote like the headline. The
  spaced form arrives when `senpai-backend` adopts ADR 0042.
- ⚠ Not yet seen: a tap actually reaching Safari, the Share sheet, Spanish
  furniture, the `NEW` count (the screen was opened before the card was), a
  league chip's refetch, the empty state.
- `handoff_news-card-page/` stays in the tree as design source, like
  `handoff_news-widget/`. Its `news.ts` is superseded by the ported functions
  in `lib/cronogol/news.ts`.

## Phase 2 (not built)
In-app browser via `openArticle`; "Your clubs" fan-out; the club page's news
list on the same `NewsRow`; keyset paging (`nextBefore` → `before`) if 30 runs
short.

## Alternatives considered
- **Fan-out per followed club now** — N requests per foreground, a merge, and a
  global fallback for a reader who follows nothing; deferred, not rejected.
- **A nested Stack in the Today tab** to keep the tab bar — untested with
  `NativeTabs` here, and the club page already established the other shape.
- **Direct-to-browser with no sheet** — smaller, but the sheet is what says
  whose article it is before someone else's page loads.
- **Hardcoding `All · Your clubs · LaLiga · Premier`** as drawn — the
  contract says the registry changes on a migration and must not be held in
  the front end.
- **Marking seen on scroll** — needs viewability tracking for a count that is a
  nudge, not a ledger.
