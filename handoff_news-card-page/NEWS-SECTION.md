# Alta Gama FC — News in the app

Design file: `News Section.dc.html` (interactive — tap the card, filter the
list, tap a headline for the link-out sheet). Types and grouping: `news.ts`,
drop in under `src/features/news/`.

Content is real: every headline, topic, publisher and age comes off
`https://altagamafc.com/en/news`.

## Placement

**No fifth tab.** Today · Fixtures · Table · Clubs holds (ADR 0005). News is:

1. **A card on the Today board**, ordered *live/next match → Around your clubs →
   rest of the round*. Scores first, always — a headline is never why someone
   opened this app.
2. **A pushed screen** behind that card (`news` route under `src/app/`), with
   the tab bar still showing and a back button to Board.

The card carries three stories — one with a picture, two as single lines — plus
an `n NEW` count against `lastSeen`. It is a doorway, not a feed; see
`todayCard`.

## News screen

Back to Board · title · filter chips (**All · Your clubs · LaLiga · Premier**) ·
day groups (`TODAY`, `YESTERDAY`, then dates) · rows of 64pt thumbnail +
three-line headline + `TOPIC · PUBLISHER age` · aggregation line at the end.

Club-level filtering is deliberately absent: the club page is where a reader has
already picked a club, and that is where its own news list belongs.

## Link-out

Tapping a third-party headline opens a **sheet** first: topic, publisher, age,
the headline, and *Open at MARCA* / Share / Cancel. Then a Safari view — the app
is not the author and should not present someone else's article as its own
screen. Our own pieces (`ours: true`) skip the sheet and open in-app.

## Rules

- **Headlines are quotes.** Publisher's language, never translated, trimmed or
  re-cased. Only the furniture localises. Same rule as the widget.
- **Topic is optional.** `null` for every SPORT item — no chip, publisher
  leads. Row three of the list is that case, on purpose.
- **Age is derived** from `filedAt` at render (`age()`), and day groups are
  computed against `now` (`groupByDay`) so a list opened after midnight
  re-buckets itself without a refetch.
- **Attribution is not a footnote.** Publisher on every row, aggregation line at
  the end of the list.
- **One feed, two consumers.** This screen's cache is what the widget's
  `news.json` writer serialises — never a second fetch.
- **Empty states.** Follows nothing → the board's existing follow prompt.
  Follows clubs but the feed is quiet → say so and keep the filters visible.

## Open

- **`lastSeen` semantics** — mark read on opening the News screen, or on
  scrolling past an item? Currently the former.
- **Club page news** — same row component, filtered to one club. Not drawn.
- **Push for headlines** — deliberately not proposed. The three existing alerts
  are all fixture-related; a news push needs its own opt-in and its own rate
  limit, and probably its own conversation.
- **Our own articles** get no visual distinction yet beyond the publisher name.
  A lime `ALTAGAMA FC` chip would separate them if the volume grows.
