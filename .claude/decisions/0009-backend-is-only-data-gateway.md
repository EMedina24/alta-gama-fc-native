# 0009 — `senpai-backend` is the only data gateway; `cronogol` is the reference implementation

- **Date:** 2026-08-24
- **Status:** Accepted
- **Decided by:** Ed Medina

## Context
This Expo app is the third surface of an existing product, not a new one:

- **senpai-backend** (`/Users/ed/Desktop/repos/senpai-backend`) — NestJS service on
  `crono-gol.com`. Feeds all data: fixtures, standings, squads, news, editorial,
  accounts, `.ics` calendar feeds, email.
- **cronogol** (`/Users/ed/Desktop/repos/cronogol`) — Next.js app on
  `altagamafc.com`. The **main driving force** of the product.

Both predate this repo and carry a settled API contract, brand rules, and a large
body of hard-won caveats.

## Decision
1. **All data comes from `senpai-backend`.** This app never talks to Supabase, the
   football provider, Hygraph, or any other source directly. No third-party data
   keys ship in the client bundle. Same rule the web app follows.
2. **`cronogol` is the reference implementation.** Where behavior is ambiguous —
   naming, empty states, date windows, score presentation — match the web app
   rather than inventing. It is the lead surface; this app follows it.
3. **`senpai-backend/CRONOGOL-API.md` is the contract's source of truth.** It is
   duplicated at `cronogol/CRONOGOL-API.md` and the pair has drifted before; if
   this app forces a contract change, **both copies change in the same sitting**.
4. **Read those repos directly.** They are granted in
   [.claude/settings.json](../settings.json) via `permissions.additionalDirectories`.
   Do not work from memory or ask for pastes.

## Consequences
- A missing capability is a **backend** task, not a client workaround. Client-side
  scraping or direct provider calls are out of bounds.
- API caveats are inherited wholesale — `lastSyncedAt === null`, non-chronological
  jornadas, the exclusive-vs-inclusive `to` param, the ~4h scores job, the ~3h
  standings lag. These are documented in [../ECOSYSTEM.md](../ECOSYSTEM.md) and in
  full in `CRONOGOL-API.md`; **read that section before building any screen.**
- The brand rules bind here too: **AltaGama FC** (no space) reader-facing,
  *Alta Gama FC* retired, *CronoGol* internal-only, *Alta Gama Fixture Club* a
  separate non-collapsing mark.
- Base URL is `https://crono-gol.com` (local `http://localhost:3001`). Never
  `altagamafc.com` — that host serves the web front end only.

## Alternatives considered
- **Direct Supabase access from the app** — fewer hops, but ships database keys to
  a client anyone can decompile and couples the app to a schema the backend exists
  to abstract.
