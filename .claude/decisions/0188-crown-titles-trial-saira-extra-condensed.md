# 0188 — Crown titles trial Saira Extra Condensed

- **Date:** 2026-09-24
- **Status:** Accepted (trial)
- **Decided by:** Ed: *"see what font we're using [in the Medina Digital design
  system] … replace the crown titles like 'jornada' and 'matchday' to see if
  they look better with the font"*.
- **Amends:** [0131](./0131-one-display-voice-for-screen-titles.md) for
  `crownTitle` and `crownTitleLg` only. The splash's Archivo exception
  ([0134](./0134-animated-splash-overlay.md)) is unchanged.

## Context

The Medina Digital design system (a local skill) sets all text in Saira. Its
signature face, **Saira Extra Condensed 800, uppercase, −0.005em**, is kept
for the wordmark, scores and hero display lines. The crown title is a hero
display line. Until now the app used SF Pro 300 there (0131).

## Decision

1. **`Type.crownTitle` and `crownTitleLg` switch to
   `SairaExtraCondensed-ExtraBold`, set uppercase, with −0.005em tracking.**
   - The sizes step up, 40→44 and 48→52, because a condensed cap reads smaller
     than SF at the same point size.
   - `lineHeight` is pinned at about 1.2× the size (53 and 62).
     - The first cut used about 1.05× (46 and 54). That **clipped the acute
       off `CLASIFICACIÓN`**, which then read as a misspelling (Ed caught it
       on the Table crown).
     - Saira's cap accent is a short, shallow dash, confirmed by rendering the
       TTF directly. It is small by design, not clipped.
   - `fontWeight` is not set: the face is a single weight.
2. **Only the ExtraBold TTF is bundled** (`assets/fonts/`, with
   `OFL-Saira.txt`), from `google/fonts`.
   - It is embedded by the `expo-font` plugin (in `app.json`), and **also**
     loaded with `Font.loadAsync` alongside the root layout's hydration. The
     runtime load lets a dev client built before the font existed show it,
     and it means no title paints in SF first.
3. **Everything else stays SF**, including `heroTitle`, the club page name and
   body text. Saira body text is out of scope.

## Consequences

- The change reaches every `crownTitle` consumer: Matchdays, Clubs (Lg), News,
  Saved news and the gallery. Other crowned tabs get it through the scaffold.
- 0131's "one display voice" now splits: crown titles are in Saira, while
  `heroTitle` is SF 300. If the trial sticks, `heroTitle` is the next question.
- Uppercase means translated titles are cased by the OS. This is fine for
  Spanish and English.
- Reverting means restoring the two tokens. The font file and loader can stay
  or go.
