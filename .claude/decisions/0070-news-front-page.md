# 0070 — The News screen's first day group is a front page: a lead with its picture and excerpt, two tiles, then hairline rows

- **Date:** 2026-08-29
- **Status:** Accepted — verified on the simulator (live feed + `/_debug/gallery?only=news`); taps not driven
- **Decided by:** Ed Medina

## Context
The News screen (0064) rendered thirty identical cards — a 64pt thumb and a
headline — so no story had any weight. The wire already carries a large picture
and the publisher's own `excerpt` (null on ~1 in 10), and the app showed
neither. The ask was a modern, attention-grabbing page; the answer is editorial
hierarchy on the tokens the app already has, not new chrome. A preview of two
directions (front page vs. a swipeable reel) and a full-width mockup of the
front page were approved before code.

## Decision
1. **`frontPagePick(items)` in `lib/cronogol/news.ts`** splits a group into
   `lead`, `tiles` (0–2) and `rows`, in the group's order. It is applied to the
   FIRST group on the screen only; every later day is rows. One front page per
   screen. A quiet league is a real state: two stories → lead + one tile drawn
   full width; one → the lead alone. Nothing is padded from another day.
2. **`NewsLead`** — the picture cover-filling a `Size.newsLeadRatio` (4:4.6)
   frame under a `WashGradient` scrim (`NewsScrim`: clear → 72 % → `card`; ⚠ via `stopOpacity` — `react-native-svg` paints an `rgba()` stop opaque),
   with the `copy.news.lead` kicker, the topic pill, a three-line `title`
   headline, the two-line excerpt and publisher · age. ⚠ **A failed or missing
   picture keeps the STORY in the slot** as a text lead on the `card` ground at
   the same sizes — never the next story, never an empty frame.
3. **`NewsTile`** — `NewsThumb` in a `Size.newsTileRatio` (16:10) frame over a
   three-line `callout` headline and publisher · age. No topic pill at half
   width. `NewsThumb` gains an `aspectRatio` prop; the square path is unchanged.
4. **`NewsRow` becomes a hairline row** (56pt `Size.newsCardRow` thumb, two-line
   headline, `hairlineMid` top rule, no ground). Only `NewsList` consumes it.
   `Size.newsThumb` (64) is retired.
5. **The `N NEW` pill** sits on the first group's header via a new
   `SectionHeader.accessory` slot, counted over the WHOLE selected feed with
   `newsCardPick(...).newCount`. ⚠⚠ It reads the seen stamp **captured at open**
   (`useState(() => newsSeenAt)`), never the live preference — the mount effect
   overwrites the store within the first frame and the pill would blank itself.
6. **Masthead**: `News` beside the reader's date through `formatFixtureDate` —
   the one formatter every date in the app uses.
7. `copy.news.lead` — `Lead` / `Destacado`. Furniture only; headlines, excerpts
   and publishers stay verbatim quotes.

## Consequences
- Two new molecules, one changed molecule, an accessory slot, two scrim tokens
  and two ratio tokens; the organism and the screen rewire; the Today card is
  untouched.
- `/_debug/gallery?only=news` shows the four states on fabricated stories with
  real hot-linked pictures — the day those 404, the first case becomes the
  second, which is the point.
- The loading state is one lead-height block over four row skeletons.

## Alternatives considered
- **A swipeable reel** of tall cards — louder, but stories 2–5 hide behind a
  gesture and the app has no snapping carousel.
- **Front page per day group** — competing leads down the page; rejected.
- **Keeping row cards** under the lead — the equal-weight cards were the problem.
