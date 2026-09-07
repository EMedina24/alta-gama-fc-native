# News — reel feed

The News screen is a **full-screen vertical snap reel**. It replaced the grouped
list entirely; the Today board's news card is still the doorway into it.

## Geometry

| Part | Value |
|---|---|
| Card | one per story, `height: 100%` of the scroll area, `scroll-snap-align: start`, `scroll-snap-stop: always` |
| Scroller | `scroll-snap-type: y mandatory`, fills the area between status bar and tab bar (695px on a 393×852 device) |
| Card padding | `118px 20px 26px` — the top value clears the pinned crown |
| Photo | absolute, `object-fit: cover`, `filter: brightness(.62) contrast(1.06) saturate(1.04)` |
| Headline | 700 31px/1.05, `letter-spacing: -.035em`, `#fff`, `text-shadow: 0 2px 22px rgba(4,7,8,.72), 0 1px 3px rgba(4,7,8,.5)` |
| Meta chip | 26px pill, `rgba(8,11,12,.42)` + `.5px rgba(255,255,255,.16)`, `backdrop-filter: blur(14px)` |
| Crest | 38px box, top right, `drop-shadow(0 3px 10px rgba(0,0,0,.5))` |
| Action buttons | 44px circles (minimum hit target), same glass as the meta chip; saved state is `rgba(200,242,90,.9)` fill with `#101806` ink |

**No scrim band.** Legibility comes from the photo being dimmed at source plus
the headline's own shadow — do not add a bottom gradient.

## Crown

The crown is **transparent** on this screen: a single dark veil, no lime.

```css
height: 196px;
background: linear-gradient(180deg,
  rgba(6,10,8,.62) 0%, rgba(6,12,11,.4) 40%,
  rgba(6,12,12,.16) 70%, rgba(15,19,22,0) 100%);
```

It is **pinned** — it does not scroll or parallax with the cards. Because the
band is no longer bright, ink reverts to the dark-theme set (white title, lime
back link, glass filter pill). The on-accent ink set in `CLAUDE.md` does **not**
apply here.

Header holds: back link to the board, `News` at 300 38px, the story count, and
the league filter pill.

## League filter

A pull-down, not a chip row. The pill toggles a glass panel at `top: 112px`
(`rgba(16,19,22,.9)`, 24px radius, `blur(24px)`) holding the league chips and,
in its footer, the publisher attribution — the only place that copy now lives.

## Interaction

- **Tap card** → the existing pull-up story sheet (unchanged).
- **Save** → toggles the lime bookmark; per-story, keyed by id.
- **Share** → 1.6s "Link copied" chip, bottom centre.
- **End of feed** → there is none. The filtered feed rolls forward in laps
  (`REEL_LAPS`), each lap re-aged a day older. Six laps is far past any real
  session and keeps the DOM small; a real client swaps this for pagination.

## Data

Same feed as the news widget and the Today card — see `news.ts` in
`export/news-section/`. Reel-specific additions:

- `club` — which club the headline is *about*, drives the crest. Empty where the
  story is about a fixture or a club we hold no crest for; the card then drops
  the crest rather than showing a placeholder box.

⚠ Headlines are **quotes** — the publisher's language, never translated. Only
the furniture (`PULL UP TO READ`, `LEAGUE`, counts) follows the reader's locale.

## Files

- `News Reel.dc.html` — the screen, standalone and interactive. Open it in a
  browser; `support.js` sits alongside it and is loaded automatically.
- `NewsReel.tsx` — React Native reference for the scroller and card.

Card photography loads from the publishers' live URLs, so the screen needs a
network connection and will go dark-grey where a URL has expired — that is the
sample feed, not the design.
