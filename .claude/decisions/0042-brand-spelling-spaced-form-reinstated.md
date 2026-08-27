# 0042 — The spaced `Alta Gama FC` is reinstated

- **Date:** 2026-08-26
- **Status:** Accepted — open across the ecosystem
- **Decided by:** Ed Medina

## Context
Since 2026-08-11 the reader-facing brand has been **`AltaGama FC`**, closed up, with
the spaced form marked RETIRED. That rule was stated in three places that agree
with each other: this repo's `AGENTS.md`, `.claude/ECOSYSTEM.md` — which names
`senpai-backend/CLAUDE.md` as *the authority* for brand strings — and
`senpai-backend/CLAUDE.md` itself, which enforces the closed-up form in every
outgoing email (`CRONOGOL.md` §44).

The `logos/` folder delivered alongside app icon 1b sets the wordmark as
**`ALTA GAMA FC`**, spaced, in the lockup that [0041](./0041-app-icon-1b-and-a-splash-of-its-own.md)
puts on the launch screen. So the artwork and the written rule disagreed, and the
disagreement was about to ship on the first screen a reader sees.

The conflict was raised with the evidence above — that this is not one stale note
in one repo, and that the App Store surface would contradict the email surface. The
call was made to change the rule rather than the artwork.

## Decision
**`Alta Gama FC`, spaced, is the reader-facing brand.** The closed-up `AltaGama FC`
is the superseded spelling.

`.claude/ECOSYSTEM.md`'s naming table and `AGENTS.md`'s brand line are updated, and
ECOSYSTEM.md **stops deferring to `senpai-backend/CLAUDE.md`** on this particular
form — it still holds for every other brand string.

`Alta Gama Fixture Club` is untouched. It was already a separate mark that does not
collapse, and ECOSYSTEM.md already placed it in the logo lockup, which is exactly
where 1b's sub-line puts it.

## Consequences
- **The ecosystem disagrees with itself until `senpai-backend` and `cronogol` are
  updated.** A reader gets `Alta Gama FC` on the launch screen and `AltaGama FC` in
  their kickoff email. This is known and accepted as a sequencing problem, not a
  bug to be found later.
- **Three files elsewhere still need the change** and none of them are in this
  repo's gift: `senpai-backend/CLAUDE.md`, `senpai-backend`'s `CRONOGOL.md` §44
  email rule, and `cronogol`.
- **This repo is now ahead of its own stated authority**, which is a strange state
  and is flagged as such in ECOSYSTEM.md. A future session reading
  `senpai-backend/CLAUDE.md` will find the old rule stated confidently; the ⚠ block
  in ECOSYSTEM.md exists so it does not "fix" this repo backwards.
- **Reader-facing copy is updated with the rule.** `src/lib/i18n/copy.ts` carried
  the old spelling in the account sheet title in both languages, and its header
  comment stated the closed-up rule as current; both are now the spaced form. That
  file is the only place in `src/` that renders a brand string.
- **The Apple-facing labels are deliberately NOT changed** and are open work:
  `app.json`'s `name` (`AltaGama FC` — the Home Screen label and the basis of the
  App Store listing) and the two extension `displayName`s in
  `targets/*/expo-target.config.js`. Renaming the app is a product and
  App Store Connect decision, not a doc sync, so it is left for a deliberate call.
  Until then the Home Screen label and the launch screen under it disagree.

## Alternatives considered
- **Re-cut the wordmark as `ALTAGAMA FC`** — the recommendation at the time, and
  free: a fresh transparent lockup export was already being commissioned for the
  splash, so closing up the wordmark cost nothing and would have left all three
  repos agreeing. Rejected in favour of the artwork as drawn.
- **Ship the lockup, leave the docs contradicting it** — the contradiction survives
  in the repo, unowned, and the next reader cannot tell which side is stale.
- **Mark-only splash, settle the name later** — sidesteps the spelling entirely by
  putting no wordmark on the launch screen. Rejected: the lockup was the point.
