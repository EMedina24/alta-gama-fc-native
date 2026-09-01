# 0092 — News becomes uniform glass story cards; the Today card leads with a thumbnail

- **Date:** 2026-09-01
- **Status:** Accepted — verified on the simulator (`/news` on live data, Today's doorway)
- **Decided by:** Ed Medina, from `handoff_new-paint/` (mockup lines 584–616 and 136–160)
- **Supersedes:** [0070](./0070-news-front-page.md)'s front page · [0071](./0071-today-news-card-lead-picture.md)'s full-bleed lead picture

## Context

0070 made the first day group a front page — a lead picture, up to two 16:10
tiles, then hairline rows — because thirty cards of equal weight left nothing
leading. 0071 carried the same idea onto the Today card. The mock replaces
both with one uniform story card, and the Today doorway with a big-thumb row.

The reversal is coherent rather than a swing back: 0070's problem was thirty
competing CARDS on a charcoal ground. On the mesh the glass card is quiet
enough to repeat, and the hierarchy that the front page provided now comes
from the screen's own furniture — the crown, the day headers, the `N NEW`
pill.

## Decision

1. **Every story on the News screen is one glass card** — `Surfaces.glass` at
   `Radius.card`, a 64pt `newsStoryThumb`, a three-line headline, the meta row
   underneath. `NewsRow` is that card (it keeps its name; it is still one
   story, one press).
2. **The screen maps the WHOLE group.** ⚠ `frontPagePick`'s lead/tiles split
   is gone from `news.tsx` and `NewsGroup` lost `lead`/`tiles` — a partial
   migration that ignored those fields while the screen still filtered into
   them would have DROPPED every lead and tile story off the screen.
   `frontPagePick` now has no consumer.
3. **The filter chips go NEUTRAL when unselected** (`ChipButton tone="neutral"`
   — new): a rail of lime-ringed chips read as every league being on at once.
   Selected stays solid lime. The follow pill keeps the accent tone, where the
   ring IS the invitation. ⚠ The chips still stay visible over an empty list.
4. **The Today card leads with a 96pt thumbnail row** instead of the
   full-bleed picture; the card regains its own padding throughout. Still a
   DOORWAY — lead + two rows + `All news`, three hard, one press target.
5. **News drops its native header** for a lime back link that NAMES its
   destination (`copy.today.title`), the same call the club page made in 0091
   and for the same reason: the inherited label printed the route group.

## Consequences

- `NewsLead`, `NewsTile`, `NewsScrim`, `Size.newsLeadRatio`/`newsTileRatio`/
  `newsCardLeadRatio` and `frontPagePick` are all orphaned — P6 deletes what is
  genuinely unreferenced.
- Everything behavioural survives: the `N NEW` pill still reads the stamp
  captured at open (trap 41), attribution stays, the link-out sheet still
  intercepts third-party stories, and `selectNewsItems`' 48h/unprintable
  filters are untouched.
- New tokens: `Size.newsStoryThumb` (64), `Size.newsCardLead` (96).
