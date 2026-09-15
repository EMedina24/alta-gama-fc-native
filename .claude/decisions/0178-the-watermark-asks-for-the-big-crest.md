# 0178 — The watermark asks for the big crest: a `hero` size, and more bands

- **Date:** 2026-09-14
- **Status:** Accepted — `tsc` clean; simulator screenshot pending Ed's eye.
- **Decided by:** Ed — *"the background crest is looking very distorted"*,
  after 0177 made it visible enough to judge.
- **Amends:** nothing — additive to
  [0175](./0175-the-board-wears-the-readers-background.md)/[0177](./0177-the-club-crest-steps-forward.md).
- **Amended by [0179](./0179-the-crest-takes-the-head.md)** — the watermark
  and its `bands` retired with the move into the head; the **`hero` ask
  survives** as the head crest's source.

## Context

Magnified screenshot + a live wire probe found three layers under
"distorted": (1) the watermark asked `crestSrc(…, 'card')`, whose list opens
at `medium` — Real Madrid's medium is a **420px** PNG drawn at 216pt =
648 device px, a visible upscale; the wire's crest vocabulary has **grown
`large` (740px) and `xlarge` (900px)** keys every `CREST_KEYS` list predates.
(2) `FadeOutImage`'s 6-band dissolve, imperceptible at alpha 0.095, printed
~3%-per-band seams at 0.18. (3) The liquid-glass card blurs whatever sits
behind it — that part is the material, not a bug.

## Decision

- **New `CREST_KEYS.hero`** in `lib/cronogol/derive.ts`:
  `["xlarge","large","svg","medium","100","teamLogo","70","small","50","xsmall","25","20"]`
  — biggest raster first for full-bleed art; `svg` right behind (vector is
  ideal at 216pt, and `FadeOutImage` exists precisely because an svg crest
  can be band-rendered but not masked). The Board's watermark asks `hero`.
- ⚠ **`card` is untouched on purpose** — its raster-first, svg-free order is
  the Starting XI export canvas's contract (a viewBox-only svg draws as
  nothing on Firefox's canvas), and "tidying" it to match would break that
  surface quietly.
- **`CrownClubArt.bands: 12`**, passed through to `FadeOutImage` — halves
  the per-band step back below perception at 0.18. The docblock records the
  alpha↔bands coupling: raise one, raise the other.
- `derive.ts` is an ADR 0018 mirror port; this is an ADDITIVE divergence (a
  new key, nothing reordered) recorded here for whoever syncs the web side.

## Rejected

- **Reordering `card` to pick up `xlarge`** — touches the XI export surface
  for a benefit only the watermark needs.
- **Shrinking the crest instead** — size was 0175's device-judged call, and
  a crisp big source removes the reason to.
