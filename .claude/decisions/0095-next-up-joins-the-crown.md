# 0095 — NEXT UP joins the crown; MatchBoard splits into two organisms

- **Date:** 2026-09-01
- **Status:** Accepted — verified on the simulator (idle Today; the live/kicked-off states re-verified via `/_debug/gallery?only=live` previews only)
- **Decided by:** Ed Medina, live on the simulator ("make the crown's gradient extend down to cover the next up card")
- **Amends:** [0088](./0088-live-match-is-the-crown-payload.md) (the payload rule generalises) · [0063](./0063-next-up-leads-the-board.md) survives in spirit — NEXT UP still leads, now from the crown itself

## Context

0088 put the LIVE match in the crown and left the idle stack (NEXT UP + LAST
RESULT) in the body — so on an idle day the crown collapsed to a title and the
gradient stopped dead above the screen's lead card. The ask was for the
gradient to cover it; the honest version of that is for the card to BE the
payload, as the live plate already is.

## Decision

1. **The Today crown's payload is the screen's LEAD CARD, whichever it is**:
   `LivePlate` while a match is in play, otherwise NEXT UP. The head of the
   screen is one object — title over lead card over fade — in both states, and
   0094's fixed gradient runs over the card either way.
2. **`match-board.tsx` is deleted, split into two single-card organisms**:
   - `organisms/next-up-card.tsx` — the next-up card verbatim (stacked
     pairing, wash-vs-lime-ring variants, countdown, `onKickoff` contract and
     every docblock warning). Its 0052 kickoff contract is UNCHANGED: the
     countdown still fires `bumpKickoff` + the finished/recent/live refetches,
     never `upcoming`.
   - `organisms/last-result-card.tsx` — the expandable last-result card,
     first in the BODY.
3. **LAST RESULT is suppressed while a match is live** — before the split the
   live branch early-returned past it, so this is the same behaviour by a
   different mechanism (the call sites gate on `board`).
4. The kicked-off handover is unchanged in shape: countdown elapses → the
   crown swaps NEXT UP for the awaiting-update plate in place.

## Consequences

- The gallery's next-up wash cases render `NextUpCard` directly.
- `MatchBoardProps`' copy surface split with it; `copy.today` satisfies both
  organisms structurally, so the screens pass what they always passed.
- ⚠ The full idle→kicked-off→live sequence in the crown remains unwatched on
  real data (first chance Valencia v Barcelona 2026-09-06) — now with the
  added transition of the payload swapping component, worth watching for a
  layout jump at the whistle.
