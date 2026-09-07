# 0131 — Screen titles share one display voice

- **Date:** 2026-09-06
- **Status:** Accepted — tsc clean; simulator pass pending
- **Decided by:** Ed Medina ("the font across the different screens is
  different… make sure the title fonts are all the same"), against a News
  screenshot

## Context

Every screen title is SF Pro, but at two voices that read as two different
typefaces at display size: the crown screens (Today, Matchdays, Table, Clubs)
run 40–48pt at weight **300** with −0.04em tracking (ADR 0087), while News,
Saved and the onboarding welcome ran the stock-iOS `largeTitle` (34/**700**)
and the club hero ran `heroTitle` (36/**700**). Ed saw the bold `News` on the
hero photo beside the light `Board` and called the mismatch.

The 700 titles were never a chosen voice — `largeTitle` was the scaffold-era
default and 0130's mock note ("white `News` title") fixed the colour and
placement, not the weight.

## Decision

One display voice for anything that introduces a screen: **weight 300,
tracking −0.04em of the size**, in exactly three sizes —

- `crownTitleLg` **48** — Clubs (unchanged);
- `crownTitle` **40** — every other tab-level screen: the crown screens
  (unchanged) and now News and Saved;
- `heroTitle` **36** — a hero inside content: the club page's name and the
  welcome statement, re-cut from 700 to **300/−1.45**.

`Type.largeTitle` (34/700) is **deleted** — a new screen never mints a fourth
size or a bold screen title. Section and sheet headings (`title` 26/700,
`title3` 22/700) deliberately stay bold: the weight contrast against the
light display voice is the hierarchy.

The family stays SF Pro (ADR 0006/0014's terms hold: no expo-font, no
licensing, Dynamic Type inherited). The premium read comes from using it with
intent — large, light, tightly tracked — not from a custom face.

## Consequences

- News' 34→40 title sits on the hero photo at a lighter stroke; `NewsHero.dim`
  (0.38) is what keeps it legible there — if a bright photo defeats it, the
  fix is that token, not the title's weight.
- The welcome title's two-line `lineHeight` follows the size: 37→39.
- Ink stays per-surface (`onCrown` on lime, default white on photo/mesh/wash);
  0131 governs the letterforms only.
- Nothing in `targets/_shared/Tokens.swift` copies a title token — no Swift
  sync needed.

## Alternatives considered

- **A custom display face** (Clash Display-class grotesk) — a brand-level
  reversal of 0006/0014: licensing cost, Dynamic Type lost, and it would
  fragment the crown look Ed has already approved on device. Available later
  as a deliberate rebrand, not as a reconciliation.
- **Unify bold** (700 everywhere) — erases the crown's signature and lands on
  the stock-iOS look every large-title app ships with.
- **Leave News bold as an editorial accent** — the mismatch is exactly what
  Ed flagged; a one-screen voice needs a stronger reason than an inherited
  default.
