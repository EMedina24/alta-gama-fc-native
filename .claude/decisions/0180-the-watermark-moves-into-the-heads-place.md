# 0180 — The watermark moves into the head's place: bled, translucent, left

- **Date:** 2026-09-14
- **Status:** Accepted — simulator-verified (RM crest top-left at watermark
  alpha, bled off the left edge, running behind the lead card; accessory row
  and payload unmoved; harness green).
- **Decided by:** Ed, correcting 0179's reading — *"the position is correct
  top left, however parts of it should still be behind the card and larger.
  exact same style as before just to the left."*
- **Amends:** [0179](./0179-the-crest-takes-the-head.md) — the title's
  retirement, `Crown.headLead`, and the a11y contract survive; the SOLID
  64pt mark does not. [0177](./0177-the-club-crest-steps-forward.md)'s
  alpha and [0178](./0178-the-watermark-asks-for-the-big-crest.md)'s
  bands/`hero` source are back in force (their supersede stamps now read as
  one bounce through 0179).

## Decision

1. **The crest is the 0175 watermark again** — `FadeOutImage`, `hero`
   source, `CrownClubArt` restored verbatim (alpha 0.18, height 0.5,
   fades, bands 12) — but anchored **head-LEFT**: new `Crown.artAnchor`
   (`'right'` — the league marks' spot — or `'headLeft'`: top at `inner`'s
   own padding so the crest's crown sits exactly where "MONDAY" sat, bled
   `ART_OFF` off the LEFT edge, running down BEHIND the payload card).
   `crownOverride` carries `artAnchor` with the art.
2. **The head is an EMPTY spacer** (`CrownClubHead.size` 64 — the
   eyebrow+title stack's height) so the accessory row and payload sit
   exactly where the title-era layout put them; the spacer is the VoiceOver
   header carrying the club's name.
3. **The harness's two-tier club proof is restored** (0177's shape): white
   ink rated bare AND crest-lit at `CrownClubArt.alpha` (ceiling ≈ 0.30,
   enforced), quiet ink on the bare band — the layout premise MOVED with
   the crest: under a club background the head is empty, so no quiet ink
   sits in the crest's top-left region; put quiet ink back into that head
   and the rating changes first.
4. League/default backgrounds untouched, as ever.
