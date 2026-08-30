# 0071 — The Today card's lead story carries its picture across the card, as a compact variant of the News lead

- **Date:** 2026-08-29
- **Status:** Accepted — verified on the simulator (Today tab on live data + `/_debug/gallery?only=news`); tap not driven
- **Decided by:** Ed Medina

## Context
The Today board's news card (0064) led with a 96pt square thumb beside a
three-line headline — the same shape as the two rows under it, so the lead did
not lead. With the News screen now a front page (0070), the card that opens it
looked like the thing it replaced. Four treatments were previewed in place on
the board; the picture-across-the-top one was chosen, with the `LEAD` kicker
dropped at review.

## Decision
1. **`NewsLead` gains `variant: 'page' | 'compact'`** rather than a second
   molecule, so the page and the card share one scrim (`NewsScrim`) and one
   picture-failure rule. `compact`: `Size.newsCardLeadRatio` (2:1.15 — shorter
   than the page's 4:4.6, because this is one card on a board of score cards
   and must stay below the next-up card in weight), a two-line `headline`, no
   excerpt, no kicker, `borderRadius: 0` — the card clips.
2. **`onPress` is optional on `NewsLead`**; without it the root is a plain,
   `accessible={false}` View. The card is the single tap target (0064) and the
   lead must not become a second one.
3. **Picture missing or failed → headline-first**: the same story on the card
   ground at `title3`, three lines, topic pill, publisher · age. Never the next
   story, never an empty frame.
4. **The card drops its horizontal padding**; rows and the foot inset
   themselves. No hairline between the lead and the first row — the scrim
   already lands on `card`, and a rule there read as an underline.
5. Header, `N NEW` meta, three-story cap, accessibility label — unchanged.
6. `Size.newsLead` (96) is retired; `newsCardRow` stays for the rows.

## Consequences
- The card grows ~90pt. The board order (live → next up → last result → news →
  finished today) is unchanged; the card still reads below the next-up card.
- `/_debug/gallery?only=news` opens with the two card states.

## Alternatives considered
- **Three picture tiles in a strip** — even weight again, 12.5pt headlines.
- **Headline-first with no picture** — quieter; kept as the failure state.
- **A `LEAD` kicker on the card** — previewed, removed at review: on a card
  already headed NEWS it said nothing.
