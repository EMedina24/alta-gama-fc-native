# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# What this is

The **native iOS app for AltaGama FC**, aimed at the **Apple App Store**. It is a
working app — five screens on live data, push wired — not a scaffold.
Functionality is **ported from `cronogol`**; data comes from **`senpai-backend`**;
the **design is new and app-specific — do not port the web look**
([.claude/SCOPE.md](.claude/SCOPE.md)).

Components follow **atomic design** — `atoms/` → `molecules/` → `organisms/`,
dependencies downward only, no data fetching below organisms
([.claude/decisions/0013](.claude/decisions/0013-atomic-design-components.md)).

⚠ The design is **still in progress**. Current theme tokens are provisional: keep
every color/space/font value in `@/constants/theme`, never a literal in a component.

# This app is one surface of an existing product

Data comes from **`senpai-backend`** (`/Users/ed/Desktop/repos/senpai-backend`,
API at `crono-gol.com`) — the only gateway; never call Supabase or a football
provider directly. **`cronogol`** (`/Users/ed/Desktop/repos/cronogol`,
`altagamafc.com`) is the lead web surface and the reference implementation —
match it rather than inventing.

⚠ Identify a repo by its **directory path** — `cronogol`'s `package.json` is also
named `alta-gama-fc`.

Read [.claude/ECOSYSTEM.md](.claude/ECOSYSTEM.md) before touching data, naming,
or URLs. The full contract is `senpai-backend/CRONOGOL-API.md`; read its
"Read this before building any UI" section before building any screen.

Brand: **AltaGama FC** (no space) reader-facing · *Alta Gama FC* is RETIRED ·
*CronoGol* is internal-only · *Alta Gama Fixture Club* is a separate mark.

# Read the project docs first

- **[.claude/HANDOFF.md](.claude/HANDOFF.md) — START HERE.** State of play, the
  front-end backlog, and the traps that have already bitten. Every entry in its
  trap list is a bug that shipped or nearly shipped in this repo.
- [.claude/SCOPE.md](.claude/SCOPE.md) — purpose, platform targets, what's out of scope
- [.claude/PROJECT.md](.claude/PROJECT.md) — stack, layout, commands
- [.claude/ECOSYSTEM.md](.claude/ECOSYSTEM.md) — backend, web app, API contract, brand, domains
- [.claude/CONVENTIONS.md](.claude/CONVENTIONS.md) — naming, imports, theming, TypeScript
- [.claude/decisions/](.claude/decisions/) — why things are the way they are

# Document every decision

Every decision made in this project gets a numbered entry in
[.claude/decisions/](.claude/decisions/), written in the same change as the code
that implements it, and added to the index table in
[.claude/decisions/README.md](.claude/decisions/README.md).

A "decision" is anything a future reader could ask *"why is it like this?"*
about — adding or dropping a dependency, an architectural split, a convention, a
deliberate non-choice. Work that simply follows an already-recorded decision
needs no new entry.

Reversing a decision means writing a **new** entry and marking the old one
`Superseded by NNNN`. Never edit or delete a past entry's history.

Format and template: [.claude/decisions/README.md](.claude/decisions/README.md).
